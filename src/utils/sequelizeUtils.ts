import { Op, WhereOptions, Order } from 'sequelize';

export class SequelizeUtils {
  /**
   * 创建搜索条件
   */
  static createSearchCondition(searchTerm: string, searchFields: string[]): WhereOptions {
    if (!searchTerm || searchFields.length === 0) {
      return {};
    }

    const conditions = searchFields.map(field => ({
      [field]: { [Op.like]: `%${searchTerm}%` },
    }));

    return { [Op.or]: conditions };
  }

  /**
   * 创建分页参数
   */
  static createPagination(page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    return { offset, limit: pageSize };
  }

  /**
   * 创建排序参数
   */
  static createOrder(sortField: string = 'createdAt', sortOrder: 'ASC' | 'DESC' = 'DESC'): Order {
    return [[sortField, sortOrder]];
  }

  /**
   * 安全解析查询参数
   */
  static safeParseQuery<T extends Record<string, any>>(
    query: T,
    allowedFields: (keyof T)[]
  ): Partial<T> {
    const result: Partial<T> = {};

    allowedFields.forEach(field => {
      if (query[field] !== undefined) {
        result[field] = query[field];
      }
    });

    return result;
  }
}

// 常用查询快捷方式
export const QueryHelpers = {
  // 状态查询
  isPublished: { status: 'published' },
  isDraft: { status: 'draft' },

  // 时间查询
  createdThisMonth: {
    createdAt: {
      [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    },
  },

  // 范围查询
  viewCountGt: (count: number) => ({ viewCount: { [Op.gt]: count } }),

  // 关联查询
  withAuthor: (authorId: number) => ({ authorId }),

  // 排除已删除
  notDeleted: { deletedAt: null },
};

export default SequelizeUtils;
