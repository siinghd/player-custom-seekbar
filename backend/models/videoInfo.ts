import mongoose from 'mongoose';
export enum VideoStatus {
  Pending = 'pending',
  Initialized = 'initialized',
  Errored = 'Errored',
  Done = 'done',
  Retrying = 'Retrying',
}
const videoInfoSchema: mongoose.Schema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
    },
    thumbnails: [],
    status: {
      type: String,
      default: VideoStatus.Pending,
      enum: Object.values(VideoStatus) as string[],
    },
    webhook: {
      type: String,
    },
    delta: {
      type: Number,
    },
    isComposite: {
      type: Boolean,
      default: true,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
  },
  { timestamps: true }
);

videoInfoSchema.index({ fileId: 1 });

// Timestamps for sorting
videoInfoSchema.index({ createdAt: 1 });
videoInfoSchema.index({ updatedAt: 1 });

export default mongoose.model('videoInfo', videoInfoSchema);
