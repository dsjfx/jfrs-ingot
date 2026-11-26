import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import RequirementService from '../services/RequirementService';
import { AppError } from '../middleware/errorHandler';
import { PriorityEnum, StatusEnum, CategoryEnum, SourceEnum } from '../models/Requirement';
import { ResponseFactory } from '@/utils/ResponseFactory';

class RequirementApi {
  // 创建/更新的校验规则
  static createSchema = Joi.object({
    name: Joi.string().max(100).required(),
    system: Joi.string().max(50).required(),
    content: Joi.string().required(),
    plannedTime: Joi.date().required(),
    priority: Joi.string()
      .valid(...Object.values(PriorityEnum))
      .default(PriorityEnum.MEDIUM),
    status: Joi.string()
      .valid(...Object.values(StatusEnum))
      .default(StatusEnum.PENDING),
    category: Joi.string()
      .valid(...Object.values(CategoryEnum))
      .default(CategoryEnum.FEATURE),
    proposer: Joi.string().max(50).allow('').default(''),
    assignee: Joi.string().max(50).allow('').default(''),
    startDate: Joi.date().allow(null).allow(''),
    endDate: Joi.date().allow(null).allow(''),
    estimatedHours: Joi.number().min(0).default(0),
    tags: Joi.array().items(Joi.string()).allow(null),
    comments: Joi.string().allow('').allow(null),
    source: Joi.string()
      .valid(...Object.values(SourceEnum))
      .default(SourceEnum.INTERNAL),
    version: Joi.string().max(20).allow('').default(''),
    progress: Joi.number().min(0).max(100).default(0),
    actualHours: Joi.number().min(0).default(0),
  });

  /**
   * 创建需求
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = RequirementApi.createSchema.validate(req.body);
      if (error) throw new AppError(error.details[0].message, 400);

      // 核心修复：清洗日期字段
      const dateFields = ['startDate', 'endDate', 'actualTime', 'plannedTime'];
      dateFields.forEach(field => {
        if (value[field] === '' || value[field] === undefined) {
          value[field] = null;
        }
      });

      const currentUser = (req as any).user;
      // 假设从 token 中获取当前用户名
      const createdBy = currentUser?.username || 'system';

      const requirement = await RequirementService.create(value, createdBy);

      res.json(ResponseFactory.success(requirement, '创建成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取需求列表
   */
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const current = parseInt(req.query.current as string) || 1;
      const size = parseInt(req.query.size as string) || 20;

      const { list, total } = await RequirementService.findAll({
        current,
        size,
        keyword: req.query.keyword as string,
        system: req.query.system as string,
        status: req.query.status as StatusEnum,
        priority: req.query.priority as PriorityEnum,
        assignee: req.query.assignee as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC',
      });

      res.json(ResponseFactory.page(list, { total, current, size }, '查询成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取需求详情
   */
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) throw new AppError('无效的需求ID', 400);

      const requirement = await RequirementService.findById(id);
      res.json(ResponseFactory.success(requirement));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新需求
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) throw new AppError('无效的需求ID', 400);

      // 使用 partial 允许部分更新
      const { error, value } = RequirementApi.createSchema
        .fork(['name', 'system', 'content', 'planned_time'], schema => schema.optional())
        .validate(req.body);

      if (error) throw new AppError(error.details[0].message, 400);

      const currentUser = (req as any).user;
      const updatedBy = currentUser?.username || 'system';

      const requirement = await RequirementService.update(id, value, updatedBy);
      res.json(ResponseFactory.success(requirement, '更新成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除需求
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) throw new AppError('无效的需求ID', 400);

      await RequirementService.delete(id);
      res.json(ResponseFactory.success(null, '删除成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量删除需求
   */
  async batchDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ids = (req.body.ids as number[])
        .map(id => parseInt(id.toString(), 10))
        .filter(id => !isNaN(id));
      if (ids.length === 0) throw new AppError('无效的需求ID列表', 400);

      await RequirementService.batchDelete(ids);
      res.json(ResponseFactory.success(null, '批量删除成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 快速更新状态（看板拖拽）
   */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) throw new AppError('无效的需求ID', 400);

      const { status, progress } = req.body;
      if (!status) throw new AppError('缺少状态参数', 400);

      const currentUser = (req as any).user;
      const updatedBy = currentUser?.username || 'system';

      const requirement = await RequirementService.updateStatus(id, status, progress, updatedBy);
      res.json(ResponseFactory.success(requirement, '状态更新成功'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取系统列表（下拉框）
   */
  async getSystems(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const systems = await RequirementService.getSystems();
      res.json(ResponseFactory.success(systems));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取统计数据
   */
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await RequirementService.getStats();
      res.json(ResponseFactory.success(stats));
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取需求总览统计
   */
  async getOverviewStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await RequirementService.getOverviewStats();

      res.json(ResponseFactory.success(stats));
    } catch (error) {
      next(error);
    }
  }
}

export default RequirementApi;
