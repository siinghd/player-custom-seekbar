import { mkdir, readdir, rm, unlink } from 'fs/promises';
import { join } from 'path';
import { ThumbnailStatus, VideoData } from './types';
import Queue from './queue';
import { generateThumbnails, notifyWebhook } from './utils/functions';
import { UploadApiResponse } from 'cloudinary';

const uploadDir = './uploads';
await mkdir(uploadDir).catch(() => {});
const thumbnailStatus: Record<string, ThumbnailStatus> = {}; // change with db
const queue = new Queue<VideoData>();
Bun.serve({
  fetch(request: Request) {
    return handleUpload(request);
  },
  port: 3000,
});

async function handleUpload(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Only POST requests are allowed', { status: 405 });
  }

  const formData = await request.formData();
  const fileId = formData.get('fileId') as string;
  const originalFileName = formData.get('originalFileName') as string; // Get the original file name
  const webhook = formData.get('webhook') as string;
  const delta = (formData.get('delta') as string) || 60;
  const chunkIndex = formData.get('chunkIndex') as string;
  const totalChunks = formData.get('totalChunks') as string;
  const video = formData.get('video') as File;

  if (!fileId || !originalFileName || !video || !chunkIndex || !totalChunks) {
    return new Response('Missing required data', { status: 400 });
  }

  const chunkDir = join(uploadDir, fileId);
  try {
    await mkdir(chunkDir);
  } catch {}

  const chunkPath = join(chunkDir, chunkIndex);
  await Bun.write(chunkPath, await video.arrayBuffer());

  const uploadedChunks = (await readdir(chunkDir)).length;
  if (uploadedChunks === parseInt(totalChunks)) {
    const finalFilePath = join(uploadDir, originalFileName); // Use the original file name
    const finalFile = Bun.file(finalFilePath);
    const writer = finalFile.writer();

    for (let i = 1; i <= uploadedChunks; i++) {
      const chunkFilePath = join(chunkDir, i.toString());
      const chunk = await Bun.file(chunkFilePath);
      const chunkBuffer = await chunk.arrayBuffer();
      writer.write(chunkBuffer);
      await unlink(chunkFilePath); // Delete chunk
    }

    writer.end();
    queue.enqueue({
      path: finalFilePath,
      delta: parseInt(delta.toString()),
      webhook: webhook,
      fileId,
    });
    await rm(chunkDir, {
      recursive: true,
    });
    return new Response('File upload and assembly complete.');
  } else {
    return new Response('Chunk received.');
  }
}

const checkForVideosToProcess = () => {
  if (!queue.isEmpty()) {
    const videoData: VideoData | null = queue.dequeue();
    if (videoData) {
      generateThumbnails(
        videoData,
        async (thumbnails: UploadApiResponse[] | null, err: any) => {
          if (err) {
            thumbnailStatus[videoData.fileId] = {
              status: 'failed',
              thumbnails: [],
            };
          } else {
            if (!thumbnailStatus[videoData.fileId]) {
              thumbnailStatus[videoData.fileId] = {
                status: 'initialized',
                thumbnails: [],
              };
            } else {
              thumbnailStatus[videoData.fileId] = {
                status: 'done',
                thumbnails:
                  thumbnails?.map((v) => ({
                    public_id: v.public_id,
                    version: v.version,
                    url: v.url,
                    secure_url: v.secure_url,
                  })) || [],
              }; // todo db can be used here :)
              await notifyWebhook(videoData.webhook, {
                fileId: videoData.fileId,
                thumbnails: thumbnailStatus[videoData.fileId].thumbnails,
              });
            }
          }
        }
      );
    }
  }
};

setInterval(() => {
  if (!queue.isEmpty()) {
    checkForVideosToProcess();
  }
}, 500);
