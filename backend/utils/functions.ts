import { exists, mkdir } from 'node:fs/promises';
import { VideoData } from '../types';
import cloudinary from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';
import path from 'path';
import Ffmpeg from 'fluent-ffmpeg';
import ConcurrencyLimit from '../ConcurrencyLimit';
import { rm } from 'node:fs/promises';
import sharp from 'sharp';

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
const createCompositeImage = async (
  thumbnailPaths: string[],
  thumbWidth: number,
  thumbHeight: number,
  imagePath: string
) => {
  const totalThumbnails = thumbnailPaths.length;
  const cols = Math.ceil(Math.sqrt(totalThumbnails));
  const rows = Math.ceil(totalThumbnails / cols);
  let compositeThumbnails = [];

  const compositeWidth = cols * thumbWidth;
  const compositeHeight = rows * thumbHeight;
  const compositeImage = sharp({
    create: {
      width: compositeWidth,
      height: compositeHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  for (let i = 0; i < totalThumbnails; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Use sharp to scale down the thumbnail
    const scaledThumbnail = await sharp(thumbnailPaths[i])
      .resize(thumbWidth, thumbHeight)
      .toBuffer();

    compositeThumbnails.push({
      input: scaledThumbnail,
      top: row * thumbHeight,
      left: col * thumbWidth,
    });
  }

  try {
    await compositeImage.composite(compositeThumbnails).toFile(imagePath);
    return [true];
  } catch (err) {
    console.error('Error creating composite image:', err);
    return [false, err];
  }
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
  const thumbnailsPaths: string[] = [];
  try {
    if (!(await exists(thumbnailsDir))) {
      await mkdir(thumbnailsDir);
    }

    if (!(await exists(videoThumbnailDir))) {
      await mkdir(videoThumbnailDir);
    }
    const videoPath = videoData.path;
    const metadata = await getVideoMetadata(videoPath);
    const duration: number = metadata.format.duration || 0;
    const uploadPromises: Promise<UploadApiResponse>[] = [];
    const thumbnailPromises: Promise<void>[] = [];

    for (let i = 0; i < duration; i += videoData.delta) {
      const thumbnailFilename = `${videoData.fileId}_${i}.png`;
      const thumbnailPath = path.join(videoThumbnailDir, thumbnailFilename);
      thumbnailsPaths.push(thumbnailPath);
      // possible not working..., actually it doesn't matter that much performance wise as its really fast
      // thumbnailPromises.push(
      //   limit.enqueue(() => generateThumbnail(videoPath, thumbnailPath, i))
      // );

      await generateThumbnail(videoPath, thumbnailPath, i);
      if (!videoData.isComposite) {
        uploadPromises.push(
          limit.enqueue(() =>
            cloudinary.uploader.upload(thumbnailPath, {
              timeout: 180000,
              resource_type: 'image',
              format: 'jpg',
              public_id: `thumbnails/${videoData.fileId}_${i}`,
              transformation: [
                { aspect_ratio: '16:9', crop: 'fill' },
                {
                  width: videoData.width,
                  height: videoData.height,
                  crop: 'scale',
                },
              ],
              context: { timestamp: i.toString() },
            })
          )
        );
      }
    }
    if (videoData.isComposite) {
      const thumbnailFilename = `${videoData.fileId}_composite.png`;
      const thumbnailPath = path.join(videoThumbnailDir, thumbnailFilename);
      const [success, error] = await createCompositeImage(
        thumbnailsPaths,
        videoData.width,
        videoData.height,
        thumbnailPath
      );
      if (success) {
        const res = await cloudinary.uploader.upload(thumbnailPath, {
          timeout: 180000,
          resource_type: 'image',
          format: 'jpg',
          public_id: `thumbnails/${videoData.fileId}_composite`,

          context: { timestamp: videoData.delta },
        });
        callback([res], null);
      } else {
        callback(null, error);
      }
    } else {
      const thumbnails = await Promise.all(uploadPromises);
      callback(thumbnails, null);
    }
    // await Promise.all(thumbnailPromises);
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
