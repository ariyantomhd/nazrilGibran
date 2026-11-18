// src/modules/payment/payment.service.ts
/// <reference path="../../types/paypal.d.ts" />
import { z } from 'zod';
import paypal from '@paypal/checkout-server-sdk';
import { paypalClient } from '../../config/paypal';
import { supabaseAdmin } from '../../config/supabase';
import { orderRepo } from '../orders/order.repo';
import { cartRepo } from '../cart/cart.repo';
import { licenseService } from '../licenses/license.service';
import { affiliateService } from '../affiliates/affiliate.service';
import { paymentRepo } from './payment.repo';
import { CreatePayPalOrderDTO, PayPalOrderResponse } from '../../types/payment';

const createPayPalOrderSchema = z.object({
  order_id: z.string().uuid('Invalid order ID format.'),
});

const capturePayPalOrderSchema = z.object({
  order_id: z.string().uuid('Invalid order ID format.'),
  token: z
    .string()
    .trim()
    .min(6, 'Invalid PayPal order token.')
    .max(100, 'Invalid PayPal order token.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid PayPal token format.'),
});

export const paymentService = {
  async createPayPalOrder(
    userId: string,
    dto: CreatePayPalOrderDTO
  ): Promise<PayPalOrderResponse> {
    if (!userId) {
      throw new Error('Authentication required.');
    }

    const parsed = createPayPalOrderSchema.safeParse(dto);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid PayPal order request.');
    }

    const order = await orderRepo.getOrderById(parsed.data.order_id, userId);
    if (!order) throw new Error('Order not found or access denied.');
    if (order.payment_status === 'PAID') {
      throw new Error('This order has already been paid.');
    }

    if (process.env.NODE_ENV === 'production' && process.env.PAYPAL_MODE !== 'live') {
      throw new Error('Critical Configuration Error: Live PayPal mode is required in production.');
    }

    const formattedAmount = Number(order.grand_total).toFixed(2);
    if (Number(formattedAmount) <= 0) {
      throw new Error('Invalid order payment amount.');
    }

    const frontendUrl = (
      process.env.FRONTEND_URL || 'https://themavia.com'
    ).replace(/\/$/, '');

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');

    request.requestBody({
      intent: 'CAPTURE',
      application_context: {
        brand_name: 'Themavia Digital Studio',
        return_url: `${frontendUrl}/checkout/success`,
        cancel_url: `${frontendUrl}/cart`,
        user_action: 'PAY_NOW',
      },
      purchase_units: [
        {
          reference_id: order.id,
          amount: {
            currency_code: 'USD',
            value: formattedAmount,
          },
        },
      ],
    });

    try {
      const response = await paypalClient.execute(request);
      const paypalOrder = response.result;
      const approveLink = paypalOrder.links?.find(
        (link: { rel?: string; href?: string }) => link.rel === 'approve'
      );

      if (!approveLink?.href) {
        throw new Error('PayPal approval link was not found in the response.');
      }

      return {
        order_id: order.id,
        gateway: 'PAYPAL',
        checkout_url: approveLink.href,
        status: paypalOrder.status,
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[PAYPAL_SERVICE_ERROR] Create Order Failed:', errMsg);
      throw new Error('Failed to connect to PayPal payment gateway. Please try again.');
    }
  },

  async capturePayPalOrder(
    userId: string,
    rawOrderId: string,
    rawPaypalToken: string
  ): Promise<{ success: boolean; message: string; order_id: string }> {
    if (!userId) {
      throw new Error('Authentication required.');
    }

    const parsed = capturePayPalOrderSchema.safeParse({
      order_id: rawOrderId,
      token: rawPaypalToken,
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid capture request parameters.');
    }

    const { order_id: orderId, token: paypalToken } = parsed.data;

    const order = await orderRepo.getOrderById(orderId, userId);
    if (!order) throw new Error('Order not found or access denied.');

    // Idempotency guard
    if (order.payment_status === 'PAID') {
      return {
        success: true,
        message: 'Payment has already been verified and licenses are active.',
        order_id: order.id,
      };
    }

    const request = new paypal.orders.OrdersCaptureRequest(paypalToken);
    request.requestBody({});

    try {
      const response = await paypalClient.execute(request);
      const captureData = response.result;

      if (captureData.status === 'COMPLETED') {
        const purchaseUnit = captureData.purchase_units?.[0];
        const captureRecord = purchaseUnit?.payments?.captures?.[0];
        const paypalTxId = captureRecord?.id;

        if (!paypalTxId) {
          throw new Error('Missing PayPal transaction capture ID.');
        }

        if (purchaseUnit?.reference_id && purchaseUnit.reference_id !== order.id) {
          throw new Error('PayPal order reference mismatch.');
        }

        const capturedAmount = Number(captureRecord?.amount?.value ?? 0);
        const expectedAmount = Number(order.grand_total);
        if (capturedAmount > 0 && Math.abs(capturedAmount - expectedAmount) > 0.01) {
          throw new Error('Captured payment amount does not match order total.');
        }

        // 1. Eksekusi Atomic Fulfillment via RPC PostgreSQL (Mencegah partial failure / race condition)
        const { error: rpcError } = await supabaseAdmin.rpc('fulfill_paypal_order', {
          p_order_id: order.id,
          p_buyer_id: userId,
          p_paypal_tx_id: paypalTxId,
          p_grand_total: expectedAmount,
        });

        if (rpcError) {
          throw new Error(`Fulfillment transaction failed: ${rpcError.message}`);
        }

        // 2. Generate cryptographic license key for each purchased item
        if (order.order_items && order.order_items.length > 0) {
          await licenseService.generateLicensesForOrder(
            order.id,
            userId,
            order.order_items
          );
        }

        // 3. Calculate & record dynamic affiliate commission
        await affiliateService.processOrderAffiliateCommission({
          id: order.id,
          buyer_id: userId,
          affiliate_token_used: (order as { affiliate_token_used?: string | null })
            .affiliate_token_used,
          order_items: order.order_items,
        });

        // 4. Clear user shopping cart
        const cart = await cartRepo.getCartByUserId(userId);
        if (cart) {
          await cartRepo.clearCartItems(cart.id);
        }

        return {
          success: true,
          message: 'Payment successful and licenses issued!',
          order_id: order.id,
        };
      }

      throw new Error('Payment was declined or not completed by PayPal.');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[PAYPAL_SERVICE_ERROR] Capture Order Failed:', error);
      // Melemparkan pesan error asli agar terlihat jelas di response frontend / konsol
      throw new Error(errMsg);
    }
  },
};
