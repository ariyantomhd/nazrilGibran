// src/modules/dashboard/dashboard.route.ts
import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.use(verifyAuth);
router.get('/', dashboardController.getDashboard);

export default router;