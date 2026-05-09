import * as svgCaptcha from 'svg-captcha';
// import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { Service, Autowired } from '../core/DIContainer';
import { CacheService } from './RedisCacheService';
import logger from '../utils/logger';
import { expiresIn, PRE_CAPTCHA } from '@/utils/redisUtil';

export interface CaptchaResponse {
  id: string;
  svg: string;
  expiresIn: number;
}

@Service('CaptchaService')
export class CaptchaService {
  // private redisClient: ReturnType<typeof createClient>;
  @Autowired('RedisCache')
  private redisCache!: CacheService;

  // private readonly expiresIn: number = 300; // 5分钟过期时间

  // constructor() {
  //   this.redisClient = createClient({
  //     url: process.env.REDIS_URL || 'redis://localhost:6379'
  //   });

  //   this.redisClient.on('error', (err) => {
  //     console.error('Redis Client Error', err);
  //   });

  //   this.connectRedis();
  // }

  // private async connectRedis() {
  //   try {
  //     await this.redisClient.connect();
  //     console.log('Redis connected successfully');
  //   } catch (error) {
  //     console.error('Failed to connect to Redis:', error);
  //   }
  // }

  /**
   * 生成新的验证码
   */
  async generateCaptcha(): Promise<CaptchaResponse> {
    // 生成验证码
    const captcha = svgCaptcha.create({
      size: 4, // 验证码长度
      noise: 2, // 干扰线条数
      color: true, // 是否使用彩色
      background: '#f0f0f0', // 背景色
      width: 120, // 宽度
      height: 40, // 高度
      fontSize: 45, // 字体大小
      charPreset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', // 字符集
    });

    // 生成唯一ID
    const captchaId = uuidv4();

    // 将验证码文本存储到Redis（转为小写不区分大小写）
    await this.redisCache.set(`${PRE_CAPTCHA}${captchaId}`, captcha.text.toLowerCase(), expiresIn);

    return {
      id: captchaId,
      svg: captcha.data,
      expiresIn: expiresIn,
    };
  }

  /**
   * 验证验证码
   */
  async validateCaptcha(id: string, userInput: string): Promise<boolean> {
    const key = `${PRE_CAPTCHA}${id}`;
    const storedText = await this.redisCache.get(key);

    if (!storedText) {
      return false; // 验证码已过期或不存在
    }

    // 验证后删除验证码（一次性使用）
    await this.redisCache.del(key);

    // 不区分大小写比较
    return storedText === userInput.toLowerCase();
  }

  /**
   * 刷新验证码（生成新的，使旧的失效）
   */
  async refreshCaptcha(oldCaptchaId: string): Promise<CaptchaResponse> {
    // 如果提供了旧验证码ID，尝试删除它
    if (oldCaptchaId) {
      try {
        await this.redisCache.del(`${PRE_CAPTCHA}${oldCaptchaId}`);
      } catch (error) {
        logger.error('Error deleting old captcha:', error);
      }
    }

    // 生成新的验证码
    return this.generateCaptcha();
  }
}
