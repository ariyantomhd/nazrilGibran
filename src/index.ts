// src/index.ts
import cookieParser from 'cookie-parser';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables before importing any other modules
dotenv.config();

import { corsOptions } from './config/cors';
import {
  securityHeadersMiddleware,
  dynamicBodyParser,
} from './middlewares/security';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { AppError } from './utils/app-error';

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
import customDevRoutes from './modules/custom-development/customDev.route';

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Silence non-error console logs in production runtime
if (isProduction) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Enable trust proxy so real client IP (X-Forwarded-For / Vercel / Cloudflare) is accurately resolved
app.set('trust proxy', 1);

// 1. Cookie Parser + Strict CORS Whitelist + Preflight Handler
app.use(cookieParser());
app.use(cors(corsOptions));
app.options('/{*splat}', cors(corsOptions));

// 2. Security Headers via Helmet (HSTS, CSP, X-Frame-Options, nosniff, hidePoweredBy)
app.use(securityHeadersMiddleware);

// 3. Global Rate Limiter (Outer shield: 120 req/min per IP across all endpoints)
app.use(globalRateLimiter);

// 4. Body Parser with dynamic payload limits (100kb Public API, 2mb Admin/Upload) + rawBody webhook
app.use(dynamicBodyParser);

// Root & Health Check Routes
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

// 5. Mount all route modules under /api prefix
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
app.use('/api/custom-development', customDevRoutes);

// 6. 404 Handler for unregistered endpoints
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// 7. Global Error Handler (Strictly separates operational AppError from internal DB/Server errors)
app.use(
  (
    err: Error & { status?: number; statusCode?: number; type?: string; code?: string },
    req: Request,
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

    // Operational error (AppError) is safe to expose to client with its explicit statusCode
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
      return;
    }

    // Unexpected / Database / System errors -> always log internally, hide raw details in production
    const statusCode = err.statusCode || err.status || 500;

    console.error('[Unhandled Server Error]:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      statusCode,
      code: err.code,
      message: err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    });

    res.status(statusCode >= 400 && statusCode < 500 ? statusCode : 500).json({
      success: false,
      message: isProduction
        ? 'Internal server error'
        : err.message || 'Internal server error',
    });
  }
);

// Start local server only when not running in Vercel serverless environment
if (!isProduction && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`=================================`);
  });
}

export default app;