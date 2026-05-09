import fs from 'fs';
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志级别定义
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志级别对应的颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 添加颜色到 winston
winston.addColors(colors);

// 日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }), // 记录错误堆栈
  winston.format.splat(), // 支持字符串插值
  winston.format.json() // JSON 格式
);

// 控制台输出格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }), // 彩色输出
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? `\n${info.stack}` : ''}`
  )
);

const transports = [
  // 控制台输出（仅开发环境）
  ...(process.env.NODE_ENV === 'development'
    ? [
        new winston.transports.Console({
          format: consoleFormat,
        }),
      ]
    : []),

  // 错误日志文件（按天轮转）
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d', // 保留14天
    level: 'error',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  }),

  // 所有日志文件（按天轮转）
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d', // 保留30天
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  }),

  // HTTP 请求日志
  new DailyRotateFile({
    filename: path.join(logDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d', // 保留7天
    level: 'http',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  defaultMeta: { service: 'blog-backend' },
  transports,
  // 处理未捕获的异常
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],

  // 处理未处理的 Promise 拒绝
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],

  exitOnError: false, // 不要因日志错误而退出进程
});

// 如果是生产环境，添加 Sentry 或其他监控服务（可选）
if (process.env.NODE_ENV === 'production') {
  // 这里可以添加 Sentry、Loggly、Datadog 等日志服务集成
  logger.info('生产环境日志系统已初始化');
}

// 创建流对象，用于 Morgan 等中间件
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// 日志工具类
export class Logger {
  /**
   * 记录错误日志
   */
  static error(message: string, meta?: any): void {
    logger.error(message, meta);
  }

  /**
   * 记录警告日志
   */
  static warn(message: string, meta?: any): void {
    logger.warn(message, meta);
  }

  /**
   * 记录信息日志
   */
  static info(message: string, meta?: any): void {
    logger.info(message, meta);
  }

  /**
   * 记录 HTTP 请求日志
   */
  static http(message: string, meta?: any): void {
    logger.http(message, meta);
  }

  /**
   * 记录调试日志
   */
  static debug(message: string, meta?: any): void {
    logger.debug(message, meta);
  }

  /**
   * 记录数据库查询日志
   */
  static sql(query: string, duration?: number, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`SQL: ${query} ${duration ? `(${duration}ms)` : ''}`, meta);
    }
  }

  /**
   * 记录 API 请求日志
   */
  static apiRequest(req: any, res: any, responseTime?: number): void {
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous',
      statusCode: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      requestBody: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      queryParams: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
    };

    // 根据状态码决定日志级别
    if (res.statusCode >= 500) {
      logger.error('API Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('API Warning', logData);
    } else {
      logger.http('API Request', logData);
    }
  }

  /**
   * 记录业务操作日志
   */
  static business(operation: string, userId: number, details: any): void {
    logger.info(`Business Operation: ${operation}`, {
      userId,
      operation,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 记录审计日志（重要操作）
   */
  static audit(action: string, userId: number, resource: string, details: any): void {
    logger.info(`Audit Log: ${action}`, {
      userId,
      action,
      resource,
      details,
      ip: '127.0.0.1', // 实际使用时可以从 req 中获取
      userAgent: 'system', // 实际使用时可以从 req 中获取
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 记录性能日志
   */
  static performance(operation: string, duration: number, meta?: any): void {
    logger.info(`Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...meta,
    });
  }

  /**
   * 创建子日志记录器（用于模块特定的日志）
   */
  static createChildLogger(moduleName: string): winston.Logger {
    return logger.child({ module: moduleName });
  }
}

// 导出默认的 Winston logger
export default logger;
