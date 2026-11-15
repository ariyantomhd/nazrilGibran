// src/config/paypal.ts
/// <reference path="../types/paypal.d.ts" />
import paypal from '@paypal/checkout-server-sdk';

const clientId = (process.env.PAYPAL_CLIENT_ID || 'sb').trim();
const clientSecret = (process.env.PAYPAL_SECRET || process.env.PAYPAL_CLIENT_SECRET || 'sb').trim();
const paypalMode = (process.env.PAYPAL_MODE || 'sandbox').trim().toLowerCase();

console.log('CHECKING PAYPAL CONFIG:', {
  idLoaded: clientId !== 'sb' && clientId.length > 0,
  secretLoaded: clientSecret !== 'sb' && clientSecret.length > 0,
  paypalMode,
  nodeEnv: process.env.NODE_ENV,
});

const environment =
  paypalMode === 'live'
    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
    : new paypal.core.SandboxEnvironment(clientId, clientSecret);

export const paypalClient = new paypal.core.PayPalHttpClient(environment);