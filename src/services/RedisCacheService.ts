import { createClient, RedisClientType } from 'redis';
import { Service } from '../core/DIContainer';
import logger from '../utils/logger';

export interface CacheService {
  /**
   * get cache data
   */
  get(key: string): Promise<string | null>;

  /**
   * set cache data
   */
  set(key: string, value: string, expiresIn?: number): Promise<void>;

  /**
   * delete cache data
   */
  del(key: string): Promise<void>;
}

@Service('RedisCache')
export class RedisCache implements CacheService {
  private client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', err => {
      logger.error('Redis Client Error:', err);
    });

    this.connect();
  }

  private async connect() {
    try {
      await this.client.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, expiresIn?: number): Promise<void> {
    if (expiresIn) {
      await this.client.setEx(key, expiresIn, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
