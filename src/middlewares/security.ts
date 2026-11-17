// src/middleware/security.ts
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

const isProduction = process.env.NODE_ENV === 'production';
const localhostSources = isProduction ? [] : ['http://localhost:5000', 'http://localhost:3000'];

/**
 * Konfigurasi Helmet untuk mengamankan HTTP Headers
 * (X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, dll.)
 */
export const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        ...localhostSources,
        'https://*.paypal.com',
        'https://*.paypalobjects.com',
        'https://js.stripe.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://*.google.com',
        'https://*.google.co.id',
        'https://static.cloudflareinsights.com',
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      connectSrc: [
        "'self'",
        ...localhostSources,
        'https://hub.themavia.com',
        'https://*.supabase.co',
        'https://*.paypal.com',
        'https://api.stripe.com',
        'https://*.googleapis.com',
        'https://*.twitter.com',
        'https://api.x.com',
      ],
      frameAncestors: ["'none'"], // Pengganti modern X-Frame-Options: DENY
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Agar asset/gambar API bisa diakses frontend themavia.com
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Wajib agar popup OAuth Google/X & PayPal tidak terblokir
  frameguard: { action: 'deny' },
  hsts: isProduction
    ? {
        maxAge: 63072000, // 2 tahun
        includeSubDomains: true,
        preload: true,
      }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// Parser terpisah: 100kb untuk Public API, 2mb untuk Admin / Upload
const publicJsonParser = express.json({
  limit: '100kb',
  verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
    if (req.originalUrl.startsWith('/api/payment')) {
      req.rawBody = buf;
    }
  },
});

const publicUrlEncodedParser = express.urlencoded({
  extended: true,
  limit: '100kb',
});

const adminJsonParser = express.json({
  limit: '2mb',
});

const adminUrlEncodedParser = express.urlencoded({
  extended: true,
  limit: '2mb',
});

/**
 * Middleware pembatas payload dinamis berdasarkan prefix route:
 * - Route '/api/admin' atau '/api/upload' -> maksimal 2mb
 * - Semua route public API lainnya -> maksimal 100kb
 */
export function dynamicBodyParser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isAdminOrUpload =
    req.originalUrl.startsWith('/api/admin') ||
    req.originalUrl.startsWith('/api/upload');

  const jsonHandler = isAdminOrUpload ? adminJsonParser : publicJsonParser;
  const urlHandler = isAdminOrUpload
    ? adminUrlEncodedParser
    : publicUrlEncodedParser;

  jsonHandler(req, res, (err) => {
    if (err) return next(err);
    urlHandler(req, res, next);
  });
}