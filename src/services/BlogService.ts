import { Op, sequelize } from '../models';
import Blog from '../models/Blog';
import Category from '../models/Category';
import Tag from '../models/Tag';
import User from '../models/User';
import Comment from '../models/Comment';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import type {
  BlogFilters,
  ArchiveOptions,
  ArchiveMonthData,
  ArchiveYearData,
  ArchiveResponse,
} from '../types/blog';
import { WhereOptions, QueryTypes } from 'sequelize';
import { generateRandomOffsets, getMonthName } from '../utils/FuncUtil';
import { PhotoData } from '../types/photo';
import PhotoService from './PhotoService';
import Constance from '../utils/Constance';

class BlogService {
  /**
   * 创建博客
   * @param blogData
   * @param authorId
   * @returns
   */
  async createBlog(
    blogData: {
      title: string;
      content: string;
      summary?: string;
      coverImage?: string;
      status?: string;
      categoryId?: number;
      tagIds?: number[];
    },
    authorId: number
  ): Promise<Blog> {
    try {
      const blog = await Blog.create({
        ...blogData,
        authorId,
      });

      if (blogData.tagIds && blogData.tagIds.length > 0) {
        await blog.$set('tags', blogData.tagIds);
      }

      if (!blog.publishedAt && blogData.status === 'published') {
        blog.publishedAt = blog.createdAt;
        await blog.save();
      }

      // 更新分类博客数量
      if (blogData.categoryId) {
        await this.updateCategoryBlogCount(blogData.categoryId);
      }

      logger.info(`博客创建成功: ${blog.title}`);
      return blog;
    } catch (error) {
      logger.error('博客创建失败:', error);
      throw error;
    }
  }

  /**
   * 创建博客（带照片）
   */
  async createBlogWithPhotos(
    blogData: {
      title: string;
      content: string;
      summary?: string;
      coverImage?: string;
      coverThumbnail?: string;
      status?: string;
      categoryId?: number;
      tagIds?: number[];
    },
    authorId: number,
    photosData?: PhotoData[]
  ): Promise<Blog> {
    const transaction = await Blog.sequelize!.transaction();

    try {
      // 1. 创建博客
      const blog = await Blog.create(
        {
          ...blogData,
          authorId,
        },
        { transaction }
      );

      // 2. 保存照片
      if (photosData && photosData.length > 0) {
        const savedPhotos = await PhotoService.savePhotos(blog.id, photosData, transaction);

        // 3. 如果没有指定封面图，设置第一张为封面
        const hasCover = savedPhotos.some(p => p.isCover);
        if (!hasCover && savedPhotos.length > 0) {
          await PhotoService.setCoverPhoto(savedPhotos[0].id, blog.id, transaction);
        }
      }

      await transaction.commit();

      if (blogData.tagIds && blogData.tagIds.length > 0) {
        await blog.$set('tags', blogData.tagIds);
      }

      // 更新分类博客数量
      if (blogData.categoryId) {
        await this.updateCategoryBlogCount(blogData.categoryId);
      }

      logger.info(`博客创建成功: ${blog.title} (ID: ${blog.id})`);
      return blog;
    } catch (error) {
      await transaction.rollback();
      logger.error('博客创建失败:', error);
      throw error;
    }
  }

  /**
   * 更新博客
   * @param id
   * @param updateData
   * @param userId
   * @param userRole
   * @returns
   */
  async updateBlog(
    id: number,
    updateData: Partial<{
      title: string;
      content: string;
      summary: string;
      coverImage: string;
      status: string;
      categoryId: number;
      tagIds: number[];
      publishedAt: string;
    }>,
    userId: number,
    userRole: string
  ): Promise<Blog> {
    try {
      const blog = await Blog.findByPk(id);
      if (!blog) {
        throw new AppError('博客不存在', 404);
      }

      // 检查权限
      if (userRole !== 'admin' && blog.authorId !== userId) {
        throw new AppError('没有权限修改该博客', 403);
      }

      const oldCategoryId = blog.categoryId;

      if (!blog.publishedAt && updateData.status === 'published') {
        updateData.publishedAt = new Date().toLocaleString();
      }

      await blog.update(updateData);

      if (updateData.tagIds) {
        await blog.$set('tags', updateData.tagIds);
      }

      // 更新分类博客数量
      if (updateData.categoryId && updateData.categoryId !== oldCategoryId) {
        if (oldCategoryId) {
          await this.updateCategoryBlogCount(oldCategoryId);
        }
        await this.updateCategoryBlogCount(updateData.categoryId);
      }

      logger.info(`博客更新成功: ${blog.title}`);
      return blog;
    } catch (error) {
      logger.error('博客更新失败:', error);
      throw error;
    }
  }

  /**
   * 更新博客（带照片）
   */
  async updateBlogWithPhotos(
    id: number,
    updateData: Partial<{
      title: string;
      content: string;
      summary: string;
      coverImage: string;
      status: string;
      categoryId: number;
      tagIds: number[];
    }>,
    userId: number,
    userRole: string,
    photosData?: PhotoData[]
  ): Promise<Blog> {
    const transaction = await Blog.sequelize!.transaction();

    try {
      const blog = await Blog.findByPk(id);
      if (!blog) {
        throw new AppError('博客不存在', 404);
      }

      // 检查权限
      if (userRole !== 'admin' && blog.authorId !== userId) {
        throw new AppError('没有权限修改该博客', 403);
      }

      const oldCategoryId = blog.categoryId;

      // 更新博客
      await blog.update(updateData, { transaction });

      // 更新照片
      if (photosData && photosData.length > 0) {
        // 删除旧照片（可选，根据需求决定是否保留）
        // await PhotoService.deletePhotosByBlogId(id, transaction);

        // 添加新照片
        const savedPhotos = await PhotoService.savePhotos(id, photosData);

        // 设置封面
        if (savedPhotos.length > 0) {
          await PhotoService.setCoverPhoto(savedPhotos[0].id, id);
        }
      }

      if (updateData.tagIds) {
        await blog.$set('tags', updateData.tagIds);
      }

      // 更新分类博客数量
      if (updateData.categoryId && updateData.categoryId !== oldCategoryId) {
        if (oldCategoryId) {
          await this.updateCategoryBlogCount(oldCategoryId);
        }
        await this.updateCategoryBlogCount(updateData.categoryId);
      }

      await transaction.commit();
      logger.info(`博客更新成功: ${blog.title} (ID: ${blog.id})`);
      return blog;
    } catch (error) {
      await transaction.rollback();
      logger.error('博客更新失败:', error);
      throw error;
    }
  }

  /**
   * 删除博客
   * @param id
   * @param userId
   * @param userRole
   */
  async deleteBlog(id: number, userId: number, userRole: string): Promise<void> {
    try {
      const blog = await Blog.findByPk(id);
      if (!blog) {
        throw new AppError('博客不存在', 404);
      }

      // 检查权限
      if (userRole !== 'admin' && blog.authorId !== userId) {
        throw new AppError('没有权限删除该博客', 403);
      }

      const categoryId = blog.categoryId;
      await blog.destroy();

      // 更新分类博客数量
      if (categoryId) {
        await this.updateCategoryBlogCount(categoryId);
      }

      logger.info(`博客删除成功: ${blog.title}`);
    } catch (error) {
      logger.error('博客删除失败:', error);
      throw error;
    }
  }

  async getBlogs(
    current: number = 1,
    size: number = 10,
    filters: BlogFilters = {}
  ): Promise<{ blogs: Blog[]; total: number }> {
    try {
      const offset = (current - 1) * size;
      const where: any = {};

      if (filters.subject) {
        where.subject = filters.subject;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.authorId) {
        where.authorId = filters.authorId;
      }

      if (filters.search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${filters.search}%` } },
          { content: { [Op.like]: `%${filters.search}%` } },
        ];
      }

      const { rows: blogs, count: total } = await Blog.findAndCountAll({
        where,
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'nickname', 'avatar'] },
          { model: Category, as: 'category', attributes: ['id', 'name', 'color', 'blogCount'] },
          { model: Tag, as: 'tags', attributes: ['id', 'name', 'color', 'blogCount'] },
        ],
        distinct: true,
        offset,
        limit: size,
        order: [['createdAt', 'DESC']],
      });

      return { blogs, total };
    } catch (error) {
      logger.error('获取博客列表失败:', error);
      throw error;
    }
  }

  async getBlogById(id: number): Promise<Blog> {
    try {
      const blog = await Blog.findByPk(id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'nickname', 'avatar'] },
          { model: Category, as: 'category', attributes: ['id', 'name', 'description'] },
          { model: Tag, as: 'tags', attributes: ['id', 'name'] },
        ],
      });

      if (!blog) {
        throw new AppError('博客不存在', 404);
      }

      PhotoService.getPhotosByBlogId(id).then(photos => {
        blog.photos = photos;
      });

      // 增加浏览量
      blog.views += 1;
      await blog.save();

      return blog;
    } catch (error) {
      logger.error('获取博客详情失败:', error);
      throw error;
    }
  }

  private async updateCategoryBlogCount(categoryId: number): Promise<void> {
    try {
      const count = await Blog.count({
        where: { categoryId, status: 'published' },
      });

      await Category.update({ blogCount: count }, { where: { id: categoryId } });
    } catch (error) {
      logger.error('更新分类博客数量失败:', error);
    }
  }

  /**
   * 获取博客的评论
   */
  async getBlogComments(blogId: number, current: number = 1, size: number = 20, _sort: string) {
    try {
      const offset = (current - 1) * size;

      // 检查文章是否存在
      const blog = await Blog.findByPk(blogId, {
        attributes: ['id'],
      });

      if (!blog) {
        throw new AppError('博客不存在', 404);
      }

      // 构建排序条件
      // let order: any = [['createdAt', 'DESC']];
      // if (sort === 'oldest') {
      //   order = [['createdAt', 'ASC']];
      // } else if (sort === 'likes') {
      //   order = [['likesCount', 'DESC'], ['createdAt', 'DESC']];
      // }

      const { rows: comments, count: total } = await Comment.findAndCountAll({
        where: {
          blogId,
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
          },
        ],
        offset,
        limit: size,
        order: [
          ['createdAt', 'DESC'],
          [{ model: Comment, as: 'replies' }, 'createdAt', 'ASC'],
        ],
      });

      return { comments, total };
    } catch (error) {
      logger.error('获取博客评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取博客统计数据
   */
  async getBlogStats(blogId: number) {
    try {
      const blog = await Blog.findByPk(blogId);
      if (!blog) {
        throw new AppError('博客不存在', 404);
      }

      // 获取评论数量
      const commentCount = await Comment.count({
        where: {
          blogId,
          status: 'approved',
        },
      });

      // 获取点赞数量（评论点赞）
      const totalLikeCount = await Comment.sum('likeCount', {
        where: {
          blogId,
          status: 'approved',
        },
      });

      return {
        views: blog.views,
        commentCount,
        totalLikeCount: totalLikeCount || 0,
      };
    } catch (error) {
      logger.error('获取博客统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取相关博客
   */
  async getRelatedBlogs(blogId: number, limit: number = 5, subject: string) {
    try {
      const blog = await Blog.findByPk(blogId, {
        include: [
          { model: Category, as: 'category' },
          { model: Tag, as: 'tags' },
        ],
      });

      if (!blog) {
        throw new AppError('博客不存在', 404);
      }

      const whereConditions: any[] = [
        { id: { [Op.ne]: blogId } }, // 排除当前博客
        { status: 'published' }, // 只获取已发布的
      ];

      // 如果有分类，按分类查找
      if (blog.categoryId) {
        whereConditions.push({ categoryId: blog.categoryId });
      }

      // 如果有标签，按标签查找
      if (blog.tags && blog.tags.length > 0) {
        const tagIds = blog.tags.map(tag => tag.id);
        const relatedByTags = await Blog.findAll({
          include: [
            {
              model: Tag,
              as: 'tags',
              where: { id: { [Op.in]: tagIds } },
            },
          ],
          where: {
            id: { [Op.ne]: blogId },
            status: 'published',
            subject,
          },
          limit: limit,
        });

        // 如果按标签找到足够的博客，直接返回
        if (relatedByTags.length >= limit) {
          return relatedByTags.slice(0, limit);
        }
      }

      // 按分类查找相关博客
      const relatedBlogs = await Blog.findAll({
        where: {
          subject,
          [Op.and]: whereConditions,
        },
        include: [
          {
            model: Category,
            as: 'category',
          },
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar'],
          },
        ],
        order: [
          ['views', 'DESC'], // 按浏览量排序
          ['createdAt', 'DESC'], // 按创建时间排序
        ],
        limit: limit,
      });

      return relatedBlogs;
    } catch (error) {
      logger.error('获取相关博客失败:', error);
      throw error;
    }
  }

  /**
   * 获取随机置顶博客
   * @param limit - 返回的博客数量（默认 3 条，最大 10 条）
   * @param options - 可选配置
   * @returns 随机置顶博客数组
   */
  async getRandomTopBlogs(
    limit: number = 3,
    options: {
      status?: string;
      categoryId?: number;
      excludeIds?: number[]; // 排除指定的博客ID（用于避免重复）
    } = {}
  ): Promise<Blog[]> {
    try {
      // 1. 限制最大数量
      const maxLimit = Math.min(limit, 10);

      // 2. 构建查询条件
      const where: any = {
        isTop: 1, // 置顶博客
      };

      // 3. 添加状态过滤（默认只获取已发布的）
      if (options.status) {
        where.status = options.status;
      } else {
        where.status = 'published';
      }

      // 4. 添加分类过滤
      if (options.categoryId) {
        where.categoryId = options.categoryId;
      }

      // 5. 排除指定的博客ID
      if (options.excludeIds && options.excludeIds.length > 0) {
        where.id = { [Op.notIn]: options.excludeIds };
      }

      // 6. 先统计置顶博客总数
      const totalCount = await Blog.count({ where });

      if (totalCount === 0) {
        return [];
      }

      // 7. 随机获取指定数量的博客
      // 方法一：使用随机偏移量（适用于数据量不大的情况）
      const randomLimit = Math.min(maxLimit, totalCount);

      // 生成随机偏移量数组，确保不重复
      const randomOffsets = generateRandomOffsets(totalCount, randomLimit);

      // 并行查询随机位置的博客
      const blogs = await Promise.all(
        randomOffsets.map(async offset => {
          const blog = await Blog.findOne({
            where,
            include: [
              {
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'avatar'],
              },
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name', 'slug'],
              },
              {
                model: Tag,
                as: 'tags',
                attributes: ['id', 'name', 'slug'],
                through: { attributes: [] },
              },
            ],
            offset,
            order: [['createdAt', 'DESC']],
          });
          return blog;
        })
      );

      // 过滤掉可能为 null 的结果
      const validBlogs = blogs.filter(blog => blog !== null) as Blog[];

      // 如果结果不足，用剩余的数量补全（避免重复）
      if (validBlogs.length < maxLimit && totalCount > validBlogs.length) {
        const remainingCount = maxLimit - validBlogs.length;
        const existingIds = validBlogs.map(b => b.id);

        const additionalBlogs = await Blog.findAll({
          where: {
            ...where,
            id: { [Op.notIn]: existingIds },
          },
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'avatar'],
            },
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'slug'],
            },
            {
              model: Tag,
              as: 'tags',
              attributes: ['id', 'name', 'slug'],
              through: { attributes: [] },
            },
          ],
          order: [['createdAt', 'DESC']],
          limit: remainingCount,
        });

        validBlogs.push(...additionalBlogs);
      }

      logger.info(`获取随机置顶博客成功，返回 ${validBlogs.length} 条`);
      return validBlogs;
    } catch (error) {
      logger.error('获取随机置顶博客失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新博客状态
   */
  async bulkUpdateStatus(blogIds: number[], status: string, userId: number, userRole: string) {
    try {
      // 验证id
      if (!blogIds || !Array.isArray(blogIds) || blogIds.length === 0) {
        throw new AppError('请提供要更新的文章ID列表', 400);
      }

      // 验证状态
      if (!status || !['draft', 'published', 'archived'].includes(status)) {
        throw new AppError('无效的状态值', 400);
      }

      // 检查权限和所有权
      const where: any = { id: { [Op.in]: blogIds } };

      if (userRole !== 'admin') {
        where.authorId = userId;
      }

      const result = await Blog.update({ status }, { where });

      if (result[0] === 0) {
        throw new AppError('没有找到要更新的博客或没有权限', 404);
      }

      logger.info(`用户 ${userId} 批量更新 ${result[0]} 篇博客状态为: ${status}`);

      return result[0]; // 返回更新的数量
    } catch (error) {
      logger.error('批量更新博客状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取随机置顶博客（使用 SQL 原生方法，性能更好）
   * @param limit - 返回的博客数量（默认 3 条，最大 10 条）
   * @param options - 可选配置
   * @returns 随机置顶博客数组
   */
  async getRandomTopBlogsSQL(
    limit: number = 3,
    options: {
      status?: string;
      categoryId?: number;
      excludeIds?: number[];
      subject?: string;
    } = {}
  ): Promise<Blog[]> {
    try {
      const maxLimit = Math.min(limit, 10);

      // 构建 SQL 查询
      let sql = `
        SELECT * FROM ingot_blogs 
        WHERE is_top = 1 
        AND status = :status
        AND subject = :subject
      `;

      const replacements: any = {
        status: options.status || 'published',
        subject: options.subject || Constance.DEFAULT_SUBJECT,
      };

      if (options.categoryId) {
        sql += ` AND category_id = :categoryId`;
        replacements.categoryId = options.categoryId;
      }

      if (options.excludeIds && options.excludeIds.length > 0) {
        sql += ` AND id NOT IN (:excludeIds)`;
        replacements.excludeIds = options.excludeIds;
      }

      // 随机排序并限制数量
      sql += ` ORDER BY RAND() LIMIT :limit`;
      replacements.limit = maxLimit;

      // 执行原生查询
      const blogs = await Blog.sequelize!.query(sql, {
        replacements,
        model: Blog,
        mapToModel: true,
      });

      // 加载关联数据
      const blogsWithRelations = await Promise.all(
        blogs.map(async (blog: Blog) => {
          const fullBlog = await Blog.findByPk(blog.id, {
            include: [
              {
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'avatar'],
              },
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name', 'slug', 'color'],
              },
              {
                model: Tag,
                as: 'tags',
                attributes: ['id', 'name', 'slug', 'color'],
                through: { attributes: [] },
              },
            ],
          });
          return fullBlog;
        })
      );

      logger.info(`获取随机置顶博客成功（SQL），返回 ${blogsWithRelations.length} 条`);
      return blogsWithRelations.filter(blog => blog !== null) as Blog[];
    } catch (error) {
      logger.error('获取随机置顶博客失败（SQL）:', error);
      throw error;
    }
  }

  /**
   * 获取所有置顶博客（按时间排序）
   * @param limit - 返回的博客数量（可选，不传则返回所有）
   * @returns 置顶博客数组
   */
  async getAllTopBlogs(limit?: number): Promise<Blog[]> {
    try {
      const where: any = {
        isTop: 1,
        status: 'published',
      };

      const queryOptions: any = {
        where,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar'],
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug'],
          },
          {
            model: Tag,
            as: 'tags',
            attributes: ['id', 'name', 'slug'],
            through: { attributes: [] },
          },
        ],
        order: [['createdAt', 'DESC']],
      };

      if (limit && limit > 0) {
        queryOptions.limit = Math.min(limit, 50);
      }

      const blogs = await Blog.findAll(queryOptions);

      logger.info(`获取所有置顶博客成功，共 ${blogs.length} 条`);
      return blogs;
    } catch (error) {
      logger.error('获取所有置顶博客失败:', error);
      throw error;
    }
  }

  /**
   * 批量获取随机置顶博客（分页场景）
   * @param page - 页码
   * @param pageSize - 每页数量
   * @returns 分页的置顶博客
   */
  async getRandomTopBlogsPaginated(
    page: number = 1,
    pageSize: number = 10
  ): Promise<{
    blogs: Blog[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const where: any = {
        isTop: 1,
        status: 'published',
      };

      const total = await Blog.count({ where });

      if (total === 0) {
        return {
          blogs: [],
          total: 0,
          currentPage: page,
          totalPages: 0,
        };
      }

      const offset = (page - 1) * pageSize;
      const randomOrder = Blog.sequelize!.random();

      const blogs = await Blog.findAll({
        where,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar'],
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug'],
          },
          {
            model: Tag,
            as: 'tags',
            attributes: ['id', 'name', 'slug'],
            through: { attributes: [] },
          },
        ],
        order: [[randomOrder, 'ASC']],
        offset,
        limit: pageSize,
      });

      return {
        blogs,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error('获取随机置顶博客分页失败:', error);
      throw error;
    }
  }

  /**
   * 搜索博客
   */
  async searchBlogs(keyword: string, current: number = 1, size: number = 10) {
    try {
      const offset = (current - 1) * size;

      const { rows: blogs, count: total } = await Blog.findAndCountAll({
        where: {
          [Op.or]: [
            { title: { [Op.like]: `%${keyword}%` } },
            { content: { [Op.like]: `%${keyword}%` } },
            { summary: { [Op.like]: `%${keyword}%` } },
          ],
          status: 'published',
        },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar'],
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name'],
          },
        ],
        offset,
        limit: size,
        order: [['createdAt', 'DESC']],
      });

      return { blogs, total };
    } catch (error) {
      logger.error('搜索博客失败:', error);
      throw error;
    }
  }

  /**
   * 获取上一篇博客（按发布时间）
   * @param id - 当前博客ID
   * @param options - 可选配置
   * @returns 上一篇博客，如果没有则返回 null
   */
  async getPrevBlog(
    id: number,
    options: {
      status?: string;
      categoryId?: number;
      authorId?: number;
      subject?: string;
    } = {}
  ): Promise<Blog | null> {
    try {
      // 1. 获取当前博客的发布时间
      const currentBlog = await Blog.findByPk(id);
      if (!currentBlog) {
        throw new AppError('博客不存在', 404);
      }

      // 2. 构建查询条件
      const where: WhereOptions = {
        createdAt: {
          [Op.lt]: currentBlog.createdAt, // 发布时间早于当前博客
        },
        id: {
          [Op.ne]: id, // 排除当前博客
        },
      };

      // 3. 添加可选过滤条件
      if (options.status) {
        where.status = options.status;
      } else {
        // 默认只查询已发布的博客
        where.status = 'published';
      }

      if (options.subject) {
        where.subject = options.subject;
      }

      if (options.categoryId) {
        where.categoryId = options.categoryId;
      }

      if (options.authorId) {
        where.authorId = options.authorId;
      }

      // 4. 查询上一篇博客（按发布时间倒序，取第一个）
      const prevBlog = await Blog.findOne({
        where,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar'],
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name'],
          },
          {
            model: Tag,
            as: 'tags',
            attributes: ['id', 'name'],
          },
        ],
        order: [['createdAt', 'DESC']], // 取最近的一篇
      });

      return prevBlog;
    } catch (error) {
      logger.error('获取上一篇博客失败:', error);
      throw error;
    }
  }

  /**
   * 获取下一篇博客（按发布时间）
   * @param id - 当前博客ID
   * @param options - 可选配置
   * @returns 下一篇博客，如果没有则返回 null
   */
  async getNextBlog(
    id: number,
    options: {
      status?: string;
      categoryId?: number;
      authorId?: number;
      subject?: string;
    } = {}
  ): Promise<Blog | null> {
    try {
      // 1. 获取当前博客的发布时间
      const currentBlog = await Blog.findByPk(id);
      if (!currentBlog) {
        throw new AppError('博客不存在', 404);
      }

      // 2. 构建查询条件
      const where: WhereOptions = {
        createdAt: {
          [Op.gt]: currentBlog.createdAt, // 发布时间晚于当前博客
        },
        id: {
          [Op.ne]: id, // 排除当前博客
        },
      };

      // 3. 添加可选过滤条件
      if (options.status) {
        where.status = options.status;
      } else {
        // 默认只查询已发布的博客
        where.status = 'published';
      }

      if (options.subject) {
        where.subject = options.subject;
      }

      if (options.categoryId) {
        where.categoryId = options.categoryId;
      }

      if (options.authorId) {
        where.authorId = options.authorId;
      }

      // 4. 查询下一篇博客（按发布时间正序，取第一个）
      const nextBlog = await Blog.findOne({
        where,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar'],
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name'],
          },
          {
            model: Tag,
            as: 'tags',
            attributes: ['id', 'name'],
          },
        ],
        order: [['createdAt', 'ASC']], // 取最近的一篇
      });

      return nextBlog;
    } catch (error) {
      logger.error('获取下一篇博客失败:', error);
      throw error;
    }
  }

  /**
   * 获取相邻博客（上一篇和下一篇）
   * @param id - 当前博客ID
   * @param options - 可选配置
   * @returns 包含上一篇和下一篇的对象
   */
  async getAdjacentBlogs(
    id: number,
    options: {
      status?: string;
      categoryId?: number;
      authorId?: number;
      subject?: string;
    } = {}
  ): Promise<{
    prev: Blog | null;
    next: Blog | null;
  }> {
    try {
      // 并行查询上一篇和下一篇
      const [prev, next] = await Promise.all([
        this.getPrevBlog(id, options),
        this.getNextBlog(id, options),
      ]);

      return { prev, next };
    } catch (error) {
      logger.error('获取相邻博客失败:', error);
      throw error;
    }
  }

  /**
   * 获取相邻博客（按自定义排序）
   * @param id - 当前博客ID
   * @param sortField - 排序字段（默认 'createdAt'）
   * @param sortOrder - 排序方向（默认 'DESC'）
   * @param options - 可选配置
   */
  async getAdjacentBlogsBySort(
    id: number,
    sortField: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    options: {
      status?: string;
      categoryId?: number;
      authorId?: number;
    } = {}
  ): Promise<{
    prev: Blog | null;
    next: Blog | null;
  }> {
    try {
      // 1. 获取当前博客的排序字段值
      const currentBlog = await Blog.findByPk(id);
      if (!currentBlog) {
        throw new AppError('博客不存在', 404);
      }

      const currentValue = (currentBlog as any)[sortField];
      if (!currentValue) {
        throw new AppError(`字段 ${sortField} 不存在`, 400);
      }

      // 2. 构建查询条件
      const baseWhere: WhereOptions = {
        id: { [Op.ne]: id },
      };

      if (options.status) {
        baseWhere.status = options.status;
      } else {
        baseWhere.status = 'published';
      }

      if (options.categoryId) {
        baseWhere.categoryId = options.categoryId;
      }

      if (options.authorId) {
        baseWhere.authorId = options.authorId;
      }

      // 3. 查询上一篇和下一篇
      const [prev, next] = await Promise.all([
        // 上一篇：排序字段值小于当前值
        Blog.findOne({
          where: {
            ...baseWhere,
            [sortField]: {
              [sortOrder === 'DESC' ? Op.lt : Op.gt]: currentValue,
            },
          },
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'avatar'],
            },
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
            {
              model: Tag,
              as: 'tags',
              attributes: ['id', 'name'],
            },
          ],
          order: [[sortField, sortOrder === 'DESC' ? 'DESC' : 'ASC']],
        }),
        // 下一篇：排序字段值大于当前值
        Blog.findOne({
          where: {
            ...baseWhere,
            [sortField]: {
              [sortOrder === 'DESC' ? Op.gt : Op.lt]: currentValue,
            },
          },
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'avatar'],
            },
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
            {
              model: Tag,
              as: 'tags',
              attributes: ['id', 'name'],
            },
          ],
          order: [[sortField, sortOrder === 'DESC' ? 'ASC' : 'DESC']],
        }),
      ]);

      return { prev, next };
    } catch (error) {
      logger.error('获取相邻博客失败:', error);
      throw error;
    }
  }

  /**
   * 获取同一分类下的相邻博客
   * @param id - 当前博客ID
   * @returns 同一分类下的上一篇和下一篇
   */
  async getAdjacentBlogsInSameCategory(id: number): Promise<{
    prev: Blog | null;
    next: Blog | null;
  }> {
    try {
      const currentBlog = await Blog.findByPk(id);
      if (!currentBlog) {
        throw new AppError('博客不存在', 404);
      }

      if (!currentBlog.categoryId) {
        return { prev: null, next: null };
      }

      return this.getAdjacentBlogs(id, {
        categoryId: currentBlog.categoryId,
        status: 'published',
      });
    } catch (error) {
      logger.error('获取同一分类下的相邻博客失败:', error);
      throw error;
    }
  }

  /**
   * 获取同一作者下的相邻博客
   * @param id - 当前博客ID
   * @returns 同一作者下的上一篇和下一篇
   */
  async getAdjacentBlogsBySameAuthor(id: number): Promise<{
    prev: Blog | null;
    next: Blog | null;
  }> {
    try {
      const currentBlog = await Blog.findByPk(id);
      if (!currentBlog) {
        throw new AppError('博客不存在', 404);
      }

      return this.getAdjacentBlogs(id, {
        authorId: currentBlog.authorId,
        status: 'published',
      });
    } catch (error) {
      logger.error('获取同一作者下的相邻博客失败:', error);
      throw error;
    }
  }

  /**
   * 获取博客归档数据
   * @param options - 查询选项
   * @returns 按年月分组的归档数据
   */
  async getArchive(options: ArchiveOptions = {}): Promise<ArchiveResponse> {
    try {
      const {
        year,
        month,
        pYears = [],
        limit = 3, // 默认加载最近3年
        status = 'published',
        subject,
      } = options;

      // 1. 构建查询条件
      const where: any = { status, subject };

      if (year) {
        where.publishedAt = {
          [Op.between]: [new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59)],
        };
      }

      // 处理年份数组（优先于单个年份）
      if (pYears && pYears.length > 0) {
        const yearConditions = pYears.map(y => ({
          [Op.and]: [
            sequelize.where(sequelize.fn('YEAR', sequelize.col('published_at')), y),
            // 如果需要精确到日期的范围查询
            // sequelize.where(sequelize.col('publishedAt'), {
            //   [Op.between]: [new Date(y, 0, 1), new Date(y, 11, 31, 23, 59, 59)]
            // })
          ],
        }));

        where[Op.or] = yearConditions;
      }

      if (month && year) {
        where.publishedAt = {
          [Op.between]: [new Date(year, month - 1, 1), new Date(year, month, 0, 23, 59, 59)],
        };
      }

      // 2. 查询所有符合条件的博客
      const blogs = await Blog.findAll({
        where,
        attributes: ['id', 'title', 'publishedAt', 'summary', 'coverImage'],
        order: [['published_at', 'DESC']],
      });

      if (blogs.length === 0) {
        return {
          years: [],
          totalPosts: 0,
          totalYears: 0,
          stats: {
            earliestYear: new Date().getFullYear(),
            latestYear: new Date().getFullYear(),
            yearsWithPosts: [],
          },
        };
      }

      // 3. 按年月分组
      const groupedData: Map<number, Map<number, any[]>> = new Map();

      blogs.forEach(blog => {
        const date = new Date(blog.publishedAt);
        const blogYear = date.getFullYear();
        const blogMonth = date.getMonth() + 1;
        const blogDay = date.getDate();

        if (!groupedData.has(blogYear)) {
          groupedData.set(blogYear, new Map());
        }

        const yearMap = groupedData.get(blogYear)!;
        if (!yearMap.has(blogMonth)) {
          yearMap.set(blogMonth, []);
        }

        yearMap.get(blogMonth)!.push({
          id: blog.id,
          title: blog.title,
          publishedAt: blog.publishedAt,
          day: blogDay,
          summary: blog.summary,
          coverImage: blog.coverImage,
        });
      });

      // 4. 构建归档数据
      const years: ArchiveYearData[] = [];
      const yearsList = Array.from(groupedData.keys()).sort((a, b) => b - a);

      // 获取最近N年（或全部）
      const yearsToProcess = limit && !year ? yearsList.slice(0, limit) : yearsList;

      for (const yearNum of yearsToProcess) {
        const yearMap = groupedData.get(yearNum)!;
        const monthsData: ArchiveMonthData[] = [];
        let yearTotalCount = 0;

        // 获取该年的所有月份并排序
        const months = Array.from(yearMap.keys()).sort((a, b) => b - a);

        for (const monthNum of months) {
          const posts = yearMap.get(monthNum)!;
          const monthCount = posts.length;
          yearTotalCount += monthCount;

          monthsData.push({
            month: monthNum,
            monthName: getMonthName(monthNum),
            count: monthCount,
            posts: posts.map(post => ({
              id: post.id,
              title: post.title,
              publishedAt: post.publishedAt,
              day: post.day,
              summary: post.summary,
              coverImage: post.coverImage,
            })),
          });
        }

        years.push({
          year: yearNum,
          count: yearTotalCount,
          months: monthsData,
        });
      }

      // 5. 获取统计信息
      const allYears = yearsList;

      return {
        years,
        totalPosts: blogs.length,
        totalYears: allYears.length,
        stats: {
          earliestYear: allYears[allYears.length - 1] || new Date().getFullYear(),
          latestYear: allYears[0] || new Date().getFullYear(),
          yearsWithPosts: allYears,
        },
      };
    } catch (error) {
      logger.error('获取博客归档失败:', error);
      throw error;
    }
  }

  /**
   * 懒加载更多年份数据（滚动加载）
   */
  async getArchiveByYears(
    options: {
      years?: number[]; // 指定要加载的年份
      startYear?: number; // 起始年份
      endYear?: number; // 结束年份
      limit?: number; // 加载的年份数量
      status?: string;
      subject?: string;
    } = {}
  ): Promise<ArchiveResponse> {
    try {
      const {
        years,
        startYear,
        endYear,
        limit = 2,
        status = 'published',
        subject = Constance.DEFAULT_SUBJECT,
      } = options;
      let targetYears: number[] = [];

      if (years && years.length > 0) {
        targetYears = years;
      } else {
        // 获取所有有文章的年份
        const allYears = await this.getYearsWithPosts(status, subject);

        // 确定要加载的年份范围
        const start = startYear || (endYear ? endYear - limit : allYears[allYears.length - 1]);
        const end = endYear || (startYear ? startYear + limit : allYears[0]);

        targetYears = allYears.filter(y => y >= start && y <= end);
      }

      if (targetYears.length === 0) {
        return {
          years: [],
          totalPosts: 0,
          totalYears: 0,
          stats: {
            earliestYear: new Date().getFullYear(),
            latestYear: new Date().getFullYear(),
            yearsWithPosts: [],
          },
        };
      }

      // 查询指定年份的数据
      return await this.getArchive({
        status,
        subject,
        pYears: targetYears,
      });
    } catch (error) {
      logger.error('懒加载归档数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有有文章的年份列表
   */
  private async getYearsWithPosts(
    status: string = 'published',
    subject: string
  ): Promise<number[]> {
    const result = (await sequelize.query(
      `SELECT DISTINCT YEAR(published_at) as year 
      FROM ingot_blogs 
      WHERE status = :status AND subject = :subject
      ORDER BY year DESC`,
      {
        replacements: { status, subject },
        type: QueryTypes.SELECT,
      }
    )) as Array<{ year: number }>;

    return result.map(r => r.year);
  }
}

export default new BlogService();
