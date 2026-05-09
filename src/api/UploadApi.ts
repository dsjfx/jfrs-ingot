import path from 'path';
import { Request, Response, NextFunction } from 'express';
import UploadService from '../services/UploadService';
import { AppError } from '../middleware/errorHandler';
import { ResponseFactory } from '@/utils/ResponseFactory';

class UploadApi {
  /**
   * 上传单个文件
   */
  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('没有上传文件', 400);
      }

      const result = await UploadService.uploadFile(req.file, {
        // 可以在这里覆盖默认配置
        createThumbnail: true,
        compress: true,
      });

      // res.json({
      //   success: true,
      //   data: result,
      //   message: '文件上传成功',
      // });
      res.json(ResponseFactory.success(result, '文件上传成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 上传多个文件
   */
  async uploadFiles(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new AppError('没有上传文件', 400);
      }

      const results = await UploadService.uploadMultiple(req.files);

      // res.json({
      //   success: true,
      //   data: results,
      //   message: `成功上传 ${results.length} 个文件`
      // });
      res.json(ResponseFactory.success(results, `成功上传 ${results.length} 个文件`));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 上传头像（特定处理）
   */
  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('没有上传文件', 400);
      }

      // 头像特殊处理：强制压缩，固定尺寸
      const result = await UploadService.uploadFile(req.file, {
        destination: path.join(__dirname, '../../uploads/avatars'),
        maxSize: 2 * 1024 * 1024, // 2MB
        allowedTypes: ['image/jpeg', 'image/png'],
        createThumbnail: true,
        thumbnailSize: { width: 100, height: 100 },
        compress: true,
        quality: 90,
      });

      // res.json({
      //   success: true,
      //   data: result,
      //   message: '头像上传成功'
      // });
      res.json(ResponseFactory.success(result, '头像上传成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 上传Base64图片
   */
  async uploadBase64(req: Request, res: Response, next: NextFunction) {
    try {
      const { image, filename } = req.body;

      if (!image) {
        throw new AppError('没有提供图片数据', 400);
      }

      const result = await UploadService.uploadBase64Image(image, filename);

      // res.json({
      //   success: true,
      //   data: result,
      //   message: '图片上传成功'
      // });
      res.json(ResponseFactory.success(result, '图片上传成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename } = req.params;

      if (!filename) {
        throw new AppError('没有指定文件名', 400);
      }

      const success = await UploadService.deleteFile(filename as string);

      // res.json({
      //   success,
      //   message: success ? '文件删除成功' : '文件删除失败'
      // });
      res.json(ResponseFactory.success(filename, success ? '文件删除成功' : '文件删除失败'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename } = req.params;

      if (!filename) {
        throw new AppError('没有指定文件名', 400);
      }

      const info = await UploadService.getFileInfo(filename as string);

      if (!info.exists) {
        throw new AppError('文件不存在', 404);
      }

      // res.json({
      //   success: true,
      //   data: info,
      // });
      res.json(ResponseFactory.success(info, '获取文件信息成功'));
    } catch (error) {
      next(error);
    }
  }
}

export default UploadApi;
