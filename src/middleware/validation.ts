import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import Joi from 'joi';
import logger from '../utils/logger';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('请求验证失败:', errors);
      res.status(400).json({ errors });
      return;
    }

    next();
  };
};

export const validateCaptchaRefresh = [
  body('captchaId').optional().isUUID().withMessage('Invalid captcha ID format'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next(); // 调用 next
      return; // 只需要加这一个 return 就行
    }

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  },
];
