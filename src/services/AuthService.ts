import bcrypt from 'bcryptjs';
import { Op } from '../models';
import User from '../models/User';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import tokenService from './TokenService';
import {
  LoginResponse,
  RegisterResponse,
  UserLogin,
  UserProfile,
  UserRegister,
} from '@/types/user';

class AuthService {
  /**
   * 用户注册
   */
  async register(data: UserRegister): Promise<RegisterResponse> {
    const transaction = await User.sequelize!.transaction();

    try {
      // 1. 检查用户名是否已存在
      const existingUsername = await User.findOne({
        where: { username: data.username },
        transaction,
      });

      if (existingUsername) {
        throw new AppError('用户名已被使用', 400);
      }

      // 2. 检查邮箱是否已存在
      const existingEmail = await User.findOne({
        where: { email: data.email },
        transaction,
      });

      if (existingEmail) {
        throw new AppError('邮箱已被注册', 400);
      }

      // 3. 密码加密
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // 4. 创建用户
      const user = await User.create(
        {
          username: data.username,
          nickname: data.nickname,
          email: data.email,
          password: hashedPassword,
          role: data.role || 'visitor',
          avatar: data.avatar,
        },
        { transaction }
      );

      // // 5. 生成 token
      // const token = this.generateToken(user);
      // const expiresIn = this.getTokenExpiration();

      // 6. 记录日志
      logger.info(`用户注册成功: ${user.username} (ID: ${user.id})`);

      // 7. 提交事务
      await transaction.commit();

      // 8. 返回用户信息（不包含密码）
      return {
        userId: `${user.id}`,
        username: user.username,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      // 回滚事务
      await transaction.rollback();

      if (error instanceof AppError) {
        throw error;
      }

      logger.error('用户注册失败:', error);
      throw new AppError('注册失败，请稍后重试', 500);
    }
  }

  /**
   * 用户登录
   */
  async login(data: UserLogin): Promise<LoginResponse> {
    try {
      // 1. 查找用户
      const user = await User.findOne({
        where: {
          [Op.or]: [{ username: data.username }, { email: data.username }],
          // status: 'active',
        },
        paranoid: false,
      });

      if (!user) {
        throw new AppError('用户名或密码错误', 401);
      }

      if (user.status != 'active') {
        if (user.status === 'pending') {
          throw new AppError('用户还未通过审核，请稍后', 401);
        }
      }

      // 2. 验证密码
      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        throw new AppError('用户名或密码错误', 401);
      }

      // 3. 生成 token
      const loginResponse = await tokenService.generateLoginResponse(user, data.appType);

      // 4. 记录日志
      logger.info(`用户登录成功: ${user.username} (ID: ${user.id})`);

      // 5. 返回用户信息
      return loginResponse;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('用户登录失败:', error);
      throw new AppError('登录失败，请稍后重试', 500);
    }
  }

  /**
   * 获取用户信息
   */
  async getUserProfile(userId: number): Promise<UserProfile> {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] },
        include: [
          {
            association: 'blogs',
            limit: 5,
            order: [['createdAt', 'DESC']],
          },
        ],
      });

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      const profile: UserProfile = {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        gender: user.gender,
        birthday: user.birthday,
        bio: user.bio,
        location: user.location,
        hobbies: user.hobbies,
        github: user.github,
        weibo: user.weibo,
        zhihu: user.zhihu,
        website: user.website,
        motto: user.motto,
        job: user.job,
      };

      return profile;
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  async updateProfile(userId: number, data: any): Promise<UserProfile> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      // 检查用户名是否已被使用
      if (data.nickname && data.nickname !== user.nickname) {
        const existingUser = await User.findOne({
          where: { nickname: data.nickname },
        });
        if (existingUser) {
          throw new AppError('用户名已被使用', 400);
        }
      }

      // 检查邮箱是否已被使用
      if (data.email && data.email !== user.email) {
        const existingUser = await User.findOne({
          where: { email: data.email },
        });
        if (existingUser) {
          throw new AppError('邮箱已被注册', 400);
        }
      }

      // 检查手机号是否已被使用
      if (data.phone && data.phone !== user.phone) {
        const existingUser = await User.findOne({
          where: { phone: data.phone },
        });
        if (existingUser) {
          throw new AppError('手机号已被使用', 400);
        }
      }

      // 如果要修改密码，验证原密码
      // if (data.password) {
      //   const isValidPassword = await bcrypt.compare(data.oldPassword, user.password);
      //   if (!isValidPassword) {
      //     throw new AppError('原密码错误', 400);
      //   }
      //   data.password = await bcrypt.hash(data.password, 10);
      // }

      // 更新用户信息
      await user.update({
        nickname: data.nickname || user.nickname,
        email: data.email || user.email,
        // password: data.password || user.password,
        avatar: data.avatar || user.avatar,
        phone: data.phone || user.phone,
        gender: data.gender || user.gender,
        birthday: data.birthday || user.birthday,
        bio: data.bio || user.bio,
        location: data.location || user.location,
        hobbies: data.hobbies || user.hobbies,
        github: data.github || user.github,
        weibo: data.weibo || user.weibo,
        zhihu: data.zhihu || user.zhihu,
        website: data.website || user.website,
        motto: data.motto || user.motto,
        job: data.job || user.job,
      });

      logger.info(`用户信息更新成功: ${user.username} (ID: ${user.id})`);

      // 返回更新后的用户信息（不包含密码）
      // return {
      //   id: user.id,
      //   username: user.username,
      //   nickname: user.nickname,
      //   email: user.email,
      //   role: user.role,
      //   avatar: user.avatar,
      //   createdAt: user.createdAt,
      //   updatedAt: user.updatedAt,
      // };
      return user.getProfile();
    } catch (error) {
      logger.error('更新用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        throw new AppError('原密码错误', 400);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      logger.info(`用户密码修改成功: ${user.username} (ID: ${user.id})`);
    } catch (error) {
      logger.error('修改密码失败:', error);
      throw error;
    }
  }

  // /**
  //  * 获取用户权限（示例）
  //  */
  // private getUserPermissions(userId: string): string[] {
  //   // 从数据库获取权限
  //   const permissions = {
  //     '1': ['*'],  // admin
  //     '2': ['post:view', 'post:create', 'comment:create'], // user
  //     '3': ['post:view', 'post:create', 'post:edit', 'comment:manage'] // editor
  //   };
  //   return permissions[userId] || [];
  // }
}

export default new AuthService();
