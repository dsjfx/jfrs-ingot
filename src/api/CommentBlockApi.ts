import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import CommentBlockService from '../services/CommentBlockService';
import { AppError } from '../middleware/errorHandler';
import { ResponseFactory } from '../utils/ResponseFactory';

class CommentBlockApi {
  // 创建屏蔽验证
  static createSchema = Joi.object({
    type: Joi.string().valid('email', 'ip', 'user', 'keyword').required(),
    value: Joi.string().max(255).required(),
    reason: Joi.string().max(500).optional(),
    duration: Joi.number().integer().min(1).optional(), // 天
  });

  // 更新屏蔽验证
  static updateSchema = Joi.object({
    reason: Joi.string().max(500).optional(),
    expiresAt: Joi.date().allow(null).optional(),
  });

  /**
   * 创建屏蔽（管理员）
   */
  async createBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;

      if (!userRole || !userId || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const { error, value } = CommentBlockApi.createSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const block = await CommentBlockService.createBlock(
        {
          type: value.type,
          value: value.value,
          reason: value.reason,
          expiresAt: value.duration
            ? new Date(Date.now() + value.duration * 24 * 60 * 60 * 1000)
            : null,
        },
        userId
      );

      res.json(ResponseFactory.success(block, '屏蔽创建成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 检查是否被屏蔽
   */
  async checkBlocked(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, ip, userId, content } = req.query;

      const result = await CommentBlockService.isBlocked({
        email: email as string,
        ip: ip as string,
        userId: userId ? parseInt(userId as string, 10) : undefined,
        content: content as string,
      });

      res.json(ResponseFactory.success(result, '检查屏蔽状态成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取屏蔽列表（管理员）
   */
  async getBlocks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      if (!userRole || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 20;
      const type = req.query.type as string;
      const keyword = req.query.keyword as string;
      const includeExpired = req.query.includeExpired === 'true';
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC';

      const { blocks, total } = await CommentBlockService.getBlocks({
        current,
        size,
        type,
        keyword,
        includeExpired,
        sortBy,
        sortOrder,
      });

      res.json(ResponseFactory.page(blocks, { current, size, total }, '获取屏蔽列表成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取屏蔽详情（管理员）
   */
  async getBlockById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      if (!userRole || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的屏蔽ID', 400);
      }

      const block = await CommentBlockService.getBlockById(id);

      res.json(ResponseFactory.success(block, '获取屏蔽详情成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新屏蔽（管理员）
   */
  async updateBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      if (!userRole || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const { error, value } = CommentBlockApi.updateSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的屏蔽ID', 400);
      }

      const block = await CommentBlockService.updateBlock(id, value);

      res.json(ResponseFactory.success(block, '屏蔽更新成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 解除屏蔽（管理员）
   */
  async deleteBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        throw new AppError('没有权限', 403);
      }

      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的屏蔽ID', 400);
      }

      await CommentBlockService.deleteBlock(id);

      res.json(ResponseFactory.success(null, '屏蔽已解除'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量解除屏蔽（管理员）
   */
  async bulkDeleteBlocks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        throw new AppError('没有权限', 403);
      }

      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError('请提供有效的屏蔽ID数组', 400);
      }

      const count = await CommentBlockService.bulkDeleteBlocks(ids);

      res.json(ResponseFactory.success({ count }, `批量解除成功，共解除 ${count} 条`));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 从评论快速屏蔽（管理员）
   */
  async blockFromComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;

      if (!userRole || !userId || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const commentId = parseInt(req.params.commentId as string, 10);
      if (isNaN(commentId)) {
        throw new AppError('无效的评论ID', 400);
      }

      const { blockType, duration, reason } = req.body;

      if (!blockType || !['email', 'ip', 'user'].includes(blockType)) {
        throw new AppError('无效的屏蔽类型', 400);
      }

      const block = await CommentBlockService.blockFromComment(
        commentId,
        { blockType, duration, reason },
        userId
      );

      res.json(ResponseFactory.success(block, '快速屏蔽成功'));
    } catch (error) {
      next(error);
    }
  }
}

export default CommentBlockApi;
