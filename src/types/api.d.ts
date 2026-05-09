/**
 * API 相关类型定义
 */

// 通用查询参数
export interface CommonQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  fields?: string;
}

// 通用过滤参数
export interface CommonFilterParams {
  status?: string;
  startDate?: string;
  endDate?: string;
  ids?: string;
}

// 通用 ID 参数
export interface IdParams {
  id: string;
}

// 批量操作参数
export interface BatchOperationParams {
  ids: number[];
}

// 状态更新参数
export interface StatusUpdateParams {
  status: string;
}

// 文件上传参数
export interface FileUploadParams {
  field?: string;
  allowedTypes?: string[];
  maxSize?: number;
  destination?: string;
}

// 搜索参数
export interface SearchParams {
  q: string;
  type?: string;
  fields?: string[];
}

// 统计参数
export interface StatsParams {
  groupBy?: string;
  startDate?: string;
  endDate?: string;
}

// API 文档信息
export interface ApiInfo {
  title: string;
  version: string;
  description: string;
  contact?: {
    name: string;
    email: string;
    url: string;
  };
  license?: {
    name: string;
    url: string;
  };
}

// API 端点信息
export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  authRequired: boolean;
  roles?: string[];
  queryParams?: string[];
  bodyParams?: string[];
  response: any;
}

// API 版本信息
export interface ApiVersion {
  version: string;
  basePath: string;
  endpoints: ApiEndpoint[];
  deprecated?: boolean;
  sunsetDate?: string;
}

export {
  CommonQueryParams,
  CommonFilterParams,
  IdParams,
  BatchOperationParams,
  StatusUpdateParams,
  FileUploadParams,
  SearchParams,
  StatsParams,
  ApiInfo,
  ApiEndpoint,
  ApiVersion,
};
