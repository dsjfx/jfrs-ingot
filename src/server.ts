import init from './init';
init();
import app from './app';
import { sequelize } from './models';
import { validateEnv } from './config';
import logger from './utils/logger';
import { registerServices } from './utils/redisUtil';

// 应用启动时第一时间验证
validateEnv();

async function bootstrap() {
  try {
    registerServices();

    // 数据库连接测试
    await sequelize.authenticate();
    logger.info('✅ 数据库连接成功');

    // 同步数据库模型
    if (process.env.NODE_ENV === 'development') {
      // 只在需要时手动同步，而不是每次启动
      if (process.env.SYNC_DB === 'true') {
        await sequelize.sync({ alter: true });
        logger.info('📦 数据库模型同步完成');
      } else {
        logger.info('⏭️ 跳过数据库同步');
      }
    }

    // 启动服务器
    const port = process.env.PORT || 6060;
    const server = app.listen(port, () => {
      logger.info(`
      🚀 服务器启动成功！
      🔗 地址: http://localhost:${port}
      🌍 环境: ${process.env.NODE_ENV}
      🗄️  数据库: ${process.env.DB_NAME}
      `);
    });

    // 优雅关闭
    const gracefulShutdown = (signal: string): void => {
      logger.info(`收到 ${signal} 信号，开始关闭服务器...`);

      server.close(async () => {
        logger.info('HTTP服务器已关闭');

        try {
          await sequelize.close();
          logger.info('数据库连接已关闭');
          process.exit(0);
        } catch (error) {
          logger.error('关闭数据库连接时出错:', error);
          process.exit(1);
        }
      });

      // 如果10秒后还没关闭，强制退出
      setTimeout(() => {
        logger.error('强制关闭服务器...');
        process.exit(1);
      }, 10000);
    };

    // 监听关闭信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', error => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  logger.error('未处理的Promise拒绝:', reason);
});

bootstrap();
