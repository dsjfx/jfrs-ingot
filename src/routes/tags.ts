import { Router } from 'express';
import TagApi from '../api/TagApi';
import { authenticateToken, authorizeRoles } from '../middleware/authority';
import { validate } from '../middleware/validation';

const router: Router = Router();

const tagApi = new TagApi();

// 公共路由
router.get('/list', tagApi.getAllTags);
router.get('/popular', tagApi.getPopularTags);
router.get('/search', tagApi.searchTags);
router.get('/:id', tagApi.getTagById);
router.get('/:id/blogs', tagApi.getTagBlogs);

// 需要认证的路由
router.use(authenticateToken);

router.get('/admin/list', tagApi.getTags);

router.post(
  '/',
  // authenticateToken,
  authorizeRoles('admin', 'editor'),
  validate(TagApi.createSchema),
  tagApi.createTag
);

router.put(
  '/:id',
  // authenticateToken,
  authorizeRoles('admin', 'editor'),
  validate(TagApi.updateSchema),
  tagApi.updateTag
);

router.delete(
  '/:id',
  // authenticateToken,
  authorizeRoles('admin', 'editor'),
  tagApi.deleteTag
);

// 管理路由（需要管理员权限）
router.get(
  '/admin/stats',
  // authenticateToken,
  authorizeRoles('admin'),
  tagApi.getTagStats
);

// 批量操作（需要管理员权限）
router.post(
  '/admin/bulk-create',
  // authenticateToken,
  authorizeRoles('admin'),
  validate(TagApi.bulkCreateSchema),
  tagApi.bulkCreateTags
);

export default router;
