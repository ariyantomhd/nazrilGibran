// src/modules/licenses/license.route.ts
import { Router } from 'express';
import { licenseController } from './license.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';
import { downloadRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.use(verifyAuth);

router.get('/', licenseController.getMyLicenses);
router.get('/:licenseId/download', downloadRateLimiter, licenseController.downloadProduct);

export default router;