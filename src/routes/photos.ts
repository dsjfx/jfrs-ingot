import { Router } from 'express';
import BlogApi from '../api/BlogApi';
import { authorizeRoles, optionalAuth } from '../middleware/authority';
import PhotoApi from '../api/PhotoApi';

const router: Router = Router();

const blogApi = new BlogApi();

const photoApi = new PhotoApi();

// 公共路由

router.get('/blogs', optionalAuth, blogApi.getBlogs);

router.get('/search', blogApi.getBlogs);

router.get('/featured', blogApi.getFeaturedBlogs);

router.get('/with-photos', optionalAuth, photoApi.getBlogsWithPhotos);

// 获取博客的所有照片
router.get('/view/:id', optionalAuth, photoApi.getBlogWithPhotos);

router.get('/search-photos', optionalAuth, photoApi.getBlogsWithPhotos);

// 相册集
router.get('/group/tag', photoApi.groupPhotosByTag);
router.get('/group/category', photoApi.groupPhotosByCategory);
router.get('/tag/:tagId', photoApi.getPhotosByTag);
router.get('/category/:categoryId', photoApi.getPhotosByCategory);

// 获取博客的封面图
router.get('/:blogId/cover', photoApi.getCoverPhoto);

// 设置封面图
router.put('/:photoId/cover', photoApi.setCoverPhoto);

// 更新照片信息
router.put('/:photoId', photoApi.updatePhoto);

// 删除照片
router.delete('/:photoId', authorizeRoles('admin', 'editor'), photoApi.deletePhoto);

// 批量更新照片排序
router.put('/:blogId/order', photoApi.updatePhotosOrder);

export default router;
