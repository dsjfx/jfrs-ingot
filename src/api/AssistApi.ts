import { Request, Response, NextFunction } from 'express';
import subjectsHelper from '../utils/subjectsHelper';
import { ResponseFactory } from '../utils/ResponseFactory';

class AssistApi {
  // 获取科目下拉选项
  async getSubjectsOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as string) || '';

      const subjects = await subjectsHelper.getOptions(type);
      res.json(ResponseFactory.success(subjects, '获取科目选项成功'));
    } catch (error) {
      next(error);
    }
  }
}

export default AssistApi;
