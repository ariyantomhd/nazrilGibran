// src/modules/auth/providers/google.provider.ts
import { oauthConfig } from '../../../config/oauth.config';
import { SocialUserProfile } from '../../../types/auth';

export const googleProvider = {
  getAuthUrl(state: string): string {
    const { clientId, callbackUrl } = oauthConfig.google;
    if (!clientId) throw new Error('GOOGLE_CLIENT_ID belum diatur di .env');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  async getUserProfile(code: string): Promise<SocialUserProfile> {
    const { clientId, clientSecret, callbackUrl } = oauthConfig.google;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || 'Gagal menukar token Google');
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const gUser = (await userRes.json()) as {
      id: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    return {
      provider: 'google',
      providerId: String(gUser.id),
      email: gUser.email || null,
      username: gUser.name || (gUser.email ? gUser.email.split('@')[0] : 'google_user'),
      avatarUrl: gUser.picture || null,
    };
  },
};
