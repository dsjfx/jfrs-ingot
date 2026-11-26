import { Op, WhereOptions } from 'sequelize';
import Requirement, { StatusEnum, PriorityEnum } from '../models/Requirement';
import { sequelize } from '../models';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface RequirementQueryParams {
  current?: number;
  size?: number;
  keyword?: string;
  system?: string;
  status?: StatusEnum;
  priority?: PriorityEnum;
  assignee?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

class RequirementService {
  /**
   * 创建需求
   */
  async create(data: any, createdBy: string): Promise<Requirement> {
    try {
      const requirement = await Requirement.create({
        ...data,
        created_by: createdBy,
        updated_by: createdBy,
      });
      logger.info(`需求创建成功: ${requirement.name} (ID: ${requirement.id})`);
      return requirement;
    } catch (error) {
      logger.error('创建需求失败:', error);
      throw error;
    }
  }

  /**
   * 分页查询需求列表
   */
  async findAll(params: RequirementQueryParams): Promise<{
    list: Requirement[];
    total: number;
    current: number;
    size: number;
    totalPages: number;
  }> {
    try {
      const {
        current = 1,
        size = 20,
        keyword,
        system,
        status,
        priority,
        assignee,
        startDate,
        endDate,
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = params;

      const offset = (current - 1) * size;
      const where: WhereOptions = {};

      // 关键词搜索（需求名称或内容）
      if (keyword) {
        (where as any)[Op.or] = [
          { name: { [Op.like]: `%${keyword}%` } },
          { content: { [Op.like]: `%${keyword}%` } },
        ];
      }

      if (system) (where as any).system = system;
      if (status) (where as any).status = status;
      if (priority) (where as any).priority = priority;
      if (assignee) (where as any).assignee = assignee;

      // 计划时间范围过滤
      if (startDate && endDate) {
        (where as any).planned_time = {
          [Op.between]: [startDate, endDate],
        };
      } else if (startDate) {
        (where as any).planned_time = { [Op.gte]: startDate };
      } else if (endDate) {
        (where as any).planned_time = { [Op.lte]: endDate };
      }

      const { rows: list, count: total } = await Requirement.findAndCountAll({
        where,
        offset,
        limit: size,
        order: [[sortBy, sortOrder]],
      });

      return {
        list,
        total,
        current,
        size,
        totalPages: Math.ceil(total / size),
      };
    } catch (error) {
      logger.error('查询需求列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取需求详情
   */
  async findById(id: number): Promise<Requirement> {
    const requirement = await Requirement.findByPk(id);
    if (!requirement) {
      throw new AppError('需求不存在', 404);
    }
    return requirement;
  }

  /**
   * 更新需求基础信息
   */
  async update(id: number, data: any, updatedBy: string): Promise<Requirement> {
    const requirement = await this.findById(id);

    // 防止通过接口篡改创建人和创建时间
    delete data.created_by;
    delete data.created_at;

    await requirement.update({
      ...data,
      updated_by: updatedBy,
    });

    logger.info(`需求更新成功: ${requirement.name} (ID: ${id})`);
    return requirement;
  }

  /**
   * 删除需求
   */
  async delete(id: number): Promise<void> {
    const requirement = await this.findById(id);
    await requirement.destroy();
    logger.info(`需求删除成功: ${requirement.name} (ID: ${id})`);
  }

  /**
   * 批量删除需求
   */
  async batchDelete(ids: number[]): Promise<void> {
    await Requirement.destroy({
      where: { id: ids },
    });
    logger.info(`批量需求删除成功: ${ids.join(', ')}`);
  }

  /**
   * 快速更新状态与进度 (看板拖拽或快速操作时使用)
   */
  async updateStatus(
    id: number,
    status: StatusEnum,
    progress?: number,
    updatedBy?: string
  ): Promise<Requirement> {
    const requirement = await this.findById(id);

    const updateData: any = {
      status,
      updated_by: updatedBy,
    };

    if (progress !== undefined) {
      updateData.progress = Math.min(100, Math.max(0, progress));
    } else {
      // 如果只改状态不改进度，可以给个默认进度值（视业务而定）
      if (status === StatusEnum.COMPLETED) updateData.progress = 100;
      if (status === StatusEnum.PENDING) updateData.progress = 0;
    }

    await requirement.update(updateData);
    return requirement;
  }

  /**
   * 获取系统列表 (用于前端下拉框)
   */
  async getSystems(): Promise<string[]> {
    const results = (await Requirement.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('system')), 'system']],
      raw: true,
    })) as any[];
    return results.map(r => r.system).filter(Boolean);
  }

  /**
   * 获取看板统计数据
   */
  async getStats(): Promise<any> {
    const stats = (await Requirement.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('estimated_hours')), 'total_estimated'],
        [sequelize.fn('SUM', sequelize.col('actual_hours')), 'total_actual'],
      ],
      group: ['status'],
      raw: true,
    })) as any[];

    // 格式化数据
    return stats.map(s => ({
      status: s.status,
      count: parseInt(s.count, 10),
      totalEstimated: parseFloat(s.total_estimated || 0),
      totalActual: parseFloat(s.total_actual || 0),
    }));
  }

  /**
   * 获取需求总览统计数据
   */
  async getOverviewStats(): Promise<{
    total: number; // 总需求
    pending: number; // 待处理（pending）
    inProgress: number; // 进行中（包含 planning, developing, testing）
    completed: number; // 已完成（completed）
    completionRate: string; // 完成率（百分比）
  }> {
    try {
      // 使用 Promise.all 并行查询，提升性能
      const [total, pending, inProgress, completed] = await Promise.all([
        // 1. 总需求数
        Requirement.count(),

        // 2. 待处理数
        Requirement.count({
          where: { status: StatusEnum.PENDING },
        }),

        // 3. 进行中数（包含规划、开发、测试）
        Requirement.count({
          where: {
            status: {
              [Op.in]: [StatusEnum.PLANNING, StatusEnum.DEVELOPING, StatusEnum.TESTING],
            },
          },
        }),

        // 4. 已完成数
        Requirement.count({
          where: { status: StatusEnum.COMPLETED },
        }),
      ]);

      // 计算完成率（防止除零错误）
      const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        total,
        pending,
        inProgress,
        completed,
        completionRate: `${completionRate}%`,
      };
    } catch (error) {
      logger.error('获取需求统计数据失败:', error);
      throw error;
    }
  }
}

export default new RequirementService();
