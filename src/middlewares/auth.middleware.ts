// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedUser } from '../types/auth';
import { UserRole } from '../types/enums';
import { AUTH_COOKIE_NAME } from '../utils/authCookie';

interface JwtSessionPayload {
  sub?: string;
  userId?: string;
  email?: string;
  role?: UserRole;
  provider?: string;
  iat?: number;
  exp?: number;
}

function extractTokenFromRequest(req: Request): string | null {
  // 1. Primary: Read from HttpOnly session cookie
  if (req.cookies && typeof req.cookies[AUTH_COOKIE_NAME] === 'string') {
    const cookieToken = req.cookies[AUTH_COOKIE_NAME].trim();
    if (cookieToken) return cookieToken;
  }

  // 2. Fallback: Read from Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken) return bearerToken;
  }

  return null;
}

function extractVerifiedUser(token: string): AuthenticatedUser | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in .env');
  }

  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
  }) as JwtSessionPayload;
  const resolvedUserId = decoded.userId || decoded.sub;

  if (!resolvedUserId) return null;

  return {
    id: resolvedUserId,
    email: decoded.email || '',
    role: decoded.role || ('BUYER' as UserRole),
    provider: decoded.provider,
  };
}

export const verifyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);

    if (!token) {
      res.status(401).json({
        success: false,
        code: 'MISSING_TOKEN',
        message: 'Authentication required. Please sign in.',
      });
      return;
    }

    const user = extractVerifiedUser(token);

    if (!user) {
      res.status(401).json({
        success: false,
        code: 'INVALID_PAYLOAD',
        message: 'Invalid session payload.',
      });
      return;
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error: unknown) {
    const isMissingSecret =
      error instanceof Error && error.message.includes('JWT_SECRET');

    if (isMissingSecret) {
      console.error('[Auth Config Error]: JWT_SECRET is missing');
      res.status(500).json({
        success: false,
        message: 'Server configuration is incomplete',
      });
      return;
    }

    const isExpired =
      error instanceof Error && error.name === 'TokenExpiredError';

    res.status(401).json({
      success: false,
      code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: isExpired
        ? 'Your session has expired. Please sign in again.'
        : 'Invalid authentication session.',
    });
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);
    if (token) {
      const user = extractVerifiedUser(token);
      if (user) {
        req.userId = user.id;
        req.user = user;
      }
    }
    next();
  } catch {
    next();
  }
};