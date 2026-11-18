// src/modules/auth/auth.service.ts
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authRepo } from './auth.repo';
import { socialProviders } from './providers';
import { SocialProvider, UpdateUserProfileInput } from '../../types/auth';
import { ClientTelemetryData } from '../../utils/clientTelemetry';

interface OAuthStatePayload {
  provider: SocialProvider;
  codeVerifier?: string;
  exp: number;
}

const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'Username must be at least 2 characters long.')
    .max(32, 'Username cannot exceed 32 characters.')
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      'Username may only contain letters, numbers, dots, underscores, or hyphens.'
    )
    .optional(),
  avatar_url: z
    .string()
    .trim()
    .url('Avatar URL must be a valid HTTPS URL.')
    .max(500, 'Avatar URL is too long.')
    .nullable()
    .optional(),
});

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured in .env');
  return secret;
};

function signOAuthState(payload: OAuthStatePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyOAuthState(stateToken: string): OAuthStatePayload {
  const [encoded, signature] = stateToken.split('.');
  if (!encoded || !signature) throw new Error('Invalid OAuth state parameter');

  const expectedSig = crypto
    .createHmac('sha256', getJwtSecret())
    .update(encoded)
    .digest('base64url');

  if (signature !== expectedSig) {
    throw new Error('OAuth state signature mismatch');
  }

  const parsed = JSON.parse(
    Buffer.from(encoded, 'base64url').toString('utf8')
  ) as OAuthStatePayload;

  if (Date.now() > parsed.exp) {
    throw new Error('OAuth session expired, please try again');
  }

  return parsed;
}

function generatePkcePair() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

export const authService = {
  getSocialAuthUrl(provider: SocialProvider): string {
    const exp = Date.now() + 10 * 60 * 1000;

    if (provider === 'x') {
      const { codeVerifier, codeChallenge } = generatePkcePair();
      const state = signOAuthState({ provider, codeVerifier, exp });
      return socialProviders.buildAuthorizeUrl(provider, state, codeChallenge);
    }

    const state = signOAuthState({ provider, exp });
    return socialProviders.buildAuthorizeUrl(provider, state);
  },

  async handleSocialCallback(
    provider: SocialProvider,
    code: string,
    rawState: string,
    telemetry?: ClientTelemetryData
  ) {
    const stateData = verifyOAuthState(rawState);
    if (stateData.provider !== provider) {
      throw new Error('Provider state mismatch');
    }

    const profile = await socialProviders.fetchProfile(
      provider,
      code,
      stateData.codeVerifier
    );

    const user = await authRepo.upsertSocialUser(profile);

    if (telemetry && user.id) {
      await authRepo.updateUserTelemetry(user.id, telemetry);
    }

    const token = jwt.sign(
      {
        sub: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
        provider: user.provider,
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return { user, token };
  },

  async getMe(userId: string) {
    const user = await authRepo.findUserById(userId);
    if (!user) throw new Error('User profile not found');
    return user;
  },

  async updateProfile(userId: string, payload: Partial<UpdateUserProfileInput>) {
    const parsed = updateProfileSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message || 'Invalid profile update payload.'
      );
    }

    return authRepo.updateProfile(userId, parsed.data);
  },
};