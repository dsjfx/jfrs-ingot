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
import CommentUser from './CommentUser';

@Table({
  tableName: 'ingot_comment_blocks_personal',
  timestamps: true,
  paranoid: true,
})
class CommentBlockPersonal extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => CommentUser)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  blockerId!: number;

  @ForeignKey(() => CommentUser)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  blockedId!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  reason?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt?: Date;

  @BelongsTo(() => CommentUser, { foreignKey: 'blockerId', as: 'blocker' })
  blocker!: CommentUser;

  @BelongsTo(() => CommentUser, { foreignKey: 'blockedId', as: 'blocked' })
  blocked!: CommentUser;
}

export default CommentBlockPersonal;
