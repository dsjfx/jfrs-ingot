import { Table, Column, Model, DataType } from 'sequelize-typescript';

export enum PriorityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum StatusEnum {
  PENDING = 'pending',
  PLANNING = 'planning',
  DEVELOPING = 'developing',
  TESTING = 'testing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum CategoryEnum {
  FEATURE = 'feature',
  IMPROVEMENT = 'improvement',
  BUGFIX = 'bugfix',
  OPTIMIZATION = 'optimization',
  OTHER = 'other',
}

export enum SourceEnum {
  CUSTOMER = 'customer',
  INTERNAL = 'internal',
  MANAGEMENT = 'management',
  OTHER = 'other',
}

@Table({
  tableName: 'ingot_requirements',
  timestamps: true,
  paranoid: true,
})
class Requirement extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  system!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  content!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  plannedTime!: Date;

  @Column({
    type: DataType.ENUM(...Object.values(PriorityEnum)),
    defaultValue: PriorityEnum.MEDIUM,
  })
  priority!: PriorityEnum;

  @Column({
    type: DataType.ENUM(...Object.values(StatusEnum)),
    defaultValue: StatusEnum.PENDING,
  })
  status!: StatusEnum;

  @Column({
    type: DataType.ENUM(...Object.values(CategoryEnum)),
    defaultValue: CategoryEnum.FEATURE,
  })
  category!: CategoryEnum;

  @Column({
    type: DataType.STRING(50),
    defaultValue: '',
  })
  proposer!: string;

  @Column({
    type: DataType.STRING(50),
    defaultValue: '',
  })
  assignee!: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  startDate?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  endDate?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  actualTime?: Date;

  @Column({
    type: DataType.DECIMAL(10, 1),
    defaultValue: 0,
  })
  estimatedHours!: number;

  @Column({
    type: DataType.DECIMAL(10, 1),
    defaultValue: 0,
  })
  actualHours!: number;

  @Column({
    type: DataType.TINYINT,
    defaultValue: 0,
  })
  progress!: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  tags?: string[]; // Sequelize 会自动在 MySQL 中存储为 JSON 字符串，取出时解析成数组

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  comments?: string;

  @Column({
    type: DataType.ENUM(...Object.values(SourceEnum)),
    defaultValue: SourceEnum.INTERNAL,
  })
  source!: SourceEnum;

  @Column({
    type: DataType.STRING(20),
    defaultValue: '',
  })
  version!: string;

  // @CreatedAt
  // @Column({
  //   field: 'created_at',
  // })
  // created_at!: Date;

  // @UpdatedAt
  // @Column({
  //   field: 'updated_at',
  // })
  // updated_at!: Date;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  createdBy?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  updatedBy?: string;
}

export default Requirement;
