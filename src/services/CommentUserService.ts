import { Op, Transaction } from 'sequelize';
import { Comment, CommentUser } from '../models';
import type { CommentUserData } from '../types/comment';
import logger from '../utils/logger';

class CommentUserService {
  /**
   * 查找或创建评论用户
   * 先根据邮箱查找，如果存在则更新信息，不存在则创建
   */
  async findOrCreate(
    data: CommentUserData,
    options: { transaction: Transaction }
  ): Promise<CommentUser> {
    try {
      // 根据邮箱查找用户
      let commentUser = await CommentUser.findOne({
        where: { email: data.email },
        transaction: options.transaction,
      });

      if (commentUser) {
        // 已存在，更新最新信息（昵称、网站可能会变）
        await commentUser.update({
          name: data.name || commentUser.name,
          website: data.website || commentUser.website,
          avatar: data.avatar || commentUser.avatar,
          ip: data.ip || commentUser.ip,
          userAgent: data.userAgent || commentUser.userAgent,
        });

        logger.debug(`评论用户已存在: ${commentUser.email} (ID: ${commentUser.id})`);
      } else {
        // 不存在，创建新用户
        commentUser = await CommentUser.create({
          ...data,
          commentCount: 0,
        });

        logger.info(`评论用户创建成功: ${commentUser.name} (${commentUser.email})`);
      }

      return commentUser;
    } catch (error) {
      logger.error('查找或创建评论用户失败:', error);
      throw error;
    }
  }

  /**
   * 根据邮箱查找评论用户
   */
  async findByEmail(email: string): Promise<CommentUser | null> {
    return await CommentUser.findOne({
      where: { email },
    });
  }

  /**
   * 根据ID查找评论用户
   */
  async findById(id: number): Promise<CommentUser | null> {
    return await CommentUser.findByPk(id);
  }

  /**
   * 更新评论用户统计信息
   * 在保存评论后调用
   */
  async updateCommentStats(userId: number, options: { transaction: Transaction }): Promise<void> {
    try {
      const commentCount = await Comment.count({
        where: {
          userId,
          status: 'approved', // 只统计已通过的评论
        },
        transaction: options.transaction,
      });

      const lastComment = await Comment.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']],
        attributes: ['createdAt'],
        transaction: options.transaction,
      });

      await CommentUser.update(
        {
          commentCount,
          lastCommentAt: lastComment?.createdAt || null,
        },
        { where: { id: userId }, transaction: options.transaction }
      );

      logger.debug(`更新评论用户统计: ID=${userId}, 评论数=${commentCount}`);
    } catch (error) {
      logger.error('更新评论用户统计失败:', error);
    }
  }

  /**
   * 获取评论用户列表（管理员使用）
   */
  async getCommentUsers(
    options: {
      current?: number;
      size?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{ users: CommentUser[]; total: number }> {
    try {
      const { current = 1, size = 20, search, sortBy = 'createdAt', sortOrder = 'DESC' } = options;

      const offset = (current - 1) * size;
      const where: any = {};

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { website: { [Op.like]: `%${search}%` } },
        ];
      }

      const { rows: users, count: total } = await CommentUser.findAndCountAll({
        where,
        offset,
        limit: size,
        order: [[sortBy, sortOrder]],
      });

      return { users, total };
    } catch (error) {
      logger.error('获取评论用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除评论用户
   */
  async delete(id: number): Promise<void> {
    try {
      const commentUser = await CommentUser.findByPk(id);
      if (!commentUser) {
        throw new Error('评论用户不存在');
      }

      await commentUser.destroy();
      logger.info(`评论用户删除成功: ${commentUser.email}`);
    } catch (error) {
      logger.error('删除评论用户失败:', error);
      throw error;
    }
  }
}

export default new CommentUserService();
