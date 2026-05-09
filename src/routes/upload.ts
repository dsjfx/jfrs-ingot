import { Router } from 'express';
import UploadApi from '../api/UploadApi';
import { authenticateToken, authorizeRoles } from '../middleware/authority';
import { uploadSingle, uploadMultiple } from '../middleware/uploadHandler';

const router: Router = Router();

const uploadApi = new UploadApi();

// 所有上传路由都需要认证
router.use(authenticateToken);

// 单文件上传
router.post('/file', uploadSingle('file'), uploadApi.uploadFile);

// 多文件上传
router.post('/files', uploadMultiple('files', 10), uploadApi.uploadFiles);

// 头像上传
router.post('/avatar', uploadSingle('avatar'), uploadApi.uploadAvatar);

// Base64图片上传
router.post('/base64', uploadApi.uploadBase64);

// 删除文件
router.delete('/:filename', authorizeRoles('admin', 'editor'), uploadApi.deleteFile);

// 获取文件信息
router.get('/:filename/info', uploadApi.getFileInfo);

export default router;
