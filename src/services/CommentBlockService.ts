import { Op, QueryTypes } from 'sequelize';
import CommentBlock from '../models/CommentBlock';
import Comment from '../models/Comment';
import User from '../models/User';
import CommentReport from '../models/CommentReport';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

interface BlockData {
  type: 'email' | 'ip' | 'user' | 'keyword';
  value: string;
  reason?: string;
  reportId?: number;
  expiresAt?: Date | null;
}

class CommentBlockService {
  /**
   * 创建屏蔽
   */
  async createBlock(data: BlockData, createdBy: number): Promise<CommentBlock> {
    try {
      // 检查是否已存在相同的屏蔽
      const existing = await CommentBlock.findOne({
        where: {
          type: data.type,
          value: data.value,
          [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
        },
      });

      if (existing) {
        throw new AppError('该屏蔽规则已存在', 400);
      }

      const block = await CommentBlock.create({
        ...data,
        createdBy,
      });

      logger.info(`屏蔽创建成功: ${data.type}=${data.value}, 原因: ${data.reason || '未指定'}`);
      return block;
    } catch (error) {
      logger.error('创建屏蔽失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否被屏蔽
   */
  async isBlocked(params: {
    email?: string;
    ip?: string;
    userId?: number;
    content?: string;
  }): Promise<{ blocked: boolean; reason?: string; block?: CommentBlock }> {
    try {
      const now = new Date();
      const activeCondition = {
        [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: now } }],
      };

      // 1. 检查邮箱屏蔽
      if (params.email) {
        const emailBlock = await CommentBlock.findOne({
          where: {
            type: 'email',
            value: params.email,
            ...activeCondition,
          },
        });
        if (emailBlock) {
          return {
            blocked: true,
            reason: emailBlock.reason || '该邮箱已被屏蔽',
            block: emailBlock,
          };
        }
      }

      // 2. 检查IP屏蔽
      if (params.ip) {
        const ipBlock = await CommentBlock.findOne({
          where: {
            type: 'ip',
            value: params.ip,
            ...activeCondition,
          },
        });
        if (ipBlock) {
          return {
            blocked: true,
            reason: ipBlock.reason || '该IP已被屏蔽',
            block: ipBlock,
          };
        }
      }

      // 3. 检查用户屏蔽
      if (params.userId) {
        const userBlock = await CommentBlock.findOne({
          where: {
            type: 'user',
            value: params.userId.toString(),
            ...activeCondition,
          },
        });
        if (userBlock) {
          return {
            blocked: true,
            reason: userBlock.reason || '该用户已被屏蔽',
            block: userBlock,
          };
        }
      }

      // 4. 检查关键词屏蔽
      if (params.content) {
        const keywordBlocks = await CommentBlock.findAll({
          where: {
            type: 'keyword',
            ...activeCondition,
          },
        });

        for (const keywordBlock of keywordBlocks) {
          if (params.content.includes(keywordBlock.value)) {
            return {
              blocked: true,
              reason: `评论内容包含违禁词：${keywordBlock.value}`,
              block: keywordBlock,
            };
          }
        }
      }

      return { blocked: false };
    } catch (error) {
      logger.error('检查屏蔽失败:', error);
      return { blocked: false };
    }
  }

  /**
   * 获取屏蔽列表
   */
  async getBlocks(
    options: {
      current?: number;
      size?: number;
      type?: string;
      keyword?: string;
      includeExpired?: boolean;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{ blocks: CommentBlock[]; total: number }> {
    try {
      const {
        current = 1,
        size = 20,
        type,
        keyword,
        includeExpired = false,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = options;

      const offset = (current - 1) * size;
      const where: any = {};

      if (type) where.type = type;

      if (keyword) {
        where[Op.or] = [
          { value: { [Op.like]: `%${keyword}%` } },
          { reason: { [Op.like]: `%${keyword}%` } },
        ];
      }

      // 是否包含过期的屏蔽
      if (!includeExpired) {
        where[Op.or] = [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }];
      }

      const { rows: blocks, count: total } = await CommentBlock.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username'],
            required: false,
          },
          {
            model: CommentReport,
            as: 'report',
            attributes: ['id', 'reason'],
            required: false,
          },
        ],
        offset,
        limit: size,
        order: [[sortBy, sortOrder]],
      });

      return { blocks, total };
    } catch (error) {
      logger.error('获取屏蔽列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取屏蔽详情
   */
  async getBlockById(id: number): Promise<CommentBlock> {
    const block = await CommentBlock.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
          required: false,
        },
        {
          model: CommentReport,
          as: 'report',
          required: false,
        },
      ],
    });

    if (!block) {
      throw new AppError('屏蔽记录不存在', 404);
    }

    return block;
  }

  /**
   * 更新屏蔽
   */
  async updateBlock(
    id: number,
    data: Partial<{
      reason: string;
      expiresAt: Date | null;
    }>
  ): Promise<CommentBlock> {
    try {
      const block = await this.getBlockById(id);
      await block.update(data);

      logger.info(`屏蔽更新成功: ID=${id}`);
      return block;
    } catch (error) {
      logger.error('更新屏蔽失败:', error);
      throw error;
    }
  }

  /**
   * 解除屏蔽
   */
  async deleteBlock(id: number): Promise<void> {
    const block = await this.getBlockById(id);
    await block.destroy();
    logger.info(`屏蔽解除: ${block.type}=${block.value}`);
  }

  /**
   * 批量删除屏蔽
   */
  async bulkDeleteBlocks(ids: number[]): Promise<number> {
    const count = await CommentBlock.destroy({
      where: { id: { [Op.in]: ids } },
    });
    logger.info(`批量解除屏蔽: ${count} 条`);
    return count;
  }

  /**
   * 快速屏蔽用户（根据评论）
   */
  async blockFromComment(
    commentId: number,
    options: {
      blockType: 'email' | 'ip' | 'user';
      duration?: number; // 天
      reason?: string;
    },
    createdBy: number
  ): Promise<CommentBlock> {
    const comment = await Comment.sequelize!.query(
      `SELECT c.userId, cu.email, cu.ip 
       FROM comments c
       LEFT JOIN comment_users cu ON c.userId = cu.id
       WHERE c.id = :commentId`,
      {
        replacements: { commentId },
        type: QueryTypes.SELECT,
      }
    );

    if (!comment || comment.length === 0) {
      throw new AppError('评论不存在', 404);
    }

    const commentData = comment[0] as any;
    let value: string;

    switch (options.blockType) {
      case 'email':
        value = commentData.email;
        break;
      case 'ip':
        value = commentData.ip;
        break;
      case 'user':
        value = commentData.userId.toString();
        break;
      default:
        throw new AppError('无效的屏蔽类型', 400);
    }

    if (!value) {
      throw new AppError('无法获取屏蔽目标值', 400);
    }

    return this.createBlock(
      {
        type: options.blockType,
        value,
        reason: options.reason || `从评论 #${commentId} 快速屏蔽`,
        expiresAt: options.duration
          ? new Date(Date.now() + options.duration * 24 * 60 * 60 * 1000)
          : null,
      },
      createdBy
    );
  }

  /**
   * 清理过期屏蔽
   */
  async cleanupExpired(): Promise<number> {
    try {
      const result = await CommentBlock.destroy({
        where: {
          expiresAt: { [Op.lt]: new Date() },
        },
        force: true, // 物理删除
      });

      if (result > 0) {
        logger.info(`清理过期屏蔽: ${result} 条`);
      }
      return result;
    } catch (error) {
      logger.error('清理过期屏蔽失败:', error);
      return 0;
    }
  }
}

export default new CommentBlockService();
