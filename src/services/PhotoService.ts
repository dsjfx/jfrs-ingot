import { CountOptions, Op, QueryTypes, Sequelize, Transaction } from 'sequelize';
import { Blog, Category, Photo, sequelize, Tag, User } from '@/models';
import { AppError } from '../middleware/errorHandler';
import { PhotoData, PhotoGroupParam, PhotoGroupResult } from '../types/photo';
import { BlogQueryParams } from '@/types/blog';
import logger from '../utils/logger';

class PhotoService {
  /**
   * 保存照片记录
   */
  async savePhoto(blogId: number, photoData: PhotoData, transaction?: Transaction): Promise<Photo> {
    try {
      const photo = await Photo.create(
        {
          blogId,
          ...photoData,
          sortOrder: photoData.sortOrder || 0,
          isCover: photoData.isCover || false,
        },
        { transaction }
      );

      // 如果是封面图，更新博客的 coverImage 字段
      if (photo.isCover) {
        await Blog.update(
          {
            coverImage: photo.url,
            coverThumbnail: photo.thumbnailUrl || photo.url,
          },
          { where: { id: blogId } }
        );
      }

      logger.info(`照片保存成功: ${photo.filename} (博客ID: ${blogId})`);
      return photo;
    } catch (error) {
      logger.error('保存照片失败:', error);
      throw error;
    }
  }

  /**
   * 批量保存照片
   */
  async savePhotos(
    blogId: number,
    photosData: PhotoData[],
    transaction?: Transaction
  ): Promise<Photo[]> {
    const savedPhotos: Photo[] = [];

    for (let i = 0; i < photosData.length; i++) {
      const photo = await this.savePhoto(
        blogId,
        {
          ...photosData[i],
          sortOrder: photosData[i].sortOrder || i,
        },
        transaction
      );
      savedPhotos.push(photo);
    }

    logger.info(`批量保存照片成功: ${savedPhotos.length} 张 (博客ID: ${blogId})`);
    return savedPhotos;
  }

  /**
   * 获取博客的所有照片
   */
  async getPhotosByBlogId(blogId: number): Promise<Photo[]> {
    try {
      const photos = await Photo.findAll({
        where: { blogId },
        order: [
          ['sortOrder', 'ASC'],
          ['createdAt', 'DESC'],
        ],
      });
      return photos;
    } catch (error) {
      logger.error('获取博客照片失败:', error);
      throw error;
    }
  }

  /**
   * 获取博客的封面图
   */
  async getCoverPhoto(blogId: number): Promise<Photo | null> {
    try {
      const coverPhoto = await Photo.findOne({
        where: { blogId, isCover: true },
      });
      return coverPhoto;
    } catch (error) {
      logger.error('获取封面图失败:', error);
      throw error;
    }
  }

  /**
   * 设置封面图
   */
  async setCoverPhoto(photoId: number, blogId: number, transaction?: Transaction): Promise<Photo> {
    // const transaction = await Photo.sequelize!.transaction();

    try {
      // 将当前博客的所有照片的 isCover 设为 false
      await Photo.update({ isCover: false }, { where: { blogId }, transaction });

      // 设置指定的照片为封面
      const photo = await Photo.findByPk(photoId, { transaction });
      if (!photo) {
        throw new AppError('照片不存在', 404);
      }

      await photo.update({ isCover: true }, { transaction });

      // 更新博客的 coverImage 字段
      await Blog.update(
        {
          coverImage: photo.url,
          coverThumbnail: photo.thumbnailUrl || photo.url,
        },
        { where: { id: blogId }, transaction }
      );

      // await transaction.commit();
      logger.info(`设置封面图成功: 照片ID ${photoId}, 博客ID ${blogId}`);
      return photo;
    } catch (error) {
      // await transaction.rollback();
      logger.error('设置封面图失败:', error);
      throw error;
    }
  }

  /**
   * 删除照片
   */
  async deletePhoto(photoId: number, blogId: number): Promise<void> {
    const transaction = await Photo.sequelize!.transaction();

    try {
      const photo = await Photo.findOne({
        where: { id: photoId, blogId },
        transaction,
      });

      if (!photo) {
        throw new AppError('照片不存在', 404);
      }

      // 如果是封面图，删除后需要重新设置封面
      const wasCover = photo.isCover;

      await photo.destroy({ transaction });

      // 如果删除的是封面图，设置第一张照片为封面
      if (wasCover) {
        const firstPhoto = await Photo.findOne({
          where: { blogId },
          order: [['sortOrder', 'ASC']],
          transaction,
        });

        if (firstPhoto) {
          await firstPhoto.update({ isCover: true }, { transaction });
          await Blog.update(
            {
              coverImage: firstPhoto.url,
              coverThumbnail: firstPhoto.thumbnailUrl || firstPhoto.url,
            },
            { where: { id: blogId }, transaction }
          );
        } else {
          // 没有照片了，清空封面
          await Blog.update(
            { coverImage: null, coverThumbnail: null },
            { where: { id: blogId }, transaction }
          );
        }
      }

      await transaction.commit();
      logger.info(`照片删除成功: ${photoId} (博客ID: ${blogId})`);
    } catch (error) {
      await transaction.rollback();
      logger.error('删除照片失败:', error);
      throw error;
    }
  }

  /**
   * 更新照片信息（描述、标签等）
   */
  async updatePhoto(
    photoId: number,
    blogId: number,
    updateData: {
      description?: string;
      tags?: string;
      sortOrder?: number;
    }
  ): Promise<Photo> {
    try {
      const photo = await Photo.findOne({
        where: { id: photoId, blogId },
      });

      if (!photo) {
        throw new AppError('照片不存在', 404);
      }

      await photo.update(updateData);
      logger.info(`照片更新成功: ${photoId}`);
      return photo;
    } catch (error) {
      logger.error('更新照片失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新照片排序
   */
  async updatePhotosOrder(
    blogId: number,
    photoOrders: { id: number; sortOrder: number }[]
  ): Promise<void> {
    const transaction = await Photo.sequelize!.transaction();

    try {
      for (const item of photoOrders) {
        await Photo.update(
          { sortOrder: item.sortOrder },
          { where: { id: item.id, blogId }, transaction }
        );
      }
      await transaction.commit();
      logger.info(`更新照片排序成功: 博客ID ${blogId}`);
    } catch (error) {
      await transaction.rollback();
      logger.error('更新照片排序失败:', error);
      throw error;
    }
  }

  /**
   * 获取博客详情（包含照片）
   */
  async getBlogWithPhotos(id: number): Promise<Blog> {
    try {
      const blog = await Blog.findByPk(id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'avatar'] },
          { model: Category, as: 'category', attributes: ['id', 'name'] },
          { model: Tag, as: 'tags', attributes: ['id', 'name'], through: { attributes: [] } },
          { model: Photo, as: 'photos' }, // 包含照片
        ],
      });

      if (!blog) {
        throw new AppError('博客不存在', 404);
      }

      // 增加浏览量
      blog.views += 1;
      await blog.save();

      return blog;
    } catch (error) {
      logger.error('获取博客详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取博客列表并同时加载照片
   */
  async getBlogsWithPhotos(options: BlogQueryParams = {}): Promise<{
    blogs: Blog[];
    total: number;
  }> {
    try {
      const {
        current = 1,
        size = 10,
        filters = {},
        includePhotos = true,
        photoLimit = 5,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = options;

      const offset = (current - 1) * size;
      const where: any = {};

      // 构建查询条件
      if (filters.subject) {
        where.subject = filters.subject;
      }

      if (filters.status) {
        where.status = filters.status;
      } else {
        where.status = 'published';
      }

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.authorId) {
        where.authorId = filters.authorId;
      }

      if (filters.isFeatured !== undefined) {
        where.isTop = filters.isFeatured;
      }

      if (filters.search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${filters.search}%` } },
          { content: { [Op.like]: `%${filters.search}%` } },
          { summary: { [Op.like]: `%${filters.search}%` } },
        ];
      }

      // 1. 先查询总数（不包含关联，性能最好）
      const total = await Blog.count({ where });

      // 2. 查询博客列表（不包含照片关联）
      const blogs = await Blog.findAll({
        where,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar', 'email'],
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
        limit: size,
        order: [[sortBy, sortOrder]],
      });

      // 3. 如果需要照片，批量查询
      if (includePhotos && blogs.length > 0) {
        const blogIds = blogs.map(blog => blog.id);

        // 获取所有相关照片
        const photos = await Photo.findAll({
          where: { blogId: { [Op.in]: blogIds } },
          order: [
            ['isCover', 'DESC'],
            ['sortOrder', 'ASC'],
            ['createdAt', 'DESC'],
          ],
        });

        // 按博客分组
        const photosMap = new Map<number, Photo[]>();
        for (const photo of photos) {
          if (!photosMap.has(photo.blogId)) {
            photosMap.set(photo.blogId, []);
          }
          const blogPhotos = photosMap.get(photo.blogId)!;
          if (blogPhotos.length < photoLimit) {
            blogPhotos.push(photo);
          }
        }

        // 附加照片到博客
        for (const blog of blogs) {
          const photos = photosMap.get(blog.id) || [];
          blog.setDataValue('photos', photos);
        }
      }

      return { blogs, total };
    } catch (error) {
      logger.error('获取博客列表（含照片）失败:', error);
      throw error;
    }
  }

  /**
   * 根据标签分组查询所有照片
   * @param options - 查询选项
   * @returns 按标签分组的照片数组
   */
  async groupPhotosByTag(
    options: PhotoGroupParam = {}
  ): Promise<{ records: PhotoGroupResult[]; total: number; safeSize: number }> {
    try {
      const {
        current = 1,
        size = 10,
        sortBy = 'name',
        sortOrder = 'DESC',
        ids,
        slugs,
        search,
        status = 'published',
        subject,
      } = options;

      // 限制每页最大数量
      const safeLimit = Math.min(size, 100);
      const offset = (current - 1) * safeLimit;

      // 1. 构建标签查询条件
      const tagWhere: any = {};
      if (ids && ids.length > 0) {
        tagWhere.id = { [Op.in]: ids };
      }
      if (slugs && slugs.length > 0) {
        tagWhere.slug = { [Op.in]: slugs };
      }
      if (search) {
        tagWhere[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      const _where = {
        ...tagWhere,
        [Op.and]: Sequelize.literal(`EXISTS (
          SELECT 1
          FROM ingot_blogs b
          INNER JOIN ingot_blog_tags c ON b.id = c.blog_id
          WHERE c.tag_id = Tag.id AND c.blog_id = b.id
            AND b.subject = $subject
            AND b.status = $status
        )`),
      };

      // 2. 查询标签总数
      const totalCount = await Tag.count({
        where: _where,
        bind: {
          subject: subject,
          status: status,
        },
      } as CountOptions);

      // 3. 查询分页的标签
      const tags = await Tag.findAll({
        where: _where,
        attributes: ['id', 'name', 'slug', 'description', 'createdAt'],
        order: [[sortBy, sortOrder]],
        offset,
        limit: safeLimit,
        bind: {
          subject: subject,
          status: status,
        },
      });

      if (tags.length === 0) {
        return { records: [], total: totalCount, safeSize: safeLimit };
      }

      const tagIdsList = tags.map(tag => tag.id);

      // 4. 查询每个标签的照片数量
      const photoCounts = (await sequelize.query(
        `SELECT 
          bt.tag_id tagId,
          COUNT(DISTINCT p.id) as photoCount
        FROM ingot_blog_tags bt
        INNER JOIN ingot_blogs b ON b.id = bt.blog_id AND b.status = :status
        INNER JOIN ingot_photos p ON p.blog_id = b.id
        WHERE bt.tag_id IN (:tagIds)
        AND b.subject = :subject
        GROUP BY bt.tag_id`,
        {
          replacements: { tagIds: tagIdsList, status, subject },
          type: QueryTypes.SELECT,
        }
      )) as Array<{ tagId: number; photoCount: string }>;

      // 构建照片数量映射
      const photoCountMap: { [key: number]: number } = {};
      photoCounts.forEach(item => {
        photoCountMap[item.tagId] = parseInt(item.photoCount, 10);
      });

      // 5. 查询每个标签的封面图（第一张照片）
      // 使用子查询获取每个标签下的第一张照片
      const coverPhotos = (await sequelize.query(
        `SELECT 
            ranked.tag_id AS tagId,
            ranked.id AS photoId,
            ranked.url,
            ranked.thumbnail_url AS thumbnailUrl,
            ranked.width,
            ranked.height,
            ranked.filename
        FROM (
            SELECT 
                bt.tag_id,
                p.id,
                p.url,
                p.thumbnail_url,
                p.width,
                p.height,
                p.filename,
                ROW_NUMBER() OVER (
                    PARTITION BY bt.tag_id 
                    ORDER BY p.is_cover DESC, p.sort_order ASC, p.created_at DESC
                ) AS rn
            FROM ingot_blog_tags bt
            INNER JOIN ingot_blogs b ON b.id = bt.blog_id AND b.status = :status
            INNER JOIN ingot_photos p ON p.blog_id = b.id
            WHERE bt.tag_id IN (:tagIds)
        ) ranked
        WHERE rn = 1
        ORDER BY tagId`,
        {
          replacements: { tagIds: tagIdsList, status },
          type: QueryTypes.SELECT,
        }
      )) as Array<{
        tagId: number;
        photoId: number;
        url: string;
        thumbnailUrl: string;
        width: number;
        height: number;
        filename: string;
      }>;

      // 构建封面图映射
      const coverMap: { [key: number]: any } = {};
      coverPhotos.forEach(photo => {
        if (!coverMap[photo.tagId]) {
          coverMap[photo.tagId] = {
            id: photo.photoId,
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl || photo.url,
            width: photo.width,
            height: photo.height,
            filename: photo.filename,
          };
        }
      });

      // 6. 组装结果
      const result = tags.map(tag => {
        const photoCount = photoCountMap[tag.id] || 0;
        const cover = coverMap[tag.id];

        return {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          description: tag.description,
          photoCount,
          coverUrl: cover?.url,
          coverThumbnail: cover?.thumbnailUrl,
          coverPhoto: cover,
        };
      });

      // 按照片数量排序（如果需要）
      if (sortBy === 'photoCount') {
        result.sort((a, b) => {
          return sortOrder === 'DESC' ? b.photoCount - a.photoCount : a.photoCount - b.photoCount;
        });
      }

      return { records: result, total: totalCount, safeSize: safeLimit };
    } catch (error) {
      logger.error('获取标签分组摘要失败:', error);
      throw error;
    }
  }

  /**
   * 根据分类分组查询所有照片
   * @param options - 查询选项
   * @returns 按分类分组的照片数组
   */
  async groupPhotosByCategory(
    options: PhotoGroupParam = {}
  ): Promise<{ records: PhotoGroupResult[]; total: number; safeSize: number }> {
    try {
      const {
        current = 1,
        size = 10,
        sortBy = 'name',
        sortOrder = 'DESC',
        ids,
        slugs,
        search,
        status = 'published',
        subject,
      } = options;

      const safeLimit = Math.min(size, 100);
      const offset = (current - 1) * safeLimit;

      // 1. 构建查询条件
      const categoryWhere: any = {};
      if (ids && ids.length > 0) {
        categoryWhere.id = { [Op.in]: ids };
      }
      if (slugs && slugs.length > 0) {
        categoryWhere.slug = { [Op.in]: slugs };
      }
      if (search) {
        categoryWhere[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      const _where = {
        ...categoryWhere,
        [Op.and]: Sequelize.literal(`EXISTS (
          SELECT 1
          FROM ingot_blogs b
          WHERE b.category_id = Category.id
            AND b.subject = $subject
            AND b.status = $status
        )`),
      };

      // 2. 查询分类总数
      const totalCount = await Category.count({
        where: _where,
        bind: {
          subject: subject,
          status: status,
        },
      } as CountOptions);

      // 3. 查询分页的分类
      const categories = await Category.findAll({
        where: _where,
        attributes: ['id', 'name', 'slug', 'description', 'createdAt'],
        order: [[sortBy, sortOrder]],
        offset,
        limit: safeLimit,
        bind: {
          subject: subject,
          status: status,
        },
      });

      if (categories.length === 0) {
        return { records: [], total: totalCount, safeSize: safeLimit };
      }

      const categoryIdsList = categories.map(c => c.id);

      // 4. 查询每个分类的照片数量
      const photoCounts = (await sequelize.query(
        `SELECT 
          b.category_id categoryId,
          COUNT(DISTINCT p.id) as photoCount
        FROM ingot_blogs b
        INNER JOIN ingot_photos p ON p.blog_id = b.id
        WHERE b.category_id IN (:categoryIds) AND b.status = :status
        GROUP BY b.category_id`,
        {
          replacements: { categoryIds: categoryIdsList, status },
          type: QueryTypes.SELECT,
        }
      )) as Array<{ categoryId: number; photoCount: string }>;

      const photoCountMap: { [key: number]: number } = {};
      photoCounts.forEach(item => {
        photoCountMap[item.categoryId] = parseInt(item.photoCount, 10);
      });

      // 5. 查询每个分类的封面图
      const coverPhotos = (await sequelize.query(
        `SELECT 
            categoryId,
            photoId,
            url,
            thumbnailUrl,
            width,
            height,
            filename
        FROM (
            SELECT 
                b.category_id AS categoryId,
                p.id AS photoId,
                p.url,
                p.thumbnail_url AS thumbnailUrl,
                p.width,
                p.height,
                p.filename,
                ROW_NUMBER() OVER (
                    PARTITION BY b.category_id 
                    ORDER BY p.is_cover DESC, p.sort_order ASC, p.created_at DESC
                ) AS rn
            FROM ingot_blogs b
            INNER JOIN ingot_photos p ON p.blog_id = b.id
            WHERE b.category_id IN (:categoryIds) AND b.status = :status
        ) t
        WHERE rn = 1
        ORDER BY categoryId`,
        {
          replacements: { categoryIds: categoryIdsList, status },
          type: QueryTypes.SELECT,
        }
      )) as Array<{
        categoryId: number;
        photoId: number;
        url: string;
        thumbnailUrl: string;
        width: number;
        height: number;
        filename: string;
      }>;

      const coverMap: { [key: number]: any } = {};
      coverPhotos.forEach(photo => {
        if (!coverMap[photo.categoryId]) {
          coverMap[photo.categoryId] = {
            id: photo.photoId,
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl || photo.url,
            width: photo.width,
            height: photo.height,
            filename: photo.filename,
          };
        }
      });

      const result = categories.map(category => {
        const photoCount = photoCountMap[category.id] || 0;
        const cover = coverMap[category.id];

        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          photoCount,
          coverUrl: cover?.url,
          coverThumbnail: cover?.thumbnailUrl,
          coverPhoto: cover,
        };
      });

      if (sortBy === 'photoCount') {
        result.sort((a, b) => {
          return sortOrder === 'DESC' ? b.photoCount - a.photoCount : a.photoCount - b.photoCount;
        });
      }

      return { records: result, total: totalCount, safeSize: safeLimit };
    } catch (error) {
      logger.error('按分类分组查询照片失败:', error);
      throw error;
    }
  }

  /**
   * 获取标签下的所有照片（分页）
   */
  async getPhotosByTag(
    tagId: number,
    options: {
      current?: number;
      size?: number;
      status?: string;
      subject?: string;
    } = {}
  ): Promise<{ photos: Photo[]; total: number; tag: Tag | null }> {
    try {
      const { current = 1, size = 20, status = 'published', subject } = options;
      const offset = (current - 1) * size;

      // 获取标签信息
      const tag = await Tag.findByPk(tagId);
      if (!tag) {
        throw new AppError('标签不存在', 404);
      }

      // 获取与该标签关联的博客ID
      const blogTags = (await sequelize.query(
        `SELECT blog_id blogId FROM ingot_blog_tags WHERE tag_id = :tagId`,
        {
          replacements: { tagId },
          type: QueryTypes.SELECT,
        }
      )) as Array<{ blogId: number }>;

      const blogIds = blogTags.map(bt => bt.blogId);

      if (blogIds.length === 0) {
        return { photos: [], total: 0, tag };
      }

      // 查询照片
      const { rows: photos, count: total } = await Photo.findAndCountAll({
        where: {
          blogId: { [Op.in]: blogIds },
        },
        include: [
          {
            model: Blog,
            as: 'blog',
            where: { status, subject },
            required: true,
            attributes: ['id', 'title', 'coverImage'],
          },
        ],
        offset,
        limit: size,
        order: [['createdAt', 'DESC']],
      });

      return { photos, total, tag };
    } catch (error) {
      logger.error('获取标签下的照片失败:', error);
      throw error;
    }
  }

  /**
   * 获取分类下的所有照片（分页）
   */
  async getPhotosByCategory(
    categoryId: number,
    options: {
      current?: number;
      size?: number;
      status?: string;
      subject?: string;
    } = {}
  ): Promise<{ photos: Photo[]; total: number; category: Category | null }> {
    try {
      const { current = 1, size = 20, status = 'published', subject } = options;
      const offset = (current - 1) * size;

      // 获取分类信息
      const category = await Category.findByPk(categoryId);
      if (!category) {
        throw new AppError('分类不存在', 404);
      }

      // 获取该分类下的博客ID
      const blogs = await Blog.findAll({
        where: {
          categoryId,
          status,
          subject,
        },
        attributes: ['id'],
      });

      const blogIds = blogs.map(blog => blog.id);

      if (blogIds.length === 0) {
        return { photos: [], total: 0, category };
      }

      // 查询照片
      const { rows: photos, count: total } = await Photo.findAndCountAll({
        where: {
          blogId: { [Op.in]: blogIds },
        },
        include: [
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title', 'coverImage'],
          },
        ],
        offset,
        limit: size,
        order: [['createdAt', 'DESC']],
      });

      return { photos, total, category };
    } catch (error) {
      logger.error('获取分类下的照片失败:', error);
      throw error;
    }
  }
}

export default new PhotoService();
