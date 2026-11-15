// src/modules/coupon/coupon.repo.ts
import { supabaseAdmin } from '../../config/supabase';

export interface CouponRecord {
  id: string;
  code: string;
  description?: string | null;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_purchase: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  used_count: number;
  is_active: boolean;
  expires_at?: string | null;
}

export const couponRepo = {
  async findByCode(code: string): Promise<CouponRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .ilike('code', code.trim())
      .maybeSingle();

    if (error) throw new Error(`Gagal memeriksa kupon: ${error.message}`);
    return data as CouponRecord | null;
  },

  async incrementUsage(couponId: string, currentUsedCount: number): Promise<void> {
    await supabaseAdmin
      .from('coupons')
      .update({
        used_count: currentUsedCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', couponId);
  },
};