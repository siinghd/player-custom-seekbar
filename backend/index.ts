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
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
});




app.post('/upload', (req: Request, res: Response) => {
  console.log(req.body);
});

app.post('/video', (req: Request, res: Response) => {
  console.log('here', req.body);
});



app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    res.status(500).send(err.message);
  } else {
    next();
  }
});
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
