// src/modules/dashboard/dashboard.controller.ts
import { Request, Response } from 'express';
import { dashboardService } from './dashboard.service';

export const dashboardController = {
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const data = await dashboardService.getDashboardData(userId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};