import { CommentBlockPersonal, CommentUser } from '../models';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

class CommentBlockPersonalService {
  /**
   * 屏蔽某个用户
   * Block a user from commenting or interacting with the blocker.
   *
   * @param blockerId - The ID of the user who is blocking.
   * @param blockedId - The ID of the user being blocked.
   * @param reason - Optional reason for blocking.
   * @returns The created CommentBlockPersonal record.
   * @throws AppError if the blocker and blocked are the same, or if
   * the blocked user does not exist, or if already blocked.
   */
  async block(
    blockerId: number,
    blockedId: number,
    reason?: string
  ): Promise<CommentBlockPersonal> {
    try {
      if (blockerId === blockedId) {
        throw new AppError('不能屏蔽自己', 400);
      }

      const blockedUser = await CommentUser.findByPk(blockedId);
      if (!blockedUser) {
        throw new AppError('被屏蔽的用户不存在', 404);
      }

      // 检查是否已屏蔽
      const existing = await CommentBlockPersonal.findOne({
        where: { blockerId, blockedId },
      });
      if (existing) {
        throw new AppError('你已经屏蔽过该用户', 400);
      }

      const block = await CommentBlockPersonal.create({
        blockerId,
        blockedId,
        reason,
      });

      logger.info(`用户 ${blockerId} 屏蔽了用户 ${blockedId}`);
      return block;
    } catch (error) {
      logger.error('屏蔽用户失败:', error);
      throw error;
    }
  }

  /**
   * 取消屏蔽
   * Unblock a previously blocked user.
   *
   * @param blockerId - The ID of the user who is unblocking.
   * @param blockedId - The ID of the user being unblocked.
   * @returns True if the unblock was successful.
   * @throws AppError if the unblock operation fails or if the block
   * record does not exist.
   */
  async unblock(blockerId: number, blockedId: number): Promise<boolean> {
    try {
      const count = await CommentBlockPersonal.destroy({
        where: { blockerId, blockedId },
      });

      if (count === 0) {
        throw new AppError('屏蔽记录不存在', 404);
      }

      logger.info(`用户 ${blockerId} 取消了屏蔽用户 ${blockedId}`);
      return true;
    } catch (error) {
      logger.error('取消屏蔽失败:', error);
      throw error;
    }
  }

  /**
   * 获取我的屏蔽列表
   * Get the list of users that the specified user has blocked.
   *
   * @param blockerId - The ID of the user whose block list is being retrieved.
   * @param page - The page number for pagination (default is 1).
   * @param limit - The number of records per page (default is 20).
   * @returns An object containing the list of blocked users and the total count.
   */
  async getBlocks(
    blockerId: number,
    current = 1,
    size = 20
  ): Promise<{ blocks: CommentBlockPersonal[]; total: number }> {
    try {
      const offset = (current - 1) * size;

      const { rows, count } = await CommentBlockPersonal.findAndCountAll({
        where: { blockerId },
        include: [
          {
            model: CommentUser,
            as: 'blocked',
            attributes: ['id', 'name', 'avatar'],
          },
        ],
        offset,
        limit: size,
        order: [['createdAt', 'DESC']],
      });

      return { blocks: rows, total: count };
    } catch (error) {
      logger.error('获取屏蔽列表失败:', error);
      throw error;
    }
  }
}

export default new CommentBlockPersonalService();
