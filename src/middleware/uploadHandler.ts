import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Request, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from './errorHandler';

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// 文件过滤器
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`不支持的文件类型: ${file.mimetype}`, 400));
  }
};

// 创建 multer 实例
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10, // 最多10个文件
  },
  fileFilter,
});

// 单个文件上传中间件
export const uploadSingle = (fieldName: string = 'file'): RequestHandler => {
  return upload.single(fieldName) as RequestHandler;
};

// 多个文件上传中间件
export const uploadMultiple = (
  fieldName: string = 'files',
  maxCount: number = 10
): RequestHandler => {
  return upload.array(fieldName, maxCount) as RequestHandler;
};

// 多字段文件上传中间件
export const uploadFields = (fields: { name: string; maxCount: number }[]): RequestHandler => {
  return upload.fields(fields) as RequestHandler;
};
