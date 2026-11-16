// src/modules/auth/auth.route.ts
import { Router } from 'express';
import { authController } from './auth.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';

const router = Router();

// Private Endpoints (Must be placed above the /:provider wildcard)
router.get('/me', verifyAuth, authController.getProfile);
router.get('/profile', verifyAuth, authController.getProfile);
router.put('/profile', verifyAuth, authController.updateProfile);
router.post('/signout', authController.signout);

// Social OAuth & Callback Endpoints (Google, Facebook, X, Discord)
router.get('/:provider/callback', authController.socialCallback);
router.get('/:provider', authController.socialAuth);

export default router;