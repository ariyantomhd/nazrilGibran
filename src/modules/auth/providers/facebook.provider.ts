// src/modules/auth/providers/facebook.provider.ts
import { oauthConfig } from '../../../config/oauth.config';
import { SocialUserProfile } from '../../../types/auth';

export const facebookProvider = {
  getAuthUrl(state: string): string {
    const { clientId, callbackUrl } = oauthConfig.facebook;
    if (!clientId) {
      throw new Error('Login dengan Facebook belum diaktifkan sementara waktu');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'email,public_profile',
      state,
    });

    return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
  },

  async getUserProfile(code: string): Promise<SocialUserProfile> {
    const { clientId, clientSecret, callbackUrl } = oauthConfig.facebook;
    if (!clientId || !clientSecret) {
      throw new Error('Login dengan Facebook belum diaktifkan sementara waktu');
    }

    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      code,
    });

    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?${tokenParams.toString()}`
    );
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: { message?: string };
    };
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error?.message || 'Gagal menukar token Facebook');
    }

    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${tokenData.access_token}`
    );
    const fbUser = (await profileRes.json()) as {
      id: string;
      name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    };

    return {
      provider: 'facebook',
      providerId: String(fbUser.id),
      email: fbUser.email || null,
      username: fbUser.name || `fb_${fbUser.id}`,
      avatarUrl: fbUser.picture?.data?.url || null,
    };
  },
};