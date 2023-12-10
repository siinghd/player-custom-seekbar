import { exists, mkdir } from 'node:fs/promises';
import { VideoData } from '../types';
import cloudinary from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';
import path from 'path';
import Ffmpeg from 'fluent-ffmpeg';
import ConcurrencyLimit from '../ConcurrencyLimit';
import { rm } from 'node:fs/promises';

const thumbnailsDir = path.join(import.meta.dir, './thumbnails');
await mkdir(thumbnailsDir, { recursive: true }).catch(console.error);
const limit = new ConcurrencyLimit<any>(10);

const getVideoMetadata = (videoPath: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    Ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(`Error getting metadata for video ${videoPath}: ${err.message}`);
      } else {
        resolve(metadata);
      }
    });
  });
};

const generateThumbnail = (
  videoPath: string,
  thumbnailPath: string,
  timeMark: number
): Promise<void> => {
  return new Promise((resolve, reject) => {
    Ffmpeg(videoPath)
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error(`Error generating thumbnail: ${err.message}`);
        reject(err);
      })
      .screenshots({
        count: 1,
        folder: '/',
        filename: thumbnailPath,
        timemarks: [timeMark.toString()],
      });
  });
};

const generateThumbnails = async (
  videoData: VideoData,
  callback: (thumbnails: UploadApiResponse[] | null, err: any) => void
) => {
  const videoThumbnailDir = path.join(thumbnailsDir, videoData.fileId);
  try {
    if (!(await exists(thumbnailsDir))) {
      await mkdir(thumbnailsDir);
    }

    if (!(await exists(videoThumbnailDir))) {
      await mkdir(videoThumbnailDir);
    }
    const videoPath = videoData.path
    const metadata = await getVideoMetadata(videoPath);
    const duration: number = metadata.format.duration || 0;
    const uploadPromises: Promise<UploadApiResponse>[] = [];
    const thumbnailPromises: Promise<void>[] = [];

    for (let i = 0; i < duration; i += videoData.delta) {
      const thumbnailFilename = `${videoData.fileId}_${i}.png`;
      const thumbnailPath = path.join(videoThumbnailDir, thumbnailFilename);
      // possible not working..., actually it doesn't matter that much performance wise as its really fast
      // thumbnailPromises.push(
      //   limit.enqueue(() => generateThumbnail(videoPath, thumbnailPath, i))
      // );

      await generateThumbnail(videoPath, thumbnailPath, i);
      uploadPromises.push(
        limit.enqueue(() =>
          cloudinary.uploader.upload(thumbnailPath, {
            timeout: 180000,
            resource_type: 'image',
            format: 'jpg',
            public_id: `thumbnails/${videoData.fileId}_${i}`,
            transformation: [
              { aspect_ratio: '16:9', crop: 'fill' },
              { width: 320, height: 180, crop: 'scale' },
            ],
            context: { timestamp: i.toString() },
          })
        )
      );
    }

    // await Promise.all(thumbnailPromises);
    const thumbnails = await Promise.all(uploadPromises);
    callback(thumbnails, null);
  } catch (error: any) {
    console.error(`Error in generateThumbnails: ${error.message}`);
    callback(null, error);
  } finally {
    await rm(videoThumbnailDir, {
      recursive: true,
    });
  }
};

const notifyWebhook = async (webhookUrl: string, data: any) => {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.statusText}`);
    }
  } catch (error: any) {
    console.error(`Error notifying webhook: ${error.message}`);
  }
};

export {
  generateThumbnail,
  generateThumbnails,
  getVideoMetadata,
  notifyWebhook,
};
