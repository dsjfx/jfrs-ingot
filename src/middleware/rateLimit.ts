import rateLimit from 'express-rate-limit';
import { AppError } from './errorHandler';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

export const rLimit = (options: RateLimitOptions = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 默认15分钟
    max = 100, // 默认100次
    message = '请求过于频繁，请稍后再试',
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res) => {
      throw new AppError(message, 429);
    },
  });
};
