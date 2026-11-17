// src/index.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables paling awal sebelum mengimpor modul lain
dotenv.config();

import { corsOptions } from './config/cors';
import {
  securityHeadersMiddleware,
  dynamicBodyParser,
} from './middlewares/security';
import { globalRateLimiter } from './middlewares/rateLimiter';

// Import route modules
import authRoutes from './modules/auth/auth.route';
import productRoutes from './modules/products/product.route';
import cartRoutes from './modules/cart/cart.route';
import orderRoutes from './modules/orders/order.route';
import paymentRoutes from './modules/payment/payment.route';
import licenseRoutes from './modules/licenses/license.route';
import dashboardRoutes from './modules/dashboard/dashboard.route';
import downloadRoutes from './modules/download/download.route';
import affiliateRoutes from './modules/affiliates/affiliate.route';
import couponRoutes from './modules/coupon/coupon.route';
import blogRoutes from './modules/blog/blog.route';
import dealsRoutes from './modules/deals/deals.route';

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Aktifkan trust proxy agar IP asli client (X-Forwarded-For / Vercel / Cloudflare) terbaca akurat
app.set('trust proxy', 1);

// 1. CORS Whitelist Ketat + Preflight Handler
app.use(cors(corsOptions));
app.options('/{*splat}', cors(corsOptions));

// 2. Security Headers via Helmet (HSTS, CSP, X-Frame-Options, nosniff, hidePoweredBy)
app.use(securityHeadersMiddleware);

// 3. Global Rate Limiter (Pagar luar 120 req/menit per IP untuk seluruh endpoint)
app.use(globalRateLimiter);

// 4. Body Parser dengan batas payload dinamis (100kb Public API, 2mb Admin/Upload) + rawBody webhook
app.use(dynamicBodyParser);

// Root & Health Check Route
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Themavia API is online',
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Themavia Backend is running smoothly',
  });
});

// 5. Mount semua route modules di bawah prefix /api
// (Rate limiter spesifik masing-masing modul sudah terpasang di dalam file *.route.ts)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/deals', dealsRoutes);

// 6. Handler 404 untuk endpoint yang tidak terdaftar
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// 7. Global Error Handler (Mencegah kebocoran stack trace / detail error internal di production)
app.use(
  (
    err: Error & { status?: number; statusCode?: number; type?: string; code?: string },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (err.message === 'CORS_NOT_ALLOWED') {
      res.status(403).json({
        success: false,
        message: 'Origin not allowed by CORS policy',
      });
      return;
    }

    if (err.type === 'entity.too.large') {
      res.status(413).json({
        success: false,
        message: 'Request payload is too large',
      });
      return;
    }

    const statusCode = err.statusCode || err.status || 500;

    console.error('[Unhandled Server Error]:', {
      statusCode,
      code: err.code,
      message: err.message,
      stack: isProduction ? undefined : err.stack,
    });

    res.status(statusCode).json({
      success: false,
      message:
        isProduction && statusCode >= 500
          ? 'Internal server error'
          : err.message || 'Internal server error',
    });
  }
);

// Jalankan server lokal hanya jika bukan berjalan di lingkungan serverless Vercel
if (!isProduction && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`=================================`);
  });
}

export default app;