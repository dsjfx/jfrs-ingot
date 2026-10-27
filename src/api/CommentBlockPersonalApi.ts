import { Request, Response, NextFunction } from 'express';
import CommentBlockPersonalService from '../services/CommentBlockPersonalService';
import { AppError } from '../middleware/errorHandler';
import { ResponseFactory } from '../utils/ResponseFactory';

class CommentBlockPersonalApi {
  /**
   * 屏蔽用户
   * Block a user from commenting or interacting with the blocker.
   */
  async block(req: Request, res: Response, next: NextFunction) {
    try {
      const { blockerId, blockedId, reason } = req.body;

      if (!blockerId || !blockedId) {
        throw new AppError('缺少必要参数', 400);
      }

      const block = await CommentBlockPersonalService.block(blockerId, blockedId, reason);

      res.json(ResponseFactory.success(block, '屏蔽成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 取消屏蔽
   * Unblock a previously blocked user.
   */
  async unblock(req: Request, res: Response, next: NextFunction) {
    try {
      const { blockerId, blockedId } = req.body;

      const result = await CommentBlockPersonalService.unblock(blockerId, blockedId);

      res.json(ResponseFactory.success(result, '已取消屏蔽'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取我的屏蔽列表
   * Get the list of users I have blocked.
   */
  async getBlocks(req: Request, res: Response, next: NextFunction) {
    try {
      const blockerId = parseInt(req.query.blockerId as string, 10);
      if (isNaN(blockerId)) {
        throw new AppError('缺少用户标识', 400);
      }

      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 20;

      const { blocks, total } = await CommentBlockPersonalService.getBlocks(
        blockerId,
        current,
        size
      );

      res.json(ResponseFactory.page(blocks, { current, size, total }, '获取屏蔽列表成功'));
    } catch (error) {
      next(error);
    }
  }
}

export default CommentBlockPersonalApi;
