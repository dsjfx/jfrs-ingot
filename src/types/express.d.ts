/* eslint-disable prettier/prettier */
import 'express';
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

/**
 * Express 类型扩展
 */

// 扩展 Express 的 Request 接口
declare global {
  namespace Express {
    interface Request {
      // 用户信息（通过 JWT 认证后添加）
      user?: {
        id: number;
        username: string;
        email: string;
        role: 'admin' | 'author' | 'user' | 'visitor'
      }
      | JwtPayload;

      // 请求 ID（日志中间件添加）
      requestId?: string;

      // 原始请求体（用于签名验证等）
      rawBody?: string;

      // 文件上传
      file?: Express.Multer.File;
      files?: Express.Multer.File[];
    }

    // 扩展 Response 接口
    interface Response {
      // 自定义响应方法
      apiSuccess: <T = any>(data: T, message?: string) => void;
      apiError: (error: Error | string, statusCode?: number) => void;
      apiValidationError: (errors: ValidationError[]) => void;
    }
  }
}

// 验证错误类型
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// 用户类型
export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// 认证请求类型
export interface AuthRequest extends Request {
  user: AuthenticatedUser;
}

// 文件上传请求
export interface FileUploadRequest extends Request {
  file: Express.Multer.File;
}

// 批量上传请求
export interface BulkUploadRequest extends Request {
  files: Express.Multer.File[];
}

export { };
