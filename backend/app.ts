import { mkdir, readdir, rm, unlink } from 'fs/promises';
import { join } from 'path';
import Queue from './queue';
import { generateThumbnails, notifyWebhook } from './utils/functions';
import { UploadApiResponse } from 'cloudinary';
import videoInfo, { VideoStatus } from './models/videoInfo';
import connectWithDb from './config/db';
import { VideoData } from './types';
import { HEIGHT, WIDTH } from './utils/constats';

const uploadDir = join(import.meta.dir, './uploads');
await mkdir(uploadDir, { recursive: true }).catch(console.error);
interface ExtendedVideo extends VideoData {
  retries: 0;
}
const queue = new Queue<ExtendedVideo>();
Bun.serve({
  fetch(request: Request) {
    switch (new URL(request.url).pathname) {
      case '/upload':
        return handleUpload(request);
      case '/video':
        return handleGetVideo(request);
      default:
        return new Response('ok');
    }
  },
  port: 3000,
});

async function handleGetVideo(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Only GET requests are allowed', { status: 405 });
  }
  const fileId = new URL(request.url).searchParams.get('fileId');
  if (!fileId) return new Response('File ID is required', { status: 400 });

  const videoInf = await videoInfo.findOne({ fileId }).lean();
  return videoInf
    ? Response.json(
        {
          fileId: videoInf.fileId,
          thumbnails: videoInf.thumbnails,
          delta: videoInf.delta,
          height: videoInf.height,
          width: videoInf.width,
          isComposite: videoInf.isComposite,
        },
        { status: 200 }
      )
    : new Response('Video not found', { status: 404 });
}

const processChunk = async (
  fileId: string,
  webhook: string,
  delta: number,
  chunkIndex: string,
  video: File,
  totalChunks: number,
  originalName: string,
  isComposite: boolean,
  width: number,
  height: number
) => {
  const chunkDir = join(uploadDir, fileId);
  await mkdir(chunkDir, { recursive: true }).catch(console.error);

  const chunkPath = join(chunkDir, chunkIndex.toString());
  await Bun.write(chunkPath, await video.arrayBuffer());
  const uploadedChunks = (await readdir(chunkDir)).length;
  if (uploadedChunks === parseInt(totalChunks.toString())) {
    const finalFilePath = join(uploadDir, `${fileId}_${originalName}`);
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
      retries: 0,
      isComposite,
      height,
      width,
    });
    await rm(chunkDir, {
      recursive: true,
    });
  }
};
const handleUpload = async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Only POST requests are allowed', { status: 405 });
  }

  const formData = await request.formData();
  const fileId = formData.get('fileId') as string;
  const originalFileName = formData.get('originalFileName') as string;
  const webhook = formData.get('webhook') as string;
  const delta = Math.max(parseInt(formData.get('delta') as string) || 10);
  const chunkIndex = formData.get('chunkIndex') as string;
  const totalChunks = parseInt(formData.get('totalChunks') as string);
  const compositeValue = formData.get('composite');
  const isComposite = compositeValue !== null ? Boolean(compositeValue) : true;
  const width = parseInt(formData.get('width') as string) || WIDTH;
  const height = parseInt(formData.get('height') as string) || HEIGHT;
  const video = formData.get('video') as File;

  if (!fileId || !originalFileName || !video || !chunkIndex || !totalChunks) {
    return new Response('Missing required data', { status: 400 });
  }

  const videoInf = await videoInfo.findOne({ fileId });
  if (videoInf && videoInf.status !== VideoStatus.Pending) {
    if (videoInf.status === VideoStatus.Errored) {
      videoInf.status = VideoStatus.Pending;
      await videoInf.save(); // wont work with lean
    } else {
      return new Response(
        'Video is already being processed, or already done, stop sending chunks',
        { status: 400 }
      );
    }
  }
  if (!videoInf) {
    await videoInfo.create({
      delta: delta,
      webhook,
      status: VideoStatus.Pending,
      fileId: fileId,
      thumbnails: [],
      isComposite,
      height,
      width,
    });
  }
  await processChunk(
    fileId,
    webhook,
    delta,
    chunkIndex,
    video,
    totalChunks,
    originalFileName,
    isComposite,
    height,
    width
  );
  return new Response('Chunk received.');
};

const updateVideoInfoAndNotify = async (
  videoData: VideoData,
  thumbnails: UploadApiResponse[] | []
): Promise<void> => {
  const updated = await videoInfo
    .findOneAndUpdate(
      { fileId: videoData.fileId },
      {
        $set: {
          status: VideoStatus.Done,
          delta: videoData.delta,
          webhook: videoData.webhook,
          isComposite: videoData.isComposite,
          height: videoData.height,
          width: videoData.width,
          thumbnails: thumbnails.map((t) => ({
            public_id: t.public_id,
            version: t.version,
            url: t.url,
            secure_url: t.secure_url,
            timestamp: (t.context as any).custom.timestamp,
          })),
        },
      },
      { new: true }
    )
    .lean();

  if (updated) {
    notifyWebhook(updated.webhook, {
      fileId: updated.fileId,
      thumbnails: updated.thumbnails,
    });
  }
};
const updateVideoStatus = async (
  fileId: string,
  status: VideoStatus
): Promise<void> => {
  await videoInfo.findOneAndUpdate(
    { fileId },
    { $set: { status } },
    { upsert: true }
  );
};
const processVideo = async (videoData: ExtendedVideo): Promise<void> => {
  generateThumbnails(videoData, async (thumbnails, err) => {
    if (err) {
      videoData.retries += 1;
      if (videoData.retries >= 5) {
        await updateVideoStatus(videoData.fileId, VideoStatus.Errored);
        return;
      }
      console.error('Thumbnail generation error:', err);
      await updateVideoStatus(videoData.fileId, VideoStatus.Retrying);
      queue.enqueue(videoData); // Re-enqueue the video for retry
    } else {
      await updateVideoInfoAndNotify(videoData, thumbnails || []);
      await rm(videoData.path, {
        recursive: true,
      });
    }
  });
};
// todo maybe use spawn for multi process
const checkForVideosToProcess = async (): Promise<void> => {
  while (!queue.isEmpty()) {
    const videoData = queue.dequeue();

    if (!videoData) continue;

    try {
      console.log('processing', videoData.fileId);
      await updateVideoStatus(videoData.fileId, VideoStatus.Initialized);
      await processVideo(videoData);
    } catch (error) {
      console.error('Error processing video:', error);
      // Reenqueue with a delay for retry, or handle error differently
    }
  }
};
// queue.enqueue({
//   path: './uploads/santurini.mp4',
//   delta: 10,
//   webhook: 'http://172.29.1.90:3001/video',
//   fileId: '1234',
//   retries: 0,
//   isComposite: true,
//   width: WIDTH,
//   height: HEIGHT,
// });

connectWithDb(() => {
  setInterval(() => {
    if (!queue.isEmpty()) {
      checkForVideosToProcess();
    }
  }, 10000);
});
