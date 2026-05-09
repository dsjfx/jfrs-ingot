import { Request, Response, NextFunction } from 'express';
import PhotoService from '../services/PhotoService';
import { AppError } from '../middleware/errorHandler';
import { ResponseFactory } from '@/utils/ResponseFactory';

class PhotoApi {
  /**
   * 获取博客的所有照片
   */
  async getPhotosByBlogId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blogId = parseInt(req.params.blogId as string, 10);
      if (isNaN(blogId)) {
        throw new AppError('无效的博客ID', 400);
      }

      const photos = await PhotoService.getPhotosByBlogId(blogId);

      res.json(ResponseFactory.success(photos, '获取照片成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取博客的封面图
   */
  async getCoverPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blogId = parseInt(req.params.blogId as string, 10);
      if (isNaN(blogId)) {
        throw new AppError('无效的博客ID', 400);
      }

      const coverPhoto = await PhotoService.getCoverPhoto(blogId);

      res.json(ResponseFactory.success(coverPhoto, '获取封面图成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 设置封面图
   */
  async setCoverPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const photoId = parseInt(req.params.photoId as string, 10);
      const { blogId } = req.body;

      if (isNaN(photoId)) {
        throw new AppError('无效的照片ID', 400);
      }

      const photo = await PhotoService.setCoverPhoto(photoId, blogId);

      res.json(ResponseFactory.success(photo, '设置封面图成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新照片信息
   */
  async updatePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const photoId = parseInt(req.params.photoId as string, 10);
      const { blogId, description, tags, sortOrder } = req.body;

      if (isNaN(photoId)) {
        throw new AppError('无效的照片ID', 400);
      }

      const photo = await PhotoService.updatePhoto(photoId, blogId, {
        description,
        tags,
        sortOrder,
      });

      res.json(ResponseFactory.success(photo, '照片更新成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除照片
   */
  async deletePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const photoId = parseInt(req.params.photoId as string, 10);
      const { blogId } = req.body;

      if (isNaN(photoId)) {
        throw new AppError('无效的照片ID', 400);
      }

      await PhotoService.deletePhoto(photoId, blogId);

      res.json(ResponseFactory.success(null, '照片删除成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量更新照片排序
   */
  async updatePhotosOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blogId = parseInt(req.params.blogId as string, 10);
      const { orders } = req.body;

      if (isNaN(blogId)) {
        throw new AppError('无效的博客ID', 400);
      }

      if (!Array.isArray(orders) || orders.length === 0) {
        throw new AppError('无效的排序数据', 400);
      }

      await PhotoService.updatePhotosOrder(blogId, orders);

      res.json(ResponseFactory.success(null, '照片排序更新成功'));
    } catch (error) {
      next(error);
    }
  }
}

export default PhotoApi;
