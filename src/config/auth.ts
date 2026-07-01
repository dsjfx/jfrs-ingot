import { parseDurationToSeconds } from '../utils/FuncUtil';

// Token配置
export const tokenConfig = {
  accessToken: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRE || '2h',
    expiresInSeconds: parseDurationToSeconds(process.env.JWT_EXPIRE || '2h'),
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    expiresInSeconds: parseDurationToSeconds(process.env.JWT_REFRESH_EXPIRE || '7d'),
  },

  // Token 签发者
  issuer: 'jingot',

  // Token 受众
  audience: ['jcandy', 'jcandy-admin', 'jcandy-photo'],

  // 是否允许同一账号多处登录
  allowMultipleLogin: false,

  // Token 黑名单清理间隔（小时）
  blacklistCleanupInterval: 24,
};

export const authConfig = {
  // JWT 配置
  jwt: {
    secret: tokenConfig.accessToken.secret,
    expiresIn: tokenConfig.accessToken.expiresIn,
    refreshExpiresIn: tokenConfig.refreshToken.expiresIn,
  },

  // 接口分类
  endpoints: {
    public: [
      '/api/posts',
      '/api/posts/:id',
      '/api/comments',
      '/api/users/:id/profile',
      '/auth/login',
      '/auth/register',
    ],
    protected: [
      '/api/user/*', // 用户相关接口
      '/api/posts/create',
      '/api/posts/*/edit',
      '/api/comments/*/delete',
      '/api/admin/*',
    ],
  },

  // 限流配置（防止暴力破解）
  rateLimit: {
    ttl: 60, // 60秒
    limit: 100, // 最多100次请求
    skipPublic: true, // 公开接口不限流
  },
};
