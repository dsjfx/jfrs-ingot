/**
 * 日志相关类型定义
 */

// 日志级别
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

// 日志配置
export interface LogConfig {
  level: LogLevel;
  dir: string;
  maxFiles: string;
  maxSize: string;
  console?: boolean;
  file?: boolean;
}

// 日志条目
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, any>;
  service?: string;
  module?: string;
  requestId?: string;
  userId?: number | string;
}

// 审计日志条目
export interface AuditLogEntry extends LogEntry {
  userId: number;
  action: string;
  resource: string;
  resourceId?: number | string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

// 性能日志条目
export interface PerformanceLogEntry extends LogEntry {
  operation: string;
  duration: number;
  unit: string;
  tags?: Record<string, string>;
}

// 错误日志条目
export interface ErrorLogEntry extends LogEntry {
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

// API 请求日志条目
export interface ApiLogEntry extends LogEntry {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  contentLength?: number;
  userAgent?: string;
  ip?: string;
  queryParams?: Record<string, any>;
  requestBody?: Record<string, any>;
}

// 数据库查询日志条目
export interface DbLogEntry extends LogEntry {
  query: string;
  duration: number;
  model?: string;
  operation?: string;
}

// 业务操作日志条目
export interface BusinessLogEntry extends LogEntry {
  operation: string;
  userId: number;
  resourceType: string;
  resourceId?: number | string;
  before?: any;
  after?: any;
  changes?: Record<string, any>;
}

// 系统事件日志条目
export interface SystemLogEntry extends LogEntry {
  event: string;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
}

// 日志查询参数
export interface LogQueryParams {
  level?: LogLevel;
  service?: string;
  module?: string;
  userId?: number | string;
  requestId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'level';
  sortOrder?: 'ASC' | 'DESC';
}

// 日志统计
export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byModule: Record<string, number>;
  byHour: Array<{
    hour: string;
    count: number;
  }>;
  errorsLast24h: number;
  warningsLast24h: number;
}

export {
  LogLevel,
  LogConfig,
  LogEntry,
  AuditLogEntry,
  PerformanceLogEntry,
  ErrorLogEntry,
  ApiLogEntry,
  DbLogEntry,
  BusinessLogEntry,
  SystemLogEntry,
  LogQueryParams,
  LogStats,
};
