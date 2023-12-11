export interface ThumbnailStatus {
  status: string;
  thumbnails: any[];
}

export interface VideoData {
  path: string;
  fileId: string;
  delta: number;
  webhook: string;
  isComposite: boolean;
  height: number;
  width: number;
}

export interface Thumbnail {
  public_id: string;
  version: number;
  url: string;
  secure_url: string;
  timestamp: number;
}
