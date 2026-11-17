// src/modules/payment/payment.route.ts
import { Router } from 'express';
import { paymentController } from './payment.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';
import { paymentRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.use(verifyAuth);

router.post('/paypal/create', paymentRateLimiter, paymentController.createPayPalOrder);
router.post('/paypal/capture', paymentRateLimiter, paymentController.capturePayPalOrder);

export default router;