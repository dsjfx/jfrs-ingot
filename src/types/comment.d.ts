/**
 * 评论相关类型定义
 */

// 评论状态
export type CommentStatus = 'pending' | 'approved' | 'rejected';

// 评论基础信息
export interface CommentBase {
  content: string;
  blogId: number;
}

// 评论创建信息
export interface CommentCreate extends CommentBase {
  parentId?: number;
  replyToId?: number;
}

// 评论更新信息
export interface CommentUpdate {
  content?: string;
  status?: CommentStatus;
}

// 评论详情
export interface CommentDetail {
  id: number;
  content: string;
  status: CommentStatus;
  likeCount: number;
  userId: number;
  blogId: number;
  parentId?: number;
  replyToId?: number;
  createdAt: Date;
  updatedAt: Date;

  // 关联数据
  user: {
    id: number;
    username: string;
    avatar?: string;
  };
  blog?: {
    id: number;
    title: string;
  };
  parent?: {
    id: number;
    content: string;
    user: {
      id: number;
      username: string;
    };
  };
  replyTo?: {
    id: number;
    content: string;
    user: {
      id: number;
      username: string;
    };
  };
  replies?: CommentDetail[];
}

// 评论列表项
export interface CommentListItem {
  id: number;
  content: string;
  status: CommentStatus;
  likeCount: number;
  userId: number;
  blogId: number;
  parentId?: number;
  createdAt: Date;

  // 关联数据
  user: {
    id: number;
    username: string;
    avatar?: string;
  };
}

// 评论查询参数
export interface CommentQueryParams {
  status?: CommentStatus;
  blogId?: number;
  userId?: number;
  parentId?: number | null;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'likeCount';
  sortOrder?: 'ASC' | 'DESC';
}

// 评论统计数据
export interface CommentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  averagePerBlog: number;
  topCommenters: Array<{
    userId: number;
    username: string;
    count: number;
  }>;
}

// 热门评论
export interface PopularComment {
  id: number;
  content: string;
  likeCount: number;
  user: {
    id: number;
    username: string;
    avatar?: string;
  };
  blog: {
    id: number;
    title: string;
  };
}

// 评论审核结果
export interface CommentModerationResult {
  id: number;
  status: CommentStatus;
  moderatedBy: number;
  moderatedAt: Date;
  reason?: string;
}

// 批量审核参数
export interface BulkModerationParams {
  commentIds: number[];
  status: CommentStatus;
  reason?: string;
}

/**
 * 评论过滤字段
 */
export interface CommentFilters {
  status?: string;
  blogId?: number;
  userId?: number;
  parentId?: number | null;
  search?: string;
}

export default {
  CommentStatus,
  CommentBase,
  CommentCreate,
  CommentUpdate,
  CommentDetail,
  CommentListItem,
  CommentQueryParams,
  CommentStats,
  PopularComment,
  CommentModerationResult,
  BulkModerationParams,
};
