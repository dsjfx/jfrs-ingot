import { Request, Response, NextFunction } from 'express';
import ArchiveService from '@/services/ArchiveService';
import Constance from '@/utils/Constance';
import { ResponseFactory } from '@/utils/ResponseFactory';

class ArchiveApi {
  /**
   * 获取博客归档数据
   */
  async getArchive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 3;
      const status = (req.query.status as string) || 'published';
      const subject = (req.query.subject as string) || Constance.DEFAULT_SUBJECT;

      const result = await ArchiveService.getArchive({
        year,
        month,
        limit,
        status,
        subject,
      });

      res.json(ResponseFactory.success(result, '获取归档数据成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 懒加载更多归档年份
   */
  async getArchiveMore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startYear = req.query.startYear
        ? parseInt(req.query.startYear as string, 10)
        : undefined;
      const endYear = req.query.endYear ? parseInt(req.query.endYear as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 2;
      const status = (req.query.status as string) || 'published';
      const subject = (req.query.subject as string) || Constance.DEFAULT_SUBJECT;

      const result = await ArchiveService.getArchiveByYears({
        startYear,
        endYear,
        limit,
        status,
        subject,
      });

      res.json(ResponseFactory.success(result, '加载更多归档成功'));
    } catch (error) {
      next(error);
    }
  }
}

export default ArchiveApi;
