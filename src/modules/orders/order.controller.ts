// src/modules/orders/order.controller.ts
import { Request, Response } from 'express';
import { orderService } from './order.service';

export const orderController = {
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const data = await orderService.createOrder(req.userId!, req.body);
      res.status(201).json({ success: true, message: 'Order berhasil dibuat', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getMyOrders(req: Request, res: Response): Promise<void> {
    try {
      const data = await orderService.getMyOrders(req.userId!);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      // Type casting eksplisit ke string untuk menghindari error 'string | string[]'
      const id = req.params.id as string;
      const data = await orderService.getOrderById(req.userId!, id);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
};