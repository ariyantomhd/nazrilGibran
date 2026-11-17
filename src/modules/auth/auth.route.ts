// src/modules/auth/auth.route.ts
import { Router } from 'express';
import { authController } from './auth.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';
import { authRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Private Endpoints (Must be placed above the /:provider wildcard)
router.get('/me', verifyAuth, authController.getProfile);
router.get('/profile', verifyAuth, authController.getProfile);
router.put('/profile', verifyAuth, authRateLimiter, authController.updateProfile);
router.post('/signout', authRateLimiter, authController.signout);

// Social OAuth & Callback Endpoints (Google & X)
router.get('/:provider/callback', authRateLimiter, authController.socialCallback);
router.get('/:provider', authRateLimiter, authController.socialAuth);

export default router;