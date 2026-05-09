import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import Blog from './Blog';

@Table({
  tableName: 'ingot_category',
  timestamps: true,
})
class Category extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [1, 50],
    },
  })
  name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  slug!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  parentId?: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  sort!: number;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
  })
  description?: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  blogCount!: number;

  @HasMany(() => Blog)
  blogs!: Blog[];
}

export default Category;
