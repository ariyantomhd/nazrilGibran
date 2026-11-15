// src/modules/downloads/download.controller.ts
import { Request, Response } from 'express';
import { downloadService } from './download.service';

export const downloadController = {
  async downloadProduct(req: Request, res: Response): Promise<void> {
    try {
      const { license_key } = req.body;
      if (!license_key) {
        res.status(400).json({ success: false, message: 'License key wajib disertakan' });
        return;
      }

      // Ambil IP address client untuk dicatat di log
      const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;

      const data = await downloadService.processDownload(req.userId!, license_key, ipAddress);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};