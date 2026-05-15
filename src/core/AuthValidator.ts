import Joi from 'joi';

// 用户注册验证
export const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().messages({
    'string.min': '用户名至少3个字符',
    'string.max': '用户名不能超过50个字符',
    'any.required': '用户名是必填项',
  }),

  nickname: Joi.string().optional(),

  email: Joi.string().email().required().messages({
    'string.email': '请输入有效的邮箱地址',
    'any.required': '邮箱是必填项',
  }),

  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': '密码至少6个字符',
      'string.max': '密码不能超过100个字符',
      'string.pattern.base': '密码必须包含大小写字母和数字',
      'any.required': '密码是必填项',
    }),

  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': '两次输入的密码不一致',
    'any.required': '请确认密码',
  }),

  role: Joi.string().valid('admin', 'editor', 'viewer').default('viewer').messages({
    'any.only': '角色只能是 admin, editor 或 viewer',
  }),

  avatar: Joi.string().uri().optional().messages({
    'string.uri': '头像必须是有效的URL地址',
  }),
});

// 用户登录验证
export const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'any.required': '用户名是必填项',
  }),

  password: Joi.string().required().messages({
    'any.required': '密码是必填项',
  }),

  captcha: Joi.string().required().messages({
    'string.required': '缺少验证码',
  }),

  captchaId: Joi.string().required().messages({
    'string.required': '缺少验证码id',
  }),

  appType: Joi.string().valid('blog', 'admin').required().messages({
    'string.required': '缺少 app 类型',
  }),

  rememberMe: Joi.boolean().default(false),
});

// 更新个人信息验证
export const updateProfileSchema = Joi.object({
  nickname: Joi.string().min(2).max(20).optional(),
  email: Joi.string().email().optional(),
  avatar: Joi.string().uri().optional().allow(''),
  bio: Joi.string().optional().allow(''),
  phone: Joi.string().optional().allow(''),
  birthday: Joi.date().optional().allow(''),
  gender: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
  hobbies: Joi.array().items(Joi.string()).optional().allow(''),
  github: Joi.string().uri().optional().allow(''),
  weibo: Joi.string().uri().optional().allow(''),
  zhihu: Joi.string().uri().optional().allow(''),
  website: Joi.string().uri().optional().allow(''),
  motto: Joi.string().optional().allow(''),
  job: Joi.string().optional().allow(''),
  position: Joi.string().optional().allow(''),

  // oldPassword: Joi.string().min(6).when('password', {
  //   is: Joi.exist(),
  //   then: Joi.required(),
  //   otherwise: Joi.optional(),
  // }),

  // password: Joi.string().min(6).max(100).optional(),

  // confirmPassword: Joi.string().valid(Joi.ref('password')).when('password', {
  //   is: Joi.exist(),
  //   then: Joi.required(),
  //   otherwise: Joi.optional(),
  // }),
});

// 修改密码验证
export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    'any.required': '原密码是必填项',
  }),

  newPassword: Joi.string()
    .min(6)
    .max(100)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': '新密码至少6个字符',
      'string.pattern.base': '新密码必须包含大小写字母和数字',
      'any.required': '新密码是必填项',
    }),

  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': '两次输入的密码不一致',
    'any.required': '请确认新密码',
  }),
});
