import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';
import Comment from './Comment';
import CommentUser from './CommentUser';
import User from './User';

// 定义模型属性类型
export interface CommentReportAttributes {
  id: number;
  commentId: number;
  reporterId?: number;
  reporterEmail?: string;
  reporterIp?: string;
  reason: string;
  description?: string;
  status: string;
  handledBy?: number;
  handledAt?: Date;
  handleRemark?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// 定义创建时的属性类型（id、createdAt 等自动生成）
export interface CommentReportCreationAttributes {
  commentId: number;
  reporterId?: number;
  reporterEmail?: string;
  reporterIp?: string;
  reason: string;
  description?: string;
  status?: string;
  handledBy?: number;
  handledAt?: Date;
  handleRemark?: string;
}

@Table({
  tableName: 'ingot_comment_reports',
  timestamps: true,
  paranoid: true,
})
class CommentReport extends Model<CommentReportAttributes, CommentReportCreationAttributes> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Comment)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  commentId!: number;

  @ForeignKey(() => CommentUser)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  reporterId?: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  reporterEmail?: string;

  @Column({
    type: DataType.STRING(45),
    allowNull: true,
  })
  reporterIp?: string;

  @Column({
    type: DataType.ENUM('spam', 'abuse', 'porn', 'politics', 'violence', 'copyright', 'other'),
    allowNull: false,
  })
  reason!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Column({
    type: DataType.ENUM('pending', 'resolved', 'rejected', 'ignored'),
    defaultValue: 'pending',
  })
  status!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  handledBy?: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  handledAt?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  handleRemark?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt?: Date;

  @BelongsTo(() => Comment, { foreignKey: 'commentId', as: 'comment' })
  comment!: Comment;

  @BelongsTo(() => CommentUser, { foreignKey: 'reporterId', as: 'reporter' })
  reporter?: CommentUser;

  @BelongsTo(() => User, { foreignKey: 'handledBy', as: 'handler' })
  handler?: User;

  // 获取举报原因的中文名称
  getReasonLabel(): string {
    const labels: Record<string, string> = {
      spam: '垃圾广告',
      abuse: '辱骂攻击',
      porn: '色情内容',
      politics: '政治敏感',
      violence: '暴力内容',
      copyright: '侵权内容',
      other: '其他原因',
    };
    return labels[this.reason] || this.reason;
  }

  getStatusLabel(): string {
    const labels: Record<string, string> = {
      pending: '待处理',
      resolved: '已处理',
      rejected: '已驳回',
      ignored: '已忽略',
    };
    return labels[this.status] || this.status;
  }
}

export default CommentReport;
