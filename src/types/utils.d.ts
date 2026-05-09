/**
 * 通用工具类型定义
 */

// 基本工具类型
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

// 深度可选/必填
export type DeepPartial<T> = T extends object
  ? {
    [P in keyof T]?: DeepPartial<T[P]>;
  }
  : T;

export type DeepRequired<T> = T extends object ? {
  [P in keyof T]-?: DeepRequired<T[P]>;
} : T;

// 递归只读
export type DeepReadonly<T> = T extends object ? {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
} : T;

// 从对象中提取函数
export type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

export type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

// 异步函数返回类型
export type AsyncReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any;

// 构造器类型
export type Constructor<T = any> = new (...args: any[]) => T;

// 事件类型
export interface EventMap {
  [event: string]: any;
}

export type EventHandler<T = any> = (data: T) => void;

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 排序配置
export interface SortConfig {
  field: string;
  order: 'ASC' | 'DESC';
}

// 过滤条件
export interface FilterCondition {
  field: string;
  operator:
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'in'
  | 'notIn'
  | 'between'
  | 'notBetween';
  value: any;
}

// 查询构建器配置
export interface QueryBuilderConfig {
  filters?: FilterCondition[];
  sorts?: SortConfig[];
  pagination?: {
    page: number;
    limit: number;
  };
  includes?: string[];
  fields?: string[];
}

// 延迟加载类型
export type Lazy<T> = () => Promise<T>;

// 缓存配置
export interface CacheConfig {
  ttl: number;
  key: string;
  tags?: string[];
}

// 验证规则
export interface ValidationRule {
  rule: string;
  params?: any[];
  message?: string;
}

// 文件信息
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  path: string;
  url?: string;
}

// HTTP 方法
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export {
  PartialBy,
  RequiredBy,
  Optional,
  DeepPartial,
  DeepRequired,
  DeepReadonly,
  FunctionKeys,
  NonFunctionKeys,
  AsyncReturnType,
  Constructor,
  EventMap,
  EventHandler,
  PaginatedResponse,
  SortConfig,
  FilterCondition,
  QueryBuilderConfig,
  Result,
  Lazy,
  CacheConfig,
  ValidationRule,
  FileInfo,
  HttpMethod,
};
