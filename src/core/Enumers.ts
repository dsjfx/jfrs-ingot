// 用户角色
export enum EUserRole {
  VISITOR = 'visitor', // 访客（未登录）
  USER = 'user', // 普通用户（已登录）
  AUTHOR = 'author', // 作者
  ADMIN = 'admin', // 管理员
}

// 用户状态
export enum EUserStatus {
  ACTIVE = 'active', // 活跃
  INACTIVE = 'inactive', // 不活跃
  BANNED = 'banned', // 禁止访问
  PENDING = 'pending', // 待审核
}

// 用户性别
export enum EUserGender {
  MALE = 'male',
  FEMALE = 'female',
  SECRET = 'secret',
}

// 应用类型
export enum EAppType {
  BLOG = 'blog', // 博客前端
  ADMIN = 'admin', // 管理后台
}

// 博客类型
export enum EBlogType {
  ARTICLE = 'article',
  IMAGE = 'photo',
}

// 文章可见性
export enum EBlogVisibility {
  PUBLIC = 'public', // 所有人可见（包括未登陆用户）
  REGISTER = 'registered_only', // 仅登陆用户可见
  ROLE = 'role_based', // 基于角色的访问控制
  PRIVATE = 'private', // 仅作者和管理员可见
}

// 评论权限
export enum ECommentPermission {
  ALL = 'all',
  REGISTED = 'registed',
  Role = 'role_based',
  NONE = 'none',
}

// 权限配置
export const RolePermissions = {
  [EUserRole.VISITOR]: ['post:view', 'comment:view', 'user:view-public'],
  [EUserRole.USER]: [
    'post:view',
    'post:create',
    'comment:view',
    'comment:create',
    'user:view-public',
    'user:update-self',
  ],
  [EUserRole.AUTHOR]: [
    'post:view',
    'post:create',
    'post:update-self',
    'post:delete-self',
    'comment:view',
    'comment:create',
    'comment:delete-self',
    'user:view-public',
    'user:update-self',
  ],
  [EUserRole.ADMIN]: [
    '*', // 所有权限
  ],
};

export default {
  EUserRole,
  EAppType,
  EBlogVisibility,
  ECommentPermission,
};
