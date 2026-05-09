/**
 * 分类相关类型定义
 */

// 分类状态
export type CategoryStatus = 'active' | 'inactive' | 'archived';

// 分类基础信息
export interface CategoryBase {
  name: string;
  description?: string;
  parentId?: number;
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
}

// 分类创建信息
export interface CategoryCreate extends CategoryBase {
  status?: CategoryStatus;
  featuredImage?: string;
  icon?: string;
  color?: string;
}

// 分类更新信息
export interface CategoryUpdate extends Partial<CategoryBase> {
  status?: CategoryStatus;
  featuredImage?: string;
  icon?: string;
  color?: string;
  blogCount?: number;
}

// 分类详情
export interface CategoryDetail {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  status: CategoryStatus;
  parentId?: number;
  sortOrder: number;
  blogCount: number;
  featuredImage?: string;
  icon?: string;
  color?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  createdAt: Date;
  updatedAt: Date;

  // 关联数据
  parent?: {
    id: number;
    name: string;
  };
  children?: Array<{
    id: number;
    name: string;
    blogCount: number;
  }>;
  blogs?: Array<{
    id: number;
    title: string;
    summary?: string;
    status: string;
    viewCount: number;
  }>;
}

// 分类列表项
export interface CategoryListItem {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  status: CategoryStatus;
  parentId?: number;
  sortOrder: number;
  blogCount: number;
  featuredImage?: string;
  icon?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;

  // 关联数据（可选）
  parent?: {
    id: number;
    name: string;
  };
  childrenCount?: number;
}

// 分类树节点
export interface CategoryTreeNode {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  status: CategoryStatus;
  parentId?: number;
  sortOrder: number;
  blogCount: number;
  featuredImage?: string;
  icon?: string;
  color?: string;
  level: number;
  children: CategoryTreeNode[];
  path: number[]; // 从根节点到当前节点的ID路径
}

// 分类查询参数
export interface CategoryQueryParams {
  status?: CategoryStatus;
  parentId?: number | null; // null 表示只查询顶级分类
  search?: string;
  includeInactive?: boolean;
  includeBlogs?: boolean;
  includeChildren?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'blogCount' | 'sortOrder' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
  treeView?: boolean; // 是否返回树形结构
}

// 分类统计数据
export interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  withBlogs: number; // 有博客的分类数量
  withoutBlogs: number; // 无博客的分类数量
  averageBlogsPerCategory: number;
  maxBlogsInCategory: number;
  categoriesByLevel: Array<{
    level: number;
    count: number;
  }>;
}

// 热门分类（按博客数量排序）
export interface PopularCategory {
  id: number;
  name: string;
  blogCount: number;
  slug?: string;
  featuredImage?: string;
  recentBlogs?: Array<{
    id: number;
    title: string;
    publishedAt: Date;
  }>;
}

// 分类面包屑
export interface CategoryBreadcrumb {
  id: number;
  name: string;
  slug?: string;
  level: number;
}

// 分类操作统计
export interface CategoryOperationStats {
  created: number;
  updated: number;
  deleted: number;
  merged: number; // 合并的分类数量
  moved: number; // 移动的分类数量（改变父级）
}

// 分类合并参数
export interface CategoryMergeParams {
  sourceCategoryId: number; // 源分类（将被合并）
  targetCategoryId: number; // 目标分类（将保留）
  moveBlogs: boolean; // 是否移动博客
  deleteSource: boolean; // 是否删除源分类
}

// 分类移动参数
export interface CategoryMoveParams {
  categoryId: number;
  newParentId?: number | null; // null 表示移动到根级
  newSortOrder?: number;
}

// 分类批量操作参数
export interface CategoryBatchParams {
  categoryIds: number[];
  operation: 'activate' | 'deactivate' | 'archive' | 'delete';
  newParentId?: number;
}

// 分类导入数据
export interface CategoryImportData {
  name: string;
  slug?: string;
  description?: string;
  parentName?: string; // 通过父分类名称关联
  parentSlug?: string; // 通过父分类slug关联
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  status?: CategoryStatus;
}

// 分类导入结果
export interface CategoryImportResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    row: number;
    name: string;
    error: string;
  }>;
  categories: CategoryListItem[];
}

// 分类导出数据
export interface CategoryExportData {
  categories: CategoryDetail[];
  stats: {
    totalCategories: number;
    totalBlogs: number;
    exportDate: Date;
  };
  metadata: {
    exportedBy: string;
    exportReason?: string;
    includeBlogs: boolean;
    includeChildren: boolean;
  };
}

export {
  CategoryStatus,
  CategoryBase,
  CategoryCreate,
  CategoryUpdate,
  CategoryDetail,
  CategoryListItem,
  CategoryTreeNode,
  CategoryQueryParams,
  CategoryStats,
  PopularCategory,
  CategoryBreadcrumb,
  CategoryOperationStats,
  CategoryMergeParams,
  CategoryMoveParams,
  CategoryBatchParams,
  CategoryImportData,
  CategoryImportResult,
  CategoryExportData,
};
