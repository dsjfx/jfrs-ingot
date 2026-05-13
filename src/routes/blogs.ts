import { Router } from 'express';
import BlogApi from '../api/BlogApi';
import CommentApi from '../api/CommentApi';
import {
  authenticateToken,
  authorizeRoles,
  optionalAuth,
  checkOwnership,
} from '../middleware/authority';
import { validate } from '../middleware/validation';

const router: Router = Router();

const blogApi = new BlogApi();

const commentApi = new CommentApi();

// 公共路由
router.get('/list', optionalAuth, blogApi.getBlogs);
router.get('/popular', blogApi.getPopularBlogs);
router.get('/search', blogApi.getBlogs); // 使用相同的获取方法
router.get('/view/:id', optionalAuth, blogApi.getBlogById);
router.get('/related/:id', blogApi.getRelatedBlogs);
router.get('/comments/:id', blogApi.getBlogComments);
router.get('/stats/:id', blogApi.getBlogStats);

router.get('/adjacent/:id', blogApi.getAdjacentBlogs);
router.get('/adjacent/category/:id', blogApi.getAdjacentBlogsInSameCategory);
router.get('/adjacent/author/:id', blogApi.getAdjacentBlogsBySameAuthor);

// 归档路由
router.get('/archive', blogApi.getArchive);
router.get('/archive/more', blogApi.getArchiveMore);

router.use(authenticateToken); // 以下所有路由都需要认证

// 需要认证的路由

router.get('/admin/list', optionalAuth, blogApi.getBlogs);

router.post(
  '/',
  authorizeRoles('admin', 'editor'),
  validate(BlogApi.createSchema),
  blogApi.createBlog
);

router.post(
  '/photos',
  authorizeRoles('admin', 'editor'),
  validate(BlogApi.createSchema),
  blogApi.createBlogWithPhotos
);

router.put(
  '/:id',
  authorizeRoles('admin', 'editor'),
  validate(BlogApi.updateSchema),
  checkOwnership('Blog'), // 检查所有权
  blogApi.updateBlog
);

router.patch('/:id/status', authorizeRoles('admin', 'editor'), blogApi.updateBlogStatus);

router.delete(
  '/:id',
  authorizeRoles('admin', 'editor'),
  checkOwnership('Blog'), // 检查所有权
  blogApi.deleteBlog
);

// 用户个人的博客
router.get('/user/my-blogs', blogApi.getUserBlogs);

// 评论相关路由
router.post('/:id/comments', commentApi.createComment);

router.put(
  '/comments/:commentId',
  checkOwnership('Comment', 'commentId'),
  commentApi.updateComment
);

router.delete(
  '/comments/:commentId',
  checkOwnership('Comment', 'commentId'),
  commentApi.deleteComment
);

// 批量操作
router.post('/bulk/update-status', authorizeRoles('admin', 'editor'), blogApi.bulkUpdateStatus);

export default router;
