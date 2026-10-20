import crypto from 'crypto';
import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';
import Comment from './Comment';

@Table({
  tableName: 'ingot_comment_users',
  timestamps: true,
  paranoid: true,
  underscored: false,
  comment: '评论用户表（未注册用户）',
})
class CommentUser extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '评论用户ID',
  })
  id!: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    comment: '评论者昵称',
  })
  name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: '评论者邮箱',
    validate: {
      isEmail: true,
    },
  })
  email!: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
    comment: '评论者个人网站',
    validate: {
      isUrl: true,
    },
  })
  website?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: '评论者头像',
  })
  avatar?: string;

  @Column({
    type: DataType.STRING(45),
    allowNull: true,
    comment: '评论者IP地址',
  })
  ip?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: '用户代理信息',
  })
  userAgent?: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: '评论总数',
  })
  commentCount!: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: '最后评论时间',
  })
  lastCommentAt?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt?: Date;

  @HasMany(() => Comment, { foreignKey: 'userId', as: 'comments' })
  comments!: Comment[];

  /**
   * 根据邮箱获取 Gravatar 头像
   */
  getAvatarUrl(size: number = 80): string {
    if (this.avatar) return this.avatar;

    // 使用邮箱生成 Gravatar 头像
    const hash = crypto.createHash('md5').update(this.email.trim().toLowerCase()).digest('hex');

    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
  }

  /**
   * 获取评论者信息（脱敏）
   */
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      website: this.website,
      avatar: this.getAvatarUrl(),
      createdAt: this.createdAt,
    };
  }
}

export default CommentUser;
