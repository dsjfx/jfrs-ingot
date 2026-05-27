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

// 标签分组结果接口
export interface PhotoGroupResult {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  photos?: PhotoData[];
  photoCount: number;
  coverUrl?: string;
  coverThumbnail?: string;
  coverPhoto?: {
    id: number;
    url: string;
    thumbnailUrl: string;
    width: number;
    height: number;
  };
}

export interface PhotoGroupParam {
  current?: number; // 当前页码
  size?: number; // 返回的数量限制
  sortBy?: string; // 排序字段：'name', 'photoCount', 'createdAt'
  sortOrder?: 'ASC' | 'DESC'; // 排序方向
  ids?: number[]; // 指定标签(分类)ID
  slugs?: string[]; // 指定标签(分类)slug
  search?: string; // 搜索关键词
  status?: string; // 博客状态
  subject?: string; // 博客类型
}
