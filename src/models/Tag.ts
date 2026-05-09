import { Table, Column, Model, DataType, BelongsToMany } from 'sequelize-typescript';
import Blog from './Blog';
import BlogTag from './BlogTag';

@Table({
  tableName: 'ingot_tag',
  timestamps: true,
})
class Tag extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(30),
    allowNull: false,
    unique: true,
    validate: {
      len: [1, 30],
    },
  })
  name!: string;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    unique: true,
    validate: {
      len: [1, 30],
    },
  })
  slug!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  color!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  description?: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  blogCount!: number;

  @BelongsToMany(() => Blog, () => BlogTag)
  blogs!: Blog[];
}

export default Tag;
