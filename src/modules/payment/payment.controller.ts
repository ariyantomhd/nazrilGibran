// src/modules/payment/payment.controller.ts
import { Request, Response } from 'express';
import { paymentService } from './payment.service';

export const paymentController = {
  async createPayPalOrder(req: Request, res: Response): Promise<void> {
    try {
      const { order_id } = req.body;
      if (!order_id) throw new Error('order_id diperlukan');

      const data = await paymentService.createPayPalOrder(req.userId!, { order_id });
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async capturePayPalOrder(req: Request, res: Response): Promise<void> {
    try {
      const { order_id, token } = req.body;
      if (!order_id || !token) throw new Error('order_id dan token PayPal diperlukan');

      const data = await paymentService.capturePayPalOrder(req.userId!, order_id, token);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};