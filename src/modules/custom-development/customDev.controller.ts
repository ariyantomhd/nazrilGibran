// src/modules/custom-development/customDev.controller.ts
import { Request, Response } from 'express';
import { customDevService } from './customDev.service';

export const customDevController = {
  async submitRequest(req: Request, res: Response): Promise<void> {
    try {
      const created = await customDevService.submitRequest(req.body, req.userId);
      res.status(201).json({
        success: true,
        message: 'Custom development proposal submitted successfully.',
        data: {
          id: created.id,
          project_title: created.project_title,
          status: created.status,
          created_at: created.created_at,
        },
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to submit proposal.',
      });
    }
  },

  async getMyRequests(req: Request, res: Response): Promise<void> {
    try {
      const requests = await customDevService.getMyRequests(req.userId as string);
      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve proposals.',
      });
    }
  },
};