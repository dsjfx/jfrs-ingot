import sequelize from '../config/database';
import { Op } from 'sequelize';

// 导入模型
import User from './User';
import Blog from './Blog';
import Category from './Category';
import Tag from './Tag';
import BlogTag from './BlogTag';
import Comment from './Comment';
import Photo from './Photo';

sequelize.addModels([User, Blog, Category, Tag, BlogTag, Comment, Photo]);

// 模型关联
User.hasMany(Blog, { foreignKey: 'authorId' });
Blog.belongsTo(User, { foreignKey: 'authorId' });

Category.hasMany(Blog, { foreignKey: 'categoryId' });
Blog.belongsTo(Category, { foreignKey: 'categoryId' });

Blog.belongsToMany(Tag, { through: BlogTag, foreignKey: 'blogId' });
Tag.belongsToMany(Blog, { through: BlogTag, foreignKey: 'tagId' });

// 评论关联
User.hasMany(Comment, { foreignKey: 'userId' });
Comment.belongsTo(User, { foreignKey: 'userId' });

Blog.hasMany(Comment, { foreignKey: 'blogId' });
Comment.belongsTo(Blog, { foreignKey: 'blogId' });

// 评论自关联
Comment.hasMany(Comment, { foreignKey: 'parentId' });
Comment.belongsTo(Comment, { foreignKey: 'parentId' });

// 回复关联
Comment.belongsTo(Comment, { foreignKey: 'replyToId' });

// Blog.hasMany(Photo, { foreignKey: 'blogId', as: 'photos' });
// Photo.belongsTo(Blog, { foreignKey: 'blogId', as: 'blog' });

export { sequelize, Op, User, Blog, Category, Tag, BlogTag, Comment, Photo };

export default { User, Blog, Category, Tag, BlogTag, Comment, Photo };
