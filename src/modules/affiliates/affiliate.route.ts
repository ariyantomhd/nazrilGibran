// src/modules/affiliates/affiliate.route.ts
import { Router } from 'express';
import { affiliateController } from './affiliate.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';
import {
  actionRateLimiter,
  interactionRateLimiter,
} from '../../middlewares/rateLimiter';

const router = Router();

// Endpoint Publik (Widget Product Detail & Tracking Klik)
router.post('/generate-link', actionRateLimiter, affiliateController.trackAndGetUrl);
router.post('/track-click', actionRateLimiter, affiliateController.trackClick);

// Endpoint User Login (Pendaftaran & Dashboard Komisi Affiliator)
router.post('/apply', verifyAuth, interactionRateLimiter, affiliateController.apply);
router.get('/me', verifyAuth, affiliateController.getMyDashboard);

export default router;