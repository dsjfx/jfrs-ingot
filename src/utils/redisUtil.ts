import { container } from '../core/DIContainer';
import { RedisCache } from '../services/RedisCacheService';
import logger from '../utils/logger';

// 注册服务
export function registerServices() {
  logger.info('Registering services...');

  // 注册 RedisCache 服务
  container.registerSingleton('RedisCache', RedisCache);

  logger.info('✓ RedisCache registered');
}

// 过期时间
export const expiresIn: number = 300; // 5分钟

// 验证码前缀
export const PRE_CAPTCHA = 'captcha:';

export const PRE_REFRESH_TOKEN = 'refresh:';

export default {
  registerServices,
  expiresIn,
  PRE_CAPTCHA,
};
