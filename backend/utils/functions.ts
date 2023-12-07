import ffmpeg from 'fluent-ffmpeg';
import { unlink, exists, mkdir } from 'node:fs/promises';
import { VideoData } from '../types';
import cloudinary from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';
import path from 'path';

const thumbnailsDir = path.join(import.meta.dir, '../thumbnails');
const uploadsDir = path.join(import.meta.dir, '../uploads');

const getVideoMetadata = (videoPath: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(`Error getting metadata for video ${videoPath}: ${err.message}`);
      } else {
        resolve(metadata);
      }
    });
  });
};
const generateThumbnails = async (
  videoData: VideoData,
  callback: (thumbnails: UploadApiResponse[] | null, err: any) => void
) => {
  const unlinkPaths = [];
  try {
    if (!(await exists(thumbnailsDir))) {
      await mkdir(thumbnailsDir);
    }
    const videoPath = path.join(import.meta.dir, `../${videoData.path}`);
    const metadata = await getVideoMetadata(videoPath);
    const duration: number = metadata.format.duration || 0;
    const uploadPromises: Promise<UploadApiResponse>[] = [];

    for (let i = 0; i < duration; i += videoData.delta) {
      const thumbnailFilename = `${videoData.fileId}_${i}.png`;
      const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
      unlinkPaths.push(thumbnailPath);
      // Generate thumbnail
      await generateThumbnail(videoPath, thumbnailPath, i);

      // Prepare to upload to Cloudinary
      uploadPromises.push(
        cloudinary.uploader.upload(thumbnailPath, {
          resource_type: 'image',
          format: 'jpg',
          public_id: `thumbnails/${videoData.fileId}_${i}`,
          transformation: [
            { aspect_ratio: '16:9', crop: 'fill' },
            { width: 320, height: 180, crop: 'scale' }, 
          ],
        })
      );
    }
    const thumbnails = await Promise.all(uploadPromises);
    callback(thumbnails, null);
  } catch (error: any) {
    console.error(`Error in generateThumbnails: ${error.message}`);
    callback(null, error);
  } finally {
    for (const path of unlinkPaths) {
      await unlink(path);
    }
  }
};

const generateThumbnail = (
  videoPath: string,
  thumbnailPath: string,
  timeMark: number
): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error(`Error generating thumbnail: ${err.message}`);
        reject(err);
      })
      // todo manage stdrr
      .screenshots({
        count: 1,
        folder: '/',
        filename: thumbnailPath,
        timemarks: [timeMark.toString()],
      });
  });
};

// ... existing code for uploadThumbnailToCloudinary and getVideoMetadata

const notifyWebhook = async (webhookUrl: string, data: any) => {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
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
