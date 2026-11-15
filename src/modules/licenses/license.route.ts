// src/modules/licenses/license.route.ts
import { Router } from 'express';
import { licenseController } from './license.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.use(verifyAuth);

router.get('/', licenseController.getMyLicenses);
router.get('/:licenseId/download', licenseController.downloadProduct);

export default router;