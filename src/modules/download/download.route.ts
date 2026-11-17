// src/modules/downloads/download.route.ts
import { Router } from 'express';
import { downloadController } from './download.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';
import { downloadRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.use(verifyAuth);

router.post('/', downloadRateLimiter, downloadController.downloadProduct);

export default router;