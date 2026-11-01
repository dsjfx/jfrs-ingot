import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../models';
import BlogReaction, { ReactionType } from '../models/BlogReaction';
import Blog from '../models/Blog';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

interface ViewerContext {
  userId?: string;
  anonymousId?: string;
}

class BlogReactionService {
  /**
   * 切换反应状态（点赞/不喜欢/取消）
   */
  async toggleReaction(
    blogId: string,
    type: ReactionType,
    viewer: ViewerContext
  ): Promise<{
    reaction: ReactionType | 0;
    likeCount: number;
    dislikeCount: number;
  }> {
    // 1. 校验参数
    if (!viewer.userId && !viewer.anonymousId) {
      throw new AppError('缺少用户标识', 400);
    }
    if (![ReactionType.LIKE, ReactionType.DISLIKE].includes(type)) {
      throw new AppError('无效的反应类型', 400);
    }

    // 2. 开启事务
    const transaction = await sequelize.transaction();

    try {
      // 3. 校验文章存在
      const blog = await Blog.findByPk(blogId, { transaction });
      if (!blog) {
        throw new AppError('文章不存在', 404);
      }

      // 4. 构建查询条件
      const whereCondition: WhereOptions = { blogId };
      if (viewer.userId) {
        whereCondition.userId = viewer.userId;
      } else {
        whereCondition.anonymousId = viewer.anonymousId;
      }

      // 5. 查询现有记录
      const existing = await BlogReaction.findOne({
        where: whereCondition,
        transaction,
      });

      let reaction: ReactionType | 0 = 0;
      let likeDelta = 0;
      let dislikeDelta = 0;

      if (!existing) {
        // 情况 A：首次操作，直接插入
        await BlogReaction.create(
          {
            blogId,
            userId: viewer.userId || null,
            anonymousId: viewer.anonymousId || null,
            reactionType: type,
          },
          { transaction }
        );

        reaction = type;
        if (type === ReactionType.LIKE) likeDelta = 1;
        else dislikeDelta = 1;
      } else if (existing.reactionType === type) {
        // 情况 B：重复点击同一个按钮，取消操作
        await existing.destroy({ transaction });

        reaction = 0;
        if (type === ReactionType.LIKE) likeDelta = -1;
        else dislikeDelta = -1;
      } else {
        // 情况 C：点击了另一个按钮，切换状态
        await existing.update({ reactionType: type }, { transaction });

        reaction = type;
        if (type === ReactionType.LIKE) {
          likeDelta = 1;
          dislikeDelta = -1;
        } else {
          likeDelta = -1;
          dislikeDelta = 1;
        }
      }

      // 6. 更新主表冗余计数（原子操作）
      if (likeDelta !== 0) {
        await Blog.increment('likeCount', {
          by: likeDelta,
          where: { id: blogId },
          transaction,
        });
      }
      if (dislikeDelta !== 0) {
        await Blog.increment('dislikeCount', {
          by: dislikeDelta,
          where: { id: blogId },
          transaction,
        });
      }

      // 7. 获取最新计数
      const updatedBlog = await Blog.findByPk(blogId, {
        attributes: ['likeCount', 'dislikeCount'],
        transaction,
      });

      await transaction.commit();

      logger.info(`文章 ${blogId} 反应切换成功: ${type}`, {
        action: existing ? 'update' : 'create',
        reaction,
      });

      return {
        reaction,
        likeCount: updatedBlog!.likeCount,
        dislikeCount: updatedBlog!.dislikeCount,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('切换文章反应失败:', error);
      throw error;
    }
  }

  /**
   * 批量查询当前用户对多篇文章的反应状态
   * 用于首页文章列表展示
   */
  async getReactionStatusBatch(
    blogIds: string[],
    viewer: ViewerContext
  ): Promise<Map<string, ReactionType | 0>> {
    const result = new Map<string, ReactionType | 0>();

    if (blogIds.length === 0) return result;

    // 初始化默认值（0 表示没操作）
    blogIds.forEach(id => result.set(id, 0));

    // 如果没有用户标识，直接返回全 0
    if (!viewer.userId && !viewer.anonymousId) {
      return result;
    }

    try {
      // 构建查询条件
      const where: WhereOptions = {
        blogId: { [Op.in]: blogIds },
      };
      if (viewer.userId) {
        where.userId = viewer.userId;
      } else {
        where.anonymousId = viewer.anonymousId;
      }

      // 一次性查出所有记录
      const reactions = (await BlogReaction.findAll({
        where,
        attributes: ['blogId', 'reactionType'],
        raw: true,
      })) as any[];

      // 填充结果
      reactions.forEach(r => {
        result.set(r.blogId, r.reactionType);
      });

      return result;
    } catch (error) {
      logger.error('批量查询文章反应状态失败:', error);
      return result; // 出错时降级为全0，不阻断列表加载
    }
  }

  /**
   * 根据文章ID查询单个反应状态数据
   * @param blogId 文章ID
   * @param viewer 访客/登录用户标识
   */
  async getReactionStatus(
    blogId: string,
    viewer: ViewerContext
  ): Promise<{
    reaction: ReactionType | 0; // 当前用户的操作：1-赞，-1-踩，0-未操作
    likeCount: number; // 总点赞数
    dislikeCount: number; // 总不喜欢数
  }> {
    try {
      // 1. 校验文章存在，并获取冗余计数
      const blog = await Blog.findByPk(blogId, {
        attributes: ['likeCount', 'dislikeCount'],
      });

      if (!blog) {
        throw new AppError('文章不存在', 404);
      }

      // 2. 获取当前用户对该文章的反应状态
      // 直接复用你已有的批量查询方法，传入单元素数组
      const map = await this.getReactionStatusBatch([blogId], viewer);
      const reaction = map.get(blogId) || 0;

      // 3. 返回结果
      return {
        reaction,
        likeCount: blog.likeCount || 0,
        dislikeCount: blog.dislikeCount || 0,
      };
    } catch (error) {
      logger.error(`查询文章 ${blogId} 反应状态失败:`, error);
      throw error;
    }
  }
}

export default new BlogReactionService();
