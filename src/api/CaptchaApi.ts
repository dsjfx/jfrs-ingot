import { Request, Response } from 'express';
import { CaptchaService } from '../services/CaptchaService';
import { ResponseFactory } from '../utils/ResponseFactory';
import logger from '../utils/logger';

class CaptchaApi {
  private captchaService: CaptchaService;

  constructor() {
    this.captchaService = new CaptchaService();
  }

  /**
   * 获取新验证码
   */
  getNewCaptcha = async (_req: Request, res: Response): Promise<void> => {
    try {
      const captcha = await this.captchaService.generateCaptcha();

      res.json(ResponseFactory.success({ captcha }, '验证码生成成功'));
    } catch (error) {
      logger.error('Error generating captcha:', error);

      res.json(ResponseFactory.error('验证码获取失败', 500));
    }
  };

  /**
   * 刷新验证码
   */
  refreshCaptcha = async (req: Request, res: Response): Promise<void> => {
    try {
      const { captchaId } = req.body;

      const captcha = await this.captchaService.refreshCaptcha(captchaId);

      const message: string = captchaId ? '验证码刷新成功' : '验证码生成成功';
      res.json(ResponseFactory.success(captcha, message));
    } catch (error) {
      logger.error('Error refreshing captcha:', error);
      res.json(ResponseFactory.error('验证码刷新失败', 500));
    }
  };

  /**
   * 验证验证码
   */
  validateCaptcha = async (req: Request, res: Response): Promise<void> => {
    try {
      const { captchaId, captchInput } = req.body;

      if (!captchaId || !captchInput) {
        res.json(ResponseFactory.error('缺失验证码数据', 400));
        return;
      }

      const isValid = await this.captchaService.validateCaptcha(captchaId, captchInput);

      const message: string = isValid ? '验证码验证成功' : '无效的验证码';
      res.json(ResponseFactory.success({ isValid }, message));
    } catch (error) {
      logger.error('Error validating captcha:', error);
      res.json(ResponseFactory.error('验证码验证失败', 500));
    }
  };
}

export default CaptchaApi;
