// src/modules/orders/order.route.ts
import { Router } from 'express';
import { orderController } from './order.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';
import { paymentRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Apply Auth protection to all order endpoints
router.use(verifyAuth);

router.post('/', paymentRateLimiter, orderController.createOrder);
router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getOrderById);

export default router;