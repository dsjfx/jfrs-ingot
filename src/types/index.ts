import type { AuthenticatedUser, AuthRequest } from './express';
export * from './global';
export * from './express';
export * from './database';
export * from './api';
export * from './user';
export * from './blog';
export * from './category';
export * from './tag';
export * from './comment';
export * from './logger';
export * from './utils';

// 类型工具重新导出
export type {
  // 从 global.d.ts
  Nullable,
  Optional,
  Maybe,
  PaginationParams,
  SortParams,
  SearchParams,
  TimeRange,
  ApiResponse,
  UploadedFile,
} from './global';

// 常用类型的别名
export type {
  // 用户相关
  UserRole,
  UserProfile,
  LoginResponse,
} from './user';

export type {
  // 博客相关
  BlogStatus,
  BlogDetail,
  BlogQueryParams,
} from './blog';

export type {
  // 分类相关
  CategoryStatus,
  CategoryDetail,
  CategoryTreeNode,
} from './category';

export type {
  // 标签相关
  TagStatus,
  TagDetail,
  TagCloudItem,
} from './tag';

export type {
  // 评论相关
  CommentStatus,
  CommentDetail,
} from './comment';

// 常用组合类型
export type UserWithStats = import('./user').UserProfile & {
  stats: {
    blogCount: number;
    commentCount: number;
    likeCount: number;
  };
};

export type BlogWithRelations = import('./blog').BlogDetail & {
  category: import('./category').CategoryDetail;
  tags: import('./tag').TagDetail[];
  commentsCount: number;
};

export type CategoryWithHierarchy = import('./category').CategoryDetail & {
  parent?: import('./category').CategoryDetail;
  children: import('./category').CategoryDetail[];
  blogsCount: number;
};

export type TagWithRelations = import('./tag').TagDetail & {
  relatedTags: import('./tag').TagDetail[];
  recentBlogs: import('./blog').BlogListItem[];
};

// 用户类型
export { AuthenticatedUser, AuthRequest };
