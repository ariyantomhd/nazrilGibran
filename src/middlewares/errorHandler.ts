// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProd = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || err.status || 500;

  // Catat detail lengkap HANYA di server log internal (Vercel Runtime Logs / stdout)
  console.error('[SERVER_ERROR]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });

  // Kirim pesan generik ke publik jika error 500 (internal server)
  const publicMessage =
    isProd && statusCode >= 500
      ? 'An internal server error occurred. Please try again later.'
      : err.message || 'Request failed.';

  res.status(statusCode).json({
    success: false,
    message: publicMessage,
    // Jangan pernah kirim err.stack ke client di production
    ...(isProd ? {} : { stack: err.stack }),
  });
}