// src/modules/orders/order.service.ts
import crypto from 'crypto';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { orderRepo } from './order.repo';
import { couponService } from '../coupon/coupon.service';
import { Order, OrderItem } from '../../types/order';
import { PaymentGateway, LicenseType, OrderStatus } from '../../types/enums';

const DEFAULT_SUPPORT_PRICE = 12.0;
const PLATFORM_SELLER_FEE_PERCENTAGE = 10;
const PLATFORM_BUYER_FEE = 0;
const PLATFORM_GATEWAY_FEE = 0;

const createOrderSchema = z.object({
  payment_gateway: z.nativeEnum(PaymentGateway).optional(),
  affiliate_token_used: z
    .string()
    .trim()
    .max(50, 'Affiliate code is too long.')
    .regex(/^[a-zA-Z0-9_-]*$/, 'Invalid affiliate code format.')
    .nullable()
    .optional(),
  coupon_code: z
    .string()
    .trim()
    .max(50, 'Coupon code is too long.')
    .regex(/^[a-zA-Z0-9_-]*$/, 'Invalid coupon code format.')
    .nullable()
    .optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1, 'Product ID is required.'),
        quantity: z.number().int().min(1).max(20).optional().default(1),
        license_type: z.string().trim().optional().default('REGULAR'),
        with_support: z.boolean().optional().default(false),
      })
    )
    .min(1, 'Order items cannot be empty.')
    .max(25, 'Maximum 25 items per order.'),
});

const uuidSchema = z.string().uuid('Invalid order ID format.');

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
  status?: string | null;
}

type PreparedOrderItem = Omit<OrderItem, 'id' | 'order_id' | 'created_at'> & {
  with_support: boolean;
  support_price: number;
};

function generateInvoiceNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${dateStr}-${randomHex}`;
}

export const orderService = {
  async createOrder(buyerId: string, rawInput: CreateOrderInput): Promise<Order> {
    if (!buyerId) {
      throw new Error('Authentication required.');
    }

    const parsed = createOrderSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid order payload.');
    }

    const input = parsed.data;

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

      const qty = Math.max(1, Math.min(20, Number(item.quantity || 1)));
      const isExtended = String(item.license_type || 'REGULAR').toUpperCase() === 'EXTENDED';

      const baseRegular = Number(dbProduct.regular_price ?? 0);
      const promoRegular = Number(dbProduct.discount_price ?? 0);
      const effectiveRegular =
        promoRegular > 0 && promoRegular < baseRegular ? promoRegular : baseRegular;

      const rawExtended = Number(dbProduct.extended_price ?? 0);
      const effectiveExtended = rawExtended > 0 ? rawExtended : effectiveRegular * 2;

      const baseUnitPrice = isExtended ? effectiveExtended : effectiveRegular;
      if (baseUnitPrice <= 0) {
        throw new Error('Invalid product price configuration.');
      }

      const rawSupport = Number(dbProduct.support_price ?? 0);
      const unitSupportPrice = item.with_support
        ? rawSupport > 0
          ? rawSupport
          : DEFAULT_SUPPORT_PRICE
        : 0;

      const lineTotal = Number(((baseUnitPrice + unitSupportPrice) * qty).toFixed(2));
      verifiedSubtotal += lineTotal;

      // Enforce server-controlled platform fee percentage (never trust client-submitted fee)
      const feePercentage = PLATFORM_SELLER_FEE_PERCENTAGE;
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

    if (input.coupon_code && input.coupon_code.trim().length > 0) {
      const couponResult = await couponService.validateAndCalculate(
        input.coupon_code.trim(),
        verifiedSubtotal
      );
      verifiedDiscount = Math.max(0, Number(couponResult.discountAmount || 0));
      verifiedGrandTotal = Math.max(0, Number(couponResult.finalTotal || 0));
      appliedCouponCode = couponResult.code;
    }

    // Never allow client-supplied negative fees to reduce grand_total
    const buyerFee = PLATFORM_BUYER_FEE;
    const gatewayFee = PLATFORM_GATEWAY_FEE;
    verifiedGrandTotal = Number(
      Math.max(0, verifiedGrandTotal + buyerFee + gatewayFee).toFixed(2)
    );

    if (verifiedGrandTotal <= 0) {
      throw new Error('Order total must be greater than $0.00.');
    }

    // 3. Generate Cryptographic Invoice Number
    const invoiceNumber = generateInvoiceNumber();

    // 4. Normalize optional referral token
    const cleanAffiliateToken =
      input.affiliate_token_used && input.affiliate_token_used.trim().length > 0
        ? input.affiliate_token_used.trim().toLowerCase()
        : null;

    // 5. Save main Order to database
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
      affiliate_token_used: cleanAffiliateToken,
      coupon_code: appliedCouponCode,
    };

    // 6. Save Order and Items atomically via PostgreSQL RPC
    const newOrder = await orderRepo.createOrderAtomic(orderData, preparedOrderItems);

    // 7. Mark coupon as used
    if (appliedCouponCode) {
      await couponService.markCouponAsUsed(appliedCouponCode);
    }

    return await this.getOrderById(buyerId, newOrder.id);
  },

  async getOrderById(buyerId: string, orderId: string): Promise<Order> {
    const parsedId = uuidSchema.safeParse(orderId);
    if (!parsedId.success) {
      throw new Error('Invalid order identifier.');
    }

    const order = await orderRepo.getOrderById(parsedId.data, buyerId);
    if (!order) throw new Error('Order not found or you do not have access.');
    return order;
  },

  async getMyOrders(buyerId: string): Promise<Order[]> {
    if (!buyerId) {
      throw new Error('Authentication required.');
    }
    return await orderRepo.getOrdersByBuyerId(buyerId);
  },
};