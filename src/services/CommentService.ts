import { Op, WhereOptions } from 'sequelize';
import { Comment, CommentUser, Blog, CommentReport, sequelize } from '../models';
import CommentUserService from './CommentUserService';
import type { CommentFilters, ViewerContext } from '../types';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import CommentBlockService from './CommentBlockService';
import CommentBlockPersonal from '@/models/CommentBlockPersonal';

class CommentService {
  /**
   * 创建评论
   */
  async createComment(
    blogId: number,
    userData: {
      name: string;
      email: string;
      website?: string;
      ip?: string;
      userAgent?: string;
    },
    content: string,
    parentId?: number,
    replyToId?: number,
    status: 'pending' | 'approved' | 'rejected' = 'pending'
  ): Promise<Comment> {
    const transaction = await Comment.sequelize!.transaction();

    try {
      // 0. 检查是否被屏蔽
      const blockCheck = await CommentBlockService.isBlocked({
        email: userData.email,
        ip: userData.ip,
        content: content,
      });

      if (blockCheck.blocked) {
        throw new AppError(blockCheck.reason || '您已被禁止发表评论', 403);
      }

      // 查找或创建评论用户
      const commentUser = await CommentUserService.findOrCreate(
        {
          name: userData.name,
          email: userData.email,
          website: userData.website,
          ip: userData.ip,
          userAgent: userData.userAgent,
        },
        { transaction }
      );

      // 1.5 再次检查用户级别屏蔽
      const userBlockCheck = await CommentBlockService.isBlocked({
        userId: commentUser.id,
      });

      if (userBlockCheck.blocked) {
        throw new AppError(userBlockCheck.reason || '您的账号已被禁止发表评论', 403);
      }

      // 验证博客是否存在
      const blog = await Blog.findByPk(blogId, { transaction });
      if (!blog) {
        throw new AppError('博客不存在', 404);
      }

      // 验证父评论是否存在（如果是回复）
      if (parentId) {
        const parentComment = await Comment.findByPk(parentId, { transaction });
        if (!parentComment) {
          throw new AppError('父评论不存在', 404);
        }

        // 确保父评论属于同一博客
        if (parentComment.blogId !== blogId) {
          throw new AppError('父评论不属于该博客', 400);
        }
      }

      // 验证回复的评论是否存在（如果是回复特定评论）
      if (replyToId) {
        const replyToComment = await Comment.findByPk(replyToId, { transaction });
        if (!replyToComment) {
          throw new AppError('回复的评论不存在', 404);
        }

        // 确保回复的评论属于同一博客
        if (replyToComment.blogId !== blogId) {
          throw new AppError('回复的评论不属于该博客', 400);
        }
      }

      const comment = await Comment.create(
        {
          blogId,
          userId: commentUser.id,
          content,
          parentId,
          replyToId,
          status, // 默认需要审核
        },
        { transaction }
      );

      // 更新评论用户统计
      await CommentUserService.updateCommentStats(commentUser.id, { transaction });

      await transaction.commit();

      logger.info(`评论创建成功: ID=${comment.id}, 博客ID=${blogId}, 用户ID=${commentUser.id}`);

      return (await Comment.findByPk(comment.id, {
        include: [{ model: CommentUser, as: 'user' }],
      })) as Comment;
    } catch (error) {
      await transaction.rollback();
      logger.error('创建评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取评论详情
   */
  async getCommentById(id: number): Promise<Comment> {
    try {
      const comment = await Comment.findByPk(id, {
        include: [
          {
            model: CommentUser,
            as: 'user',
            attributes: ['id', 'name', 'email', 'website', 'avatar', 'commentCount'],
          },
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title', 'authorId'],
          },
          {
            model: Comment,
            as: 'parent',
            include: [
              {
                model: CommentUser,
                as: 'user',
                attributes: ['id', 'name'],
              },
            ],
          },
          {
            model: Comment,
            as: 'replyTo',
            include: [
              {
                model: CommentUser,
                as: 'user',
                attributes: ['id', 'name'],
              },
            ],
          },
          {
            model: Comment,
            as: 'replies',
            include: [
              {
                model: CommentUser,
                as: 'user',
                attributes: ['id', 'name', 'avatar'],
              },
            ],
            where: { status: 'approved' },
            required: false,
            // 可以限制回复数量，避免加载太多数据
            limit: 20,
            order: [['createdAt', 'ASC']],
          },
        ],
      });

      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      return comment;
    } catch (error) {
      logger.error('获取评论详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新评论
   */
  async updateComment(
    id: number,
    updateData: Partial<{
      content: string;
      status: string;
    }>,
    userId: number,
    userRole: string
  ): Promise<Comment> {
    const transaction = await Comment.sequelize!.transaction();

    try {
      const comment = await Comment.findByPk(id, { transaction });
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 检查权限：管理员/编辑可以更新任何评论，普通用户只能更新自己的评论
      if (userRole !== 'admin' && userRole !== 'editor') {
        if (comment.userId !== userId) {
          throw new AppError('没有权限修改该评论', 403);
        }

        // 普通用户只能更新内容，不能更新状态
        if (updateData.status) {
          throw new AppError('没有权限修改评论状态', 403);
        }
      }

      // 如果更新状态为 approved，需要检查博客是否存在
      if (updateData.status === 'approved') {
        const blog = await Blog.findByPk(comment.blogId, { transaction });
        if (!blog) {
          throw new AppError('关联的博客不存在', 404);
        }
      }

      await comment.update(updateData);

      // 更新评论用户统计
      if (updateData.status) {
        await CommentUserService.updateCommentStats(comment.userId, { transaction });
      }

      await transaction.commit();

      logger.info(`评论更新成功: ID=${id}, 更新内容: ${JSON.stringify(updateData)}`);

      return comment;
    } catch (error) {
      await transaction.rollback();
      logger.error('更新评论失败:', error);
      throw error;
    }
  }

  /**
   * 删除评论
   */
  async deleteComment(id: number, userId: number, userRole: string): Promise<void> {
    const transaction = await Comment.sequelize!.transaction();

    try {
      const comment = await Comment.findByPk(id, { transaction });
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 检查权限
      if (userRole !== 'admin' && userRole !== 'editor') {
        if (`${comment.userId}` !== `${userId}`) {
          throw new AppError('没有权限删除该评论', 403);
        }
      }

      const commentUserId = comment.userId;
      await comment.destroy({ transaction });

      // 更新评论用户统计
      await CommentUserService.updateCommentStats(commentUserId, { transaction });

      await transaction.commit();

      logger.info(`评论删除成功: ID=${id}, 删除者用户ID=${userId}`);
    } catch (error) {
      await transaction.rollback();
      logger.error('删除评论失败:', error);
      throw error;
    }
  }

  /**
   * 点赞评论
   */
  async likeComment(commentId: number, userId: number): Promise<Comment> {
    try {
      const comment = await Comment.findByPk(commentId);
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 检查评论状态
      if (comment.status !== 'approved') {
        throw new AppError('只能点赞已审核通过的评论', 400);
      }

      // TODO: 这里可以添加防止重复点赞的逻辑
      // 例如：创建点赞记录表，检查用户是否已经点过赞

      // 增加点赞数
      comment.likes += 1;
      await comment.save();

      logger.info(`用户 ${userId} 点赞评论 ${commentId}`);

      return comment;
    } catch (error) {
      logger.error('点赞评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取评论列表
   * Get a paginated list of comments with optional filters and
   * viewer context.
   *
   * @param current - The current page number (default: 1).
   * @param size - The number of comments per page (default: 20).
   * @param filters - The filters to apply to the comment list.
   * @param viewer - The viewer context.
   */
  async getComments(
    current: number = 1,
    size: number = 20,
    filters: CommentFilters = {},
    viewer?: ViewerContext
  ): Promise<{ comments: Comment[]; total: number }> {
    try {
      const offset = (current - 1) * size;
      const where: WhereOptions = {};

      if (filters.blogId) {
        where.blogId = filters.blogId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.parentId !== undefined) {
        where.parentId = filters.parentId;
      }

      if (filters.search) {
        where.content = { [Op.like]: `%${filters.search}%` };
      }

      // 如果有访客身份，排除被该访客屏蔽的用户
      if (viewer?.viewerId) {
        // 查出当前访客屏蔽的所有用户ID
        const personalBlocks = await CommentBlockPersonal.findAll({
          where: { blockerId: viewer.viewerId },
          attributes: ['blockedId'],
          raw: true,
        });

        const blockedUserIds = personalBlocks.map(b => b.blockedId);

        if (blockedUserIds.length > 0) {
          where.userId = {
            [Op.notIn]: blockedUserIds,
          };
        }
      }
      const { rows: comments, count: total } = await Comment.findAndCountAll({
        where,
        include: [
          {
            model: CommentUser,
            as: 'user',
            attributes: ['id', 'name', 'email', 'website', 'avatar'],
          },
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title'],
          },
          {
            model: Comment,
            as: 'replyTo',
            include: [
              {
                model: CommentUser,
                as: 'user',
                attributes: ['id', 'name', 'avatar'],
              },
            ],
          },
          {
            model: Comment,
            as: 'replies',
            include: [
              {
                model: CommentUser,
                as: 'user',
                attributes: ['id', 'name', 'avatar'],
              },
            ],
            where: { status: 'approved' },
            required: false,
            separate: true, // 单独查询，避免重复数据
          },
        ],
        offset,
        limit: size,
        order: [['createdAt', 'DESC']],
      });

      // 附加举报信息
      await this.attachReportInfo(comments);

      // 附加"是否已被当前访客屏蔽"的信息
      if (viewer?.viewerId) {
        await this.attachBlockStatus(comments, viewer.viewerId);
      }

      return { comments, total };
    } catch (error) {
      logger.error('获取评论列表失败:', error);
      throw error;
    }
  }

  /**
   * 为评论列表附加举报信息
   */
  private async attachReportInfo(comments: Comment[]): Promise<void> {
    if (comments.length === 0) return;

    // 收集所有评论ID（包括回复）
    const commentIds: number[] = [];
    const collectIds = (list: Comment[]) => {
      list.forEach(c => {
        commentIds.push(c.id);
        if (c.replies) {
          collectIds(c.replies);
        }
      });
    };
    collectIds(comments);

    if (commentIds.length === 0) return;

    // 一次性统计所有评论的举报数（按状态分组）
    const reportStats = (await CommentReport.findAll({
      attributes: ['commentId', 'status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: {
        commentId: { [Op.in]: commentIds },
      },
      group: ['commentId', 'status'],
      raw: true,
    })) as any[];

    // 构建映射：commentId -> { total, pending, resolved, rejected, ignored }
    const reportMap = new Map<
      number,
      {
        total: number;
        pending: number;
        resolved: number;
        rejected: number;
        ignored: number;
      }
    >();

    for (const stat of reportStats) {
      const commentId = stat.commentId;
      const count = parseInt(stat.count, 10);

      if (!reportMap.has(commentId)) {
        reportMap.set(commentId, {
          total: 0,
          pending: 0,
          resolved: 0,
          rejected: 0,
          ignored: 0,
        });
      }

      const info = reportMap.get(commentId)!;
      info.total += count;
      info[stat.status as keyof typeof info] = count;
    }

    // 附加到每个评论
    const attachToComment = (comment: Comment) => {
      const info = reportMap.get(comment.id);

      (comment as any).reportInfo = info || {
        total: 0,
        pending: 0,
        resolved: 0,
        rejected: 0,
        ignored: 0,
      };

      comment.setDataValue('isReported', (info?.total || 0) > 0);

      // 递归处理回复
      if ((comment as any).replies) {
        (comment as any).replies.forEach(attachToComment);
      }
    };

    comments.forEach(attachToComment);
  }

  /**
   * 附加"是否被当前访客屏蔽"信息
   */
  private async attachBlockStatus(comments: Comment[], viewerId: number) {
    if (comments.length === 0) return;

    // 收集评论用户ID
    const commentUserIds = [...new Set(comments.map(c => c.userId))];

    // 查询当前访客屏蔽了哪些评论用户
    const blocks = await CommentBlockPersonal.findAll({
      where: {
        blockerId: viewerId,
        blockedId: { [Op.in]: commentUserIds },
      },
      attributes: ['blockedId'],
      raw: true,
    });

    const blockedSet = new Set(blocks.map(b => b.blockedId));

    // 附加到评论
    comments.forEach(comment => {
      comment.setDataValue('isBlocked', blockedSet.has(comment.userId));
    });
  }

  /**
   * 获取博客的评论
   */
  async getBlogComments(
    blogId: number,
    current: number = 1,
    size: number = 20,
    showPending: boolean = false
  ): Promise<{ comments: Comment[]; total: number }> {
    try {
      const blog = await Blog.findByPk(blogId);
      if (!blog) {
        throw new AppError('博客不存在', 404);
      }

      const offset = (current - 1) * size;
      const where: any = {
        blogId,
        parentId: null, // 只获取顶级评论
      };

      // 默认只显示已审核的评论，除非特别指定
      if (!showPending) {
        where.status = 'approved';
      }

      const { rows: comments, count: total } = await Comment.findAndCountAll({
        where,
        include: [
          {
            model: CommentUser,
            as: 'user',
            attributes: ['id', 'name', 'website', 'avatar'],
          },
          {
            model: Comment,
            as: 'replies',
            include: [
              {
                model: CommentUser,
                as: 'user',
                attributes: ['id', 'name', 'website', 'avatar'],
              },
              {
                model: Comment,
                as: 'replyTo',
                include: [
                  {
                    model: CommentUser,
                    as: 'user',
                    attributes: ['id', 'name'],
                  },
                ],
              },
            ],
            where: showPending ? {} : { status: 'approved' },
            required: false,
            separate: true,
            order: [['createdAt', 'ASC']],
          },
        ],
        offset,
        limit: size,
        order: [
          ['createdAt', 'DESC'], // 然后按创建时间排序
          ['likes', 'DESC'], // 按点赞数排序
        ],
      });

      return { comments, total };
    } catch (error) {
      logger.error('获取博客评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的评论
   */
  async getUserComments(
    userId: number,
    current: number = 1,
    size: number = 20
  ): Promise<{ comments: Comment[]; total: number }> {
    try {
      const offset = (current - 1) * size;

      const { rows: comments, count: total } = await Comment.findAndCountAll({
        where: {
          userId,
          status: 'approved', // 只显示已审核的
        },
        include: [
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title', 'authorId'],
          },
        ],
        offset,
        limit: size,
        order: [['createdAt', 'DESC']],
      });

      return { comments, total };
    } catch (error) {
      logger.error('获取用户评论失败:', error);
      throw error;
    }
  }

  /**
   * 根据邮箱获取评论用户的评论
   */
  async getCommentsByEmail(
    email: string,
    current: number = 1,
    size: number = 20
  ): Promise<{ comments: Comment[]; total: number }> {
    try {
      // 先找评论用户
      const commentUser = await CommentUser.findOne({ where: { email } });
      if (!commentUser) {
        return { comments: [], total: 0 };
      }

      return this.getUserComments(commentUser.id, current, size);
    } catch (error) {
      logger.error('根据邮箱获取评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取待审核的评论
   */
  async getPendingComments(
    current: number = 1,
    size: number = 20
  ): Promise<{ comments: Comment[]; total: number }> {
    try {
      const offset = (current - 1) * size;

      const { rows: comments, count: total } = await Comment.findAndCountAll({
        where: {
          status: 'pending',
        },
        include: [
          {
            model: CommentUser,
            as: 'user',
            attributes: ['id', 'name', 'website', 'avatar'],
          },
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title'],
          },
        ],
        offset,
        limit: size,
        order: [['createdAt', 'ASC']], // 按创建时间升序，先审核早的
      });

      return { comments, total };
    } catch (error) {
      logger.error('获取待审核评论失败:', error);
      throw error;
    }
  }

  /**
   * 审核评论
   */
  async moderateComment(commentId: number, status: 'approved' | 'rejected'): Promise<Comment> {
    try {
      const comment = await Comment.findByPk(commentId);
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      if (comment.status !== 'pending') {
        throw new AppError('只能审核待处理的评论', 400);
      }

      comment.status = status;
      await comment.save();

      logger.info(`评论审核完成: ID=${commentId}, 状态=${status}`);

      return comment;
    } catch (error) {
      logger.error('审核评论失败:', error);
      throw error;
    }
  }

  /**
   * 批量审核评论
   */
  async bulkModerateComments(
    commentIds: number[],
    status: 'approved' | 'rejected'
  ): Promise<number> {
    try {
      const result = await Comment.update(
        { status },
        {
          where: {
            id: { [Op.in]: commentIds },
            status: 'pending', // 只更新待处理的
          },
        }
      );

      const updatedCount = result[0];
      logger.info(`批量审核评论完成: 共审核 ${updatedCount} 条评论, 状态=${status}`);

      return updatedCount;
    } catch (error) {
      logger.error('批量审核评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取评论统计数据
   */
  async getCommentStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    today: number;
  }> {
    try {
      // 总评论数
      const total = await Comment.count();

      // 按状态统计
      const approved = await Comment.count({ where: { status: 'approved' } });
      const pending = await Comment.count({ where: { status: 'pending' } });
      const rejected = await Comment.count({ where: { status: 'rejected' } });

      // 今日评论数
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayCount = await Comment.count({
        where: {
          createdAt: {
            [Op.gte]: today,
          },
        },
      });

      return {
        total,
        approved,
        pending,
        rejected,
        today: todayCount,
      };
    } catch (error) {
      logger.error('获取评论统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 搜索评论
   */
  async searchComments(
    keyword: string,
    current: number = 1,
    size: number = 20
  ): Promise<{ comments: Comment[]; total: number }> {
    try {
      const offset = (current - 1) * size;

      const { rows: comments, count: total } = await Comment.findAndCountAll({
        where: {
          content: { [Op.like]: `%${keyword}%` },
        },
        include: [
          {
            model: CommentUser,
            as: 'user',
            attributes: ['id', 'name', 'email', 'avatar'],
            where: {
              [Op.or]: [
                { name: { [Op.like]: `%${keyword}%` } },
                { email: { [Op.like]: `%${keyword}%` } },
              ],
            },
            required: false,
          },
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title'],
          },
        ],
        offset,
        limit: size,
        order: [['createdAt', 'DESC']],
      });

      return { comments, total };
    } catch (error) {
      logger.error('搜索评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门评论（按点赞数）
   */
  async getPopularComments(limit: number = 10): Promise<Comment[]> {
    try {
      const comments = await Comment.findAll({
        where: {
          status: 'approved',
          parentId: null, // 只获取顶级评论
        },
        include: [
          {
            model: CommentUser,
            as: 'user',
            attributes: ['id', 'name', 'email', 'avatar'],
          },
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title'],
          },
        ],
        limit,
        order: [['likes', 'DESC']],
      });

      return comments;
    } catch (error) {
      logger.error('获取热门评论失败:', error);
      throw error;
    }
  }

  /**
   * 批量创建评论（用于导入数据）
   */
  async bulkCreateComments(
    comments: Array<{
      blogId: number;
      userData: {
        name: string;
        email: string;
        website?: string;
      };
      content: string;
    }>
  ): Promise<Comment[]> {
    const results: Comment[] = [];

    for (const item of comments) {
      const comment = await this.createComment(item.blogId, item.userData, item.content);
      results.push(comment);
    }

    return results;
  }
}

export default new CommentService();
