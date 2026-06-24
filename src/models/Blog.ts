import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  HasMany,
} from 'sequelize-typescript';
import User from './User';
import Category from './Category';
import Tag from './Tag';
import BlogTag from './BlogTag';
import { EBlogType, EBlogVisibility, ECommentPermission } from '../core/Enumers';
import Photo from './Photo';

@Table({
  tableName: 'ingot_blogs',
  timestamps: true,
  paranoid: true,
})
class Blog extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200],
    },
  })
  title!: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
    validate: {
      len: [1, 200],
    },
  })
  subtitle!: string;

  @Column({
    type: DataType.ENUM(...Object.values(EBlogType)),
    defaultValue: EBlogType.ARTICLE,
  })
  subject!: EBlogType;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  content!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  summary?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  coverImage?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: '封面图缩略图URL',
  })
  coverThumbnail?: string;

  @Column({
    type: DataType.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft',
  })
  status!: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  views!: number;

  @Column({
    type: DataType.JSON,
    defaultValue: [],
  })
  likes!: number[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isTop!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isComment!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  publishedAt!: Date;

  // 文章可见性
  @Column({
    type: DataType.ENUM(...Object.values(EBlogVisibility)),
    defaultValue: EBlogVisibility.PUBLIC,
  })
  visibility!: EBlogVisibility;

  // 允许访问的角色（仅在 visibility='role_based' 时有效）
  @Column({
    type: DataType.STRING,
    defaultValue: null,
  })
  allowedRoles?: string;

  // 是否需特定权限才能评论
  @Column({
    type: DataType.ENUM(...Object.values(ECommentPermission)),
    defaultValue: ECommentPermission.ALL,
  })
  commentPermission!: string;

  // 允许评论的角色（ 仅在 commentPermission='role_based' 时有效）
  @Column({
    type: DataType.STRING,
    defaultValue: null,
  })
  commentAllowedRoles?: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  authorId!: number;

  @ForeignKey(() => Category)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  categoryId?: number;

  @BelongsTo(() => User)
  author!: User;

  @BelongsTo(() => Category)
  category!: Category;

  @BelongsToMany(() => Tag, () => BlogTag)
  tags!: Tag[];

  // 添加关联：一篇博客有多张照片
  @HasMany(() => Photo)
  photos!: Photo[];
}

export default Blog;
