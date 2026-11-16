// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedUser } from '../types/auth';
import { UserRole } from '../types/enums';

interface JwtSessionPayload {
  sub?: string;
  userId?: string;
  email?: string;
  role?: UserRole;
  provider?: string;
  iat?: number;
  exp?: number;
}

function extractVerifiedUser(token: string): AuthenticatedUser | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in .env');
  }

  const decoded = jwt.verify(token, secret) as JwtSessionPayload;
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[Auth Rejected]: Missing or malformed Authorization header', {
        url: req.originalUrl,
        authHeader: authHeader || 'EMPTY',
      });
      res.status(401).json({ success: false, message: 'Authentication token not found' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const user = extractVerifiedUser(token);

    if (!user) {
      console.warn('[Auth Rejected]: JWT payload is missing userId/sub', {
        url: req.originalUrl,
      });
      res.status(401).json({ success: false, message: 'Invalid token payload' });
      return;
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error: unknown) {
    const rawErrorMessage =
      error instanceof Error ? error.message : String(error);

    console.error('[Auth Middleware Rejected]:', {
      url: req.originalUrl,
      reason: rawErrorMessage,
      secretLength: process.env.JWT_SECRET?.length || 0,
      tokenPreview: req.headers.authorization?.slice(0, 30) + '...',
    });

    if (rawErrorMessage.includes('JWT_SECRET')) {
      res
        .status(500)
        .json({ success: false, message: 'Server configuration is incomplete' });
      return;
    }

    const isExpired =
      error instanceof Error && error.name === 'TokenExpiredError';

    res.status(401).json({
      success: false,
      code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: isExpired
        ? 'Your session has expired. Please sign in again'
        : `Invalid authentication token (${rawErrorMessage})`,
    });
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
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