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
    if (!requestOrigin) {
      return callback(null, true);
    }

    const normalizedOrigin = requestOrigin.trim().replace(/\/+$/, '');

    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn(`[CORS Blocked] Rejected origin: ${normalizedOrigin}`);
    return callback(new Error('CORS_NOT_ALLOWED'));
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
  maxAge: 86400,
};