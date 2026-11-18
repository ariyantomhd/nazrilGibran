// src/modules/licenses/license.controller.ts
import { Request, Response } from 'express';
import { licenseService } from './license.service';

interface ApiErrorResponse {
  message?: string;
}

function extractClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress;
}

export const licenseController = {
  async getMyLicenses(req: Request, res: Response): Promise<void> {
    try {
      const data = await licenseService.getMyLicenses(req.userId!);
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      let message = 'An error occurred while fetching licenses.';
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errObj = error as ApiErrorResponse;
        if (errObj.message) message = errObj.message;
      }
      res.status(400).json({ success: false, message });
    }
  },

  async downloadProduct(req: Request, res: Response): Promise<void> {
    try {
      const licenseId = String(req.params.licenseId || '');
      const ipAddress = extractClientIp(req);
      const data = await licenseService.getDownloadUrl(
        req.userId!,
        licenseId,
        ipAddress
      );
      res.status(200).json({
        success: true,
        message: 'Download link generated successfully.',
        data,
      });
    } catch (error: unknown) {
      let message = 'Failed to generate download link.';
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errObj = error as ApiErrorResponse;
        if (errObj.message) message = errObj.message;
      }
      res.status(400).json({ success: false, message });
    }
  },
};