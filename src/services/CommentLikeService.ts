import { Op, WhereOptions } from 'sequelize';
import { sequelize, Comment, CommentLike } from '../models';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

interface LikeUser {
  userId?: string; // 登录用户ID
  anonymousId?: string; // 访客匿名ID（从 localStorage 或 Cookie 中生成）
}

class CommentLikeService {
  /**
   * 点赞 / 取消点赞（切换）
   */
  async toggleLike(
    commentId: string,
    user: LikeUser
  ): Promise<{
    liked: boolean;
    likes: number;
  }> {
    const transaction = await sequelize.transaction();

    try {
      // 1. 校验参数：必须提供 userId 或 anonymousId 之一
      if (!user.userId && !user.anonymousId) {
        throw new AppError('缺少用户标识', 400);
      }

      // 2. 校验评论是否存在
      const comment = await Comment.findByPk(commentId, { transaction });
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 3. 查询是否已点赞
      const whereCondition: WhereOptions = { commentId };
      if (user.userId) {
        whereCondition.userId = user.userId;
      } else {
        whereCondition.anonymousId = user.anonymousId;
      }

      const existingLike = await CommentLike.findOne({
        where: whereCondition,
        transaction,
      });

      let liked: boolean;

      if (existingLike) {
        // 已点赞 → 取消点赞
        await existingLike.destroy({ transaction });

        // 同步更新评论表点赞数（原子操作）
        await Comment.decrement('likes', {
          by: 1,
          where: {
            id: commentId,
            likes: { [Op.gt]: 0 }, // 只在 > 0 时减
          },
          transaction,
        });

        liked = false;
      } else {
        // 未点赞 → 新增点赞
        await CommentLike.create(
          {
            commentId,
            userId: user.userId || null,
            anonymousId: user.anonymousId || null,
          },
          { transaction }
        );

        // 同步更新评论表点赞数（原子操作）
        await Comment.increment('likes', {
          by: 1,
          where: { id: commentId },
          transaction,
        });

        liked = true;
      }

      // 4. 获取最新点赞数
      // const likeCount = await CommentLike.count({ where: { commentId } });
      const updatedComment = await Comment.findByPk(commentId, {
        attributes: ['likes'],
        transaction,
      });
      const likeCount = updatedComment?.likes || 0;

      await transaction.commit();

      logger.info(`评论 ${commentId} ${liked ? '点赞' : '取消点赞'}，当前 ${likeCount} 赞`);

      return { liked, likes: likeCount };
    } catch (error) {
      await transaction.rollback();
      logger.error('切换点赞状态失败:', error);
      throw error;
    }
  }

  /**
   * 查询某条评论的点赞状态和数量
   */
  async getLikeStatus(
    commentId: string,
    user?: LikeUser
  ): Promise<{
    liked: boolean;
    likeCount: number;
  }> {
    try {
      // 点赞总数
      const likeCount = await CommentLike.count({ where: { commentId } });

      // 当前用户是否点赞
      let liked = false;
      if (user?.userId) {
        const count = await CommentLike.count({
          where: { commentId, userId: user.userId },
        });
        liked = count > 0;
      } else if (user?.anonymousId) {
        const count = await CommentLike.count({
          where: { commentId, anonymousId: user.anonymousId },
        });
        liked = count > 0;
      }

      return { liked, likeCount };
    } catch (error) {
      logger.error('查询点赞状态失败:', error);
      throw error;
    }
  }

  /**
   * 批量查询多条评论的点赞数和当前用户点赞状态
   * 用于列表页，避免 N+1 查询
   */
  async getLikeStatusBatch(
    commentIds: string[],
    user?: LikeUser
  ): Promise<Map<string, { liked: boolean; likeCount: number }>> {
    const result = new Map<string, { liked: boolean; likeCount: number }>();

    if (commentIds.length === 0) return result;

    try {
      // 1. 批量统计点赞数
      const counts = (await CommentLike.findAll({
        attributes: ['commentId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: { commentId: { [Op.in]: commentIds } },
        group: ['commentId'],
        raw: true,
      })) as any[];

      const countMap = new Map<string, number>();
      counts.forEach(c => countMap.set(c.commentId, parseInt(c.count, 10)));

      // 2. 批量查询当前用户点赞了哪些
      const likedSet = new Set<string>();
      if (user?.userId) {
        const likes = (await CommentLike.findAll({
          attributes: ['commentId'],
          where: {
            commentId: { [Op.in]: commentIds },
            userId: user.userId,
          },
          raw: true,
        })) as any[];
        likes.forEach(l => likedSet.add(l.commentId));
      } else if (user?.anonymousId) {
        const likes = (await CommentLike.findAll({
          attributes: ['commentId'],
          where: {
            commentId: { [Op.in]: commentIds },
            anonymousId: user.anonymousId,
          },
          raw: true,
        })) as any[];
        likes.forEach(l => likedSet.add(l.commentId));
      }

      // 3. 组装结果
      commentIds.forEach(id => {
        result.set(id, {
          liked: likedSet.has(id),
          likeCount: countMap.get(id) || 0,
        });
      });

      return result;
    } catch (error) {
      logger.error('批量查询点赞状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取某用户点赞的所有评论
   */
  async getLikedComments(user: LikeUser, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const where: any = {};
    if (user.userId) where.userId = user.userId;
    else if (user.anonymousId) where.anonymousId = user.anonymousId;
    else throw new AppError('缺少用户标识', 400);

    const { rows, count } = await CommentLike.findAndCountAll({
      where,
      include: [
        {
          model: Comment,
          as: 'comment',
          required: true,
          include: [
            { association: 'user', attributes: ['id', 'name', 'avatar'] },
            { association: 'blog', attributes: ['id', 'title'] },
          ],
        },
      ],
      offset,
      limit,
      order: [['createdAt', 'DESC']],
    });

    return { likes: rows, total: count };
  }
}

export default new CommentLikeService();
