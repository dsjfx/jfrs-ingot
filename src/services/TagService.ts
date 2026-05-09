import { Op } from 'sequelize';
import Tag from '../models/Tag';
import Blog from '../models/Blog';
import User from '../models/User';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

interface TagFilters {
  keyword?: string;
}

class TagService {
  /**
   * 创建标签
   */
  async createTag(data: { name: string; description?: string }): Promise<Tag> {
    try {
      // 检查标签名是否已存在
      const existingTag = await Tag.findOne({
        where: { name: data.name },
      });

      if (existingTag) {
        throw new AppError('标签名称已存在', 400);
      }

      const tag = await Tag.create(data);

      logger.info(`标签创建成功: ${tag.name}`);

      return tag;
    } catch (error) {
      logger.error('创建标签失败:', error);
      throw error;
    }
  }

  /**
   * 获取标签列表
   */
  async getTags(
    page: number = 1,
    limit: number = 20,
    filters: TagFilters = {}
  ): Promise<{ tags: Tag[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      const where: any = {};

      if (filters.keyword) {
        where.name = { [Op.like]: `%${filters.keyword}%` };
      }

      const { rows: tags, count: total } = await Tag.findAndCountAll({
        where,
        offset,
        limit,
        order: [['name', 'ASC']],
      });

      return { tags, total };
    } catch (error) {
      logger.error('获取标签列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取标签详情
   */
  async getTagById(id: number): Promise<Tag> {
    try {
      const tag = await Tag.findByPk(id);

      if (!tag) {
        throw new AppError('标签不存在', 404);
      }

      return tag;
    } catch (error) {
      logger.error('获取标签详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新标签
   */
  async updateTag(
    id: number,
    updateData: Partial<{
      name: string;
      description: string;
    }>
  ): Promise<Tag> {
    try {
      const tag = await Tag.findByPk(id);
      if (!tag) {
        throw new AppError('标签不存在', 404);
      }

      // 如果更新名称，检查是否与其他标签重名
      if (updateData.name && updateData.name !== tag.name) {
        const existingTag = await Tag.findOne({
          where: { name: updateData.name },
        });

        if (existingTag) {
          throw new AppError('标签名称已存在', 400);
        }
      }

      await tag.update(updateData);

      logger.info(`标签更新成功: ${tag.name}`);

      return tag;
    } catch (error) {
      logger.error('更新标签失败:', error);
      throw error;
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(id: number): Promise<void> {
    try {
      const tag = await Tag.findByPk(id);
      if (!tag) {
        throw new AppError('标签不存在', 404);
      }

      // 检查是否有博客使用该标签
      const blogCount = await Blog.count({
        include: [
          {
            model: Tag,
            as: 'tags',
            where: { id },
          },
        ],
      });

      if (blogCount > 0) {
        throw new AppError('该标签下有博客，无法删除', 400);
      }

      await tag.destroy();

      logger.info(`标签删除成功: ${tag.name}`);
    } catch (error) {
      logger.error('删除标签失败:', error);
      throw error;
    }
  }

  /**
   * 获取标签下的博客
   */
  async getTagBlogs(
    tagId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ tag: Tag; blogs: Blog[]; total: number }> {
    try {
      const tag = await Tag.findByPk(tagId);

      if (!tag) {
        throw new AppError('标签不存在', 404);
      }

      // 获取博客列表（带分页）
      const offset = (page - 1) * limit;

      const { rows: blogs, count: total } = await Blog.findAndCountAll({
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar'],
          },
          {
            model: Tag,
            as: 'tags',
            where: { id: tagId },
          },
        ],
        where: {
          status: 'published',
        },
        offset,
        limit,
        order: [['createdAt', 'DESC']],
      });

      return { tag, blogs, total };
    } catch (error) {
      logger.error('获取标签博客失败:', error);
      throw error;
    }
  }

  /**
   * 获取标签统计
   */
  async getTagStats(): Promise<{
    total: number;
    totalBlogs: number;
    averageBlogsPerTag: number;
    topTags: Array<{ id: number; name: string; blogCount: number }>;
  }> {
    try {
      // 总标签数
      const total = await Tag.count();

      // 总博客数
      const totalBlogs = await Blog.count({ where: { status: 'published' } });

      // 平均每个标签的博客数
      const averageBlogsPerTag = total > 0 ? totalBlogs / total : 0;

      // 获取博客最多的标签
      const topTags = await Tag.findAll({
        attributes: ['id', 'name', 'blogCount'],
        order: [['blogCount', 'DESC']],
        limit: 10,
      });

      return {
        total,
        totalBlogs,
        averageBlogsPerTag,
        topTags,
      };
    } catch (error) {
      logger.error('获取标签统计失败:', error);
      throw error;
    }
  }

  /**
   * 搜索标签
   */
  async searchTags(
    keyword: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ tags: Tag[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const { rows: tags, count: total } = await Tag.findAndCountAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${keyword}%` } },
            { description: { [Op.like]: `%${keyword}%` } },
          ],
        },
        offset,
        limit,
        order: [['name', 'ASC']],
      });

      return { tags, total };
    } catch (error) {
      logger.error('搜索标签失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门标签（按博客数量排序）
   */
  async getPopularTags(limit: number = 20): Promise<Tag[]> {
    try {
      const tags = await Tag.findAll({
        order: [['blogCount', 'DESC']],
        limit,
      });

      return tags;
    } catch (error) {
      logger.error('获取热门标签失败:', error);
      throw error;
    }
  }

  /**
   * 批量创建标签
   */
  async bulkCreateTags(tags: Array<{ name: string; description?: string }>): Promise<Tag[]> {
    try {
      if (!Array.isArray(tags) || tags.length === 0) {
        throw new AppError('请提供有效的标签数组', 400);
      }

      const createdTags: Tag[] = [];

      for (const tagData of tags) {
        try {
          // 检查是否已存在
          const existing = await Tag.findOne({
            where: { name: tagData.name },
          });

          if (!existing) {
            const tag = await Tag.create(tagData);
            createdTags.push(tag);
          }
        } catch (error) {
          logger.warn(`创建标签 ${tagData.name} 失败:`, error);
        }
      }

      logger.info(`批量创建标签完成，成功创建 ${createdTags.length} 个标签`);

      return createdTags;
    } catch (error) {
      logger.error('批量创建标签失败:', error);
      throw error;
    }
  }

  /**
   * 获取或创建标签
   */
  async getOrCreateTag(name: string, description?: string): Promise<Tag> {
    try {
      let tag = await Tag.findOne({
        where: { name },
      });

      if (!tag) {
        tag = await Tag.create({
          name,
          description,
        });
        logger.info(`创建新标签: ${name}`);
      }

      return tag;
    } catch (error) {
      logger.error('获取或创建标签失败:', error);
      throw error;
    }
  }

  /**
   * 根据名称数组获取或创建标签
   */
  async getOrCreateTags(tagNames: string[]): Promise<Tag[]> {
    try {
      if (!Array.isArray(tagNames) || tagNames.length === 0) {
        return [];
      }

      const tags: Tag[] = [];

      for (const name of tagNames) {
        const trimmedName = name.trim();
        if (trimmedName) {
          const tag = await this.getOrCreateTag(trimmedName);
          tags.push(tag);
        }
      }

      return tags;
    } catch (error) {
      logger.error('批量获取或创建标签失败:', error);
      throw error;
    }
  }
}

export default new TagService();
