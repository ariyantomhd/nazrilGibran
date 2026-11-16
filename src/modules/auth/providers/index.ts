// src/modules/auth/providers/index.ts
import { SocialProvider, SocialUserProfile } from '../../../types/auth';
import { googleProvider } from './google.provider';
import { facebookProvider } from './facebook.provider';
import { xProvider } from './x.provider';
import { discordProvider } from './discord.provider';

export const socialProviders = {
  buildAuthorizeUrl(
    provider: SocialProvider,
    state: string,
    codeChallenge?: string
  ): string {
    switch (provider) {
      case 'google':
        return googleProvider.getAuthUrl(state);
      case 'facebook':
        return facebookProvider.getAuthUrl(state);
      case 'x':
        if (!codeChallenge) throw new Error('PKCE codeChallenge wajib untuk X');
        return xProvider.getAuthUrl(state, codeChallenge);
      case 'discord':
        return discordProvider.getAuthUrl(state);
    }
  },

  async fetchProfile(
    provider: SocialProvider,
    code: string,
    codeVerifier?: string
  ): Promise<SocialUserProfile> {
    switch (provider) {
      case 'google':
        return googleProvider.getUserProfile(code);
      case 'facebook':
        return facebookProvider.getUserProfile(code);
      case 'x':
        if (!codeVerifier) throw new Error('PKCE codeVerifier wajib untuk X');
        return xProvider.getUserProfile(code, codeVerifier);
      case 'discord':
        return discordProvider.getUserProfile(code);
    }
  },
};