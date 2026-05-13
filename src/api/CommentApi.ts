import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import CommentService from '../services/CommentService';
// import { AuthRequest } from '../types';
import logger from '../utils/logger';
import { ResponseFactory } from '@/utils/ResponseFactory';
import { AppError } from '../middleware/errorHandler';

class CommentApi {
  // 验证模式
  static createSchema = Joi.object({
    content: Joi.string().min(1).max(1000).required(),
    parentId: Joi.number().integer().positive().optional(),
    replyToId: Joi.number().integer().positive().optional(),
  });

  static updateSchema = Joi.object({
    content: Joi.string().min(1).max(1000).required(),
    status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  });

  static querySchema = Joi.object({
    current: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(10),
    blogId: Joi.number().integer().positive().required(),
    sort: Joi.string().optional(),
  }).unknown(true);

  /**
   * 创建评论
   */
  async createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blogId = parseInt(req.params.id as string, 10);
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('未认证的用户', 401);
      }

      const { content, parentId, replyToId } = req.body;

      const comment = await CommentService.createComment(
        blogId,
        userId,
        content,
        parentId,
        replyToId
      );

      logger.info(`用户 ${req.user?.username} 为博客 ${blogId} 创建评论`);

      res.json(ResponseFactory.success(comment, '评论创建成功，等待审核'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新评论
   */
  async updateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const commentId = parseInt(req.params.commentId as string, 10);
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new AppError('未认证的用户', 401);
      }

      const comment = await CommentService.updateComment(commentId, req.body, userId, userRole);

      res.json(ResponseFactory.success(comment, '评论更新成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除评论
   */
  async deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const commentId = parseInt(req.params.commentId as string, 10);
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new AppError('未认证的用户', 401);
      }

      await CommentService.deleteComment(commentId, userId, userRole);

      res.json(ResponseFactory.success(1, '评论删除成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 点赞评论
   */
  async likeComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const commentId = parseInt(req.params.commentId as string, 10);
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('未认证的用户', 401);
      }

      const comment = await CommentService.likeComment(commentId, userId);

      res.json(ResponseFactory.success(comment, '点赞成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取待审核评论
   */
  async getPendingComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;

      if (!userRole || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const current = parseInt(req.query.page as string, 10) || 1;
      const size = parseInt(req.query.limit as string, 10) || 20;

      const { comments, total } = await CommentService.getPendingComments(current, size);

      res.json(ResponseFactory.page(comments, { current, size, total }, '获取待审核评论成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 审核评论
   */
  async moderateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const commentId = parseInt(req.params.commentId as string, 10);
      const { status } = req.body;
      const userRole = req.user?.role;

      if (!userRole || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        throw new AppError('无效的状态值', 400);
      }

      const comment = await CommentService.moderateComment(commentId, status);

      res.json(
        ResponseFactory.success(comment, `评论已${status === 'approved' ? '通过' : '拒绝'}`)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 查询评论
   * @param req
   * @param res
   * @param next
   */
  async getComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = CommentApi.querySchema.validate(req.query);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const { current, size, ...filters } = value;
      // const page = parseInt(req.query.page as string, 10) || 1;
      // const limit = parseInt(req.query.limit as string, 10) || 10;

      // console.log(current, size, filters);

      const { comments, total } = await CommentService.getComments(current, size, filters);

      res.json(ResponseFactory.page(comments, { current, size, total }, '查询评论成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 查询博客的评论
   * @param req
   * @param res
   * @param next
   */
  async getBlogsComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = CommentApi.querySchema.validate(req.query);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const { blogId, current, size } = value;

      const { comments, total } = await CommentService.getBlogComments(blogId, current, size);

      res.json(ResponseFactory.page(comments, { current, size, total }, '查询博客评论成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取热门评论（按点赞数）
   */
  async getPopularComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const comments = await CommentService.getPopularComments(limit);

      // res.json({
      //   success: true,
      //   data: comments,
      // });
      res.json(ResponseFactory.success(comments, '获取热门评论成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 搜索评论
   * @param req
   * @param res
   * @param next
   */
  async searchComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const keyword = req.query.keyword as string;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const comments = await CommentService.searchComments(keyword, page, limit);

      // res.json({
      //   success: true,
      //   data: comments,
      // });
      res.json(ResponseFactory.success(comments, '搜索评论成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取评论详情
   */
  async getCommentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);

      const comment = await CommentService.getCommentById(id);

      res.json(ResponseFactory.success(comment, '获取评论详情成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户的评论
   * @param req
   * @param res
   * @param next
   */
  async getUserComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.query.userId as string, 10);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const comments = await CommentService.getUserComments(userId, page, limit);

      // res.json({
      //   success: true,
      //   data: comments,
      // });
      res.json(ResponseFactory.success(comments, '获取用户评论成功'));
    } catch (error) {
      next(error);
    }
  }

  async bulkModerateComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ids, status } = req.query;

      if (!ids) {
        throw new AppError('评论id不存在', 400);
      }

      const commentIds: number[] = (req.query.commentId as string).split(',').map(Number);
      // 验证 status
      if (!status || typeof status !== 'string') {
        throw new AppError('status 缺失', 400);
      }

      // 类型守卫：检查 status 是否是有效的值
      if (status !== 'approved' && status !== 'rejected') {
        throw new AppError('status 必须是"approved"或者"rejected"', 400);
      }

      const count = CommentService.bulkModerateComments(commentIds, status);

      // res.json({
      //   success: true,
      //   data: count,
      // });
      res.json(ResponseFactory.success(count, '批量更新评论成功'));
    } catch (error) {
      next(error);
    }
  }

  async getCommentStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = CommentService.getCommentStats();

      // res.json({
      //   success: true,
      //   data: stats,
      // });
      res.json(ResponseFactory.success(stats, '获取评论统计成功'));
    } catch (error) {
      next(error);
    }
  }
}

export default CommentApi;
