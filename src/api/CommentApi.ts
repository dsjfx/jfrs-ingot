import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import CommentService from '../services/CommentService';
// import { AuthRequest } from '../types';
import logger from '../utils/logger';
import { ResponseFactory } from '../utils/ResponseFactory';
import { AppError } from '../middleware/errorHandler';
import CommentUserService from '@/services/CommentUserService';

class CommentApi {
  // 验证模式
  static createSchema = Joi.object({
    content: Joi.string().min(1).max(2000).required().messages({
      'string.min': '评论内容不能为空',
      'string.max': '评论内容不能超过2000个字符',
      'any.required': '评论内容是必填项',
    }),
    name: Joi.string().min(1).max(50).required().messages({
      'string.min': '昵称不能为空',
      'string.max': '昵称不能超过50个字符',
      'any.required': '昵称是必填项',
    }),
    email: Joi.string().email().max(100).required().messages({
      'string.email': '请输入有效的邮箱地址',
      'any.required': '邮箱是必填项',
    }),
    website: Joi.string().uri().max(200).optional().messages({
      'string.uri': '请输入有效的网址',
    }),
    // parentId: Joi.number().integer().positive().optional(),
    // replyToId: Joi.number().integer().positive().optional(),
    // 前端只传"被回复的评论ID"
    replyToCommentId: Joi.number().integer().positive().optional(),
    status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  });

  static updateSchema = Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  });

  static querySchema = Joi.object({
    current: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(10),
    blogId: Joi.number().integer().positive().required(),
    sort: Joi.string().optional(),
    viewerId: Joi.string().optional(),
    viewerEmail: Joi.string().optional(),
  }).unknown(true);

  /**
   * 获取评论用户列表（管理员）
   */
  async getCommentUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 20;
      const search = req.query.search as string;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC';

      const { users, total } = await CommentUserService.getCommentUsers({
        current,
        size,
        search,
        sortBy,
        sortOrder,
      });

      res.json(
        ResponseFactory.page(users, { current, size, total: total }, '获取评论用户列表成功')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 根据邮箱查询评论用户
   */
  async getCommentUserByEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.query;

      if (!email) {
        throw new AppError('请提供邮箱地址', 400);
      }

      const commentUser = await CommentUserService.findByEmail(email as string);

      if (!commentUser) {
        throw new AppError('评论用户不存在', 404);
      }

      res.json(ResponseFactory.success(commentUser.toPublicJSON(), '获取评论用户成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建评论
   */
  async createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 验证请求数据
      const { error, value } = CommentApi.createSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }
      const blogId = parseInt(req.params.id as string, 10);
      if (isNaN(blogId)) {
        throw new AppError('无效的博客ID', 400);
      }

      // 获取客户端信息
      const ip = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.get('user-agent') || '';

      const { name, email, website, content, replyToCommentId, status } = value;

      const comment = await CommentService.createComment({
        blogId,
        userData: { name, email, website, ip, userAgent },
        content,
        replyToCommentId,
        status,
      });

      logger.info(`用户 ${name} 为博客 ${blogId} 创建评论`);

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
      const commentId = parseInt(req.params.id as string, 10);
      let userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        userId = req.body.userId;
      }

      if (!userId && !userRole) {
        throw new AppError('未认证或登记的用户', 401);
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
      const commentId = parseInt(req.params.id as string, 10);
      let userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        userId = req.query.userId;
      }

      if (!userId && !userRole) {
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
      let userId = req.user?.id;

      if (!userId) {
        userId = req.query.userId;
      }

      if (!userId) {
        throw new AppError('未认证或登记的用户', 401);
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

      const { current, size, viewerId, viewerEmail, ...filters } = value;

      const { comments, total } = await CommentService.getComments(current, size, filters, {
        viewerId,
        viewerEmail,
      });

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
      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 10;

      const comments = await CommentService.searchComments(keyword, current, size);

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
      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 10;

      const comments = await CommentService.getUserComments(userId, current, size);

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

      res.json(ResponseFactory.success(count, '批量更新评论成功'));
    } catch (error) {
      next(error);
    }
  }

  async getCommentStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = CommentService.getCommentStats();

      res.json(ResponseFactory.success(stats, '获取评论统计成功'));
    } catch (error) {
      next(error);
    }
  }
}

export default CommentApi;
