import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import Blog from './Blog';

@Table({
  tableName: 'ingot_photos',
  timestamps: true,
  paranoid: true,
  comment: '照片表',
})
class Photo extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '照片ID',
  })
  id!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    comment: '文件名',
  })
  filename!: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: false,
    comment: '文件路径',
  })
  path!: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: false,
    comment: '访问URL',
  })
  url!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: '原始文件名',
  })
  originalname!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    comment: 'MIME类型',
  })
  mimetype!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: '文件大小(字节)',
  })
  size!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: '图片宽度',
  })
  width!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: '图片高度',
  })
  height!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: '缩略图文件名',
  })
  thumbnailFilename!: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: '缩略图路径',
  })
  thumbnailPath!: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: '缩略图URL',
  })
  thumbnailUrl!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: '缩略图大小',
  })
  thumbnailSize!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: '排序序号',
  })
  sortOrder!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: '是否为封面图',
  })
  isCover!: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: '图片描述',
  })
  description!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: '图片标签',
  })
  tags!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: '图片类型(avatar, cover, gallery)',
  })
  photoType!: string;

  @ForeignKey(() => Blog)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: '关联的博客ID',
  })
  blogId!: number;

  @BelongsTo(() => Blog)
  blog!: Blog;
}

export default Photo;
