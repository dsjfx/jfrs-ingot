import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import Blog from './Blog';
import CommentUser from './CommentUser';
import CommentLike from './CommentLike';

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

  @ForeignKey(() => CommentUser)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: '评论用户ID',
  })
  userId!: number;

  @ForeignKey(() => Blog)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  blogId!: number;

  // 关联关系
  @BelongsTo(() => CommentUser, { foreignKey: 'userId', as: 'user' })
  user!: CommentUser;

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

  @HasMany(() => CommentLike, { foreignKey: 'commentId', as: 'clikes' })
  clikes!: CommentLike[];

  @Column({
    type: DataType.VIRTUAL,
  })
  isReported!: boolean;

  @Column({
    type: DataType.VIRTUAL,
  })
  reportInfo!: any;

  @Column({ type: DataType.VIRTUAL })
  isBlocked!: boolean; // 当前访客是否屏蔽了该评论作者

  @Column({ type: DataType.VIRTUAL })
  isLiked!: boolean;
}

export default Comment;
