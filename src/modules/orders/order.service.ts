// src/modules/orders/order.service.ts
import { supabaseAdmin } from '../../config/supabase';
import { orderRepo } from './order.repo';
import { couponService } from '../coupon/coupon.service';
import { Order, OrderItem } from '../../types/order';
import { PaymentGateway, LicenseType, OrderStatus } from '../../types/enums';

const DEFAULT_SUPPORT_PRICE = 12.0;

export interface CreateOrderInput {
  subtotal?: number;
  discount_total?: number;
  buyer_fee?: number;
  gateway_fee?: number;
  grand_total?: number;
  payment_gateway?: PaymentGateway;
  affiliate_token_used?: string | null;
  coupon_code?: string | null;
  items: {
    product_id: string;
    quantity?: number;
    license_type: LicenseType;
    price_at_purchase?: number;
    with_support?: boolean;
    support_price?: number;
    seller_fee_percentage?: number;
  }[];
}

interface VerifiedProductRow {
  id: string;
  regular_price: number | null;
  extended_price: number | null;
  discount_price: number | null;
  support_price: number | null;
}

type PreparedOrderItem = Omit<OrderItem, 'id' | 'order_id' | 'created_at'> & {
  with_support: boolean;
  support_price: number;
};

export const orderService = {
  async createOrder(buyerId: string, input: CreateOrderInput): Promise<Order> {
    if (!input.items || input.items.length === 0) {
      throw new Error('Order items cannot be empty.');
    }

    // 1. Fetch actual prices from database as Single Source of Truth
    const productIds = Array.from(new Set(input.items.map((item) => item.product_id)));
    const { data: products, error: prodError } = await supabaseAdmin
      .from('products')
      .select('id, regular_price, extended_price, discount_price, support_price')
      .in('id', productIds);

    if (prodError || !products) {
      throw new Error('Failed to verify product pricing from the server.');
    }

    const productMap = new Map<string, VerifiedProductRow>();
    (products as VerifiedProductRow[]).forEach((p) => productMap.set(String(p.id), p));

    let verifiedSubtotal = 0;
    const preparedOrderItems: PreparedOrderItem[] = [];

    for (const item of input.items) {
      const dbProduct = productMap.get(String(item.product_id));
      if (!dbProduct) {
        throw new Error(`Product with ID ${item.product_id} was not found.`);
      }

      const qty = Math.max(1, Number(item.quantity || 1));
      const isExtended = String(item.license_type || 'REGULAR').toUpperCase() === 'EXTENDED';
      const regularPrice = Number(dbProduct.discount_price ?? dbProduct.regular_price ?? 0);
      const extendedPrice = Number(dbProduct.extended_price ?? regularPrice * 2);
      const baseUnitPrice = isExtended ? extendedPrice : regularPrice;

      const rawSupport = Number(dbProduct.support_price ?? 0);
      const unitSupportPrice = item.with_support
        ? rawSupport > 0
          ? rawSupport
          : DEFAULT_SUPPORT_PRICE
        : 0;

      const lineTotal = Number(((baseUnitPrice + unitSupportPrice) * qty).toFixed(2));
      verifiedSubtotal += lineTotal;

      const feePercentage = item.seller_fee_percentage || 10;
      const resolvedLicense: LicenseType = (isExtended ? 'EXTENDED' : 'REGULAR') as LicenseType;

      // Expand based on quantity so each unit receives its own individual license
      for (let i = 0; i < qty; i++) {
        const singleUnitPrice = Number((baseUnitPrice + unitSupportPrice).toFixed(2));
        const singleFee = Number(((singleUnitPrice * feePercentage) / 100).toFixed(2));

        preparedOrderItems.push({
          product_id: item.product_id,
          license_type: resolvedLicense,
          price_at_purchase: singleUnitPrice,
          with_support: Boolean(item.with_support),
          support_price: unitSupportPrice,
          seller_fee_percentage: feePercentage,
          seller_fee_amount: singleFee,
          net_seller_earning: Number((singleUnitPrice - singleFee).toFixed(2)),
        });
      }
    }

    verifiedSubtotal = Number(verifiedSubtotal.toFixed(2));

    // 2. Validate coupon & calculate discount directly on the server if coupon_code is provided
    let verifiedDiscount = 0;
    let verifiedGrandTotal = verifiedSubtotal;
    let appliedCouponCode: string | null = null;

    if (input.coupon_code) {
      const couponResult = await couponService.validateAndCalculate(
        input.coupon_code,
        verifiedSubtotal
      );
      verifiedDiscount = couponResult.discountAmount;
      verifiedGrandTotal = couponResult.finalTotal;
      appliedCouponCode = couponResult.code;
    }

    const buyerFee = Number(input.buyer_fee || 0);
    const gatewayFee = Number(input.gateway_fee || 0);
    verifiedGrandTotal = Number((verifiedGrandTotal + buyerFee + gatewayFee).toFixed(2));

    // 3. Generate Invoice Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceNumber = `INV-${dateStr}-${randomStr}`;

    // 4. Save main Order to database
    const orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_items'> & {
      coupon_code: string | null;
    } = {
      buyer_id: buyerId,
      invoice_number: invoiceNumber,
      subtotal: verifiedSubtotal,
      discount_total: verifiedDiscount,
      buyer_fee: buyerFee,
      gateway_fee: gatewayFee,
      grand_total: verifiedGrandTotal,
      payment_gateway: input.payment_gateway || PaymentGateway.PAYPAL,
      paypal_transaction_id: null,
      payment_status: 'PENDING' as OrderStatus,
      affiliate_token_used: input.affiliate_token_used || null,
      coupon_code: appliedCouponCode,
    };

    const newOrder = await orderRepo.createOrder(orderData);

    // 5. Save Order Items
    const itemsWithOrderId: Omit<OrderItem, 'id' | 'created_at'>[] = preparedOrderItems.map((row) => ({
      ...row,
      order_id: newOrder.id,
    }));
    await orderRepo.createOrderItems(itemsWithOrderId);

    // 6. Mark coupon as used
    if (appliedCouponCode) {
      await couponService.markCouponAsUsed(appliedCouponCode);
    }

    return await this.getOrderById(buyerId, newOrder.id);
  },

  async getOrderById(buyerId: string, orderId: string): Promise<Order> {
    const order = await orderRepo.getOrderById(orderId, buyerId);
    if (!order) throw new Error('Order not found or you do not have access');
    return order;
  },

  async getMyOrders(buyerId: string): Promise<Order[]> {
    return await orderRepo.getOrdersByBuyerId(buyerId);
  },
};