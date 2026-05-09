import { Op, WhereOptions } from 'sequelize';
import Comment from '../models/Comment';
import Blog from '../models/Blog';
import User from '../models/User';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import type { CommentFilters } from '@/types';

class CommentService {
  /**
   * 创建评论
   */
  async createComment(
    blogId: number,
    userId: number,
    content: string,
    parentId?: number,
    replyToId?: number
  ): Promise<Comment> {
    try {
      // 验证博客是否存在
      const blog = await Blog.findByPk(blogId);
      if (!blog) {
        throw new AppError('博客不存在', 404);
      }

      // 验证父评论是否存在（如果是回复）
      if (parentId) {
        const parentComment = await Comment.findByPk(parentId);
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
        const replyToComment = await Comment.findByPk(replyToId);
        if (!replyToComment) {
          throw new AppError('回复的评论不存在', 404);
        }

        // 确保回复的评论属于同一博客
        if (replyToComment.blogId !== blogId) {
          throw new AppError('回复的评论不属于该博客', 400);
        }
      }

      const comment = await Comment.create({
        blogId,
        userId,
        content,
        parentId,
        replyToId,
        status: 'pending', // 默认需要审核
      });

      logger.info(`评论创建成功: ID=${comment.id}, 博客ID=${blogId}, 用户ID=${userId}`);

      return comment;
    } catch (error) {
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
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatar', 'email'],
          },
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title', 'authorId'],
          },
          // {
          //   model: Comment,
          //   as: 'parent',
          //   include: [
          //     {
          //       model: User,
          //       as: 'user',
          //       attributes: ['id', 'username'],
          //     },
          //   ],
          // },
          {
            model: Comment,
            as: 'replyTo',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username'],
              },
            ],
          },
          {
            model: Comment,
            as: 'replies',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'avatar'],
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
    try {
      const comment = await Comment.findByPk(id);
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
        const blog = await Blog.findByPk(comment.blogId);
        if (!blog) {
          throw new AppError('关联的博客不存在', 404);
        }
      }

      await comment.update(updateData);

      logger.info(`评论更新成功: ID=${id}, 更新内容: ${JSON.stringify(updateData)}`);

      return comment;
    } catch (error) {
      logger.error('更新评论失败:', error);
      throw error;
    }
  }

  /**
   * 删除评论
   */
  async deleteComment(id: number, userId: number, userRole: string): Promise<void> {
    try {
      const comment = await Comment.findByPk(id);
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 检查权限
      if (userRole !== 'admin' && userRole !== 'editor') {
        if (comment.userId !== userId) {
          throw new AppError('没有权限删除该评论', 403);
        }
      }

      await comment.destroy();

      logger.info(`评论删除成功: ID=${id}, 删除者用户ID=${userId}`);
    } catch (error) {
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
   */
  async getComments(
    current: number = 1,
    size: number = 20,
    filters: CommentFilters = {}
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

      const { rows: comments, count: total } = await Comment.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname', 'avatar'],
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
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'nickname'],
              },
            ],
          },
          {
            model: Comment,
            as: 'replies',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'nickname', 'avatar'],
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

      return { comments, total };
    } catch (error) {
      logger.error('获取评论列表失败:', error);
      throw error;
    }
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
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname', 'avatar'],
          },
          {
            model: Comment,
            as: 'replies',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'nickname', 'avatar'],
              },
              {
                model: Comment,
                as: 'replyTo',
                include: [
                  {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'nickname'],
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
          // ['likes', 'DESC'], // 按点赞数排序
          ['createdAt', 'DESC'], // 然后按创建时间排序
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
    page: number = 1,
    limit: number = 20
  ): Promise<{ comments: Comment[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

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
        limit,
        order: [['createdAt', 'DESC']],
      });

      return { comments, total };
    } catch (error) {
      logger.error('获取用户评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取待审核的评论
   */
  async getPendingComments(
    page: number = 1,
    limit: number = 20
  ): Promise<{ comments: Comment[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const { rows: comments, count: total } = await Comment.findAndCountAll({
        where: {
          status: 'pending',
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatar'],
          },
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title'],
          },
        ],
        offset,
        limit,
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
    page: number = 1,
    limit: number = 20
  ): Promise<{ comments: Comment[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const { rows: comments, count: total } = await Comment.findAndCountAll({
        where: {
          content: { [Op.like]: `%${keyword}%` },
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatar'],
          },
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title'],
          },
        ],
        offset,
        limit,
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
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatar'],
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
}

export default new CommentService();
