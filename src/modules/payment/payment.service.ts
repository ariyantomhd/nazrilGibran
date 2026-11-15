// src/modules/payment/payment.service.ts
/// <reference path="../../types/paypal.d.ts" />
import paypal from '@paypal/checkout-server-sdk';
import { paypalClient } from '../../config/paypal';
import { orderRepo } from '../orders/order.repo';
import { cartRepo } from '../cart/cart.repo';
import { licenseService } from '../licenses/license.service';
import { affiliateService } from '../affiliates/affiliate.service';
import { paymentRepo } from './payment.repo';
import { CreatePayPalOrderDTO, PayPalOrderResponse } from '../../types/payment';

export const paymentService = {
  async createPayPalOrder(userId: string, dto: CreatePayPalOrderDTO): Promise<PayPalOrderResponse> {
    console.log(`[PAYPAL_SERVICE] Creating PayPal order for internal order ID: ${dto.order_id}`);
    
    const order = await orderRepo.getOrderById(dto.order_id, userId);
    if (!order) throw new Error('Order tidak ditemukan atau akses ditolak');
    if (order.payment_status === 'PAID') throw new Error('Order ini sudah dibayar');

    const frontendUrl = (process.env.FRONTEND_URL || 'https://www.themavia.com').replace(/\/$/, '');
    const formattedAmount = Number(order.grand_total).toFixed(2);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    
    request.requestBody({
      intent: 'CAPTURE',
      application_context: {
        brand_name: 'Themavia Digital Studio',
        return_url: `${frontendUrl}/checkout/success`,
        cancel_url: `${frontendUrl}/cart`,
        user_action: 'PAY_NOW'
      },
      purchase_units: [{
        reference_id: order.id,
        amount: {
          currency_code: 'USD',
          value: formattedAmount
        }
      }]
    });

    try {
      const response = await paypalClient.execute(request);
      const paypalOrder = response.result;
      const approveLink = paypalOrder.links.find((link: any) => link.rel === 'approve');

      if (!approveLink) {
        throw new Error('Link persetujuan PayPal tidak ditemukan pada respons');
      }

      return {
        order_id: order.id,
        gateway: 'PAYPAL',
        checkout_url: approveLink.href,
        status: paypalOrder.status
      };
    } catch (error: any) {
      console.error('[PAYPAL_SERVICE_ERROR] Create Order Failed:', error?.message || error);
      throw new Error(`Gagal terhubung ke PayPal: ${error.message}`);
    }
  },

  async capturePayPalOrder(userId: string, orderId: string, paypalToken: string): Promise<any> {
    const order = await orderRepo.getOrderById(orderId, userId);
    if (!order) throw new Error('Order tidak ditemukan');

    const request = new paypal.orders.OrdersCaptureRequest(paypalToken);
    request.requestBody({});

    try {
      const response = await paypalClient.execute(request);
      const captureData = response.result;

      if (captureData.status === 'COMPLETED') {
        const paypalTxId = captureData.purchase_units[0].payments.captures[0].id;
        
        // 1. Update status order menjadi PAID
        await orderRepo.updatePaymentStatus(order.id, 'PAID', paypalTxId);

        // 2. Generate license key untuk setiap item yang dibeli
        if (order.order_items && order.order_items.length > 0) {
          await licenseService.generateLicensesForOrder(order.id, userId, order.order_items);
        }

        // 3. Hitung & catat komisi affiliate dinamis per item produk (jika memakai kode referral)
        await affiliateService.processOrderAffiliateCommission({
          id: order.id,
          buyer_id: userId,
          affiliate_token_used: (order as any).affiliate_token_used,
          order_items: order.order_items,
        });

        // 4. Simpan log transaksi
        await paymentRepo.saveTransactionRecord({
          order_id: order.id,
          buyer_id: userId,
          gateway: 'PAYPAL',
          paypal_transaction_id: paypalTxId,
          amount: order.grand_total,
          status: 'COMPLETED'
        });

        // 5. Kosongkan keranjang belanja user
        const cart = await cartRepo.getCartByUserId(userId);
        if (cart) {
          await cartRepo.clearCartItems(cart.id);
        }

        return { 
          success: true, 
          message: 'Pembayaran berhasil dan lisensi diterbitkan!', 
          order_id: order.id 
        };
      }

      throw new Error('Pembayaran ditolak atau belum selesai dari pihak PayPal');
    } catch (error: any) {
      console.error('[PAYPAL_SERVICE_ERROR] Capture Order Failed:', error?.message || error);
      throw new Error(`Gagal mencairkan pembayaran PayPal: ${error.message}`);
    }
  }
};