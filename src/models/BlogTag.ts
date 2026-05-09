import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import Blog from './Blog';
import Tag from './Tag';

@Table({
  tableName: 'ingot_blog_tags',
  timestamps: false,
})
class BlogTag extends Model {
  @ForeignKey(() => Blog)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  blogId!: number;

  @ForeignKey(() => Tag)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  tagId!: number;
}

export default BlogTag;
