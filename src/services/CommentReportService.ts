import { Op } from 'sequelize';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { CommentReportData } from '../types';
import { User, Comment, CommentUser, CommentReport, CommentBlock } from '../models';

class CommentReportService {
  /**
   * 举报评论
   */
  async createReport(data: CommentReportData): Promise<CommentReport> {
    try {
      // 1. 验证评论是否存在
      const comment = await Comment.findByPk(data.commentId);
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 2. 防止重复举报（同一IP或同一用户）
      const whereConditions: any[] = [];
      if (data.reporterIp) {
        whereConditions.push({ reporterIp: data.reporterIp });
      }
      if (data.reporterId) {
        whereConditions.push({ reporterId: data.reporterId });
      }

      if (whereConditions.length > 0) {
        const existingReport = await CommentReport.findOne({
          where: {
            commentId: data.commentId,
            [Op.or]: whereConditions,
            status: { [Op.in]: ['pending', 'resolved'] },
          },
        });

        if (existingReport) {
          throw new AppError('您已经举报过该评论，请耐心等待处理', 400);
        }
      }

      // 3. 检查是否被屏蔽（防止恶意举报）
      if (data.reporterIp) {
        const isBlocked = await CommentBlock.findOne({
          where: {
            type: 'ip',
            value: data.reporterIp,
            [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
          },
        });

        if (isBlocked) {
          throw new AppError('您的账号已被限制举报', 403);
        }
      }

      // 4. 创建举报记录
      const report = await CommentReport.create(data);

      logger.info(`评论举报成功: 评论ID=${data.commentId}, 原因=${data.reason}`);

      // 5. 检查是否需要自动处理（同一评论被举报多次）
      await this.checkAutoModerate(data.commentId);

      return report;
    } catch (error) {
      logger.error('举报评论失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否需要自动处理（被举报次数达到阈值）
   */
  private async checkAutoModerate(commentId: number): Promise<void> {
    try {
      const reportCount = await CommentReport.count({
        where: {
          commentId,
          status: 'pending',
        },
      });

      // 被举报超过5次，自动隐藏评论
      const AUTO_HIDE_THRESHOLD = 5;
      if (reportCount >= AUTO_HIDE_THRESHOLD) {
        await Comment.update({ status: 'pending' }, { where: { id: commentId } });
        logger.warn(`评论 ${commentId} 被举报 ${reportCount} 次，已自动隐藏`);
      }
    } catch (error) {
      logger.error('自动处理举报失败:', error);
    }
  }

  /**
   * 获取举报列表（管理员）
   */
  async getReports(
    options: {
      current?: number;
      size?: number;
      status?: string;
      reason?: string;
      commentId?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{ reports: CommentReport[]; total: number }> {
    try {
      const {
        current = 1,
        size = 20,
        status,
        reason,
        commentId,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = options;

      const offset = (current - 1) * size;
      const where: any = {};

      if (status) where.status = status;
      if (reason) where.reason = reason;
      if (commentId) where.commentId = commentId;

      const { rows: reports, count: total } = await CommentReport.findAndCountAll({
        where,
        include: [
          {
            model: Comment,
            as: 'comment',
            include: [
              {
                model: CommentUser,
                as: 'user',
                attributes: ['id', 'name', 'email', 'avatar'],
              },
            ],
          },
          {
            model: CommentUser,
            as: 'reporter',
            attributes: ['id', 'name', 'email'],
            required: false,
          },
          {
            model: User,
            as: 'handler',
            attributes: ['id', 'username'],
            required: false,
          },
        ],
        offset,
        limit: size,
        order: [[sortBy, sortOrder]],
      });

      return { reports, total };
    } catch (error) {
      logger.error('获取举报列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取举报详情
   */
  async getReportById(id: number): Promise<CommentReport> {
    const report = await CommentReport.findByPk(id, {
      include: [
        {
          model: Comment,
          as: 'comment',
          include: [
            {
              model: CommentUser,
              as: 'user',
              attributes: ['id', 'name', 'email', 'avatar'],
            },
          ],
        },
        {
          model: CommentUser,
          as: 'reporter',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
        {
          model: User,
          as: 'handler',
          attributes: ['id', 'username'],
          required: false,
        },
        {
          model: CommentBlock,
          as: 'blocks',
          required: false,
        },
      ],
    });

    if (!report) {
      throw new AppError('举报记录不存在', 404);
    }

    return report;
  }

  /**
   * 处理举报（管理员）
   */
  async handleReport(
    id: number,
    data: {
      status: 'resolved' | 'rejected' | 'ignored';
      handleRemark?: string;
      blockOptions?: {
        blockType?: 'email' | 'ip' | 'user' | 'keyword';
        blockValue?: string;
        blockDuration?: number; // 单位：天，null表示永久
        deleteComment?: boolean; // 是否删除评论
      };
    },
    handlerId: number
  ): Promise<CommentReport> {
    try {
      const report = await this.getReportById(id);

      if (report.status !== 'pending') {
        throw new AppError('该举报已处理', 400);
      }

      // 更新举报状态
      await report.update({
        status: data.status,
        handledBy: handlerId,
        handledAt: new Date(),
        handleRemark: data.handleRemark,
      });

      logger.info(`举报处理完成: ID=${id}, 状态=${data.status}`);

      // 如果举报成立，执行屏蔽操作
      if (data.status === 'resolved') {
        // 1. 删除评论（如果指定）
        if (data.blockOptions?.deleteComment) {
          await Comment.destroy({ where: { id: report.commentId } });
          logger.info(`举报成立，已删除评论: ${report.commentId}`);
        }

        // 2. 添加屏蔽记录
        if (data.blockOptions?.blockType && data.blockOptions?.blockValue) {
          await this.createBlock(
            {
              type: data.blockOptions.blockType,
              value: data.blockOptions.blockValue,
              reason: `举报处理：${data.handleRemark || '违规内容'}`,
              reportId: report.id,
              expiresAt: data.blockOptions.blockDuration
                ? new Date(Date.now() + data.blockOptions.blockDuration * 24 * 60 * 60 * 1000)
                : null,
            },
            handlerId
          );
        }
      }

      return report;
    } catch (error) {
      logger.error('处理举报失败:', error);
      throw error;
    }
  }

  /**
   * 批量处理举报
   */
  async bulkHandleReports(
    ids: number[],
    status: 'resolved' | 'rejected' | 'ignored',
    handlerId: number,
    handleRemark?: string
  ): Promise<number> {
    const result = await CommentReport.update(
      {
        status,
        handledBy: handlerId,
        handledAt: new Date(),
        handleRemark,
      },
      {
        where: {
          id: { [Op.in]: ids },
          status: 'pending',
        },
      }
    );

    logger.info(`批量处理举报: ${result[0]} 条`);
    return result[0];
  }

  /**
   * 获取举报统计
   */
  async getReportStats(): Promise<{
    total: number;
    pending: number;
    resolved: number;
    rejected: number;
    ignored: number;
    today: number;
    byReason: Array<{ reason: string; count: number }>;
  }> {
    try {
      const [total, pending, resolved, rejected, ignored] = await Promise.all([
        CommentReport.count(),
        CommentReport.count({ where: { status: 'pending' } }),
        CommentReport.count({ where: { status: 'resolved' } }),
        CommentReport.count({ where: { status: 'rejected' } }),
        CommentReport.count({ where: { status: 'ignored' } }),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await CommentReport.count({
        where: { createdAt: { [Op.gte]: today } },
      });

      // 按原因统计
      const byReasonResults = await CommentReport.findAll({
        attributes: [
          'reason',
          [CommentReport.sequelize!.fn('COUNT', CommentReport.sequelize!.col('reason')), 'count'],
        ],
        group: ['reason'],
        raw: true,
      });

      const byReason = byReasonResults.map((item: any) => ({
        reason: item.reason,
        count: parseInt(item.count, 10),
      }));

      return {
        total,
        pending,
        resolved,
        rejected,
        ignored,
        today: todayCount,
        byReason,
      };
    } catch (error) {
      logger.error('获取举报统计失败:', error);
      throw error;
    }
  }

  /**
   * 删除举报记录
   */
  async deleteReport(id: number): Promise<void> {
    const report = await CommentReport.findByPk(id);
    if (!report) {
      throw new AppError('举报记录不存在', 404);
    }

    await report.destroy();
    logger.info(`举报记录删除: ID=${id}`);
  }

  /**
   * 创建屏蔽记录（内部方法）
   */
  private async createBlock(
    data: {
      type: 'email' | 'ip' | 'user' | 'keyword';
      value: string;
      reason?: string;
      reportId?: number;
      expiresAt?: Date | null;
    },
    createdBy: number
  ): Promise<CommentBlock> {
    const block = await CommentBlock.create({
      ...data,
      createdBy,
    });
    logger.info(`屏蔽创建成功: ${data.type}=${data.value}`);
    return block;
  }
}

export default new CommentReportService();
