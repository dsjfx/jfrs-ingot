import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import CategoryService from '../services/CategoryService';
import { AppError } from '../middleware/errorHandler';
// import { AuthRequest } from '../types';
import logger from '../utils/logger';
import { ResponseFactory } from '@/utils/ResponseFactory';

class CategoryApi {
  // 验证模式
  static createSchema = Joi.object({
    name: Joi.string().min(1).max(50).required(),
    description: Joi.string().max(200).empty('').optional(),
  });

  static updateSchema = Joi.object({
    name: Joi.string().min(1).max(50).optional(),
    description: Joi.string().max(200).empty('').optional(),
  });

  static querySchema = Joi.object({
    current: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(50).empty('').optional(),
    sortBy: Joi.string().valid('name', 'blogCount', 'createdAt').default('name'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('ASC'),
  }).unknown(true);

  /**
   * 创建分类
   */
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CategoryService.createCategory(req.body);

      logger.info(`分类创建成功: ${category.name}`);

      // res.status(201).json({
      //   success: true,
      //   data: category,
      //   message: '分类创建成功',
      // });
      res.json(ResponseFactory.success(category, '分类创建成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取分类列表
   */
  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 验证查询参数
      const { error, value } = CategoryApi.querySchema.validate(req.query);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const { current, size, ...filters } = value;

      const { categories, total } = await CategoryService.getCategories(current, size, filters);

      res.json(ResponseFactory.page(categories, { current, size, total } , '分类查询成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取分类详情
   */
  async getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的分类ID', 400);
      }

      const category = await CategoryService.getCategoryById(id);

      // res.json({
      //   success: true,
      //   data: category,
      // });
      res.json(ResponseFactory.success(category, '查询分类详情成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新分类
   */
  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的分类ID', 400);
      }

      const category = await CategoryService.updateCategory(id, req.body);

      logger.info(`分类更新成功: ${category.name}`);

      // res.json({
      //   success: true,
      //   data: category,
      //   message: '分类更新成功',
      // });
      res.json(ResponseFactory.success(category, '分类更新成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除分类
   */
  async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的分类ID', 400);
      }

      await CategoryService.deleteCategory(id);

      logger.info(`分类删除成功: ID=${id}`);

      // res.json({
      //   success: true,
      //   message: '分类删除成功',
      // });
      res.json(ResponseFactory.success(id, '分类删除成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取分类的博客
   */
  async getCategoryBlogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的分类ID', 400);
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const result = await CategoryService.getCategoryBlogs(id, page, limit);

      // res.json({
      //   success: true,
      //   data: {
      //     category: result.category,
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
        category: result.category,
        blogs: result.blogs,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      }, '查询该分类相关的博客成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取分类统计
   */
  async getCategoryStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;

      if (!userRole || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const stats = await CategoryService.getCategoryStats();

      // res.json({
      //   success: true,
      //   data: stats,
      // });
      res.json(ResponseFactory.success(stats, '查询分类统计数据成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 搜索分类
   */
  async searchCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { keyword, page = 1, limit = 20 } = req.query;

      if (!keyword || typeof keyword !== 'string') {
        throw new AppError('请提供搜索关键词', 400);
      }

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;

      const result = await CategoryService.searchCategories(keyword as string, pageNum, limitNum);

      // res.json({
      //   success: true,
      //   data: {
      //     categories: result.categories,
      //     pagination: {
      //       page: pageNum,
      //       limit: limitNum,
      //       total: result.total,
      //       totalPages: Math.ceil(result.total / limitNum),
      //     },
      //   },
      // });
      res.json(ResponseFactory.success({
        categories: result.categories,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
      }, '根据关键字查询分类成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取热门分类
   */
  async getPopularCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const categories = await CategoryService.getPopularCategories(limit);

      // res.json({
      //   success: true,
      //   data: categories,
      // });
      res.json(ResponseFactory.success(categories, '查询热门分类成功'));
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cates = req.params.cates as any as Array<{ name: string; description?: string }>;
      const categories = await CategoryService.bulkCreateCategories(cates);

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default CategoryApi;
