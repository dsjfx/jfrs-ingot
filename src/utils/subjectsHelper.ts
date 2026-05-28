import { sequelize } from '../models';
import { QueryTypes } from 'sequelize';
import { PageResult, ResponseData, ResponseFactory } from './ResponseFactory';

export interface Subject {
  id: number;
  name: string;
  code: string;
  status: number;
  sort_order: number;
  create_time: Date;
  update_time: Date;
}

class SubjectsHelper {
  /**
   * 获取所有启用的科目（按排序）
   */
  async getAllEnabled(type: string): Promise<Subject[]> {
    return await sequelize.query(
      `SELECT id, name, code, status, sort_order 
       FROM ingot_subjects 
       WHERE status = 1 
       AND type = :type
       ORDER BY sort_order ASC, id ASC`,
      { type: QueryTypes.SELECT, replacements: { type } }
    );
  }

  /**
   * 获取所有科目（包括禁用的）
   */
  async getAll(type: string): Promise<Subject[]> {
    return await sequelize.query(
      `SELECT id, name, code, status, sort_order, create_time, update_time
       FROM ingot_subjects 
       WHERE type = :type
       ORDER BY sort_order ASC, id ASC`,
      { type: QueryTypes.SELECT, replacements: { type } }
    );
  }

  /**
   * 根据ID获取科目
   */
  async getById(id: number): Promise<Subject | null> {
    const results = (await sequelize.query(
      `SELECT id, name, code, status, sort_order 
       FROM ingot_subjects 
       WHERE id = ? 
       LIMIT 1`,
      {
        replacements: [id],
        type: QueryTypes.SELECT,
      }
    )) as Subject[];
    return results[0] || null;
  }

  /**
   * 根据代码获取科目
   */
  async getByCode(code: string): Promise<Subject | null> {
    const results = (await sequelize.query(
      `SELECT id, name, code, status, sort_order 
       FROM ingot_subjects 
       WHERE code = ? 
       LIMIT 1`,
      {
        replacements: [code],
        type: QueryTypes.SELECT,
      }
    )) as Subject[];
    return results[0] || null;
  }

  /**
   * 分页获取科目
   */
  async getPaginated(
    page: number = 1,
    pageSize: number = 20,
    status?: number
  ): Promise<ResponseData<PageResult<Subject>>> {
    const offset = (page - 1) * pageSize;
    let whereClause = '';
    let replacements: any[] = [];

    if (status !== undefined) {
      whereClause = 'WHERE status = ?';
      replacements = [status, pageSize, offset];
    } else {
      replacements = [pageSize, offset];
    }

    // 查询列表
    const list = await sequelize.query(
      `SELECT id, name, code, status, sort_order, create_time, update_time
       FROM ingot_subjects 
       ${whereClause}
       ORDER BY sort_order ASC, id ASC 
       LIMIT ? OFFSET ?`,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    // 查询总数
    const totalResult = await sequelize.query(
      `SELECT COUNT(*) as total FROM ingot_subjects ${whereClause}`,
      {
        replacements: status !== undefined ? [status] : [],
        type: QueryTypes.SELECT,
      }
    );

    const total = (totalResult[0] as any)?.total || 0;

    return ResponseFactory.page(
      list as Subject[],
      { current: page, size: pageSize, total },
      '分页获取科目成功'
    );
  }

  /**
   * 搜索科目
   */
  async search(keyword: string, limit: number = 20): Promise<Subject[]> {
    return await sequelize.query(
      `SELECT id, name, code, status, sort_order 
       FROM ingot_subjects 
       WHERE status = 1 
         AND (name LIKE ? OR code LIKE ?) 
       ORDER BY sort_order ASC, id ASC 
       LIMIT ?`,
      {
        replacements: [`%${keyword}%`, `%${keyword}%`, limit],
        type: QueryTypes.SELECT,
      }
    );
  }

  /**
   * 获取科目选项（用于下拉框）
   */
  async getOptions(type: string): Promise<Array<{ value: number; label: string; code: string }>> {
    return await sequelize.query(
      `SELECT id, name, code as value
       FROM ingot_subjects 
       WHERE status = 1 
       AND type = :type
       ORDER BY sort_order ASC, id ASC`,
      { type: QueryTypes.SELECT, replacements: { type } }
    );
  }

  /**
   * 统计科目数量
   */
  async getStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
  }> {
    const results = await sequelize.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as enabled,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as disabled
       FROM ingot_subjects`,
      { type: QueryTypes.SELECT }
    );

    const data = results[0] as any;
    return {
      total: data?.total || 0,
      enabled: data?.enabled || 0,
      disabled: data?.disabled || 0,
    };
  }

  /**
   * 批量获取多个ID的科目
   */
  async getByIds(ids: number[]): Promise<Subject[]> {
    if (!ids.length) return [];

    const placeholders = ids.map(() => '?').join(',');
    return await sequelize.query(
      `SELECT id, name, code, status, sort_order 
       FROM ingot_subjects 
       WHERE id IN (${placeholders}) 
       ORDER BY sort_order ASC, id ASC`,
      {
        replacements: ids,
        type: QueryTypes.SELECT,
      }
    );
  }
}

export default new SubjectsHelper();
