import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import TagService from '../services/TagService';
import { AppError } from '../middleware/errorHandler';
// import { AuthRequest } from '../types';
import logger from '../utils/logger';
import { ResponseFactory } from '@/utils/ResponseFactory';

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
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
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

      // res.status(201).json({
      //   success: true,
      //   data: tag,
      //   message: '标签创建成功',
      // });
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

      const { page, limit, ...filters } = value;

      const result = await TagService.getTags(page, limit, filters);

      // res.json({
      //   success: true,
      //   data: {
      //     tags: result.tags,
      //     pagination: {
      //       page,
      //       limit,
      //       total: result.total,
      //       totalPages: Math.ceil(result.total / limit),
      //       hasNext: page * limit < result.total,
      //       hasPrev: page > 1,
      //     },
      //   },
      // });
      res.json(ResponseFactory.success({
        tags: result.tags,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1,
        },
      }, '标签查询成功'));
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

      // res.json({
      //   success: true,
      //   data: tag,
      // });
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

      // res.json({
      //   success: true,
      //   data: tag,
      //   message: '标签更新成功',
      // });
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

      // res.json({
      //   success: true,
      //   message: '标签删除成功',
      // });
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

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const result = await TagService.getTagBlogs(id, page, limit);

      // res.json({
      //   success: true,
      //   data: {
      //     tag: result.tag,
      //     blogs: result.blogs,
      //     pagination: {
      //       page,
      //       limit,
      //       total: result.total,
      //       totalPages: Math.ceil(result.total / limit),
      //     },
      //   },
      // });
      res.json(ResponseFactory.success({
        success: true,
        data: {
          tag: result.tag,
          blogs: result.blogs,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
          },
        },
      }));
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

      // res.json({
      //   success: true,
      //   data: stats,
      // });
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
      const { keyword, page = 1, limit = 20 } = req.query;

      if (!keyword || typeof keyword !== 'string') {
        throw new AppError('请提供搜索关键词', 400);
      }

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;

      const result = await TagService.searchTags(keyword as string, pageNum, limitNum);

      // res.json({
      //   success: true,
      //   data: {
      //     tags: result.tags,
      //     pagination: {
      //       page: pageNum,
      //       limit: limitNum,
      //       total: result.total,
      //       totalPages: Math.ceil(result.total / limitNum),
      //     },
      //   },
      // });
      res.json(ResponseFactory.success({
        tags: result.tags,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取热门标签
   */
  async getPopularTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const tags = await TagService.getPopularTags(limit);

      // res.json({
      //   success: true,
      //   data: tags,
      // });
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

      // res.json({
      //   success: true,
      //   data: createdTags,
      //   message: `成功创建 ${createdTags.length} 个标签`,
      // });
      res.json(ResponseFactory.success(createdTags, `成功创建 ${createdTags.length} 个标签`));
    } catch (error) {
      next(error);
    }
  }
}

export default TagApi;
