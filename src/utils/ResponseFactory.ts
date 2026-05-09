import { Album } from '@/types/photo';
import HttpStatus from '@/utils/HttpStatus';

// 响应工具类
export class ResponseFactory {
  // 成功响应
  static success<T>(data: T, message: string = '操作成功'): ResponseData<T> {
    return {
      code: HttpStatus.OK,
      data,
      message,
      success: true,
    };
  }

  static error<T>(
    message: string = '操作失败',
    code: number = HttpStatus.InternalServerError,
    data?: T
  ): ResponseData<T> {
    return {
      code,
      data: data ?? (null as T), // 空值合并运算符
      message,
      success: false,
    };
  }

  // 分页响应
  static page<T>(data: T[], page: Pagination, message?: string): ResponseData<PageResult<T>> {
    const { current, size, total } = page;
    return this.success(
      {
        records: data || [],
        pagination: {
          current,
          size,
          total,
          pages: Math.ceil(total / size),
          hasNext: current * size < total,
          hasPrev: current > 1,
        },
      },
      message
    );
  }

  static pageAlbum(data: Album, page: Pagination, message?: string): ResponseData<PageResultAlbum> {
    const { current, size, total } = page;
    return this.success(
      {
        album: data,
        pagination: {
          current,
          size,
          total,
          pages: Math.ceil(total / size),
          hasNext: current * size < total,
          hasPrev: current > 1,
        },
      },
      message
    );
  }

  // 列表响应
  static list<T>(items: T[] = []): ResponseData<T[]> {
    return this.success(items);
  }

  // 空响应
  static empty(): ResponseData<null> {
    return this.success(null, '暂无数据');
  }
}

// 结果包装器
export interface ResponseData<T> {
  code: number;
  data: T;
  message: string;
  success: boolean;
  stack?: string | undefined;
}

/**
 * 默认返回的分页数据格式
 */
export interface PageResult<T> {
  records: T[];
  pagination: Pagination;
}

// 分页结构
export interface Pagination {
  current: number;
  size: number;
  total: number;
  pages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface PageResultAlbum {
  album: Album;
  pagination: Pagination;
}

export default {
  ResponseFactory,
};
