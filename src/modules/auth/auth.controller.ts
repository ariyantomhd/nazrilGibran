// src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { authService } from './auth.service';
import { inspectClientTelemetry } from '../../utils/clientTelemetry';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await inspectClientTelemetry(req);
      const data = await authService.register(req.body, telemetry);
      res.status(201).json({ success: true, message: 'Registrasi berhasil', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await inspectClientTelemetry(req);
      const data = await authService.login(req.body, telemetry);
      res.status(200).json({ success: true, message: 'Login berhasil', data });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message });
    }
  },

  async socialAuth(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params; // 'google' atau 'twitter'
      if (provider !== 'google' && provider !== 'twitter') {
        res.status(400).json({ success: false, message: 'Provider tidak didukung' });
        return;
      }

      const url = await authService.getSocialAuthUrl(provider);
      res.status(200).json({ success: true, url });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const data = await authService.getMe(userId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async signout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : undefined;

      await authService.signout(accessToken);
      res.status(200).json({ success: true, message: 'Logout berhasil' });
    } catch (error: any) {
      console.warn('[Signout Controller Warning]:', error.message);
      res.status(200).json({ success: true, message: 'Logout berhasil' });
    }
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email wajib diisi' });
        return;
      }
      await authService.resetPassword(email);
      res.status(200).json({ success: true, message: 'Email reset password telah dikirim' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      await authService.updatePassword(userId, req.body);
      res.status(200).json({ success: true, message: 'Password berhasil diperbarui' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const data = await authService.updateProfile(userId, req.body);
      res.status(200).json({ success: true, message: 'Profil berhasil diperbarui', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async confirmation(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ success: false, message: 'Token wajib diisi' });
        return;
      }
      await authService.confirmation(token);
      res.status(200).json({ success: true, message: 'Konfirmasi sukses' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};