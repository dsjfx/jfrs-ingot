// import init from '../src/init';
// init();
import mysql from 'mysql2/promise';
import config from '../src/config';
import logger from '../src/utils/logger';

async function createDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
    });

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database.name}\` 
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    logger.info(`✅ 数据库 ${config.database.name} 创建成功`);
    await connection.end();
  } catch (error) {
    logger.error('❌ 创建数据库失败:', error);
    process.exit(1);
  }
}

createDatabase();
