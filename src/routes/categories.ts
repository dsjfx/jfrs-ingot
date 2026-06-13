import { Router } from 'express';
import CategoryApi from '../api/CategoryApi';
import { authenticateToken, authorizeRoles } from '../middleware/authority';
import { validate } from '../middleware/validation';

const router: Router = Router();

const categoryAPi = new CategoryApi();

// 公共路由
router.get('/list', categoryAPi.getAllCategories);
router.get('/popular', categoryAPi.getPopularCategories);
router.get('/search', categoryAPi.searchCategories);
router.get('/:id', categoryAPi.getCategoryById);
router.get('/:id/blogs', categoryAPi.getCategoryBlogs);

// 需要认证的路由
router.use(authenticateToken);

router.get('/admin/list', categoryAPi.getCategories);

router.post(
  '/',
  // authenticateToken,
  authorizeRoles('admin', 'editor'),
  validate(CategoryApi.createSchema),
  categoryAPi.createCategory
);

router.put(
  '/:id',
  // authenticateToken,
  authorizeRoles('admin', 'editor'),
  validate(CategoryApi.updateSchema),
  categoryAPi.updateCategory
);

router.delete(
  '/:id',
  // authenticateToken,
  authorizeRoles('admin', 'editor'),
  categoryAPi.deleteCategory
);

// 管理路由（需要管理员权限）
router.get(
  '/admin/stats',
  // authenticateToken,
  authorizeRoles('admin'),
  categoryAPi.getCategoryStats
);

// 批量操作（需要管理员权限）
router.post(
  '/admin/bulk-create',
  // authenticateToken,
  authorizeRoles('admin'),
  categoryAPi.bulkCreateCategories
);

export default router;
