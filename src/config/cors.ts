// src/config/cors.ts
import type { CorsOptions } from 'cors';

const PRODUCTION_ORIGINS = [
  'https://themavia.com',
  'https://www.themavia.com',
];

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

function buildAllowedOrigins(): Set<string> {
  const isProd = process.env.NODE_ENV === 'production';

  // Tambahan origin dinamis dari .env (pisahkan dengan koma, misal: https://admin.themavia.com)
  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const baseOrigins = isProd
    ? PRODUCTION_ORIGINS
    : [...PRODUCTION_ORIGINS, ...DEV_ORIGINS];

  return new Set([...baseOrigins, ...envOrigins]);
}

const allowedOrigins = buildAllowedOrigins();

export const corsOptions: CorsOptions = {
  origin(requestOrigin, callback) {
    // 1. Izinkan request server-to-server / webhook (Stripe, PayPal, curl, Postman) yang tidak mengirim header Origin
    if (!requestOrigin) {
      return callback(null, true);
    }

    const normalizedOrigin = requestOrigin.trim().replace(/\/+$/, '');

    // 2. Cek apakah Origin ada dalam whitelist
    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    // 3. Tolak origin asing
    console.warn(`[CORS Blocked] Rejected origin: ${normalizedOrigin}`);
    return callback(new Error('Not allowed by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],
  exposedHeaders: ['Content-Length'],
  maxAge: 86400, // Cache preflight OPTIONS selama 24 jam agar tidak membebani serverless function
};