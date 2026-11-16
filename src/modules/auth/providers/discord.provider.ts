// src/modules/auth/providers/discord.provider.ts
import { oauthConfig } from '../../../config/oauth.config';
import { SocialUserProfile } from '../../../types/auth';

export const discordProvider = {
  getAuthUrl(state: string): string {
    const { clientId, callbackUrl } = oauthConfig.discord;
    if (!clientId) {
      throw new Error('Login dengan Discord belum diaktifkan sementara waktu');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'identify email',
      state,
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  },

  async getUserProfile(code: string): Promise<SocialUserProfile> {
    const { clientId, clientSecret, callbackUrl } = oauthConfig.discord;
    if (!clientId || !clientSecret) {
      throw new Error('Login dengan Discord belum diaktifkan sementara waktu');
    }

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || 'Gagal menukar token Discord');
    }

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const dUser = (await userRes.json()) as {
      id: string;
      username?: string;
      global_name?: string | null;
      email?: string | null;
      avatar?: string | null;
    };

    if (!dUser?.id) throw new Error('Gagal membaca profil akun Discord');

    const avatarUrl = dUser.avatar
      ? `https://cdn.discordapp.com/avatars/${dUser.id}/${dUser.avatar}.png`
      : null;

    return {
      provider: 'discord',
      providerId: String(dUser.id),
      email: dUser.email || null,
      username: dUser.global_name || dUser.username || `discord_${dUser.id}`,
      avatarUrl,
    };
  },
};