import { Router } from 'express';
import ArchiveApi from '../api/ArchiveApi';

const router: Router = Router();

const archiveApi = new ArchiveApi();

// 归档路由
router.get('/list', archiveApi.getArchive);
router.get('/more', archiveApi.getArchiveMore);

export default router;
