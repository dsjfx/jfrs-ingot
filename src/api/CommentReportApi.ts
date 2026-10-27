import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import CommentReportService from '../services/CommentReportService';
import { AppError } from '../middleware/errorHandler';
import { ResponseFactory } from '../utils/ResponseFactory';

class CommentReportApi {
  // 举报验证模式
  static reportSchema = Joi.object({
    commentId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({ 'any.required': '评论ID是必填项' }),
    reason: Joi.string()
      .valid('spam', 'abuse', 'porn', 'politics', 'violence', 'copyright', 'other')
      .required()
      .messages({
        'any.only': '无效的举报原因',
        'any.required': '请选择举报原因',
      }),
    description: Joi.string().max(500).optional(),
    reporterEmail: Joi.string().email().max(100).optional(),
  });

  // 处理举报验证模式
  static handleSchema = Joi.object({
    status: Joi.string().valid('resolved', 'rejected', 'ignored').required(),
    handleRemark: Joi.string().max(500).optional(),
    blockOptions: Joi.object({
      blockType: Joi.string().valid('email', 'ip', 'user', 'keyword').optional(),
      blockValue: Joi.string().max(255).optional(),
      blockDuration: Joi.number().integer().min(1).optional(),
      deleteComment: Joi.boolean().optional(),
    }).optional(),
  });

  /**
   * 举报评论（无需登录）
   */
  async reportComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = CommentReportApi.reportSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      // 获取客户端信息
      const reporterIp = req.ip || req.socket.remoteAddress || '';

      const report = await CommentReportService.createReport({
        commentId: value.commentId,
        reason: value.reason,
        description: value.description,
        reporterEmail: value.reporterEmail,
        reporterIp,
      });

      res.json(
        ResponseFactory.success(
          {
            id: report.id,
            status: report.status,
            createdAt: report.createdAt,
          },
          '举报成功，我们会尽快处理'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取举报列表（管理员）
   */
  async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      if (!userRole || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const current = parseInt(req.query.current as string, 10) || 1;
      const size = parseInt(req.query.size as string, 10) || 20;
      const status = req.query.status as string;
      const reason = req.query.reason as string;
      const commentId = req.query.commentId
        ? parseInt(req.query.commentId as string, 10)
        : undefined;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC';

      const { reports, total } = await CommentReportService.getReports({
        current,
        size,
        status,
        reason,
        commentId,
        sortBy,
        sortOrder,
      });

      res.json(ResponseFactory.page(reports, { current, size, total }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取举报详情（管理员）
   */
  async getReportById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      if (!userRole || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的举报ID', 400);
      }

      const report = await CommentReportService.getReportById(id);

      res.json(ResponseFactory.success(report, '获取举报详情成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 处理举报（管理员）
   */
  async handleReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      const handlerId = req.user?.id;

      if (!userRole || !handlerId || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const { error, value } = CommentReportApi.handleSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的举报ID', 400);
      }

      const report = await CommentReportService.handleReport(id, value, handlerId);

      res.json(ResponseFactory.success(report, '举报处理成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量处理举报（管理员）
   */
  async bulkHandleReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      const handlerId = req.user?.id;

      if (!userRole || !handlerId || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const { ids, status, handleRemark } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError('请提供有效的举报ID数组', 400);
      }

      if (!status || !['resolved', 'rejected', 'ignored'].includes(status)) {
        throw new AppError('无效的状态值', 400);
      }

      const count = await CommentReportService.bulkHandleReports(
        ids,
        status,
        handlerId,
        handleRemark
      );

      res.json(ResponseFactory.success({ count }, `批量处理完成，共处理 ${count} 条`));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取举报统计（管理员）
   */
  async getReportStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      if (!userRole || !['admin', 'editor'].includes(userRole)) {
        throw new AppError('没有权限', 403);
      }

      const stats = await CommentReportService.getReportStats();

      res.json(ResponseFactory.success(stats, '获取举报统计成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除举报记录（管理员）
   */
  async deleteReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        throw new AppError('没有权限', 403);
      }

      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError('无效的举报ID', 400);
      }

      await CommentReportService.deleteReport(id);

      res.json(ResponseFactory.success(null, '举报记录删除成功'));
    } catch (error) {
      next(error);
    }
  }
}

export default CommentReportApi;
