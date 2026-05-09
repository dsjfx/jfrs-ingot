/**
 * 数据库相关类型定义
 */

import { Model, ModelCtor } from 'sequelize-typescript';

// 通用模型接口
export interface IBaseModel {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// 软删除模型
export interface ISoftDeleteModel extends IBaseModel {
  deletedAt?: Date;
}

// 分页查询结果
export interface PaginatedResult<T> {
  rows: T[];
  count: number;
}

// 查询选项
export interface QueryOptions {
  where?: any;
  include?: any[];
  attributes?: string[];
  order?: any[];
  limit?: number;
  offset?: number;
  distinct?: boolean;
  paranoid?: boolean;
  transaction?: any;
  lock?: any;
  benchmark?: boolean;
}

// 关联查询选项
export interface IncludeOptions {
  model: ModelCtor<Model>;
  as: string;
  attributes?: string[];
  where?: any;
  required?: boolean;
  separate?: boolean;
  through?: {
    attributes: string[];
  };
}

// 事务选项
export interface TransactionOptions {
  isolationLevel?: string;
  deferrable?: string;
  autocommit?: boolean;
}

// 数据库配置
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql';
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
  logging?: boolean | ((sql: string, timing?: number) => void);
  timezone?: string;
  dialectOptions?: any;
}

// 迁移配置
export interface MigrationConfig {
  tableName: string;
  schema?: string;
  columnType?: string;
  columnName?: string;
  timestamps?: boolean;
}

export {
  IBaseModel,
  ISoftDeleteModel,
  PaginatedResult,
  QueryOptions,
  IncludeOptions,
  TransactionOptions,
  DatabaseConfig,
  MigrationConfig,
};
