// src/modules/orders/order.controller.ts
import { Request, Response } from 'express';
import { orderService } from './order.service';

export const orderController = {
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const data = await orderService.createOrder(req.userId!, req.body);
      res.status(201).json({
        success: true,
        message: 'Order created successfully.',
        data,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create order.';
      res.status(400).json({ success: false, message });
    }
  },

  async getMyOrders(req: Request, res: Response): Promise<void> {
    try {
      const data = await orderService.getMyOrders(req.userId!);
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch orders.';
      res.status(400).json({ success: false, message });
    }
  },

  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const data = await orderService.getOrderById(req.userId!, id);
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Order not found.';
      res.status(404).json({ success: false, message });
    }
  },
};