import Photo from '../models/Photo';
import Blog from '../models/Blog';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { PhotoData } from '../types/photo';
import { Transaction } from 'sequelize';

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
}

export default new PhotoService();
