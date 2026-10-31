import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import BlogReactionService from '../services/BlogReactionService';
import { ReactionType } from '../models/BlogReaction';
import { AppError } from '../middleware/errorHandler';
import { Blog } from '@/models';
import { ResponseFactory } from '@/utils/ResponseFactory';

class BlogReactionApi {
  static toggleSchema = Joi.object({
    blogId: Joi.string().max(64).required().messages({ 'any.required': '文章ID是必填项' }),
    type: Joi.number().valid(1, -1).required().messages({
      'any.only': '类型必须是 1(点赞)或 -1(不喜欢)',
      'any.required': '类型是必填项',
    }),
    userId: Joi.string().max(64).optional().allow(null, ''),
    anonymousId: Joi.string().max(128).optional().allow(null, ''),
  })
    .or('userId', 'anonymousId')
    .messages({ 'object.missing': 'userId 和 anonymousId 至少提供一个' });

  /**
   * 切换文章反应（点赞/不喜欢/取消）
   */
  async toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = BlogReactionApi.toggleSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const { blogId, type, userId, anonymousId } = value;

      const result = await BlogReactionService.toggleReaction(`${blogId}`, type as ReactionType, {
        userId,
        anonymousId,
      });

      let message = '';
      if (result.reaction === 0) {
        message = type === ReactionType.LIKE ? '已取消点赞' : '已取消不喜欢';
      } else if (type === ReactionType.LIKE) {
        message = '点赞成功';
      } else {
        message = '已标记为不喜欢';
      }

      // res.json({
      //   success: true,
      //   data: result,
      //   message,
      // });
      res.json(ResponseFactory.success(result, message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 查询单篇文章的反应状态
   */
  async getReaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blogId = parseInt(req.params.blogId as string, 10);
      if (!blogId) throw new AppError('缺少文章ID', 400);

      const userId = req.query.userId as string | undefined;
      const anonymousId = req.query.anonymousId as string | undefined;

      // 复用批量方法查单条
      const map = await BlogReactionService.getReactionStatusBatch([`${blogId}`], {
        userId,
        anonymousId,
      });

      // 获取文章总数
      const blog = await Blog.findByPk(blogId, {
        attributes: ['likeCount', 'dislikeCount'],
      });

      if (!blog) throw new AppError('文章不存在', 404);

      // res.json({
      //   success: true,
      //   data: {
      //     reaction: map.get(`${blogId}`) || 0,
      //     likeCount: blog.likeCount,
      //     dislikeCount: blog.dislikeCount,
      //   },
      // });
      res.json(
        ResponseFactory.success({
          reaction: map.get(`${blogId}`) || 0,
          likeCount: blog.likeCount,
          dislikeCount: blog.dislikeCount,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

export default BlogReactionApi;
