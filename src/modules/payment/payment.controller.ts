// src/modules/payment/payment.controller.ts
import { Request, Response } from 'express';
import { paymentService } from './payment.service';

export const paymentController = {
  async createPayPalOrder(req: Request, res: Response): Promise<void> {
    try {
      const { order_id } = req.body;
      if (!order_id || typeof order_id !== 'string') {
        res.status(400).json({ success: false, message: 'order_id is required.' });
        return;
      }

      const data = await paymentService.createPayPalOrder(req.userId!, { order_id });
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize PayPal checkout.';
      res.status(400).json({ success: false, message });
    }
  },

  async capturePayPalOrder(req: Request, res: Response): Promise<void> {
    try {
      const { order_id, token } = req.body;
      if (!order_id || !token || typeof order_id !== 'string' || typeof token !== 'string') {
        res.status(400).json({
          success: false,
          message: 'order_id and PayPal token are required.',
        });
        return;
      }

      const data = await paymentService.capturePayPalOrder(
        req.userId!,
        order_id,
        token
      );
      res.status(200).json(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to capture PayPal payment.';
      res.status(400).json({ success: false, message });
    }
  },
};