// src/utils/authCookie.ts
import { CookieOptions, Response } from 'express';

export const AUTH_COOKIE_NAME = 'tmv_session';

const isProduction = process.env.NODE_ENV === 'production';

export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true, // Prevents client-side JavaScript (document.cookie) from reading the token
    secure: isProduction, // Enforce HTTPS in production
    sameSite: isProduction ? 'none' : 'lax', // Allow cross-subdomain cookies over HTTPS
    domain: isProduction ? '.themavia.com' : undefined,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  const { maxAge: _maxAge, ...clearOptions } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
}