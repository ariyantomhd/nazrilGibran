// src/middlewares/rateLimiter.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { supabaseAdmin } from '../config/supabase';

type AuthenticatedRequest = Request & {
  user?: { id?: string | number };
};

interface RateLimiterConfig {
  prefix: string;
  windowSeconds: number;
  maxHits: number;
  message: string;
  useUserKey?: boolean;
  skip?: (req: Request) => boolean;
}

interface RpcRateLimitRow {
  allowed: boolean;
  remaining: number;
  reset_in_seconds: number;
}

// Fallback memori lokal jika RPC Supabase mengalami gangguan sementara
const fallbackMemoryStore = new Map<string, { hits: number; resetAtMs: number }>();

function checkInMemoryFallback(
  key: string,
  maxHits: number,
  windowSeconds: number
): RpcRateLimitRow {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = fallbackMemoryStore.get(key);

  if (!existing || existing.resetAtMs <= now) {
    const resetAtMs = now + windowMs;
    fallbackMemoryStore.set(key, { hits: 1, resetAtMs });
    return {
      allowed: true,
      remaining: Math.max(maxHits - 1, 0),
      reset_in_seconds: windowSeconds,
    };
  }

  existing.hits += 1;
  return {
    allowed: existing.hits <= maxHits,
    remaining: Math.max(maxHits - existing.hits, 0),
    reset_in_seconds: Math.max(Math.ceil((existing.resetAtMs - now) / 1000), 1),
  };
}

function resolveIdentifier(req: Request, useUserKey: boolean): string {
  if (useUserKey) {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.id) {
      return `user:${authReq.user.id}`;
    }
  }
  const forwardedIp = req.ip || req.socket?.remoteAddress || 'unknown-ip';
  return `ip:${forwardedIp}`;
}

function createSupabaseRateLimiter(config: RateLimiterConfig): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (config.skip && config.skip(req)) {
        next();
        return;
      }

      const identifier = resolveIdentifier(req, Boolean(config.useUserKey));
      const rateKey = `${config.prefix}:${identifier}`;

      let verdict: RpcRateLimitRow | null = null;

      const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
        p_key: rateKey,
        p_max_hits: config.maxHits,
        p_window_seconds: config.windowSeconds,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        verdict = data[0] as RpcRateLimitRow;
      } else {
        if (error) {
          console.warn(`[RateLimiter RPC Fallback] ${config.prefix}:`, error.message);
        }
        verdict = checkInMemoryFallback(rateKey, config.maxHits, config.windowSeconds);
      }

      // Header standar RFC RateLimit
      res.setHeader('RateLimit-Limit', String(config.maxHits));
      res.setHeader('RateLimit-Remaining', String(verdict.remaining));
      res.setHeader('RateLimit-Reset', String(verdict.reset_in_seconds));

      if (!verdict.allowed) {
        res.setHeader('Retry-After', String(verdict.reset_in_seconds));
        res.status(429).json({
          success: false,
          message: config.message,
        });
        return;
      }

      next();
    } catch (err) {
      // Fail-open jika terjadi error tak terduga agar request user sah tidak terblokir 500
      console.error(`[RateLimiter Error] ${config.prefix}:`, err);
      next();
    }
  };
}

/**
 * 1. Global Limiter (dipasang di src/index.ts): 120 req / menit per IP
 */
export const globalRateLimiter = createSupabaseRateLimiter({
  prefix: 'global',
  windowSeconds: 60,
  maxHits: 120,
  useUserKey: false,
  skip: (req) =>
    req.path === '/health' || req.originalUrl.startsWith('/api/payment/webhook'),
  message: 'Too many requests, please try again in a minute.',
});

/**
 * 2. Strict Auth Limiter (OAuth Login, Callback, Update Profile): 15 req / 10 menit
 */
export const authRateLimiter = createSupabaseRateLimiter({
  prefix: 'auth',
  windowSeconds: 600,
  maxHits: 15,
  useUserKey: true,
  message: 'Too many authentication attempts. Please try again in 10 minutes.',
});

/**
 * 3. Strict Payment & Order Limiter: 10 transaksi / 10 menit per User/IP
 */
export const paymentRateLimiter = createSupabaseRateLimiter({
  prefix: 'payment',
  windowSeconds: 600,
  maxHits: 10,
  useUserKey: true,
  skip: (req) => req.originalUrl.startsWith('/api/payment/webhook'),
  message: 'Too many payment or order attempts. Please wait 10 minutes.',
});

/**
 * 4. Strict Coupon Brute-Force Limiter: 10 percobaan kode promo / 10 menit
 */
export const couponRateLimiter = createSupabaseRateLimiter({
  prefix: 'coupon',
  windowSeconds: 600,
  maxHits: 10,
  useUserKey: true,
  message: 'Too many coupon validation attempts. Please wait 10 minutes.',
});

/**
 * 5. Download & License Limiter: 20 download / 10 menit per User
 */
export const downloadRateLimiter = createSupabaseRateLimiter({
  prefix: 'download',
  windowSeconds: 600,
  maxHits: 20,
  useUserKey: true,
  message: 'Download rate limit reached. Please wait a few minutes.',
});

/**
 * 6. Interaksi Publik / User (Komentar Blog, Review, Like, Affiliate Apply): 8 aksi / 10 menit
 */
export const interactionRateLimiter = createSupabaseRateLimiter({
  prefix: 'interaction',
  windowSeconds: 600,
  maxHits: 8,
  useUserKey: true,
  message: 'Too many submissions. Please wait a few minutes.',
});

/**
 * 7. Cart & Affiliate Tracking Limiter: 30 aksi / menit
 */
export const actionRateLimiter = createSupabaseRateLimiter({
  prefix: 'action',
  windowSeconds: 60,
  maxHits: 30,
  useUserKey: true,
  message: 'Action rate limit exceeded. Please slow down.',
});