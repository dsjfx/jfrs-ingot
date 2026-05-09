import { Router } from 'express';
import CommentApi from '../api/CommentApi';
import { authenticateToken, authorizeRoles, checkOwnership } from '../middleware/authority';
import { validate } from '../middleware/validation';

const router: Router = Router();

const commentApi = new CommentApi();

// 公共路由
router.get('/list', commentApi.getComments);
router.get('/blog', commentApi.getBlogsComments);
router.get('/popular', commentApi.getPopularComments);
router.get('/search', commentApi.searchComments);
router.get('/view/:id', commentApi.getCommentById);

// 需要认证的路由
router.post('/', authenticateToken, validate(CommentApi.createSchema), commentApi.createComment);

router.put(
  '/:id',
  authenticateToken,
  validate(CommentApi.updateSchema),
  checkOwnership('Comment'),
  commentApi.updateComment
);

router.delete('/:id', authenticateToken, checkOwnership('Comment'), commentApi.deleteComment);

router.post('/like/:id', authenticateToken, commentApi.likeComment);

// 用户相关的评论
router.get('/user/my-comments', authenticateToken, commentApi.getUserComments);

// 管理相关路由（需要管理员或编辑权限）
router.get(
  '/pending',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  commentApi.getPendingComments
);

router.post(
  '/moderate/:id',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  commentApi.moderateComment
);

router.post(
  '/bulk-moderate',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  commentApi.bulkModerateComments
);

router.get(
  '/stats',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  commentApi.getCommentStats
);

export default router;
