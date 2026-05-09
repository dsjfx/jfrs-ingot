import { Dialect } from 'sequelize';
import logger from '../utils/logger';

const config = {
  // 应用配置
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'Blog Backend API',

  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    name: process.env.DB_NAME || 'blog_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    dialect: (process.env.DB_DIALECT || 'mysql') as Dialect,
  },

  // 日志配置
  logLevel: process.env.LOG_LEVEL || 'info',

  // 速率限制
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15分钟
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};

// 验证环境变量
export function validateEnv() {
  // 定义必需的环境变量
  const requiredEnvVars = ['JWT_SECRET']; // 所有环境都需要

  // 生产环境需要数据库配置
  if (process.env.NODE_ENV === 'production') {
    requiredEnvVars.push('DB_HOST', 'DB_NAME');
  }

  // 检查缺失的变量
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  // 如果有缺失的变量
  if (missingEnvVars.length > 0) {
    const errorMessage = `❌ 缺少必需的环境变量: ${missingEnvVars.join(', ')}`;

    // 开发环境可以警告但不退出
    if (process.env.NODE_ENV === 'development') {
      logger.warn(errorMessage);
      logger.warn('⚠️ 开发模式：使用默认值继续运行');
    } else {
      logger.error(errorMessage);
      process.exit(1); // 生产环境直接退出
    }

    return false;
  }

  logger.info('✅ 所有必需的环境变量已配置');
  return true;
}

export default config;
