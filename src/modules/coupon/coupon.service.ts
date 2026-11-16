// src/modules/coupon/coupon.service.ts
import { couponRepo } from './coupon.repo';

export interface ValidateCouponResult {
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  discountPercent: number; // Directly compatible with frontend state
  discountAmount: number;
  finalTotal: number;
  description?: string | null;
}

export const couponService = {
  async validateAndCalculate(rawCode: string, subtotal: number = 0): Promise<ValidateCouponResult> {
    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
      throw new Error('Please enter a coupon code.');
    }

    const coupon = await couponRepo.findByCode(rawCode.trim());
    if (!coupon) {
      throw new Error(`Coupon code "${rawCode.toUpperCase()}" was not found.`);
    }

    if (!coupon.is_active) {
      throw new Error('This coupon code is no longer active.');
    }

    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
      throw new Error('This coupon code has expired.');
    }

    if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && coupon.used_count >= coupon.usage_limit) {
      throw new Error('This coupon has reached its maximum usage limit.');
    }

    const numericSubtotal = Math.max(0, Number(subtotal) || 0);
    const minPurchase = Number(coupon.min_purchase || 0);

    if (numericSubtotal > 0 && numericSubtotal < minPurchase) {
      throw new Error(`Minimum purchase amount for this coupon is $${minPurchase}.`);
    }

    const discountValue = Number(coupon.discount_value);
    let discountAmount = 0;
    let discountPercent = 0;

    if (coupon.discount_type === 'PERCENTAGE') {
      discountPercent = discountValue;
      discountAmount = (numericSubtotal * discountValue) / 100;
      if (coupon.max_discount !== null && coupon.max_discount !== undefined) {
        discountAmount = Math.min(discountAmount, Number(coupon.max_discount));
      }
    } else {
      discountAmount = Math.min(numericSubtotal, discountValue);
      discountPercent = numericSubtotal > 0 ? Number(((discountAmount / numericSubtotal) * 100).toFixed(2)) : 0;
    }

    discountAmount = Number(discountAmount.toFixed(2));
    const finalTotal = Number(Math.max(0, numericSubtotal - discountAmount).toFixed(2));

    return {
      code: coupon.code.toUpperCase(),
      discount_type: coupon.discount_type,
      discount_value: discountValue,
      discountPercent,
      discountAmount,
      finalTotal,
      description: coupon.description,
    };
  },

  async markCouponAsUsed(code?: string | null): Promise<void> {
    if (!code) return;
    const coupon = await couponRepo.findByCode(code);
    if (coupon) {
      await couponRepo.incrementUsage(coupon.id, Number(coupon.used_count || 0));
    }
  },
};