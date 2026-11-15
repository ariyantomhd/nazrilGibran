// src/config/paypal.ts
import paypal from '@paypal/checkout-server-sdk';

// Pastikan kamu menambahkan variabel ini di file .env nantinya
const clientId = process.env.PAYPAL_CLIENT_ID || 'sb'; 
const clientSecret = process.env.PAYPAL_SECRET || 'sb';

// Debugging log untuk mengecek apakah env terbaca atau fallback ke 'sb'
console.log("CHECKING PAYPAL CONFIG:", {
  idLoaded: !!process.env.PAYPAL_CLIENT_ID,
  secretLoaded: !!process.env.PAYPAL_CLIENT_SECRET,
  mode: process.env.NODE_ENV
});

// Secara default gunakan mode Sandbox untuk development
const environment = process.env.NODE_ENV === 'production'
  ? new paypal.core.LiveEnvironment(clientId, clientSecret)
  : new paypal.core.SandboxEnvironment(clientId, clientSecret);

export const paypalClient = new paypal.core.PayPalHttpClient(environment);