import { Router } from 'express';
import RequirementApi from '../api/RequirementApi';
import { authenticateToken, authorizeRoles } from '../middleware/authority';

const router: Router = Router();

const requirementApi = new RequirementApi();

// 所有需求管理接口都需要登录
router.use(authenticateToken);

router.get('/systems', requirementApi.getSystems);
router.get('/stats', requirementApi.getStats);
router.get('/overview-stats', requirementApi.getOverviewStats);

// 查询列表
router.get('/list', requirementApi.findAll);

// 创建需求（如果有权限控制，可以加 authorizeRoles('admin', 'editor')）
router.post('/', requirementApi.create);

// 查询详情
router.get('/view/:id', requirementApi.findById);

// 更新需求（全量/部分）
router.put('/:id', requirementApi.update);

// 删除需求（通常只允许管理员或产品经理删除）
router.delete('/:id', authorizeRoles('admin'), requirementApi.delete);

// 批量删除需求（通常只允许管理员或产品经理删除）
router.delete('/batch', authorizeRoles('admin'), requirementApi.batchDelete);

// 快速更新状态（用于看板拖拽或一键完成）
router.patch('/:id/status', requirementApi.updateStatus);

export default router;
