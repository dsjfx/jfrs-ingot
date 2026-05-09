// import path from 'path';
import { Sequelize } from 'sequelize-typescript';
import config from './index';
import logger from '@/utils/logger';

class Database {
  private static instance: Sequelize;

  static getInstance(): Sequelize {
    if (!Database.instance) {
      Database.instance = Database.createInstance();
    }
    return Database.instance;
  }

  public static createInstance(): Sequelize {
    // const sequelize = new Sequelize('mysql://root:password@localhost:3306/testdb');
    const sequelize = new Sequelize({
      database: config.database.name,
      username: config.database.user,
      password: config.database.password,
      host: config.database.host,
      port: config.database.port,
      dialect: config.database.dialect,

      // 自动加载模型
      // models: [path.join(__dirname, '../models')],

      // 模型匹配规则
      modelMatch: (filename, member) => {
        return filename.substring(0, filename.indexOf('.model')) === member.toLowerCase();
      },

      // 日志配置
      logging: (sql: string, timing?: number) => {
        // 开发环境：详细日志
        if (config.env === 'development') {
          console.log(`${formatDate()} [SQL] ${sql}`); // eslint-disable-line no-console
          if (timing) console.log(`[TIME] ${timing}ms`); // eslint-disable-line no-console
        }

        // 生产环境：慢查询监控
        if (config.env === 'production') {
          const SLOW_QUERY_THRESHOLD = 1000; // 1秒

          if (timing && timing > SLOW_QUERY_THRESHOLD) {
            logger.warn(`慢查询警告 (${timing}ms): ${sql}`);
          }
        }

        // 测试环境：完全静默
        if (config.env === 'test') {
          // 不输出任何日志
        }
      },

      // 开发环境启用基准测试
      benchmark: config.env === 'development',

      // 连接池优化
      pool: {
        max: config.env === 'production' ? 10 : 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },

      // 全局模型配置
      define: {
        timestamps: true,
        paranoid: true,
        underscored: true,
        freezeTableName: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      },

      // 时区设置
      timezone: '+08:00',

      // 查询配置
      query: {
        raw: false,
      },

      // 仓库模式
      repositoryMode: false,
    });
    return sequelize;
  }

  static async testConnection(): Promise<void> {
    try {
      await Database.instance.authenticate();
      logger.info('✅ 测试：数据库连接成功');
    } catch (error) {
      logger.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }

  static async syncModels(alter: boolean = false): Promise<void> {
    if (config.env === 'development' || config.env === 'test') {
      await Database.instance.sync({ alter });
      logger.info('📦 数据库模型同步完成');
    }
  }
}

function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const sequelize = Database.getInstance();

// 测试连接
export const testDB = Database.testConnection;

// 同步模块
export const syncDB = Database.syncModels;

export default sequelize;
