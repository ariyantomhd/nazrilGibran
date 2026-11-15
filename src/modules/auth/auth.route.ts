// src/modules/auth/auth.route.ts
import { Router } from 'express';
import { authController } from './auth.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';

const router = Router();

// Endpoint Publik
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/reset-password', authController.resetPassword);
router.post('/confirmation', authController.confirmation);
router.post('/signout', authController.signout);

// Endpoint Privat (Wajib di atas /:provider agar /profile tidak dianggap sebagai :provider)
router.get('/profile', verifyAuth, authController.getProfile);
router.put('/profile', verifyAuth, authController.updateProfile);
router.put('/password', verifyAuth, authController.updatePassword);

// Endpoint Social Auth (Google & Twitter)
router.get('/:provider', authController.socialAuth);

export default router;