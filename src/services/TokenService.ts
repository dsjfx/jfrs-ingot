import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { tokenConfig } from '@/config/auth';
import { CacheService } from './RedisCacheService';
import { Autowired } from '@/core/DIContainer';
import logger from '@/utils/logger';
import { User } from '@/models';
import { RefreshTokenResponse, TokenPayload } from '@/types/auth';
import { PRE_REFRESH_TOKEN } from '@/utils/redisUtil';
import { LoginResponse } from '@/types/user';
import { AppError } from '@/middleware/errorHandler';

/**
 * JWT Token 服务类
 */
class TokenService {
  @Autowired('RedisCache')
  private redisCache!: CacheService;

  /**
   * 生成 Access Token
   */
  generateAccessToken(user: User, appType: string): string {
    const payload: TokenPayload = {
      sub: `${user.id}`,
      username: user.username,
      role: user.role,
      jti: uuidv4(), // JWT ID，用于黑名单
    };

    return jwt.sign(payload, tokenConfig.accessToken.secret, {
      expiresIn: tokenConfig.accessToken.expiresIn as jwt.SignOptions['expiresIn'],
      algorithm: 'HS256',
      issuer: tokenConfig.issuer,
      audience: appType === 'blog' ? 'jcandy' : 'jcandy-admin',
    });
  }

  /**
   * 生成 Refresh Token
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = jwt.sign(
      {
        sub: userId,
        type: 'refresh',
        jti: uuidv4(),
      },
      tokenConfig.refreshToken.secret,
      {
        expiresIn: tokenConfig.refreshToken.expiresIn as jwt.SignOptions['expiresIn'],
        algorithm: 'HS256',
        issuer: tokenConfig.issuer,
      }
    );

    // 存储 Refresh Token 到 Redis
    await this.redisCache.set(
      `${PRE_REFRESH_TOKEN}${userId}`,
      refreshToken,
      tokenConfig.refreshToken.expiresInSeconds
    );

    // 如果禁止多处登录，删除旧的 Refresh Token
    if (!tokenConfig.allowMultipleLogin) {
      await this.revokeOldTokens(userId);
    }

    return refreshToken;
  }

  /**
   * 生成完整的登录响应
   */
  async generateLoginResponse(user: User, appType: string): Promise<LoginResponse> {
    const accessToken = this.generateAccessToken(user, appType);
    const refreshToken = await this.generateRefreshToken(`${user.id}`);

    // 记录登录历史
    await this.recordLoginHistory(`${user.id}`, appType);

    return {
      accessToken,
      refreshToken,
      expiresIn: tokenConfig.accessToken.expiresInSeconds,
      tokenType: 'Bearer',
      userInfo: {
        id: `${user.id}`,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        // permissions: user.permissions || [],
      },
    };
  }

  /**
   * 刷新 Access Token
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse | null> {
    try {
      // 验证 Refresh Token
      const decoded = jwt.verify(refreshToken, tokenConfig.refreshToken.secret) as any;

      // 检查 Redis 中是否存在
      const storedToken = await this.redisCache.get(`refresh:${decoded.sub}`);
      if (storedToken !== refreshToken) {
        throw new AppError('refresh token 验证失败');
      }

      // 获取用户信息
      const user = await this.getUserById(decoded.sub);
      if (!user) {
        throw new AppError('refresh token 格式错误');
      }

      // 生成新的 Access Token
      const newAccessToken = jwt.sign(
        {
          sub: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions || [],
        },
        tokenConfig.accessToken.secret,
        {
          expiresIn: tokenConfig.accessToken.expiresInSeconds,
        }
      );

      return {
        accessToken: newAccessToken,
        expiresIn: tokenConfig.accessToken.expiresInSeconds,
        tokenType: 'Bearer',
      };
    } catch (error) {
      logger.error('Refresh token error:', error);
      return null;
    }
  }

  /**
   * 验证 Access Token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ['HS256'],
        issuer: 'blog-system', // 验证签发者
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      logger.error(error);
      return null;
    }
  }

  /**
   * 使用 payload 中的字段进行安全检查
   */
  async validateTokenPayload(payload: TokenPayload): Promise<boolean> {
    // 1. 检查黑名单
    if (payload.jti) {
      const isBlacklisted = await this.redisCache.get(`blacklist:${payload.jti}`);
      if (isBlacklisted) return false;
    }

    // 2. 检查 Token 版本
    const currentTokenVersion = await this.getTokenVersion(payload.sub);
    if (payload.tokenVersion !== currentTokenVersion) {
      return false; // Token 版本不匹配，已被强制登出
    }

    // 3. 检查密码版本
    const currentPwdVersion = await this.getPasswordVersion(payload.sub);
    if (payload.pwdVersion !== currentPwdVersion) {
      return false; // 密码已修改，Token 失效
    }

    // 4. 检查设备（如果启用了单设备登录）
    if (payload.deviceId) {
      const currentDeviceId = await this.redisCache.get(`device:${payload.sub}`);
      if (currentDeviceId && currentDeviceId !== payload.deviceId) {
        return false; // 其他设备登录，当前设备被踢下线
      }
    }

    return true;
  }

  /**
   * 使用 jti 将 Token 加入黑名单
   */
  async blacklistToken(payload: TokenPayload, expiresIn: number): Promise<void> {
    if (payload.jti) {
      await this.redisCache.set(`blacklist:${payload.jti}`, 'revoked', expiresIn);
    }
  }

  /**
   * 登出（撤销 Token）
   */
  async logout(userId: string, accessToken?: string): Promise<void> {
    // 删除 Refresh Token
    await this.redisCache.del(`refresh:${userId}`);

    // 如果提供了 Access Token，加入黑名单
    if (accessToken) {
      const decoded = jwt.decode(accessToken) as any;
      if (decoded?.jti) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await this.redisCache.set(`blacklist:${decoded.jti}`, 'revoked', expiresIn);
        }
      }
    }
  }

  /**
   * 检查 Token 是否在黑名单中
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded?.jti) return false;

      const result = await this.redisCache.get(`blacklist:${decoded.jti}`);
      return result === 'revoked';
    } catch {
      return false;
    }
  }

  /**
   * 撤销旧 Token（禁止多处登录）
   */
  private async revokeOldTokens(userId: string): Promise<void> {
    // 删除旧的 Refresh Token
    await this.redisCache.del(`${PRE_REFRESH_TOKEN}${userId}`);

    // 可以在这里记录日志或通知用户
    logger.info(`Revoked old tokens for user: ${userId}`);
  }

  /**
   * 记录登录历史
   */
  private async recordLoginHistory(userId: string, appType: string): Promise<void> {
    const history = {
      userId,
      appType,
      timestamp: new Date().toISOString(),
      ip: '获取客户端IP',
    };

    // 存储到数据库或 Redis
    // await this.redisCache.lpush(`login:history:${userId}`, JSON.stringify(history));
    // await this.redisCache.ltrim(`login:history:${userId}`, 0, 9); // 保留最近10条
    logger.info(history);
  }

  /**
   * 获取用户信息（示例）
   */
  private async getUserById(userId: string): Promise<any> {
    // 从数据库获取用户
    return {
      id: userId,
      username: 'testuser',
      role: 'user',
      permissions: ['post:view', 'post:create'],
    };
  }

  /**
   * 获取 Token 版本
   */
  private async getTokenVersion(userId: string): Promise<number> {
    const version = await this.redisCache.get(`token:version:${userId}`);
    return version ? parseInt(version) : 1;
  }

  /**
   * 获取密码版本
   */
  private async getPasswordVersion(userId: string): Promise<number> {
    const version = await this.redisCache.get(`pwd:version:${userId}`);
    return version ? parseInt(version) : 1;
  }

  /**
   * 更新用户Token版本到数据库
   */
  // private async updateUserTokenVersion(userId: string, version: number): Promise<void> {
  //   // 更新数据库
  //   console.log(`User ${userId} token version updated to ${version}`);
  // }
}

export default new TokenService();
