import { Table, Column, Model, DataType, CreatedAt, BelongsTo } from 'sequelize-typescript';
import Comment from './Comment';

@Table({
  tableName: 'ingot_comment_likes',
  timestamps: true,
  updatedAt: false, // 只有 created_at，没有 updated_at
  paranoid: false,
  underscored: true, // 自动使用 created_at
})
class CommentLike extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(64),
    allowNull: false,
    field: 'comment_id',
  })
  commentId!: string;

  @Column({
    type: DataType.STRING(64),
    allowNull: true,
    field: 'user_id',
  })
  userId?: string;

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
    field: 'anonymous_id',
  })
  anonymousId?: string;

  @CreatedAt
  @Column({
    field: 'created_at',
  })
  createdAt!: Date;

  @BelongsTo(() => Comment, { foreignKey: 'commentId', as: 'comment' })
  comment!: Comment;
}

export default CommentLike;
