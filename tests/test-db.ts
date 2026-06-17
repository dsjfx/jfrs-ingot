/* eslint-disable no-console */
import sequelize from '../src/config/database';
import { User } from '../src/models';

async function test() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 测试模型是否可用
    const users = await User.findAll();
    console.log(`✅ 模型正常，用户数: ${users.length}`);
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

test();
