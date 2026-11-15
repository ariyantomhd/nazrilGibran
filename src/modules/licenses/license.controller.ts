// src/modules/licenses/license.controller.ts
import { Request, Response } from 'express';
import { licenseService } from './license.service';

interface ApiErrorResponse {
  message?: string;
}

export const licenseController = {
  async getMyLicenses(req: Request, res: Response): Promise<void> {
    try {
      const data = await licenseService.getMyLicenses(req.userId!);
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      let message = 'Terjadi kesalahan saat mengambil data lisensi.';
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
      const licenseId = req.params.licenseId as string;
      const data = await licenseService.getDownloadUrl(req.userId!, licenseId);
      res.status(200).json({ success: true, message: 'Tautan unduhan berhasil dibuat', data });
    } catch (error: unknown) {
      let message = 'Gagal membuat tautan unduhan.';
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errObj = error as ApiErrorResponse;
        if (errObj.message) message = errObj.message;
      }
      res.status(400).json({ success: false, message });
    }
  }
};