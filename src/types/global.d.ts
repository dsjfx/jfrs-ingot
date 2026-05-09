/**
 * 全局类型声明
 */

// 环境变量类型
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: string;
    APP_NAME: string;

    // 数据库配置
    DB_HOST: string;
    DB_PORT: string;
    DB_NAME: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_DIALECT: string;

    // JWT配置
    JWT_SECRET: string;
    JWT_EXPIRE: string;

    // 日志配置
    LOG_LEVEL: string;

    // 速率限制
    RATE_LIMIT_WINDOW_MS: string;
    RATE_LIMIT_MAX: string;

    // 可选配置
    CORS_ORIGIN?: string;
    COOKIE_SECRET?: string;
  }
}

// 全局工具类型
type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type Maybe<T> = T | null | undefined;

// 分页参数
interface PaginationParams {
  page?: number;
  limit?: number;
}

// 排序参数
interface SortParams {
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// 搜索参数
interface SearchParams {
  search?: string;
}

// 时间范围
interface TimeRange {
  startDate?: Date | string;
  endDate?: Date | string;
}

// 通用响应格式
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 文件上传相关
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

export {
  Nullable,
  Optional,
  Maybe,
  PaginationParams,
  SortParams,
  SearchParams,
  TimeRange,
  ApiResponse,
  UploadedFile,
};
