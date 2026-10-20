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
import User from './User';
import CommentReport from './CommentReport';

@Table({
  tableName: 'ingot_comment_blocks',
  timestamps: true,
  paranoid: true,
})
class CommentBlock extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.ENUM('email', 'ip', 'user', 'keyword'),
    allowNull: false,
  })
  type!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  value!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reason?: string;

  @ForeignKey(() => CommentReport)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  reportId?: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  expiresAt?: Date;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  createdBy?: number;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt?: Date;

  @BelongsTo(() => User, { foreignKey: 'createdBy', as: 'creator' })
  creator?: User;

  @BelongsTo(() => CommentReport, { foreignKey: 'reportId', as: 'report' })
  report?: CommentReport;

  /**
   * 判断屏蔽是否已过期
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false; // null 表示永久
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * 判断屏蔽是否生效
   */
  isActive(): boolean {
    return !this.isExpired();
  }

  getTypeLabel(): string {
    const labels: Record<string, string> = {
      email: '邮箱',
      ip: 'IP地址',
      user: '用户',
      keyword: '关键词',
    };
    return labels[this.type] || this.type;
  }
}

export default CommentBlock;
