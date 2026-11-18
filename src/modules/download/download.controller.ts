// src/modules/downloads/download.controller.ts
import { Request, Response } from 'express';
import { downloadService } from './download.service';

function extractClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress;
}

export const downloadController = {
  async downloadProduct(req: Request, res: Response): Promise<void> {
    try {
      const { license_key } = req.body;
      if (!license_key || typeof license_key !== 'string') {
        res.status(400).json({ success: false, message: 'License key is required.' });
        return;
      }

      const ipAddress = extractClientIp(req);
      const data = await downloadService.processDownload(
        req.userId!,
        license_key,
        ipAddress
      );

      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to process download request.';
      res.status(400).json({ success: false, message });
    }
  },
};