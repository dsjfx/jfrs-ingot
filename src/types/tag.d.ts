/**
 * 标签相关类型定义
 */

// 标签状态
export type TagStatus = 'active' | 'inactive' | 'archived';

// 标签基础信息
export interface TagBase {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

// 标签创建信息
export interface TagCreate extends TagBase {
  slug?: string;
  status?: TagStatus;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
}

// 标签更新信息
export interface TagUpdate extends Partial<TagBase> {
  slug?: string;
  status?: TagStatus;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  blogCount?: number;
}

// 标签详情
export interface TagDetail {
  id: number;
  name: string;
  slug: string;
  description?: string;
  status: TagStatus;
  color?: string;
  icon?: string;
  blogCount: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  createdAt: Date;
  updatedAt: Date;

  // 关联数据
  blogs?: Array<{
    id: number;
    title: string;
    summary?: string;
    status: string;
    viewCount: number;
    publishedAt?: Date;
  }>;
  relatedTags?: Array<{
    id: number;
    name: string;
    blogCount: number;
    coOccurrenceCount: number; // 共同出现的次数
  }>;
}

// 标签列表项
export interface TagListItem {
  id: number;
  name: string;
  slug: string;
  description?: string;
  status: TagStatus;
  color?: string;
  icon?: string;
  blogCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 标签云项目
export interface TagCloudItem {
  id: number;
  name: string;
  slug: string;
  blogCount: number;
  fontSize: number; // 根据博客数量计算的字体大小
  color?: string;
  weight: number; // 权重 0-1
}

// 标签查询参数
export interface TagQueryParams {
  status?: TagStatus;
  search?: string;
  minBlogCount?: number; // 最小博客数量
  maxBlogCount?: number; // 最大博客数量
  includeInactive?: boolean;
  includeBlogs?: boolean;
  includeRelated?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'blogCount' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
  cloudView?: boolean; // 是否返回标签云格式
  random?: boolean; // 是否随机排序
}

// 标签统计数据
export interface TagStats {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  averageBlogsPerTag: number;
  maxBlogsPerTag: number;
  unusedTags: number; // 没有博客的标签数量
  popularTags: Array<{
    id: number;
    name: string;
    blogCount: number;
  }>;
  tagUsageDistribution: Array<{
    blogCountRange: string;
    tagCount: number;
  }>;
}

// 热门标签（按博客数量排序）
export interface PopularTag {
  id: number;
  name: string;
  slug: string;
  blogCount: number;
  color?: string;
  recentUsage?: Array<{
    blogId: number;
    blogTitle: string;
    usedAt: Date;
  }>;
}

// 标签关联分析
export interface TagAssociation {
  tag1Id: number;
  tag1Name: string;
  tag2Id: number;
  tag2Name: string;
  coOccurrenceCount: number; // 同时出现的次数
  jaccardIndex: number; // 杰卡德相似系数
}

// 标签操作统计
export interface TagOperationStats {
  created: number;
  updated: number;
  deleted: number;
  merged: number; // 合并的标签数量
  cleaned: number; // 清理的标签数量（删除无用标签）
}

// 标签合并参数
export interface TagMergeParams {
  sourceTagId: number; // 源标签（将被合并）
  targetTagId: number; // 目标标签（将保留）
  moveBlogs: boolean; // 是否移动博客关联
  deleteSource: boolean; // 是否删除源标签
  updateSlug?: boolean; // 是否更新slug
}

// 标签清理参数
export interface TagCleanupParams {
  minBlogCount: number; // 最小博客数量，低于此值的标签将被清理
  inactiveOnly: boolean; // 只清理非活跃标签
  deleteOrArchive: 'delete' | 'archive'; // 删除还是归档
}

// 标签批量操作参数
export interface TagBatchParams {
  tagIds: number[];
  operation: 'activate' | 'deactivate' | 'archive' | 'delete' | 'merge';
  targetTagId?: number; // 合并操作的目标标签ID
}

// 标签自动建议结果
export interface TagSuggestion {
  tag: {
    id: number;
    name: string;
    slug: string;
    blogCount: number;
  };
  score: number; // 匹配分数 0-1
  reason: 'name_match' | 'slug_match' | 'related' | 'popular';
}

// 标签导入数据
export interface TagImportData {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  status?: TagStatus;
}

// 标签导入结果
export interface TagImportResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    row: number;
    name: string;
    error: string;
  }>;
  tags: TagListItem[];
}

// 标签导出数据
export interface TagExportData {
  tags: TagDetail[];
  stats: {
    totalTags: number;
    totalBlogs: number;
    exportDate: Date;
  };
  metadata: {
    exportedBy: string;
    exportReason?: string;
    includeBlogs: boolean;
    includeAssociations: boolean;
  };
}

// 标签云配置
export interface TagCloudConfig {
  minFontSize: number;
  maxFontSize: number;
  colorScheme: 'random' | 'category' | 'fixed';
  shape: 'linear' | 'spiral' | 'rectangular';
  sortBy: 'name' | 'blogCount' | 'random';
  limit: number;
}

// 标签自动完成结果
export interface TagAutocompleteResult {
  id: number;
  name: string;
  slug: string;
  blogCount: number;
  matchType: 'prefix' | 'contains' | 'exact';
}

export {
  TagStatus,
  TagBase,
  TagCreate,
  TagUpdate,
  TagDetail,
  TagListItem,
  TagCloudItem,
  TagQueryParams,
  TagStats,
  PopularTag,
  TagAssociation,
  TagOperationStats,
  TagMergeParams,
  TagCleanupParams,
  TagBatchParams,
  TagSuggestion,
  TagImportData,
  TagImportResult,
  TagExportData,
  TagCloudConfig,
  TagAutocompleteResult,
};
