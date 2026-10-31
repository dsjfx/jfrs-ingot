import sequelize from '../config/database';
import { Op } from 'sequelize';

// 导入模型
import User from './User';
import Blog from './Blog';
import Category from './Category';
import Tag from './Tag';
import BlogTag from './BlogTag';
import Comment from './Comment';
import CommentUser from './CommentUser';
import CommentReport from './CommentReport';
import CommentBlock from './CommentBlock';
import CommentBlockPersonal from './CommentBlockPersonal';
import CommentLike from './CommentLike';
import Photo from './Photo';
import BlogReaction from './BlogReaction';

/**
 * 初始化所有模型并设置关联关系
 * Initialize all models and set up associations
 */
sequelize.addModels([
  User,
  Blog,
  BlogReaction,
  Category,
  Tag,
  BlogTag,
  Comment,
  CommentUser,
  CommentReport,
  CommentBlock,
  CommentBlockPersonal,
  CommentLike,
  Photo,
]);

/**
 * 设置模型之间的关联关系
 * Set up associations between models
 */
User.hasMany(Blog, { foreignKey: 'authorId' });
Blog.belongsTo(User, { foreignKey: 'authorId' });

Category.hasMany(Blog, { foreignKey: 'categoryId' });
Blog.belongsTo(Category, { foreignKey: 'categoryId' });

Blog.belongsToMany(Tag, { through: BlogTag, foreignKey: 'blogId' });
Tag.belongsToMany(Blog, { through: BlogTag, foreignKey: 'tagId' });

// 评论关联
CommentUser.hasMany(Comment, { foreignKey: 'userId' });
Comment.belongsTo(CommentUser, { foreignKey: 'userId' });

Blog.hasMany(Comment, { foreignKey: 'blogId' });
Comment.belongsTo(Blog, { foreignKey: 'blogId' });

// 评论自关联
Comment.hasMany(Comment, { foreignKey: 'parentId' });
Comment.belongsTo(Comment, { foreignKey: 'parentId' });

// 回复关联
Comment.belongsTo(Comment, { foreignKey: 'replyToId' });

// Blog.hasMany(Photo, { foreignKey: 'blogId', as: 'photos' });
// Photo.belongsTo(Blog, { foreignKey: 'blogId', as: 'blog' });

// 举报关联
// Comment.hasMany(CommentReport, { foreignKey: 'commentId', as: 'reports' });
// CommentReport.belongsTo(Comment, { foreignKey: 'commentId', as: 'comment' });

// CommentUser.hasMany(CommentReport, { foreignKey: 'reporterId', as: 'reports' });
// CommentReport.belongsTo(CommentUser, { foreignKey: 'reporterId', as: 'reporter' });

// User.hasMany(CommentReport, { foreignKey: 'handledBy', as: 'handledReports' });
// CommentReport.belongsTo(User, { foreignKey: 'handledBy', as: 'handler' });

// 屏蔽关联
// CommentReport.hasMany(CommentBlock, { foreignKey: 'reportId', as: 'blocks' });
// CommentBlock.belongsTo(CommentReport, { foreignKey: 'reportId', as: 'report' });

// User.hasMany(CommentBlock, { foreignKey: 'createdBy', as: 'createdBlocks' });
// CommentBlock.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

export {
  sequelize,
  Op,
  User,
  Blog,
  BlogReaction,
  Category,
  Tag,
  BlogTag,
  Comment,
  CommentUser,
  CommentReport,
  CommentBlock,
  CommentBlockPersonal,
  CommentLike,
  Photo,
};

export default {
  User,
  Blog,
  BlogReaction,
  Category,
  Tag,
  BlogTag,
  Comment,
  CommentUser,
  CommentReport,
  CommentBlock,
  CommentBlockPersonal,
  CommentLike,
  Photo,
};
