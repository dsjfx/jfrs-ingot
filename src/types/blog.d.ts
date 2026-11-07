/**
 * 博客相关类型定义
 */

// 博客状态
export type BlogStatus = 'draft' | 'published' | 'archived';

// 博客基础信息
export interface BlogBase {
  title: string;
  content: string;
  summary?: string;
  coverImage?: string;
}

// 博客创建信息
export interface BlogCreate extends BlogBase {
  status?: BlogStatus;
  categoryId?: number;
  tagIds?: number[];
  isFeatured?: boolean;
}

// 博客更新信息
export interface BlogUpdate extends Partial<BlogBase> {
  status?: BlogStatus;
  categoryId?: number;
  tagIds?: number[];
  isFeatured?: boolean;
  viewCount?: number;
}

// 博客详情
export interface BlogDetail extends BlogBase {
  id: number;
  status: BlogStatus;
  viewCount: number;
  authorId: number;
  categoryId?: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;

  // 关联数据
  author?: {
    id: number;
    username: string;
    avatar?: string;
  };
  category?: {
    id: number;
    name: string;
  };
  tags?: Array<{
    id: number;
    name: string;
  }>;
}

// 博客列表项
export interface BlogListItem {
  id: number;
  title: string;
  summary?: string;
  coverImage?: string;
  status: BlogStatus;
  viewCount: number;
  authorId: number;
  categoryId?: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;

  // 关联数据（可选）
  author?: {
    id: number;
    username: string;
    avatar?: string;
  };
  category?: {
    id: number;
    name: string;
  };
  tags?: Array<{
    id: number;
    name: string;
  }>;
}

// 博客查询参数
export interface BlogQueryParams {
  filters?: {
    subject?: string;
    status?: BlogStatus;
    categoryId?: number;
    tagId?: number;
    authorId?: number;
    search?: string;
    isFeatured?: boolean;
  };
  includePhotos?: boolean;
  startDate?: string;
  endDate?: string;
  current?: number;
  size?: number;
  photoLimit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'publishedAt' | 'title';
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

// 博客统计数据
export interface BlogStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  featured: number;
  totalViews: number;
  averageViews: number;
  blogsByMonth: Array<{
    month: string;
    count: number;
  }>;
}

// 热门博客
export interface PopularBlog {
  id: number;
  title: string;
  viewCount: number;
  author: {
    id: number;
    username: string;
  };
}

// 相关博客
export interface RelatedBlog {
  id: number;
  title: string;
  summary?: string;
  coverImage?: string;
  author: {
    id: number;
    username: string;
  };
}

// 博客操作统计
export interface BlogOperationStats {
  created: number;
  updated: number;
  deleted: number;
  published: number;
  archived: number;
}

export interface BlogFilters {
  subject?: string;
  status?: BlogStatus;
  categoryId?: number;
  tagId?: number;
  authorId?: number;
  search?: string;
  isTop?: number; // 添加置顶筛选
}

export default {
  BlogStatus,
  BlogBase,
  BlogCreate,
  BlogUpdate,
  BlogDetail,
  BlogListItem,
  BlogQueryParams,
  BlogStats,
  PopularBlog,
  RelatedBlog,
  BlogOperationStats,
};
