import SystemApi from '../api/SystemApi';
import { Router } from 'express';

const router: Router = Router();

const systemApi = new SystemApi();

// 获取所有系统配置
router.get('/configs', systemApi.getAll);

// 获取特定配置项
router.get('/config/:key', systemApi.getByKey);

// 更新配置项
router.post('/config/:key', systemApi.updateSingle);

// 删除配置项（软删除）
router.delete('/config/:key', systemApi.deleteConfig);

// 永久删除配置项
router.delete('/config/:key/force', systemApi.forceDelete);

// 恢复已删除的配置项
router.post('/config/:key/restore', systemApi.restore);

export default router;
