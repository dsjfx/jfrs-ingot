import { Op } from 'sequelize';
import Category from '../models/Category';
import Blog from '../models/Blog';
import User from '../models/User';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

interface CategoryFilters {
  search?: string;
}

class CategoryService {
  /**
   * 创建分类
   */
  async createCategory(data: { name: string; description?: string }): Promise<Category> {
    try {
      // 检查分类名是否已存在
      const existingCategory = await Category.findOne({
        where: { name: data.name },
      });

      if (existingCategory) {
        throw new AppError('分类名称已存在', 400);
      }

      const category = await Category.create(data);

      logger.info(`分类创建成功: ${category.name}`);

      return category;
    } catch (error) {
      logger.error('创建分类失败:', error);
      throw error;
    }
  }

  /**
   * 获取分类列表
   */
  async getCategories(
    current: number = 1,
    size: number = 20,
    filters: CategoryFilters = {}
  ): Promise<{ categories: Category[]; total: number }> {
    try {
      const offset = (current - 1) * size;
      const where: any = {};

      if (filters.search) {
        where.name = { [Op.like]: `%${filters.search}%` };
      }

      const { rows: categories, count: total } = await Category.findAndCountAll({
        where,
        offset,
        limit: size,
        order: [['sort', 'ASC']],
      });

      return { categories, total };
    } catch (error) {
      logger.error('获取分类列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有分类（不分页）
   * @param options - 查询选项
   * @returns 分类列表
   */
  async getAllCategories(
    options: {
      sortBy?: string; // 排序字段
      sortOrder?: 'ASC' | 'DESC'; // 排序方向
    } = {}
  ): Promise<Category[]> {
    try {
      const { sortBy = 'name', sortOrder = 'ASC' } = options;

      const where: any = {};

      const categories = await Category.findAll({
        where,
        order: [[sortBy, sortOrder]],
        attributes: ['id', 'name', 'slug', 'description', 'blogCount', 'parentId'],
      });

      logger.info(`获取所有分类成功，共 ${categories.length} 条`);
      return categories;
    } catch (error) {
      logger.error('获取所有分类失败:', error);
      throw error;
    }
  }

  /**
   * 获取分类树（层级结构）
   */
  async getCategoryTree(): Promise<any[]> {
    try {
      const categories = await this.getAllCategories();

      // 构建树形结构
      const categoryMap = new Map();
      const roots: any[] = [];

      categories.forEach(category => {
        const item = category.toJSON();
        categoryMap.set(item.id, { ...item, children: [] });
      });

      categories.forEach(category => {
        const item = categoryMap.get(category.id);
        if (category.parentId && categoryMap.has(category.parentId)) {
          categoryMap.get(category.parentId).children.push(item);
        } else {
          roots.push(item);
        }
      });

      return roots;
    } catch (error) {
      logger.error('获取分类树失败:', error);
      throw error;
    }
  }

  /**
   * 获取分类详情
   */
  async getCategoryById(id: number): Promise<Category> {
    try {
      const category = await Category.findByPk(id);

      if (!category) {
        throw new AppError('分类不存在', 404);
      }

      return category;
    } catch (error) {
      logger.error('获取分类详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新分类
   */
  async updateCategory(
    id: number,
    updateData: Partial<{
      name: string;
      description: string;
    }>
  ): Promise<Category> {
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        throw new AppError('分类不存在', 404);
      }

      // 如果更新名称，检查是否与其他分类重名
      if (updateData.name && updateData.name !== category.name) {
        const existingCategory = await Category.findOne({
          where: { name: updateData.name },
        });

        if (existingCategory) {
          throw new AppError('分类名称已存在', 400);
        }
      }

      await category.update(updateData);

      logger.info(`分类更新成功: ${category.name}`);

      return category;
    } catch (error) {
      logger.error('更新分类失败:', error);
      throw error;
    }
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: number): Promise<void> {
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        throw new AppError('分类不存在', 404);
      }

      // 检查是否有博客使用该分类
      const blogCount = await Blog.count({ where: { categoryId: id } });
      if (blogCount > 0) {
        throw new AppError('该分类下有博客，无法删除', 400);
      }

      await category.destroy();

      logger.info(`分类删除成功: ${category.name}`);
    } catch (error) {
      logger.error('删除分类失败:', error);
      throw error;
    }
  }

  /**
   * 获取分类下的博客
   */
  async getCategoryBlogs(
    categoryId: number,
    current: number = 1,
    size: number = 10
  ): Promise<{ category: Category; blogs: Blog[]; total: number }> {
    try {
      const category = await Category.findByPk(categoryId, {
        include: [
          {
            model: Blog,
            as: 'blogs',
            where: { status: 'published' },
            required: false,
            include: [
              {
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'avatar'],
              },
            ],
          },
        ],
      });

      if (!category) {
        throw new AppError('分类不存在', 404);
      }

      // 获取博客列表（带分页）
      const offset = (current - 1) * size;

      const { rows: blogs, count: total } = await Blog.findAndCountAll({
        where: {
          categoryId,
          status: 'published',
        },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar'],
          },
        ],
        offset,
        limit: size,
        order: [['createdAt', 'DESC']],
      });

      return { category, blogs, total };
    } catch (error) {
      logger.error('获取分类博客失败:', error);
      throw error;
    }
  }

  /**
   * 获取分类统计
   */
  async getCategoryStats(): Promise<{
    total: number;
    totalBlogs: number;
    averageBlogsPerCategory: number;
    topCategories: Array<{ id: number; name: string; blogCount: number }>;
  }> {
    try {
      // 总分类数
      const total = await Category.count();

      // 总博客数
      const totalBlogs = await Blog.count({ where: { status: 'published' } });

      // 平均每个分类的博客数
      const averageBlogsPerCategory = total > 0 ? totalBlogs / total : 0;

      // 获取博客最多的分类
      const topCategories = await Category.findAll({
        attributes: ['id', 'name', 'blogCount'],
        order: [['blogCount', 'DESC']],
        limit: 10,
      });

      return {
        total,
        totalBlogs,
        averageBlogsPerCategory,
        topCategories,
      };
    } catch (error) {
      logger.error('获取分类统计失败:', error);
      throw error;
    }
  }

  /**
   * 搜索分类
   */
  async searchCategories(
    keyword: string,
    current: number = 1,
    size: number = 20
  ): Promise<{ categories: Category[]; total: number }> {
    try {
      const offset = (current - 1) * size;

      const { rows: categories, count: total } = await Category.findAndCountAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${keyword}%` } },
            { description: { [Op.like]: `%${keyword}%` } },
          ],
        },
        offset,
        limit: size,
        order: [['name', 'ASC']],
      });

      return { categories, total };
    } catch (error) {
      logger.error('搜索分类失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门分类（按博客数量排序）
   */
  async getPopularCategories(size: number = 10): Promise<Category[]> {
    try {
      return await this.getAllCategories({ sortBy: 'blogCount', sortOrder: 'DESC' }).then(tags =>
        tags.slice(0, size)
      );
    } catch (error) {
      logger.error('获取热门分类失败:', error);
      throw error;
    }
  }

  /**
   * 批量创建分类
   */
  async bulkCreateCategories(
    categories: Array<{ name: string; description?: string }>
  ): Promise<Category[]> {
    try {
      if (!Array.isArray(categories) || categories.length === 0) {
        throw new AppError('请提供有效的分类数组', 400);
      }

      const createdCategories: Category[] = [];

      for (const categoryData of categories) {
        try {
          // 检查是否已存在
          const existing = await Category.findOne({
            where: { name: categoryData.name },
          });

          if (!existing) {
            const category = await Category.create(categoryData);
            createdCategories.push(category);
          }
        } catch (error) {
          logger.warn(`创建分类 ${categoryData.name} 失败:`, error);
        }
      }

      logger.info(`批量创建分类完成，成功创建 ${createdCategories.length} 个分类`);

      return createdCategories;
    } catch (error) {
      logger.error('批量创建分类失败:', error);
      throw error;
    }
  }
}

export default new CategoryService();
