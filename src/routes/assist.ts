import { Router } from 'express';
import AssistApi from '@/api/AssistApi';

const router: Router = Router();

const assistApi = new AssistApi();

router.get('/subjects', assistApi.getSubjectsOptions);

export default router;
