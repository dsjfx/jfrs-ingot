import logger, { Logger } from './logger';

/**
 * 日志工具函数
 */
export class LogHelpers {
  /**
   * 记录用户操作
   */
  static logUserAction(
    userId: number,
    action: string,
    resourceType: string,
    resourceId: number | string,
    details?: Record<string, any>
  ): void {
    Logger.audit(action, userId, `${resourceType}:${resourceId}`, {
      ...details,
      resourceType,
      resourceId,
    });
  }

  /**
   * 记录 API 调用
   */
  static logApiCall(
    method: string,
    endpoint: string,
    statusCode: number,
    userId?: number,
    duration?: number,
    error?: Error
  ): void {
    const logData = {
      method,
      endpoint,
      statusCode,
      userId: userId || 'anonymous',
      duration: duration ? `${duration}ms` : undefined,
      error: error ? { message: error.message, stack: error.stack } : undefined,
    };

    if (statusCode >= 500 || error) {
      logger.error('API Error', logData);
    } else if (statusCode >= 400) {
      logger.warn('API Warning', logData);
    } else {
      logger.http('API Call', logData);
    }
  }

  /**
   * 记录数据库操作
   */
  static logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    query?: string,
    userId?: number
  ): void {
    const logData = {
      operation,
      table,
      duration: `${duration}ms`,
      query,
      userId,
    };

    if (duration > 1000) {
      logger.warn('Slow database operation', logData);
    } else if (duration > 100) {
      logger.info('Database operation', logData);
    } else {
      logger.debug('Database operation', logData);
    }
  }

  /**
   * 记录系统事件
   */
  static logSystemEvent(
    event: string,
    level: 'info' | 'warn' | 'error' = 'info',
    details?: Record<string, any>
  ): void {
    const logData = {
      event,
      ...details,
    };

    switch (level) {
      case 'error':
        logger.error(`System Event: ${event}`, logData);
        break;
      case 'warn':
        logger.warn(`System Event: ${event}`, logData);
        break;
      default:
        logger.info(`System Event: ${event}`, logData);
    }
  }

  /**
   * 记录性能指标
   */
  static logPerformance(
    metric: string,
    value: number,
    unit: string = 'ms',
    tags?: Record<string, string>
  ): void {
    Logger.performance(metric, value, { unit, tags });
  }

  /**
   * 创建请求上下文日志
   */
  static createRequestContext(req: any) {
    return {
      requestId: req.headers['x-request-id'],
      userId: req.user?.id || 'anonymous',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      method: req.method,
      url: req.originalUrl || req.url,
    };
  }
}

/**
 * 日志装饰器（用于类方法）
 */
export function LogMethod(
  level: 'debug' | 'info' | 'warn' | 'error' = 'debug',
  logArgs: boolean = true,
  logResult: boolean = false,
  logDuration: boolean = true
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const className = target.constructor.name;

      try {
        // 记录方法调用
        if (logArgs) {
          logger[level](`${className}.${propertyKey} called`, {
            args: args.length > 0 ? args : undefined,
          });
        } else {
          logger[level](`${className}.${propertyKey} called`);
        }

        // 执行原始方法
        const result = await originalMethod.apply(this, args);

        const duration = Date.now() - startTime;

        // 记录方法完成
        const logData: any = {};
        if (logDuration) logData.duration = `${duration}ms`;
        if (logResult) logData.result = result;

        logger[level](`${className}.${propertyKey} completed`, logData);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // 记录方法错误
        logger.error(`${className}.${propertyKey} failed`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          duration: `${duration}ms`,
          args: logArgs ? args : undefined,
        });

        throw error;
      }
    };

    return descriptor;
  };
}
