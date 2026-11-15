// src/modules/payment/payment.route.ts
import { Router } from 'express';
import { paymentController } from './payment.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.use(verifyAuth);

router.post('/paypal/create', paymentController.createPayPalOrder);
router.post('/paypal/capture', paymentController.capturePayPalOrder);

export default router;