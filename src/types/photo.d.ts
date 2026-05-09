export interface PhotoData {
  id: number;
  filename: string;
  path: string;
  url: string;
  originalname: string;
  mimetype: string;
  size: number;
  width?: number;
  height?: number;
  thumbnailFilename?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  thumbnailSize?: number;
  sortOrder?: number;
  isCover?: boolean;
  description?: string;
  tags?: string;
  photoType?: string; //图片类型(avatar, cover, gallery)
}

export interface Album {
  id: number;
  name: string;
  description: string;
  coverUrl: string;
  coverThumbnail?: string;
  isPublic?: boolean;
  photos: Photo[];
  photoCount: number;
  createdAt?: string;
  updatedAt?: string;
}
