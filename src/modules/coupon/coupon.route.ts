// src/modules/coupon/coupon.route.ts
import { Router } from 'express';
import { couponController } from './coupon.controller';

const router = Router();

router.post('/apply', couponController.applyCoupon);
router.post('/validate', couponController.applyCoupon);

export default router;