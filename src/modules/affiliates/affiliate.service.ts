// src/modules/affiliates/affiliate.service.ts
import { affiliateRepo } from './affiliate.repo';

const normalizeAffiliateCode = (raw: string): string => {
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleaned) throw new Error('Affiliate ID tidak valid');
  return cleaned.startsWith('tmv-') ? cleaned : `tmv-${cleaned}`;
};

export const affiliateService = {
  async applyAffiliate(userId: string, desiredCode: string, payoutAccount?: string) {
    const existingUserAffiliate = await affiliateRepo.findByUserId(userId);
    if (existingUserAffiliate) {
      return existingUserAffiliate;
    }

    const formattedCode = normalizeAffiliateCode(desiredCode);
    const taken = await affiliateRepo.findByCode(formattedCode);
    if (taken) {
      throw new Error(`Kode ${formattedCode} sudah digunakan, pilih kombinasi lain.`);
    }

    return await affiliateRepo.createAffiliate(userId, formattedCode, payoutAccount);
  },

  async getMyAffiliateDashboard(userId: string) {
    const affiliate = await affiliateRepo.findByUserId(userId);
    if (!affiliate) return null;

    const commissions = await affiliateRepo.getCommissionsByAffiliateId(affiliate.id);
    return {
      profile: affiliate,
      commissions,
    };
  },

  async generateAndValidateProductLink(productIdOrSlug: string, rawAffiliateCode: string) {
    const formattedCode = normalizeAffiliateCode(rawAffiliateCode);
    const affiliate = await affiliateRepo.findByCode(formattedCode);

    if (!affiliate) {
      throw new Error(`Affiliate ID "${formattedCode}" belum terdaftar. Daftar terlebih dahulu di menu Become Affiliate.`);
    }

    if (affiliate.status !== 'APPROVED') {
      throw new Error(`Akun Affiliate "${formattedCode}" berstatus ${affiliate.status}.`);
    }

    const productInfo = await affiliateRepo.getProductCommissionInfo(productIdOrSlug);
    if (!productInfo) {
      throw new Error('Produk tidak ditemukan.');
    }

    if (productInfo.product.is_affiliate_enabled === false) {
      throw new Error('Program afiliasi sedang dinonaktifkan untuk produk ini.');
    }

    return {
      affiliate_code: affiliate.affiliate_code,
      commission_rate: Number(productInfo.product.affiliate_commission_rate ?? 8),
      product_slug: productInfo.product.slug,
      campaign_kit: productInfo.campaignKit,
    };
  },

  async trackReferralClick(rawAffiliateCode: string) {
    const formattedCode = normalizeAffiliateCode(rawAffiliateCode);
    const affiliate = await affiliateRepo.findByCode(formattedCode);
    if (affiliate && affiliate.status === 'APPROVED') {
      await affiliateRepo.incrementClicks(affiliate.id, affiliate.total_clicks);
    }
    return { tracked: Boolean(affiliate) };
  },

  async processOrderAffiliateCommission(order: {
    id: string;
    buyer_id: string;
    affiliate_token_used?: string | null;
    order_items?: any[];
  }) {
    if (!order.affiliate_token_used) return 0;

    const formattedCode = normalizeAffiliateCode(order.affiliate_token_used);
    const affiliate = await affiliateRepo.findByCode(formattedCode);

    // Validasi status APPROVED & proteksi anti-self-referral
    if (!affiliate || affiliate.status !== 'APPROVED') return 0;
    if (String(affiliate.user_id) === String(order.buyer_id)) {
      console.warn(`[AFFILIATE] Self-referral diblokir untuk user ${order.buyer_id}`);
      return 0;
    }

    return await affiliateRepo.recordOrderCommissions(affiliate, order);
  },
};