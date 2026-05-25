import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { AppError } from './errorHandler';
import { AuthRequest } from '../types';
import { tokenConfig } from '../config/auth';
import { TokenPayload } from '../types/auth';

/**
 * 认证中间件 - 验证 JWT Token
 */
export const authenticateToken: RequestHandler = async (req, _res, next) => {
  try {
    // // 白名单：不需要验证的接口
    // const whiteList = [
    //   '/jdmk/auth/login',
    //   '/jdmk/auth/register',
    //   '/jdmk/auth/logout',
    //   '/jdmk/auth/refresh-token',
    // ];
    // const url = `${req.baseUrl}${req.path}`;

    // if (whiteList.includes(url)) {
    //   return next();
    // }
    // 从多个地方获取 token
    const token = extractToken(req);

    if (!token) {
      throw new AppError('未提供认证令牌', 401);
    }

    // 验证 token
    const decoded = jwt.verify(token, tokenConfig.accessToken.secret) as TokenPayload;

    // 将用户信息附加到请求对象
    req.user = {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
      jti: decoded.jti,
    };

    logger.debug(`用户认证成功: ${decoded.username} (ID: ${decoded.sub})`);

    next();
  } catch (error) {
    console.log(error)
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token 已过期');
      next(new AppError('认证令牌已过期，请重新登录', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('无效的 Token');
      next(new AppError('无效的认证令牌', 401));
    } else {
      logger.error('认证失败:', error);
      next(error);
    }
  }
};

/**
 * 授权中间件 - 检查用户角色
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!(req as AuthRequest).user) {
      return next(new AppError('未认证的用户', 401));
    }

    if (!allowedRoles.includes(req.user!.role)) {
      logger.warn(
        `用户 ${req.user!.username} (角色: ${req.user!.role}) 尝试访问需要 ${allowedRoles.join(', ')} 角色的资源`
      );
      return next(new AppError('没有权限访问该资源', 403));
    }

    next();
  };
};

/**
 * 可选认证中间件 - 不强制要求认证
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = jwt.verify(token, tokenConfig.accessToken.secret) as {
        id: number;
        username: string;
        email: string;
        role: string;
      };

      req.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
      };

      logger.debug(`可选认证成功: ${decoded.username}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // 静默失败，不阻止请求
    logger.debug('可选认证失败，继续处理请求');
  }

  next();
};

/**
 * 提取 token 的辅助函数
 */
const extractToken = (req: Request): string | null => {
  // 1. 从 Authorization header 获取
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. 从 query string 获取
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  // 3. 从 cookies 获取
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
};

/**
 * 检查资源所有权中间件
 */
export const checkOwnership = (modelName: string, idParam: string = 'id') => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(req as AuthRequest).user) {
        return next(new AppError('未认证的用户', 401));
      }

      // 如果是管理员，跳过所有权检查
      if (req.user!.role === 'admin') {
        return next();
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const model = require(`../models/${modelName}`).default;
      const resourceId = parseInt(req.params[idParam] as string, 10);

      const resource = await model.findByPk(resourceId);

      if (!resource) {
        return next(new AppError('资源不存在', 404));
      }

      // 检查资源是否属于当前用户
      // 注意：这里假设资源有 userId 或 authorId 字段
      const ownerId = (resource as any).userId || (resource as any).authorId;

      if (ownerId !== req.user!.id) {
        logger.warn(`用户 ${req.user!.id} 尝试访问不属于自己的 ${modelName} (ID: ${resourceId})`);
        return next(new AppError('只能访问自己的资源', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 限流中间件（简单实现）
 */
export const rateLimit = (
  windowMs: number = 15 * 60 * 1000, // 15分钟
  maxRequests: number = 100
) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = (req as AuthRequest).user ? `user:${req.user!.id}` : `ip:${req.ip}`;
    const now = Date.now();

    let record = requests.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
    }

    record.count++;
    requests.set(key, record);

    // 设置响应头
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      logger.warn(`用户/IP ${key} 触发速率限制`);
      return next(new AppError('请求过于频繁，请稍后再试', 429));
    }

    next();
  };
};
