import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import User from './User';
import Blog from './Blog';

@Table({
  tableName: 'ingot_comment',
  timestamps: true,
  paranoid: true,
})
class Comment extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    validate: {
      len: [1, 1000],
    },
  })
  content!: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  likes!: number;

  @Column({
    type: DataType.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  })
  status!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  parentId?: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  userId!: number;

  @ForeignKey(() => Blog)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  blogId!: number;

  // 关联关系
  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Blog)
  blog!: Blog;

  // 自关联：回复评论
  @ForeignKey(() => Comment)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  replyToId?: number;

  @BelongsTo(() => Comment, 'replyToId')
  replyTo?: Comment;

  // 子评论列表
  @HasMany(() => Comment, {
    foreignKey: 'replyToId', // 注意这里使用 replyToId 作为外键
    as: 'replies',
  })
  replies?: Comment[];
}

export default Comment;
