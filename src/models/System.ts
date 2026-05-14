import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  AllowNull,
  Default,
  PrimaryKey,
  AutoIncrement,
  Unique,
  Comment,
} from 'sequelize-typescript';

export enum ConfigGroup {
  BASIC = 'basic',
  SECURITY = 'security',
  NOTIFICATION = 'notification',
  THEME = 'theme',
  BACKUP = 'backup',
}

export enum ConfigType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
}

export interface ISystemConfig {
  id?: number;
  config_key: string;
  config_value?: string | null;
  config_group: ConfigGroup;
  config_type: ConfigType;
  description?: string | null;
}

@Table({
  tableName: 'ingot_system_configs',
  timestamps: true,
  paranoid: true, // 软删除
  underscored: true, // 使用 snake_case 字段名
  comment: '系统配置表',
})
export class SystemConfig extends Model<SystemConfig, ISystemConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  @Comment('主键ID')
  declare id: number;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(100))
  @Comment('配置键')
  declare config_key: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  @Comment('配置值')
  declare config_value: string | null;

  @AllowNull(false)
  @Default(ConfigGroup.BASIC)
  @Column(DataType.ENUM(...Object.values(ConfigGroup)))
  @Comment('分组: basic/security/notification/theme/backup')
  declare config_group: ConfigGroup;

  @AllowNull(false)
  @Default(ConfigType.STRING)
  @Column(DataType.ENUM(...Object.values(ConfigType)))
  @Comment('值类型')
  declare config_type: ConfigType;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Comment('配置说明')
  declare description: string | null;

  @CreatedAt
  @Column(DataType.DATE)
  @Comment('创建时间')
  declare created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  @Comment('更新时间')
  declare updated_at: Date;

  @DeletedAt
  @Column(DataType.DATE)
  @Comment('删除时间')
  declare deleted_at: Date | null;
}
