// src/modules/affiliates/affiliate.repo.ts
import { supabaseAdmin } from '../../config/supabase';

export interface AffiliateRecord {
  id: string;
  user_id: string;
  affiliate_code: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  payout_method?: string | null;
  payout_account?: string | null;
  total_clicks: number;
  total_conversions: number;
  total_earnings: number;
  pending_balance: number;
}

export const affiliateRepo = {
  async findByCode(affiliateCode: string): Promise<AffiliateRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .ilike('affiliate_code', affiliateCode.trim())
      .maybeSingle();

    if (error) throw new Error(`Failed to verify affiliate code: ${error.message}`);
    return data as AffiliateRecord | null;
  },

  async findByUserId(userId: string): Promise<AffiliateRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch affiliate profile: ${error.message}`);
    return data as AffiliateRecord | null;
  },

  async createAffiliate(
    userId: string,
    affiliateCode: string,
    payoutAccount?: string
  ): Promise<AffiliateRecord> {
    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .insert([
        {
          user_id: userId,
          affiliate_code: affiliateCode.toLowerCase(),
          status: 'PENDING', // Approval handled centrally by admin-BE
          payout_account: payoutAccount || null,
        },
      ])
      .select('*')
      .single();

    if (error) throw new Error(`Failed to register affiliate account: ${error.message}`);
    return data as AffiliateRecord;
  },

  async getProductCommissionInfo(productIdentifier: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      productIdentifier
    );
    const column = isUuid ? 'id' : 'slug';

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('id, title, slug, regular_price, affiliate_commission_rate, is_affiliate_enabled')
      .eq(column, productIdentifier)
      .maybeSingle();

    if (error || !product) return null;

    const { data: campaignKit } = await supabaseAdmin
      .from('product_campaign_kits')
      .select('*')
      .eq('product_id', product.id)
      .maybeSingle();

    return {
      product,
      campaignKit: campaignKit || null,
    };
  },

  async getOrderInternalAffiliateMeta(orderId: string): Promise<{
    buyer_id: string;
    affiliate_token_used: string | null;
    subtotal: number;
    discount_total: number;
  } | null> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('buyer_id, affiliate_token_used, subtotal, discount_total')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      buyer_id: String(data.buyer_id),
      affiliate_token_used: data.affiliate_token_used ?? null,
      subtotal: Number(data.subtotal ?? 0),
      discount_total: Number(data.discount_total ?? 0),
    };
  },

  async incrementClicks(affiliateId: string, currentClicks: number): Promise<void> {
    await supabaseAdmin
      .from('affiliates')
      .update({
        total_clicks: currentClicks + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliateId);
  },

  async recordOrderCommissions(
    affiliate: AffiliateRecord,
    order: {
      id: string;
      buyer_id: string;
      subtotal?: number;
      discount_total?: number;
      order_items?: Array<{
        id?: string;
        product_id: string;
        price_at_purchase?: number | string;
      }>;
    }
  ): Promise<number> {
    if (!order.order_items || order.order_items.length === 0) return 0;

    // Prevent duplicate commission entries for the same order
    const { data: existing } = await supabaseAdmin
      .from('affiliate_commissions')
      .select('id')
      .eq('order_id', order.id)
      .limit(1);

    if (existing && existing.length > 0) return 0;

    const productIds = Array.from(new Set(order.order_items.map((item) => item.product_id)));
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, affiliate_commission_rate, is_affiliate_enabled')
      .in('id', productIds);

    const productMap = new Map<string, { rate: number; enabled: boolean }>();
    (products || []).forEach((p: { id: string; affiliate_commission_rate?: number; is_affiliate_enabled?: boolean }) => {
      productMap.set(String(p.id), {
        rate: Number(p.affiliate_commission_rate ?? 8),
        enabled: p.is_affiliate_enabled !== false,
      });
    });

    // Calculate net-after-discount ratio so commissions are based on actual paid item value
    const grossSubtotal = Number(order.subtotal ?? 0);
    const discountTotal = Math.max(0, Number(order.discount_total ?? 0));
    const netRatio =
      grossSubtotal > 0
        ? Math.max(0, Math.min(1, (grossSubtotal - discountTotal) / grossSubtotal))
        : 1;

    const commissionRows: Array<Record<string, unknown>> = [];
    let totalCommissionEarned = 0;

    for (const item of order.order_items) {
      const prodRule = productMap.get(String(item.product_id)) || { rate: 8, enabled: true };
      if (!prodRule.enabled || prodRule.rate <= 0) continue;

      const rawItemPrice = Number(item.price_at_purchase || 0);
      const netItemSubtotal = Number((rawItemPrice * netRatio).toFixed(2));
      const commissionAmount = Number(((netItemSubtotal * prodRule.rate) / 100).toFixed(2));
      if (commissionAmount <= 0) continue;

      totalCommissionEarned += commissionAmount;
      commissionRows.push({
        affiliate_id: affiliate.id,
        order_id: order.id,
        order_item_id: item.id || null,
        product_id: item.product_id,
        buyer_id: order.buyer_id,
        item_subtotal: netItemSubtotal,
        commission_rate: prodRule.rate,
        commission_amount: commissionAmount,
        status: 'PENDING', // Hold period & release managed by affiliate-BE
      });
    }

    if (commissionRows.length === 0) return 0;

    const { error: insertErr } = await supabaseAdmin
      .from('affiliate_commissions')
      .insert(commissionRows);

    if (insertErr) {
      console.error('[AFFILIATE_COMMISSION_INSERT_ERROR]:', insertErr.message);
      return 0;
    }

    // Update conversion counter & pending_balance (total_earnings updated upon release in affiliate-BE)
    await supabaseAdmin
      .from('affiliates')
      .update({
        total_conversions: Number(affiliate.total_conversions || 0) + 1,
        pending_balance: Number(
          (Number(affiliate.pending_balance || 0) + totalCommissionEarned).toFixed(2)
        ),
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliate.id);

    return totalCommissionEarned;
  },

  async getCommissionsByAffiliateId(affiliateId: string) {
    const { data, error } = await supabaseAdmin
      .from('affiliate_commissions')
      .select('*, products(title, slug, images_url)')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },
};