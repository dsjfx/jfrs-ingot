import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import BlogService from '../services/BlogService';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { User } from '../models';
import logger from '../utils/logger';
import { ResponseFactory } from '../utils/ResponseFactory';
import Constance from '../utils/Constance';

class BlogApi {
  // 验证模式
  static createSchema = Joi.object({
    title: Joi.string().min(1).max(200).required(),
    content: Joi.string().min(1).required(),
    summary: Joi.string().max(500).optional(),
    coverImage: Joi.string().uri().optional().allow(null).allow(''),
    status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
    categoryId: Joi.number().integer().positive().optional(),
    tagIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    photos: Joi.array()
      .items(
        Joi.object({
          filename: Joi.string().required(),
          // path: Joi.string().required(),
          url: Joi.string().required(),
          originalname: Joi.string().required(),
          mimetype: Joi.string().required(),
          size: Joi.number().required(),
          width: Joi.number().optional(),
          height: Joi.number().optional(),
          thumbnailFilename: Joi.string().optional(),
          // thumbnailPath: Joi.string().optional(),
          thumbnailUrl: Joi.string().optional(),
          thumbnailSize: Joi.number().optional(),
          isCover: Joi.boolean().default(false),
          description: Joi.string().max(500).optional(),
        })
      )
      .optional(),
  });

  static updateSchema = Joi.object({
    title: Joi.string().min(1).max(200).optional(),
    content: Joi.string().min(1).optional(),
    summary: Joi.string().max(500).optional(),
    coverImage: Joi.string().uri().optional().allow(''),
    status: Joi.string().valid('draft', 'published', 'archived').optional(),
    categoryId: Joi.number().integer().positive().optional(),
    tagIds: Joi.array().items(Joi.number().integer().positive()).optional(),
  });

  static querySchema = Joi.object({
    current: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('draft', 'published', 'archived').empty('').optional(),
    subject: Joi.string().optional().allow(''),
    categoryId: Joi.number().integer().positive().empty('').optional(),
    tagId: Joi.number().integer().positive().optional(),
    authorId: Joi.number().integer().positive().optional(),
    search: Joi.string().max(100).empty('').optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'views', 'title').default('createdAt'),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC'),
  }).unknown(true);

  /**
   * 创建博客
   */
  async createBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('未认证的用户', 401);
      }

      const blog = await BlogService.createBlog(req.body, userId);

      logger.info(`用户 ${req.user?.username} 创建博客: ${blog.title}`);

      // res.status(201).json({
      //   success: true,
      //   data: blog,
      //   message: '博客创建成功',
      // });
      res.json(ResponseFactory.success(blog, '博客创建成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建博客（带照片）
   */
  async createBlogWithPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('未认证的用户', 401);
      }

      const blogData = req.body;
      const photos = blogData.photos;

      const blog = await BlogService.createBlogWithPhotos(blogData, userId, photos);

      logger.info(`用户 ${req.user?.username} 创建博客: ${blog.title}`);

      res.json(ResponseFactory.success(blog, '博客创建成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取博客列表
   */
  async getBlogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 验证查询参数
      const { error, value } = BlogApi.querySchema.validate(req.query);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const { current, size, ...filters } = value;

      const { blogs, total } = await BlogService.getBlogs(current, size, filters);

      res.json(ResponseFactory.page(blogs, { current, size, total }, '博客数据查询成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取博客详情
   */
  async getBlogById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的博客ID', 400);
      }

      const blog = await BlogService.getBlogById(id);

      res.json(ResponseFactory.success(blog, '查询博客详情成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新博客
   */
  async updateBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的博客ID', 400);
      }

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new AppError('未认证的用户', 401);
      }

      const blog = await BlogService.updateBlog(id, req.body, userId, userRole);

      logger.info(`用户 ${req.user?.username} 更新博客: ${blog.title}`);

      res.json(ResponseFactory.success(blog, '博客更新成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新博客（带照片）
   */
  async updateBlogWithPhotos(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的博客ID', 400);
      }

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new AppError('未认证的用户', 401);
      }

      const { photos, ...blogData } = req.body;

      const blog = await BlogService.updateBlogWithPhotos(id, blogData, userId, userRole, photos);

      logger.info(`用户 ${req.user?.username} 更新博客: ${blog.title}`);

      res.json(ResponseFactory.success(blog, '博客更新成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除博客
   */
  async deleteBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的博客ID', 400);
      }

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new AppError('未认证的用户', 401);
      }

      await BlogService.deleteBlog(id, userId, userRole);

      logger.info(`用户 ${req.user?.username} 删除博客 ID: ${id}`);

      // res.json({
      //   success: true,
      //   message: '博客删除成功',
      // });
      res.json(ResponseFactory.success(id, '博客删除成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户的博客
   */
  async getUserBlogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('未认证的用户', 401);
      }

      const { current = 1, size = 10 } = req.query;
      const pageNum = parseInt(current as string, 10) || 1;
      const limitNum = parseInt(size as string, 10) || 10;

      const { blogs, total } = await BlogService.getBlogs(pageNum, limitNum, { authorId: userId });

      res.json(
        ResponseFactory.page(blogs, { current: pageNum, size: limitNum, total }, '博客数据查询成功')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新博客状态
   */
  async updateBlogStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { status } = req.body;

      if (isNaN(id)) {
        throw new AppError('无效的博客ID', 400);
      }

      if (!status || !['draft', 'published', 'archived'].includes(status)) {
        throw new AppError('无效的状态值', 400);
      }

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new AppError('未认证的用户', 401);
      }

      const blog = await BlogService.updateBlog(id, { status }, userId, userRole);

      logger.info(`用户 ${req.user?.username} 更新博客状态: ${blog.title} -> ${status}`);

      res.json(ResponseFactory.success(blog, '博客状态更新成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取热门博客
   */
  async getPopularBlogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const size = parseInt(req.query.size as string, 10) || 10;

      const { blogs } = await BlogService.getBlogs(1, size, { status: 'published' });

      // 按浏览量排序
      const popularBlogs = blogs.sort((a, b) => b.views - a.views).slice(0, size);

      res.json(ResponseFactory.success(popularBlogs, '查询热门博客成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取精选博客（置顶）
   */
  async getFeaturedBlogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const size = parseInt(req.query.size as string, 10) || 1;
      const subject = (req.query.subject as string) || Constance.DEFAULT_SUBJECT;

      const blogs = await BlogService.getRandomTopBlogsSQL(size, { status: 'published', subject });

      res.json(
        ResponseFactory.page(blogs, { current: 1, size, total: blogs.length }, '查询精选博客成功')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取相关博客
   */
  async getRelatedBlogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const size = parseInt(req.query.size as string, 10) || 3;
      const subject = (req.query.subject as string) || Constance.DEFAULT_SUBJECT;

      const relatedBlogs = await BlogService.getRelatedBlogs(id, size, subject);

      res.json(ResponseFactory.success(relatedBlogs, '查询相关博客成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取文章评论
   * @param req
   * @param res
   * @param next
   */
  async getBlogComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.query.id as string, 10);
      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 10;
      const sort = (req.query.sort as string) || 'latest';

      const comment = await BlogService.getBlogComments(id, current, size, sort);

      res.json(ResponseFactory.success(comment, '查询博客评论成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取文章统计数据
   * @param req
   * @param res
   * @param next
   */
  async getBlogStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.query.id as string, 10);

      const stats = await BlogService.getBlogStats(id);

      res.json(ResponseFactory.success(stats));
    } catch (error) {
      next(error);
    }
  }

  async bulkUpdateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ids, status } = req.body;
      const operator = req.user as User;

      const count = await BlogService.bulkUpdateStatus(ids, status, operator.id, operator.role);

      res.json(ResponseFactory.success(count, '批量更新博客状态成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取相邻博客（上一篇和下一篇）
   */
  async getAdjacentBlogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的博客ID', 400);
      }
      const subject = (req.query.subject as string) || Constance.DEFAULT_SUBJECT;

      // 获取相邻博客
      const adjacent = await BlogService.getAdjacentBlogs(id, {
        status: 'published', // 只获取已发布的博客
        subject,
      });

      res.json(ResponseFactory.success(adjacent, '获取相邻博客成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取同一分类下的相邻博客
   */
  async getAdjacentBlogsInSameCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的博客ID', 400);
      }

      const adjacent = await BlogService.getAdjacentBlogsInSameCategory(id);

      res.json({
        success: true,
        data: adjacent,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取同一作者下的相邻博客
   */
  async getAdjacentBlogsBySameAuthor(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的博客ID', 400);
      }

      const adjacent = await BlogService.getAdjacentBlogsBySameAuthor(id);

      res.json({
        success: true,
        data: adjacent,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取博客归档数据
   */
  async getArchive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 3;
      const status = (req.query.status as string) || 'published';
      const subject = (req.query.subject as string) || Constance.DEFAULT_SUBJECT;

      const result = await BlogService.getArchive({
        year,
        month,
        limit,
        status,
        subject,
      });

      res.json(ResponseFactory.success(result, '获取归档数据成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 懒加载更多归档年份
   */
  async getArchiveMore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startYear = req.query.startYear
        ? parseInt(req.query.startYear as string, 10)
        : undefined;
      const endYear = req.query.endYear ? parseInt(req.query.endYear as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 2;
      const status = (req.query.status as string) || 'published';
      const subject = (req.query.subject as string) || Constance.DEFAULT_SUBJECT;

      const result = await BlogService.getArchiveByYears({
        startYear,
        endYear,
        limit,
        status,
        subject,
      });

      res.json(ResponseFactory.success(result, '加载更多归档成功'));
    } catch (error) {
      next(error);
    }
  }
}

export default BlogApi;
