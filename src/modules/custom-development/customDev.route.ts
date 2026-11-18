// src/modules/custom-development/customDev.route.ts
import { Router } from 'express';
import { customDevController } from './customDev.controller';
import { optionalAuth, verifyAuth } from '../../middlewares/auth.middleware';
import { interactionRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Public & Authenticated proposal submission (rate-limited)
router.post(
  '/',
  optionalAuth,
  interactionRateLimiter,
  customDevController.submitRequest
);

// Authenticated user's submitted proposals history (for Dashboard)
router.get('/my-requests', verifyAuth, customDevController.getMyRequests);

export default router;