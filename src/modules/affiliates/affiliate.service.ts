// src/modules/affiliates/affiliate.service.ts
import { z } from 'zod';
import { affiliateRepo } from './affiliate.repo';

const affiliateCodeInputSchema = z
  .string()
  .trim()
  .min(3, 'Affiliate ID must be at least 3 characters long.')
  .max(40, 'Affiliate ID cannot exceed 40 characters.')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Affiliate ID may only contain letters, numbers, hyphens (-), or underscores (_).'
  );

const applyAffiliateSchema = z.object({
  desiredCode: affiliateCodeInputSchema,
  payoutAccount: z
    .string()
    .trim()
    .max(255, 'Payout account details cannot exceed 255 characters.')
    .optional()
    .nullable(),
});

const generateLinkSchema = z.object({
  productIdOrSlug: z
    .string()
    .trim()
    .min(1, 'Product identifier is required.')
    .max(150, 'Invalid product identifier.'),
  rawAffiliateCode: affiliateCodeInputSchema,
});

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>?/gm, '').trim();
}

const normalizeAffiliateCode = (raw: string): string => {
  const sanitized = stripHtmlTags(String(raw ?? ''));
  const parsed = affiliateCodeInputSchema.safeParse(sanitized);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid Affiliate ID.');
  }

  const cleaned = parsed.data.toLowerCase();
  return cleaned.startsWith('tmv-') ? cleaned : `tmv-${cleaned}`;
};

export const affiliateService = {
  async applyAffiliate(userId: string, desiredCode: string, payoutAccount?: string) {
    if (!userId) {
      throw new Error('Authentication required to apply for the affiliate program.');
    }

    const existingUserAffiliate = await affiliateRepo.findByUserId(userId);
    if (existingUserAffiliate) {
      return existingUserAffiliate;
    }

    const parsed = applyAffiliateSchema.safeParse({
      desiredCode: stripHtmlTags(String(desiredCode ?? '')),
      payoutAccount: payoutAccount ? stripHtmlTags(String(payoutAccount)) : null,
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid affiliate application data.');
    }

    const formattedCode = normalizeAffiliateCode(parsed.data.desiredCode);
    const taken = await affiliateRepo.findByCode(formattedCode);
    if (taken) {
      throw new Error(`Affiliate code "${formattedCode}" is already taken. Please choose another one.`);
    }

    return await affiliateRepo.createAffiliate(
      userId,
      formattedCode,
      parsed.data.payoutAccount || undefined
    );
  },

  async getMyAffiliateDashboard(userId: string) {
    if (!userId) {
      throw new Error('Authentication required.');
    }

    const affiliate = await affiliateRepo.findByUserId(userId);
    if (!affiliate) return null;

    const commissions = await affiliateRepo.getCommissionsByAffiliateId(affiliate.id);
    return {
      profile: affiliate,
      commissions,
    };
  },

  async generateAndValidateProductLink(productIdOrSlug: string, rawAffiliateCode: string) {
    const parsed = generateLinkSchema.safeParse({
      productIdOrSlug: stripHtmlTags(String(productIdOrSlug ?? '')),
      rawAffiliateCode: stripHtmlTags(String(rawAffiliateCode ?? '')),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid affiliate link request.');
    }

    const formattedCode = normalizeAffiliateCode(parsed.data.rawAffiliateCode);
    const affiliate = await affiliateRepo.findByCode(formattedCode);

    if (!affiliate) {
      throw new Error(
        `Affiliate ID "${formattedCode}" is not registered yet. Please register first via the Become Affiliate menu.`
      );
    }

    if (affiliate.status !== 'APPROVED') {
      throw new Error(`Affiliate account "${formattedCode}" is currently ${affiliate.status}.`);
    }

    const productInfo = await affiliateRepo.getProductCommissionInfo(parsed.data.productIdOrSlug);
    if (!productInfo) {
      throw new Error('Product not found.');
    }

    if (productInfo.product.is_affiliate_enabled === false) {
      throw new Error('The affiliate program is currently disabled for this product.');
    }

    return {
      affiliate_code: affiliate.affiliate_code,
      commission_rate: Number(productInfo.product.affiliate_commission_rate ?? 8),
      product_slug: productInfo.product.slug,
      campaign_kit: productInfo.campaignKit,
    };
  },

  async trackReferralClick(rawAffiliateCode: string) {
    if (!rawAffiliateCode || typeof rawAffiliateCode !== 'string') {
      return { tracked: false };
    }

    try {
      const formattedCode = normalizeAffiliateCode(rawAffiliateCode);
      const affiliate = await affiliateRepo.findByCode(formattedCode);
      if (affiliate && affiliate.status === 'APPROVED') {
        await affiliateRepo.incrementClicks(affiliate.id, affiliate.total_clicks);
      }
      return { tracked: Boolean(affiliate && affiliate.status === 'APPROVED') };
    } catch {
      return { tracked: false };
    }
  },

  async processOrderAffiliateCommission(order: {
    id: string;
    buyer_id: string;
    affiliate_token_used?: string | null;
    order_items?: Array<{
      id?: string;
      product_id: string;
      price_at_purchase?: number | string;
    }>;
  }) {
    try {
      // Fetch internal order metadata directly so SAFE_ORDER_SELECT DTO filtering never hides the token
      const internalMeta = await affiliateRepo.getOrderInternalAffiliateMeta(order.id);
      const rawToken = order.affiliate_token_used ?? internalMeta?.affiliate_token_used;
      if (!rawToken) return 0;

      const formattedCode = normalizeAffiliateCode(rawToken);
      const affiliate = await affiliateRepo.findByCode(formattedCode);

      // Enforce APPROVED status and block self-referrals
      if (!affiliate || affiliate.status !== 'APPROVED') return 0;
      if (String(affiliate.user_id) === String(order.buyer_id)) {
        console.warn(`[AFFILIATE] Self-referral blocked for user ${order.buyer_id}`);
        return 0;
      }

      return await affiliateRepo.recordOrderCommissions(affiliate, {
        id: order.id,
        buyer_id: order.buyer_id,
        subtotal: internalMeta?.subtotal,
        discount_total: internalMeta?.discount_total,
        order_items: order.order_items,
      });
    } catch (err) {
      console.error('[AFFILIATE_PROCESS_COMMISSION_WARNING]:', err);
      return 0; // Best-effort: never fail paid order fulfillment
    }
  },
};