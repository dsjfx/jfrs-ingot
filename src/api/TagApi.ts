import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import TagService from '../services/TagService';
import { AppError } from '../middleware/errorHandler';
// import { AuthRequest } from '../types';
import logger from '../utils/logger';
import { ResponseFactory } from '../utils/ResponseFactory';

class TagApi {
  // 验证模式
  static createSchema = Joi.object({
    name: Joi.string().min(1).max(30).required(),
    description: Joi.string().max(100).empty('').optional(),
  });

  static updateSchema = Joi.object({
    name: Joi.string().min(1).max(30).optional(),
    description: Joi.string().max(100).empty('').optional(),
  });

  static querySchema = Joi.object({
    current: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(30).empty('').optional(),
    sortBy: Joi.string().valid('name', 'blogCount', 'createdAt').default('name'),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('ASC'),
  }).unknown(true);

  static bulkCreateSchema = Joi.object({
    tags: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().min(1).max(30).required(),
          description: Joi.string().max(100).optional(),
        })
      )
      .min(1)
      .required(),
  });

  /**
   * 创建标签
   */
  async createTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tag = await TagService.createTag(req.body);

      logger.info(`标签创建成功: ${tag.name}`);

      res.json(ResponseFactory.success(tag, '标签创建成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取标签列表
   */
  async getTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 验证查询参数
      const { error, value } = TagApi.querySchema.validate(req.query);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const { current, size, ...filters } = value;

      const { tags, total } = await TagService.getTags(current, size, filters);

      res.json(ResponseFactory.page(tags, { current, size, total }, '标签查询成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取所有标签（不分页）
   */
  async getAllTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sortBy, sortOrder } = req.query;

      const tags = await TagService.getAllTags({
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
      });

      res.json(ResponseFactory.success(tags, '获取标签列表成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取标签详情
   */
  async getTagById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的标签ID', 400);
      }

      const tag = await TagService.getTagById(id);

      res.json(ResponseFactory.success(tag, '标签获取成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新标签
   */
  async updateTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的标签ID', 400);
      }

      const tag = await TagService.updateTag(id, req.body);

      logger.info(`标签更新成功: ${tag.name}`);

      res.json(ResponseFactory.success(tag, '标签更新成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的标签ID', 400);
      }

      await TagService.deleteTag(id);

      logger.info(`标签删除成功: ID=${id}`);

      res.json(ResponseFactory.success(id, '标签删除成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取标签的博客
   */
  async getTagBlogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的标签ID', 400);
      }

      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 10;

      const { blogs, total } = await TagService.getTagBlogs(id, current, size);

      res.json(ResponseFactory.page(blogs, { current, size, total }, '获取标签的博客成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取标签统计
   */
  async getTagStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;

      if (!userRole || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const stats = await TagService.getTagStats();

      res.json(ResponseFactory.success(stats));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 搜索标签
   */
  async searchTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 20;
      const keyword = req.query.keyword;

      if (!keyword || typeof keyword !== 'string') {
        throw new AppError('请提供搜索关键词', 400);
      }

      const { tags, total } = await TagService.searchTags(keyword as string, current, size);

      res.json(ResponseFactory.page(tags, { current, size, total }, '标签搜索成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取热门标签
   */
  async getPopularTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const size = parseInt(req.query.size as string, 10) || 20;

      const tags = await TagService.getPopularTags(size);

      res.json(ResponseFactory.success(tags));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量创建标签
   */
  async bulkCreateTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;

      if (!userRole || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const { tags } = req.body;

      if (!Array.isArray(tags) || tags.length === 0) {
        throw new AppError('请提供有效的标签数组', 400);
      }

      const createdTags = await TagService.bulkCreateTags(tags);

      res.json(ResponseFactory.success(createdTags, `成功创建 ${createdTags.length} 个标签`));
    } catch (error) {
      next(error);
    }
  }
}

export default TagApi;
