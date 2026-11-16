// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Aktifkan trust proxy agar IP asli client (X-Forwarded-For / Cloudflare) terbaca akurat
app.set('trust proxy', 1);

// Konfigurasi CORS untuk Production (themavia.com) & Development Lokal
const allowedOrigins = [
  'https://themavia.com',
  'https://www.themavia.com',
  'https://hub.themavia.com',
  'http://localhost:3000',
  'http://localhost:5000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (Postman, curl, server-to-server)
      // dan origin terdaftar atau preview vercel.app
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware untuk Mengatur Security Headers (Termasuk CSP untuk Social Auth, PayPal, & Supabase)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5000 https://*.paypal.com https://*.paypalobjects.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google.com https://*.google.co.id https://static.cloudflareinsights.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' blob: data: https:; " +
    "connect-src 'self' http://localhost:5000 https://hub.themavia.com https://*.supabase.co https://*.paypal.com https://*.googleapis.com https://*.facebook.com https://*.twitter.com https://*.discord.com;"
  );
  next();
});

// Root & Health Check Route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Themavia API is online 🚀',
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Themavia Backend is running smoothly! 🚀',
  });
});

// Pasang semua route modules dengan menambahkan prefix /api
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

// Jalankan server lokal hanya jika bukan berjalan di lingkungan serverless Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`=================================`);
  });
}

export default app;