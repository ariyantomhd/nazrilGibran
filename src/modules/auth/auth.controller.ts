// src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { authService } from './auth.service';
import { inspectClientTelemetry } from '../../utils/clientTelemetry';
import { SocialProvider } from '../../types/auth';
import { setAuthCookie, clearAuthCookie } from '../../utils/authCookie';

const ALLOWED_PROVIDERS: SocialProvider[] = ['google'];

const getFrontendBaseUrl = (): string =>
  (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const authController = {
  async socialAuth(req: Request, res: Response): Promise<void> {
    try {
      const provider = String(req.params.provider).toLowerCase() as SocialProvider;
      if (!ALLOWED_PROVIDERS.includes(provider)) {
        res
          .status(400)
          .json({ success: false, message: 'Unsupported authentication provider' });
        return;
      }

      const url = authService.getSocialAuthUrl(provider);

      if (req.headers.accept?.includes('application/json')) {
        res.status(200).json({ success: true, url });
        return;
      }

      res.redirect(url);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize authentication';
      res.status(400).json({ success: false, message });
    }
  },

  async socialCallback(req: Request, res: Response): Promise<void> {
    const frontendUrl = getFrontendBaseUrl();

    try {
      const provider = String(req.params.provider).toLowerCase() as SocialProvider;
      if (!ALLOWED_PROVIDERS.includes(provider)) {
        res.redirect(`${frontendUrl}/?login=true&error=UnsupportedProvider`);
        return;
      }

      const { code, state, error: oauthError } = req.query;

      if (oauthError) {
        res.redirect(
          `${frontendUrl}/?login=true&error=${encodeURIComponent(String(oauthError))}`
        );
        return;
      }

      if (!code || !state) {
        res.redirect(`${frontendUrl}/?login=true&error=MissingCodeOrState`);
        return;
      }

      const telemetry = await inspectClientTelemetry(req);
      const { token } = await authService.handleSocialCallback(
        provider,
        String(code),
        String(state),
        telemetry
      );

      // Store JWT session token in HttpOnly cookie instead of exposing it in URL query params
      setAuthCookie(res, token);

      res.redirect(`${frontendUrl}/?auth=success`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'AuthenticationFailed';
      res.redirect(
        `${frontendUrl}/?login=true&error=${encodeURIComponent(message)}`
      );
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'User profile not found';
      res.status(404).json({ success: false, message });
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
      res
        .status(200)
        .json({ success: true, message: 'Profile updated successfully', data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update profile';
      res.status(400).json({ success: false, message });
    }
  },

  async signout(_req: Request, res: Response): Promise<void> {
    clearAuthCookie(res);
    res.status(200).json({ success: true, message: 'Signed out successfully' });
  },
};