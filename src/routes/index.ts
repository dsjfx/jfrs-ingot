import { Router } from 'express';
import assistRoutes from './assist'; // 导入 assist 路由
import authRoutes from './auth';
import blogRoutes from './blogs';
import captchaRoutes from './captcha';
import categoryRoutes from './categories';
import commentRoutes from './comments';
import photoRoutes from './photos';
import tagRoutes from './tags';
import uploadRoutes from './upload';

const router: Router = Router();

// API 版本前缀
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// 注册路由
router.use(`${API_PREFIX}/auth`, authRoutes);
router.use(`${API_PREFIX}/blog`, blogRoutes);
router.use(`${API_PREFIX}/category`, categoryRoutes);
router.use(`${API_PREFIX}/tag`, tagRoutes);
router.use(`${API_PREFIX}/comment`, commentRoutes);
router.use(`${API_PREFIX}/captcha`, captchaRoutes);
router.use(`${API_PREFIX}/upload`, uploadRoutes);
router.use(`${API_PREFIX}/photos`, photoRoutes);
router.use(`${API_PREFIX}/assist`, assistRoutes); // 添加 assist 路由

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
