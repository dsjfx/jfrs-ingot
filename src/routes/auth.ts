import { Router } from 'express';
import AuthApi from '../api/AuthApi';
import { authenticateToken } from '../middleware/authority';
import { rLimit as rateLimit } from '../middleware/rateLimit';

const router: Router = Router();

const authApi = new AuthApi();

// 公开路由（不需要认证）
/**
 * 用户注册
 */
router.post('/register', authApi.register);

/**
 * 用户登录
 */
router.post('/login', rateLimit({ max: 5 }), authApi.login);

router.get('/avatar', authApi.getUserAvatar);

router.get('/sys-avatar', authApi.getSystemAvatar);

/**
 * 获取当前用户信息
 */
router.get('/profile/simple', authApi.getSimpleProfile);

// 需要认证的路由
router.use(authenticateToken); // 以下所有路由都需要认证

/**
 * 获取当前用户信息
 */
router.get('/profile', authApi.getProfile);

/**
 * 更新个人信息
 */
router.post('/profile', authApi.updateProfile);

/**
 * 修改密码
 */
router.post('/change-password', authApi.changePassword);

/**
 * 退出登录
 */
router.post('/logout', authApi.logout);

/**
 * 刷新token
 */
router.post('/refresh-token', authApi.refreshToken);

export default router;
