import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import CommentLikeService from '../services/CommentLikeService';
import { AppError } from '../middleware/errorHandler';
import { ResponseFactory } from '@/utils/ResponseFactory';

class CommentLikeApi {
  static toggleSchema = Joi.object({
    commentId: Joi.string().max(64).required().messages({ 'any.required': '评论ID是必填项' }),
    userId: Joi.string().max(64).allow(null, '').optional(),
    anonymousId: Joi.string().max(128).allow(null, '').optional(),
  })
    .or('userId', 'anonymousId')
    .messages({ 'object.missing': 'userId 和 anonymousId 至少提供一个' });

  /**
   * 点赞 / 取消点赞
   */
  async toggleLike(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = CommentLikeApi.toggleSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const { commentId, userId, anonymousId } = value;

      const result = await CommentLikeService.toggleLike(commentId, {
        userId,
        anonymousId,
      });

      // res.json({
      //   success: true,
      //   data: result,
      //   message: result.liked ? '点赞成功' : '已取消点赞',
      // });
      const message: string = result.liked ? '点赞成功' : '已取消点赞';
      res.json(ResponseFactory.success(result, message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 查询单条评论的点赞状态
   */
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const commentId = req.params.commentId as string;
      if (!commentId) throw new AppError('缺少评论ID', 400);

      const userId = req.query.userId as string | undefined;
      const anonymousId = req.query.anonymousId as string | undefined;

      const result = await CommentLikeService.getLikeStatus(commentId, {
        userId,
        anonymousId,
      });

      // res.json({ success: true, data: result });
      res.json(ResponseFactory.success(result, '查询点赞状态成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量查询点赞状态
   * POST /api/comment-likes/batch-status
   * body: { commentIds: ["1", "2"], userId?, anonymousId? }
   */
  async getBatchStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { commentIds, userId, anonymousId } = req.body;

      if (!Array.isArray(commentIds) || commentIds.length === 0) {
        throw new AppError('commentIds 必须是非空数组', 400);
      }

      if (commentIds.length > 100) {
        throw new AppError('一次最多查询 100 条', 400);
      }

      const map = await CommentLikeService.getLikeStatusBatch(commentIds, { userId, anonymousId });

      // 转成对象返回
      const data: Record<string, { liked: boolean; likeCount: number }> = {};
      map.forEach((v, k) => {
        data[k] = v;
      });

      // res.json({ success: true, data });
      res.json(ResponseFactory.success(data, '批量查询点赞状态成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取我点赞的评论
   */
  async getLikes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.query.userId as string | undefined;
      const anonymousId = req.query.anonymousId as string | undefined;

      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 20;

      const { likes, total } = await CommentLikeService.getLikedComments(
        { userId, anonymousId },
        current,
        size
      );

      // res.json({
      //   success: true,
      //   data: {
      //     likes: result.likes,
      //     pagination: {
      //       page,
      //       limit,
      //       total: result.total,
      //       totalPages: Math.ceil(result.total / limit),
      //     },
      //   },
      // });
      res.json(ResponseFactory.page(likes, { current, size, total }));
    } catch (error) {
      next(error);
    }
  }
}

export default CommentLikeApi;
