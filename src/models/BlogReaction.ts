import { Table, Column, Model, DataType, CreatedAt } from 'sequelize-typescript';

export enum ReactionType {
  LIKE = 1,
  DISLIKE = -1,
  NONE = 0,
}

@Table({
  tableName: 'ingot_blogs_reactions',
  timestamps: true,
  updatedAt: false, // 只有 created_at
  paranoid: false, // 不需要软删除
  underscored: true,
})
class ArticleReaction extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(64),
    allowNull: false,
    field: 'blog_id',
  })
  blogId!: string;

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

  @Column({
    type: DataType.TINYINT,
    allowNull: false,
    field: 'reaction_type',
  })
  reactionType!: ReactionType;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt!: Date;
}

export default ArticleReaction;
