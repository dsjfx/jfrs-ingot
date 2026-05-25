import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../types';

/**
 * 请求日志中间件
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = uuidv4();

  // 为请求添加唯一 ID
  req.headers['x-request-id'] = requestId;

  // 记录请求开始
  logger.http('Request started', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as AuthRequest).user?.id || 'anonymous',
  });

  // 在响应结束时记录完整信息
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any, callback?: any): any {
    const duration = Date.now() - startTime;

    // 记录请求完成
    logger.http('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0,
    });

    // 调用原始 end 方法
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

/**
 * 响应时间中间件
 */
export const responseTime = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // 记录慢请求
    if (duration > 1000) {
      // 超过1秒的请求
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        userId: (req as AuthRequest).user?.id || 'anonymous',
      });
    }
  });

  const originalJson = res.json;
  res.json = function (body) {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    return originalJson.call(this, body);
  };

  next();
};

/**
 * 错误日志中间件
 */
export const errorLogger = (err: Error, req: Request, _res: Response, next: NextFunction): void => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: (req as AuthRequest).user?.id || 'anonymous',
    requestId: req.headers['x-request-id'],
  });

  next(err);
};

/**
 * 数据库查询日志中间件（用于 Sequelize）
 */
export const sqlLogger = (sql: string, timing?: number): void => {
  if (timing && timing > 100) {
    // 超过100ms的查询
    logger.warn('Slow SQL query', {
      sql,
      duration: `${timing}ms`,
    });
  } else {
    logger.debug('SQL query', { sql, duration: timing ? `${timing}ms` : undefined });
  }
};
