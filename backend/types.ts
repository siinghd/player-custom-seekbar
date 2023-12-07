export interface ThumbnailStatus {
  status: string;
  thumbnails: any[];
}

export interface VideoData {
  path: string;
  fileId: string;
  delta: number;
  webhook: string;
}
