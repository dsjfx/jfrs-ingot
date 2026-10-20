import { Router } from 'express';
import CommentApi from '../api/CommentApi';
import CommentReportApi from '../api/CommentReportApi';
import CommentBlockApi from '../api/CommentBlockApi';
import CommentBlockPersonalApi from '@/api/CommentBlockPersonalApi';
import { authenticateToken, authorizeRoles } from '../middleware/authority';
import { validate } from '../middleware/validation';

const router: Router = Router();

const commentApi = new CommentApi();

const reportApi = new CommentReportApi();

const blockApi = new CommentBlockApi();

const blockPersonalApi = new CommentBlockPersonalApi();

// 公共路由
router.get('/list', commentApi.getComments);
router.get('/blog', commentApi.getBlogsComments);
router.get('/popular', commentApi.getPopularComments);
router.get('/search', commentApi.searchComments);
router.get('/view/:id', commentApi.getCommentById);
router.get('/user', commentApi.getCommentUserByEmail);

router.post('/add/:id', validate(CommentApi.createSchema), commentApi.createComment);

router.put('/update/:id', validate(CommentApi.updateSchema), commentApi.updateComment);

router.delete('/delete/:id', commentApi.deleteComment);

router.post('/like/:id', commentApi.likeComment);

// 用户相关的评论
router.get('/user/comments', commentApi.getUserComments);

// 举报评论（无需登录）
router.post('/reports', validate(CommentReportApi.reportSchema), reportApi.reportComment);

// 检查是否被屏蔽（无需登录）
router.get('/blocks/check', blockApi.checkBlocked);

// 个人屏蔽相关路由（无需登录，前端可根据用户ID获取）
router.post('/blocks/personal', blockPersonalApi.block);

// 取消个人屏蔽
router.delete('/blocks/personal', blockPersonalApi.unblock);

// 获取我的屏蔽列表（无需登录，前端可根据用户ID获取）
router.get('/blocks/personal', blockPersonalApi.getBlocks);

router.use(authenticateToken); // 以下所有路由都需要认证

// ^^^^^^^^^^^^^^ 需要认证的路由

router.get('/users', authorizeRoles('admin', 'editor'), commentApi.getCommentUsers);

// 管理相关路由（需要管理员或编辑权限）
router.get('/pending', authorizeRoles('admin', 'editor'), commentApi.getPendingComments);

router.post('/moderate/:id', authorizeRoles('admin', 'editor'), commentApi.moderateComment);

router.post('/bulk-moderate', authorizeRoles('admin', 'editor'), commentApi.bulkModerateComments);

router.get('/stats', authorizeRoles('admin', 'editor'), commentApi.getCommentStats);

router.get('/reports', authenticateToken, authorizeRoles('admin', 'editor'), reportApi.getReports);

router.get(
  '/reports/stats',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  reportApi.getReportStats
);

router.get(
  '/reports/:id',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  reportApi.getReportById
);

router.post(
  '/reports/:id/handle',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  validate(CommentReportApi.handleSchema),
  reportApi.handleReport
);

router.post(
  '/reports/bulk-handle',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  reportApi.bulkHandleReports
);

router.delete('/reports/:id', authenticateToken, authorizeRoles('admin'), reportApi.deleteReport);

router.post(
  '/blocks',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  validate(CommentBlockApi.createSchema),
  blockApi.createBlock
);

router.get('/blocks', authenticateToken, authorizeRoles('admin', 'editor'), blockApi.getBlocks);

router.get(
  '/blocks/:id',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  blockApi.getBlockById
);

router.put(
  '/blocks/:id',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  validate(CommentBlockApi.updateSchema),
  blockApi.updateBlock
);

router.delete('/blocks/:id', authenticateToken, authorizeRoles('admin'), blockApi.deleteBlock);

router.post(
  '/blocks/bulk-delete',
  authenticateToken,
  authorizeRoles('admin'),
  blockApi.bulkDeleteBlocks
);

// 从评论快速屏蔽
router.post(
  '/blocks/from-comment/:commentId',
  authenticateToken,
  authorizeRoles('admin', 'editor'),
  blockApi.blockFromComment
);

export default router;
