import init from '../src/init';
init();
import mysql from 'mysql2/promise';
import config from '../src/config';
import logger from '../src/utils/logger';

async function dropDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
    });

    await connection.query(`DROP DATABASE IF EXISTS \`${config.database.name}\``);

    logger.info(`✅ 数据库 ${config.database.name} 删除成功`);
    await connection.end();
  } catch (error) {
    logger.error('❌ 删除数据库失败:', error);
    process.exit(1);
  }
}

dropDatabase();
