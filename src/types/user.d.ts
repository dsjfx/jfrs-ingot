/**
 * 用户相关类型定义
 */

import { EUserRole } from '../core/Enumers';

// 用户角色
export type UserRole = `${EUserRole}`;

// 用户状态
export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending';

// 用户注册信息
export interface UserRegister {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  nickname?: string;
  role?: UserRole;
  avatar?: string;
}

// 用户登录信息
export interface UserLogin {
  username: string;
  password: string;
  rememberMe?: boolean;
  appType: string;
}

// 用户更新信息
export interface UserUpdate {
  username?: string;
  email?: string;
  password?: string;
  oldPassword?: string;
  avatar?: string;
  role?: UserRole;
  status?: UserStatus;
}

// 用户个人信息
export interface UserProfile {
  id: number;
  username: string;
  nickname?: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status?: UserStatus;
  createdAt?: Date;
  updatedAt?: Date;
  blogCount?: number;
  commentCount?: number;
  phone?: string;
  gender?: string;
  birthday?: Date;
  bio?: string;
  location?: string;
  hobbies?: string[];
  github?: string;
  twitter?: string;
  weibo?: string;
  zhihu?: string;
  website?: string;
  motto?: string;
  job?: string;
  icpLicense?: string;
  publicSecurityLicense?: string;
}

// 用户统计数据
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByRole: Record<UserRole, number>;
}

// 用户查询参数
export interface UserQueryParams {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'id' | 'username' | 'email' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

// 用户会话信息
export interface UserSession {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// 登陆响应定义
export interface LoginResponse {
  accessToken: string; // JWT access token
  refreshToken: string; // Refresh token
  expiresIn: number; // Access token 过期时间（秒）
  tokenType: 'Bearer'; // Token 类型
  userInfo: {
    id: string;
    username: string;
    nickname?: string;
    email?: string;
    role: string;
    avatar?: string;
    permissions?: string[];
  };
}

// 注册响应定义
export interface RegisterResponse {
  userId: string;
  username: string;
  email?: string;
  role?: string;
}

// 密码重置请求
export interface PasswordResetRequest {
  email: string;
}

// 密码重置确认
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export {
  UserRole,
  UserStatus,
  UserBase,
  UserRegister,
  UserLogin,
  UserUpdate,
  UserProfile,
  UserStats,
  UserQueryParams,
  UserSession,
  LoginResponse,
  RegisterResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
};
