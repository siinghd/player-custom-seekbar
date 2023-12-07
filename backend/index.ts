import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import Queue from './queue';
import { ThumbnailStatus, VideoData } from './types';
import { UploadApiResponse } from 'cloudinary';
import { generateThumbnails, notifyWebhook } from './utils/functions';

const app = express();
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 4000 * 1024 * 1024, // 50 MB
  },
});

app.use(express.json({ limit: '4000mb' }));
app.use(
  express.urlencoded({
    limit: '4000mb',
    extended: true,
  })
);
const thumbnailStatus: Record<string, ThumbnailStatus> = {}; // change with db
const queue = new Queue<VideoData>();

app.post(
  '/upload',

  upload.single('video'),
  (req: Request, res: Response) => {
    try {
      const { fileId, delta, webhook } = req.body;
      if (!req.file) {
        return res.status(400).send('No video file uploaded.');
      }
      if (!fileId || !webhook) {
        return res.status(400).json({
          success: false,
          message: 'Missing one required params : fileId, delta or webhook',
        });
      }

      const deltaInt: number = parseInt(delta) || 10;

      const videoObj = {
        path: req.file.path,
        fileId: fileId,
        delta: deltaInt,
        webhook: webhook,
      };
      queue.enqueue(videoObj);
      res.status(200).send({
        message:
          'Video queue, you will be informed when the video is ready at the provided webhook',
        fileId,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

app.post('/video', (req: Request, res: Response) => {
  console.log('here', req.body);
});

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
      );
    }
  }
};

setInterval(() => {
  if (!queue.isEmpty()) {
    checkForVideosToProcess();
  }
}, 500);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
