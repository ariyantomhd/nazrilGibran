// src/modules/coupon/coupon.controller.ts
import { Request, Response } from 'express';
import { couponService } from './coupon.service';

export const couponController = {
  async applyCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { code, subtotal } = req.body;
      const result = await couponService.validateAndCalculate(code, subtotal);

      res.status(200).json({
        success: true,
        message: `Kupon ${result.code} berhasil diterapkan!`,
        discountPercent: result.discountPercent,
        discountAmount: result.discountAmount,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Kode kupon tidak valid',
      });
    }
  },
};