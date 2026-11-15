// src/modules/downloads/download.route.ts
import { Router } from 'express';
import { downloadController } from './download.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.use(verifyAuth);

router.post('/', downloadController.downloadProduct);

export default router;