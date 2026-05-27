import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import PhotoService from '../services/PhotoService';
import { AppError } from '../middleware/errorHandler';
import { ResponseFactory } from '../utils/ResponseFactory';
import { Album } from '@/types/photo';
import Constance from '@/utils/Constance';

class PhotoApi {
  static querySchema = Joi.object({
    current: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('draft', 'published', 'archived').empty('').optional(),
    subject: Joi.string().valid('article', 'photo').optional().allow(''),
    categoryId: Joi.number().integer().positive().empty('').optional(),
    tagId: Joi.number().integer().positive().optional(),
    authorId: Joi.number().integer().positive().optional(),
    search: Joi.string().max(100).empty('').optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'views', 'title').default('createdAt'),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC'),
  }).unknown(true);

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

  /**
   * 获取博客详情（包含照片）
   */
  async getBlogWithPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的博客ID', 400);
      }

      const blog = await PhotoService.getBlogWithPhotos(id);

      res.json(ResponseFactory.success(blog, '查询博客详情成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取博客列表并同时加载照片
   */
  async getBlogsWithPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 验证查询参数
      const { error, value } = PhotoApi.querySchema.validate(req.query);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const { current, size, ...filters } = value;

      const { blogs, total } = await PhotoService.getBlogsWithPhotos({
        current,
        size,
        filters,
      });

      res.json(ResponseFactory.page(blogs, { current, size, total }, '博客数据查询成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 根据标签分组查询所有照片
   */
  async groupPhotosByTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 10;
      const sortBy = (req.query.sortBy as string) || 'name';
      const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC';
      const status = (req.query.status as string) || 'published';
      const search = req.query.search as string;
      const subject = (req.query.subject as string) || Constance.DEFAULT_SUBJECT;

      let tagIds: number[] | undefined;
      let tagSlugs: string[] | undefined;

      if (req.query.tagIds) {
        tagIds = (req.query.tagIds as string).split(',').map(id => parseInt(id, 10));
      }
      if (req.query.tagSlugs) {
        tagSlugs = (req.query.tagSlugs as string).split(',');
      }

      const { records, total, safeSize } = await PhotoService.groupPhotosByTag({
        current,
        size,
        sortBy,
        sortOrder,
        ids: tagIds,
        slugs: tagSlugs,
        search,
        status,
        subject,
      });

      res.json(
        ResponseFactory.page(records, { total, current, size: safeSize }, `成功获取标签分组的照片`)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 根据分类分组查询所有照片
   */
  async groupPhotosByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 10;
      const sortBy = (req.query.sortBy as string) || 'name';
      const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC';
      const status = (req.query.status as string) || 'published';
      const search = req.query.search as string;
      const subject = (req.query.subject as string) || Constance.DEFAULT_SUBJECT;

      let categoryIds: number[] | undefined;
      let categorySlugs: string[] | undefined;

      if (req.query.categoryIds) {
        categoryIds = (req.query.categoryIds as string).split(',').map(id => parseInt(id, 10));
      }
      if (req.query.categorySlugs) {
        categorySlugs = (req.query.categorySlugs as string).split(',');
      }

      const { records, total, safeSize } = await PhotoService.groupPhotosByCategory({
        current,
        size,
        sortBy,
        sortOrder,
        ids: categoryIds,
        slugs: categorySlugs,
        search,
        status,
        subject,
      });

      res.json(
        ResponseFactory.page(records, { total, current, size: safeSize }, `成功获取分类分组的照片`)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取标签下的所有照片
   */
  async getPhotosByTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tagId = parseInt(req.params.tagId as string, 10);
      if (isNaN(tagId)) {
        throw new AppError('无效的标签ID', 400);
      }

      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 20;
      const status = (req.query.status as string) || 'published';
      const subject = (req.query.subject as string) || Constance.DEFAULT_SUBJECT;

      const { photos, total, tag } = await PhotoService.getPhotosByTag(tagId, {
        current,
        size,
        status,
        subject,
      });

      if (!tag) {
        throw new AppError('标签不存在', 404);
      }
      const firstPhoto = photos[0] || { url: '', thumbnailUrl: '' };
      const data: Album = {
        id: tag.id,
        name: tag.name,
        description: tag.description || '暂无描述',
        coverUrl: firstPhoto.url,
        coverThumbnail: firstPhoto.thumbnailUrl,
        isPublic: true,
        photos: photos,
        photoCount: photos.length,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      };
      res.json(ResponseFactory.pageAlbum(data, { current, size, total }, '成功获取标签下的照片'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取分类下的所有照片
   */
  async getPhotosByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = parseInt(req.params.categoryId as string, 10);
      if (isNaN(categoryId)) {
        throw new AppError('无效的分类ID', 400);
      }

      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 20;
      const status = (req.query.status as string) || 'published';
      const subject = (req.query.subject as string) || Constance.DEFAULT_SUBJECT;

      const { photos, total, category } = await PhotoService.getPhotosByCategory(categoryId, {
        current,
        size,
        status,
        subject,
      });

      if (!category) {
        throw new AppError('分类不存在', 404);
      }
      const firstPhoto = photos[0] || { url: '', thumbnailUrl: '' };
      const data: Album = {
        id: category.id,
        name: category.name,
        description: category.description || '暂无描述',
        coverUrl: firstPhoto.url,
        coverThumbnail: firstPhoto.thumbnailUrl,
        isPublic: true,
        photos: photos,
        photoCount: photos.length,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      };
      res.json(ResponseFactory.pageAlbum(data, { current, size, total }, '成功获取分类下的照片'));
    } catch (error) {
      next(error);
    }
  }
}

export default PhotoApi;
