// src/modules/coupon/coupon.route.ts
import { Router } from 'express';
import { couponController } from './coupon.controller';
import { couponRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.post('/apply', couponRateLimiter, couponController.applyCoupon);
router.post('/validate', couponRateLimiter, couponController.applyCoupon);

export default router;