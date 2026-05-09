import { Router } from 'express';
import authRoutes from './auth';
import blogRoutes from './blogs';
import photoRoutes from './photos';
import categoryRoutes from './categories';
import tagRoutes from './tags';
import commentRoutes from './comments';
import captchaRoutes from './captcha';
import uploadRoutes from './upload';

const router: Router = Router();

// API 版本前缀
// const API_PREFIX = '/api/v1';
const API_PREFIX = '/jdmk';

// 注册路由
router.use(`${API_PREFIX}/auth`, authRoutes);
router.use(`${API_PREFIX}/blog`, blogRoutes);
router.use(`${API_PREFIX}/category`, categoryRoutes);
router.use(`${API_PREFIX}/tag`, tagRoutes);
router.use(`${API_PREFIX}/comment`, commentRoutes);
router.use(`${API_PREFIX}/captcha`, captchaRoutes);
router.use(`${API_PREFIX}/upload`, uploadRoutes);
router.use(`${API_PREFIX}/photos`, photoRoutes);

// API 根路径
router.get(API_PREFIX, (_req, res) => {
  res.json({
    message: '糖果博客后台 API',
    version: '1.0.0',
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      blogs: `${API_PREFIX}/blogs`,
      categories: `${API_PREFIX}/categories`,
      tags: `${API_PREFIX}/tags`,
      comments: `${API_PREFIX}/comments`,
    },
    documentation: '/api/v1/docs', // 可以添加文档链接
  });
});

export default router;
