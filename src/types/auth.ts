// src/types/auth.ts
import { Request } from 'express';
import { UserRole, AccountStatus } from './enums';

export type SocialProvider = 'google' | 'facebook' | 'x' | 'discord';

export interface SocialUserProfile {
  provider: SocialProvider;
  providerId: string;
  email: string | null;
  username: string;
  avatarUrl: string | null;
}

export interface User {
  id: string;
  email: string;
  username: string;
  creator_number?: number;
  avatar_url: string | null;
  provider?: SocialProvider;
  provider_id?: string;
  role: UserRole;
  status: AccountStatus;
  terms_accepted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserProfileInput {
  username: string;
  avatar_url: string | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status?: AccountStatus;
  [key: string]: unknown;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  userId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      userId?: string;
    }
  }
}