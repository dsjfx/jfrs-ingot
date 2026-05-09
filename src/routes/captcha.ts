import { Router } from 'express';
import CaptchaApi from '../api/CaptchaApi';
import { validateCaptchaRefresh } from '../middleware/validation';

const router: Router = Router();

const captchaApi = new CaptchaApi();

// 获取新验证码
router.get('/new', captchaApi.getNewCaptcha);

// 刷新验证码（POST方式）
router.post('/refresh', validateCaptchaRefresh, captchaApi.refreshCaptcha);

// 验证验证码
router.post('/validate', captchaApi.validateCaptcha);

export default router;