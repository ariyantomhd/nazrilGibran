// src/modules/affiliates/affiliate.route.ts
import { Router } from 'express';
import { affiliateController } from './affiliate.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';
import {
  actionRateLimiter,
  interactionRateLimiter,
} from '../../middlewares/rateLimiter';

const router = Router();

// Public endpoints (Product Detail Affiliate Widget & Referral Click Tracking)
router.post('/generate-link', actionRateLimiter, affiliateController.trackAndGetUrl);
router.post('/track-click', actionRateLimiter, affiliateController.trackClick);

// Authenticated user endpoints (Affiliate Registration & Commission Dashboard)
router.post('/apply', verifyAuth, interactionRateLimiter, affiliateController.apply);
router.get('/me', verifyAuth, affiliateController.getMyDashboard);

export default router;