import path from 'path';
import fs from 'fs/promises';
import { Readable } from 'stream';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

// 上传配置接口
interface UploadOptions {
  destination?: string;
  maxSize?: number;
  allowedTypes?: string[];
  fileName?: string;
  createThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };
  compress?: boolean;
  quality?: number;
}

// 上传结果接口
export interface UploadResult {
  filename: string;
  originalname: string;
  path?: string;
  url: string;
  size: number;
  mimetype: string;
  thumbnail?: {
    filename: string;
    path?: string;
    url: string;
    size: number;
  };
  dimensions?: {
    width: number;
    height: number;
  };
}

const getUploadPath = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // 生产环境：可以存到系统临时目录或独立数据目录
    return process.env.UPLOAD_PATH || '/home/ubuntu/uploads';
  } else {
    // 开发环境：项目目录下的文件夹
    return path.join(__dirname, '../../uploads');
  }
};

// 默认配置
const defaultOptions: UploadOptions = {
  destination: getUploadPath(),
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  createThumbnail: true,
  thumbnailSize: { width: 400, height: 400 },
  compress: true,
  quality: 85,
};

class UploadService {
  private static instance: UploadService;
  private baseUrl: string;

  private constructor() {
    // 确保上传目录存在
    this.ensureUploadDir();

    // 基础URL（用于生成访问链接）
    this.baseUrl = process.env.UPLOAD_BASE_URL || 'http://localhost:4000/uploads';
  }

  static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  /**
   * 确保上传目录存在
   */
  private async ensureUploadDir(): Promise<void> {
    const base = defaultOptions.destination!;
    const dirs = [base, path.join(base, 'temp')];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`创建上传目录: ${dir}`);
      }
    }
  }

  /**
   * 生成唯一文件名
   */
  private generateFileName(originalname: string): string {
    const ext = path.extname(originalname);
    const timestamp = Date.now();
    const random = uuidv4().split('-')[0];
    return `${timestamp}-${random}${ext}`;
  }

  /**
   * 获取文件访问URL
   */
  private getFileUrl(filename: string, subPath: string = '', isThumbnail: boolean = false): string {
    const prefix = subPath ? `${subPath}/` : '';
    const thumb = isThumbnail ? `thumbnails/` : '';
    return `${this.baseUrl}/${prefix}${thumb}${filename}`;
  }

  /**
   * 验证文件类型
   */
  private validateFileType(mimetype: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimetype);
  }

  /**
   * 从 exif buffer 中尝试解析出 "YYYY:MM:DD HH:MM:SS" 格式的日期，若解析失败返回 null
   */
  private parseExifDate(exifBuffer?: Buffer): Date | null {
    if (!exifBuffer) return null;
    try {
      const str = exifBuffer.toString('latin1');
      const m = str.match(/\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/);
      if (m && m[0]) {
        const d = m[0].replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
        return new Date(d.replace(' ', 'T'));
      }
    } catch (err) {
      logger.debug('parseExifDate failed', err);
    }
    return null;
  }

  /**
   * 获取图片的日期（优先 EXIF DateTimeOriginal，其次文件 birthtime，最后当前时间）
   */
  private async getImageDate(filePath: string): Promise<Date> {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      const exifDate = this.parseExifDate(metadata.exif as Buffer | undefined);
      if (exifDate) return exifDate;

      const stats = await fs.stat(filePath);
      if (stats.birthtimeMs && !isNaN(stats.birthtimeMs)) return stats.birthtime;
    } catch (err) {
      logger.debug('getImageDate: failed to read EXIF, fallback', err);
    }
    return new Date();
  }

  /**
   * 验证文件大小
   */
  private validateFileSize(size: number, maxSize: number): boolean {
    return size <= maxSize;
  }

  /**
   * 处理图片（压缩、调整大小、生成缩略图）
   */
  private async processImage(
    filePath: string,
    options: UploadOptions
  ): Promise<{
    dimensions: { width: number; height: number };
    thumbnail?: Buffer;
  }> {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // 获取图片尺寸
      const dimensions = {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };

      // 压缩图片
      if (options.compress) {
        let processedImage = image;

        // 根据原图尺寸调整
        if (dimensions.width > 1920) {
          processedImage = processedImage.resize(1920, null, {
            withoutEnlargement: true,
            fit: 'inside',
          });
        }

        // 根据格式压缩
        switch (metadata.format) {
          case 'jpeg':
          case 'jpg':
            await processedImage.jpeg({ quality: options.quality }).toFile(filePath + '.tmp');
            break;
          case 'png':
            await processedImage
              .png({ compressionLevel: 9, quality: options.quality })
              .toFile(filePath + '.tmp');
            break;
          case 'webp':
            await processedImage.webp({ quality: options.quality }).toFile(filePath + '.tmp');
            break;
          default:
            await processedImage.toFile(filePath + '.tmp');
        }

        // 替换原文件
        await fs.rename(filePath + '.tmp', filePath);
      }

      // 生成缩略图
      if (options.createThumbnail && options.thumbnailSize) {
        const thumbnail = await sharp(filePath)
          .resize(options.thumbnailSize.width, options.thumbnailSize.height, {
            fit: 'cover',
            position: 'center',
          })
          .toBuffer();

        return { dimensions, thumbnail };
      }

      return { dimensions };
    } catch (error) {
      logger.error('图片处理失败:', error);
      throw new AppError('图片处理失败', 500);
    }
  }

  /**
   * 单文件上传
   */
  async uploadFile(
    file: Express.Multer.File,
    options: Partial<UploadOptions> = {}
  ): Promise<UploadResult> {
    const opts = { ...defaultOptions, ...options };

    try {
      // 验证文件类型
      if (!this.validateFileType(file.mimetype, opts.allowedTypes!)) {
        throw new AppError(
          `不支持的文件类型: ${file.mimetype}，允许的类型: ${opts.allowedTypes?.join(', ')}`,
          400
        );
      }

      // 验证文件大小
      if (!this.validateFileSize(file.size, opts.maxSize!)) {
        throw new AppError(
          `文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB，最大允许: ${(opts.maxSize! / 1024 / 1024).toFixed(2)}MB`,
          400
        );
      }

      // 生成文件名
      const filename = opts.fileName || this.generateFileName(file.originalname);

      // 先确定目标子目录（year/month），仅对图片尝试读取 EXIF 获取日期
      let targetSubPath = ''; // e.g., "2026/12"
      try {
        let date = new Date();
        if (file.mimetype.startsWith('image/')) {
          date = await this.getImageDate(file.path);
        } else {
          const stats = await fs.stat(file.path);
          if (stats.birthtimeMs && !isNaN(stats.birthtimeMs)) date = stats.birthtime;
        }
        const year = date.getFullYear();
        const month = `${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        targetSubPath = `${year}/${month}`;
      } catch (err) {
        logger.debug('确定目标子目录失败，使用默认目录', err);
      }

      // 创建目标目录（以及缩略图目录）
      const destBase = opts.destination!;
      const targetDir = path.join(destBase, targetSubPath);
      const targetThumbDir = path.join(targetDir, 'thumbnails');

      await fs.mkdir(targetDir, { recursive: true });
      await fs.mkdir(targetThumbDir, { recursive: true });

      // 最终文件路径
      const filePath = path.join(targetDir, filename);

      // 移动文件到目标目录
      await fs.rename(file.path, filePath);

      // 初始化结果
      const result: UploadResult = {
        filename,
        originalname: file.originalname,
        path: targetSubPath ? path.posix.join(targetSubPath, filename) : filename,
        url: this.getFileUrl(filename, targetSubPath),
        size: file.size,
        mimetype: file.mimetype,
      };

      // 处理图片文件
      if (file.mimetype.startsWith('image/')) {
        const { dimensions, thumbnail } = await this.processImage(filePath, opts);

        result.dimensions = dimensions;

        // 保存缩略图
        if (thumbnail) {
          const thumbnailFilename = `thumb_${filename}`;
          const thumbnailPath = path.join(targetThumbDir, thumbnailFilename);
          await fs.writeFile(thumbnailPath, thumbnail);

          const thumbnailRelPath = targetSubPath
            ? path.posix.join(targetSubPath, 'thumbnails', thumbnailFilename)
            : path.posix.join('thumbnails', thumbnailFilename);

          result.thumbnail = {
            filename: thumbnailFilename,
            path: thumbnailRelPath,
            url: this.getFileUrl(thumbnailFilename, targetSubPath, true),
            size: thumbnail.length,
          };
        }
      }

      logger.info(`文件上传成功: ${filename} (${(file.size / 1024).toFixed(2)}KB)`);
      return result;
    } catch (error) {
      // 清理临时文件
      if (file.path) {
        try {
          await fs.unlink(file.path);
        } catch (err) {
          logger.error('清理临时文件失败:', err);
        }
      }
      throw error;
    }
  }

  /**
   * 批量文件上传
   */
  async uploadMultiple(
    files: Express.Multer.File[],
    options: Partial<UploadOptions> = {}
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, options);
        results.push(result);
      } catch (error) {
        errors.push({
          file: file.originalname,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    if (errors.length > 0) {
      logger.warn('批量上传部分失败:', errors);
    }

    return results;
  }

  /**
   * 在 base uploads 下查找文件（支持两层目录：year/month）
   * 返回匹配到的完整路径以及相对 subPath（用于生成 URL）
   */
  private async findFilePath(
    filename: string
  ): Promise<{ fullPath: string; subPath: string } | null> {
    const base = defaultOptions.destination!;
    // 先检查根目录
    try {
      const rootPath = path.join(base, filename);
      await fs.access(rootPath);
      return { fullPath: rootPath, subPath: '' };
    } catch (err) {
      logger.debug('check root access error', err);
    }
    try {
      const years = await fs.readdir(base);
      for (const year of years) {
        const yearPath = path.join(base, year);
        const statYear = await fs.stat(yearPath).catch(() => null);
        if (!statYear || !statYear.isDirectory()) continue;
        const months = await fs.readdir(yearPath);
        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const statMonth = await fs.stat(monthPath).catch(() => null);
          if (!statMonth || !statMonth.isDirectory()) continue;
          const candidate = path.join(monthPath, filename);
          try {
            await fs.access(candidate);
            const subPath = path.posix.join(year, month);
            return { fullPath: candidate, subPath };
          } catch (err) {
            logger.debug('check candidate access error', err);
          }
          // also check thumbnails
          const thumbCandidate = path.join(monthPath, 'thumbnails', `thumb_${filename}`);
          try {
            await fs.access(thumbCandidate);
            const subPath = path.posix.join(year, month);
            return { fullPath: thumbCandidate, subPath };
          } catch (err) {
            logger.debug('check thumb candidate access error', err);
          }
        }
      }
    } catch (err) {
      logger.debug('findFilePath error', err);
    }
    return null;
  }

  /**
   * 上传Base64图片
   */
  async uploadBase64Image(
    base64String: string,
    filename?: string,
    options: Partial<UploadOptions> = {}
  ): Promise<UploadResult> {
    try {
      // 解析base64
      const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

      if (!matches || matches.length !== 3) {
        throw new AppError('无效的base64图片格式', 400);
      }

      const mimetype = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      // 创建临时文件对象
      const tempFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: filename || `image.${mimetype.split('/')[1]}`,
        encoding: '7bit',
        mimetype,
        size: buffer.length,
        destination: '',
        filename: '',
        path: path.join(defaultOptions.destination!, 'temp', uuidv4()),
        buffer,
        stream: Readable.from(buffer), // 添加 stream 属性
      };

      // 写入临时文件
      await fs.writeFile(tempFile.path, buffer);

      // 调用文件上传
      return await this.uploadFile(tempFile, options);
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filename: string, includeThumbnail: boolean = true): Promise<boolean> {
    try {
      const found = await this.findFilePath(filename);
      if (found) {
        try {
          await fs.unlink(found.fullPath);
          logger.info(`删除文件: ${found.fullPath}`);
        } catch (error) {
          logger.warn(`删除文件失败: ${found.fullPath}`, error);
        }

        if (includeThumbnail) {
          // thumbnail name可能已经在 thumbnails 中，尝试删除
          const thumbDir = path.join(path.dirname(found.fullPath), 'thumbnails');
          const thumbPath = path.join(thumbDir, `thumb_${filename}`);
          try {
            await fs.unlink(thumbPath);
          } catch (err) {
            logger.debug('删除缩略图失败或不存在', err);
          }
        }

        return true;
      } else {
        logger.warn('删除文件失败: 未找到文件', filename);
        return false;
      }
    } catch (error) {
      logger.error('删除文件失败:', error);
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filename: string): Promise<{
    exists: boolean;
    size?: number;
    createdAt?: Date;
    url?: string;
    thumbnailUrl?: string;
  }> {
    try {
      const found = await this.findFilePath(filename);
      if (!found) return { exists: false };

      const stats = await fs.stat(found.fullPath);
      // thumbnail 是否存在
      const thumbnailDir = path.join(path.dirname(found.fullPath), 'thumbnails');
      const thumbnailPath = path.join(thumbnailDir, `thumb_${filename}`);
      const thumbnailExists = await fs
        .access(thumbnailPath)
        .then(() => true)
        .catch(() => false);

      return {
        exists: true,
        size: stats.size,
        createdAt: stats.birthtime,
        url: this.getFileUrl(path.basename(found.fullPath), found.subPath),
        thumbnailUrl: thumbnailExists
          ? this.getFileUrl(`thumb_${filename}`, found.subPath, true)
          : undefined,
      };
    } catch (error) {
      logger.error(error);
      return { exists: false };
    }
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const tempDir = path.join(defaultOptions.destination!, 'temp');
      const files = await fs.readdir(tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.birthtimeMs > maxAge) {
          await fs.unlink(filePath);
          logger.debug(`清理临时文件: ${file}`);
        }
      }
    } catch (error) {
      logger.error('清理临时文件失败:', error);
    }
  }
}

export default UploadService.getInstance();
