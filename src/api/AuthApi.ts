import { Request, Response, NextFunction } from 'express';
import AuthService from '@/services/AuthService';
import tokenService from '@/services/TokenService';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '@/core/AuthValidator';
import { ResponseFactory } from '@/utils/ResponseFactory';
import { AppError } from '@/middleware/errorHandler';

class AuthApi {
  /**
   * 用户注册
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 验证请求数据
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // 调用服务
      const result = await AuthService.register(value);

      // 返回响应
      res.json(ResponseFactory.success(result, '注册成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 用户登录
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 验证请求数据
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // 调用服务
      const result = await AuthService.login(value);

      // 设置 cookie（如果需要）
      if (value.rememberMe) {
        res.cookie('token', result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
        });
      }

      res.json(ResponseFactory.success(result, '登录成功'));
    } catch (error) {
      next(error);
    }
  }

  async getUserAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 从请求中获取用户ID（由认证中间件设置）
      const userId = parseInt(req.query.id as string, 10);
      if (!userId) {
        throw new AppError('未认证', 401);
      }

      let avatar = null;

      // 调用服务
      const user = await AuthService.getUserProfile(userId);
      if (user && user.avatar) {
        avatar = user.avatar;
      }

      res.json(ResponseFactory.success({ avatar }, '获取用户头像成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取当前用户信息
   */
  async getSimpleProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 从请求中获取用户ID（由认证中间件设置）
      const userId = parseInt(req.query.id as string, 10);
      if (!userId) {
        throw new AppError('未认证', 401);
      }

      // 调用服务
      const user = await AuthService.getUserProfile(userId);

      res.json(ResponseFactory.success(user, '获取用户信息成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取当前用户信息
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 从请求中获取用户ID（由认证中间件设置）
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AppError('未认证', 401);
      }

      // 调用服务
      const user = await AuthService.getUserProfile(userId);

      res.json(ResponseFactory.success(user, '获取用户信息成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新个人信息
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 验证请求数据
      const { error, value } = updateProfileSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // 从请求中获取用户ID
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AppError('未认证', 401);
      }

      // 调用服务
      const user = await AuthService.updateProfile(userId, value);

      // 返回响应
      res.json(ResponseFactory.success(user, '个人信息更新成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 验证请求数据
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // 从请求中获取用户ID
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AppError('未认证', 401);
      }

      // 调用服务
      await AuthService.changePassword(userId, value.oldPassword, value.newPassword);

      // 返回响应
      // res.json({
      //   success: true,
      //   message: '密码修改成功'
      // });
      res.json(ResponseFactory.success(1, '密码修改成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 退出登录
   */
  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 清除 cookie
      res.clearCookie('token');
      // // 删除数据库中的 Refresh Token
      // await deleteRefreshToken(req.user.sub)

      // 返回响应
      res.json(ResponseFactory.success(1, '退出登录成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 刷新 token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      ResponseFactory.error('请提供刷新令牌', 401);
    }

    try {
      const response = tokenService.refreshAccessToken(refreshToken);

      // 返回响应
      res.json(ResponseFactory.success(response, 'token刷新成功'));
    } catch (error) {
      next(error);
    }
  }
}

export default AuthApi;
