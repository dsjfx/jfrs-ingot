// Token 载荷设计
export interface TokenPayload {
  // 标准 JWT 字段 (RFC 7519)
  sub: string; // Subject - 用户ID
  iat?: number; // Issued At - 签发时间（自动添加）
  exp?: number; // Expiration Time - 过期时间（自动添加）
  iss?: string; // Issuer - 签发者
  aud?: string | string[]; // Audience - 受众

  // 自定义业务字段
  username: string; // 用户名
  role: string; // 用户角色
  app?: string; // 当前应用 (blog/admin)
  permissions?: string[]; // 权限列表

  // 安全增强字段
  jti?: string; // JWT ID - 唯一标识，用于黑名单
  deviceId?: string; // 设备ID，用于单设备登录
  ip?: string; // 登录IP，用于安全检查
  userAgent?: string; // 用户代理，用于安全检查

  // 版本控制
  tokenVersion?: number; // Token版本，用于强制登出
  pwdVersion?: number; // 密码版本，密码修改后失效
}

// refresh token 响应类型定义
export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export default {
  TokenPayload,
  RefreshTokenResponse,
};
