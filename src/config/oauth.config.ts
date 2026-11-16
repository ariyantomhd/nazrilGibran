// src/config/oauth.config.ts
import { SocialProvider } from '../types/auth';

const backendUrl = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

export const oauthConfig: Record<
  SocialProvider,
  {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  }
> = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL || `${backendUrl}/api/auth/google/callback`,
  },
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID || '',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    callbackUrl:
      process.env.FACEBOOK_CALLBACK_URL || `${backendUrl}/api/auth/facebook/callback`,
  },
  x: {
    clientId: process.env.X_CLIENT_ID || '',
    clientSecret: process.env.X_CLIENT_SECRET || '',
    callbackUrl:
      process.env.X_CALLBACK_URL || `${backendUrl}/api/auth/x/callback`,
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    callbackUrl:
      process.env.DISCORD_CALLBACK_URL || `${backendUrl}/api/auth/discord/callback`,
  },
};