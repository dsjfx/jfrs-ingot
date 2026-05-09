import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';
import HttpStatus from '@/utils/HttpStatus';

/**
 * 自定义应用错误类
 * 用于区分系统错误和业务逻辑错误
 */
export class AppError extends Error {
  statusCode: number;
  errorCode: string;
  isOperational: boolean;

  /**
   * 创建应用错误实例
   * @param {string} message - 错误信息
   * @param {number} statusCode - HTTP 状态码
   * @param {string} errorCode - 业务错误代码（可选）
   * @param {boolean} isOperational - 是否为可操作错误
   */
  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    isOperational?: boolean
  ) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode || getDefaultCode(statusCode);
    this.isOperational = isOperational || true;
    // this.timestamp = new Date().toISOString();

    // 保留原始错误堆栈
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 转换为 JSON 格式
   * @returns {Object} JSON 对象
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.errorCode,
      // timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }

  /**
   * 转换为 API 响应格式
   * @returns {Object} API 响应对象
   */
  toResponse(): object {
    return {
      success: false,
      code: this.statusCode,
      message: this.message,
      // timestamp: this.timestamp
    };
  }
}

/**
 * 根据状态码获取默认错误代码
 * @param {number} statusCode - HTTP 状态码
 * @returns {string} 错误代码
 */
function getDefaultCode(statusCode: number): string {
  const codeMap: Record<number, string> = {
    [HttpStatus.BadRequest]: 'BAD_REQUEST',
    [HttpStatus.Unauthorized]: 'UNAUTHORIZED',
    [HttpStatus.Forbidden]: 'FORBIDDEN',
    [HttpStatus.NotFound]: 'NOT_FOUND',
    [HttpStatus.Conflict]: 'CONFLICT',
    [HttpStatus.ValidationError]: 'VALIDATION_ERROR',
    [HttpStatus.TooManyRequests]: 'TOO_MANY_REQUESTS',
    [HttpStatus.InternalServerError]: 'INTERNAL_SERVER_ERROR',
    [HttpStatus.ServiceUnavailable]: 'SERVICE_UNAVAILABLE',
  };

  return codeMap[statusCode] || 'UNKNOWN_ERROR';
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = err;

  // 如果不是操作错误，转换为通用错误
  if (!(error instanceof AppError)) {
    const statusCode = 500;
    const message = '服务器内部错误';
    error = new AppError(message, statusCode);
  }

  const appError = error as AppError;

  // 记录错误
  logger.error({
    message: appError.message,
    statusCode: appError.statusCode,
    stack: appError.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // 响应错误
  res.status(appError.statusCode).json({
    error: {
      message: appError.message,
      code: appError.statusCode,
      success: false,
      ...(process.env.NODE_ENV === 'development' && { stack: appError.stack }),
    },
  });
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`路径 ${req.originalUrl} 不存在`);
  next(error);
};

// ==============================
// 特定错误类型（继承自 AppError）
// ==============================

/**
 * 认证错误
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权访问') {
    super(message, HttpStatus.Unauthorized, getDefaultCode(HttpStatus.Unauthorized));
  }
}

/**
 * 权限不足
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '禁止访问') {
    super(message, HttpStatus.Forbidden, getDefaultCode(HttpStatus.Forbidden));
  }
}

/**
 * 资源未找到
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource}不存在`, HttpStatus.NotFound, getDefaultCode(HttpStatus.NotFound));
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, HttpStatus.ValidationError, getDefaultCode(HttpStatus.ValidationError));
  }
}
