// src/modules/auth/providers/x.provider.ts
import { oauthConfig } from '../../../config/oauth.config';
import { SocialUserProfile } from '../../../types/auth';

export const xProvider = {
  getAuthUrl(state: string, codeChallenge: string): string {
    const { clientId, callbackUrl } = oauthConfig.x;
    if (!clientId) {
      throw new Error('Login dengan X belum diaktifkan sementara waktu');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'tweet.read users.read offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  },

  async getUserProfile(code: string, codeVerifier: string): Promise<SocialUserProfile> {
    const { clientId, clientSecret, callbackUrl } = oauthConfig.x;
    if (!clientId || !clientSecret) {
      throw new Error('Login dengan X belum diaktifkan sementara waktu');
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: callbackUrl,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || 'Gagal menukar token X');
    }

    const userRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );
    const xPayload = (await userRes.json()) as {
      data?: {
        id: string;
        username?: string;
        name?: string;
        profile_image_url?: string;
      };
    };

    const xUser = xPayload.data;
    if (!xUser?.id) throw new Error('Gagal membaca profil akun X');

    return {
      provider: 'x',
      providerId: String(xUser.id),
      email: null,
      username: xUser.username || xUser.name || `x_${xUser.id}`,
      avatarUrl: xUser.profile_image_url || null,
    };
  },
};