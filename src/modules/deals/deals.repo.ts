// src/modules/deals/deals.repo.ts
import { supabaseAdmin } from '../../config/supabase';

export interface DealQueryFilters {
  category?: string;
  flashSaleOnly?: boolean;
  maxPrice?: number;
  tech?: string[];
  search?: string;
  sortBy?: 'lowest' | 'highest' | 'newest' | 'discount';
}

export interface ProductWithDealDTO {
  id: string;
  deal_id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  regular_price: number;
  extended_price: number;
  discount_price: number;
  discount_percent: number;
  deal_badge: string;
  is_flash_sale: boolean;
  expires_at: string;
  quota_limit: number | null;
  quota_claimed: number;
  images_url: string;
  thumbnail_url: string;
  tags: string[];
  rating: number;
  sales_count: number;
  status: string;
}

interface RawDealRow {
  id: string;
  product_id: string;
  deal_title: string | null;
  deal_badge: string | null;
  deal_price: number;
  discount_percent: number | null;
  is_flash_sale: boolean | null;
  quota_limit: number | null;
  quota_claimed: number | null;
  expires_at: string;
  products: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    category?: string | null;
    regular_price: number;
    extended_price: number | null;
    images_url: string | null;
    tags: string[] | null;
    rating?: number | null;
    sales_count?: number | null;
    status: string;
  } | null;
}

export const dealsRepo = {
  async getActiveDeals(filters: DealQueryFilters): Promise<{
    items: ProductWithDealDTO[];
    availableCategories: string[];
    availableTech: string[];
    featuredDeal: ProductWithDealDTO | null;
  }> {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('deals')
      .select(`
        id,
        product_id,
        deal_title,
        deal_badge,
        deal_price,
        discount_percent,
        is_flash_sale,
        quota_limit,
        quota_claimed,
        expires_at,
        products (
          id,
          title,
          slug,
          description,
          category,
          regular_price,
          extended_price,
          images_url,
          tags,
          rating,
          sales_count,
          status
        )
      `)
      .eq('is_active', true)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch deals from database: ${error.message}`);
    }

    const rows = (data || []) as unknown as RawDealRow[];
    const categorySet = new Set<string>(['All Deals']);
    const techSet = new Set<string>();

    const allMappedDeals: ProductWithDealDTO[] = rows
      .filter((row) => row.products !== null && row.products.status === 'PUBLISHED')
      .map((row) => {
        const prod = row.products!;
        const regPrice = Number(prod.regular_price || 0);
        const dealPrice = Number(row.deal_price || regPrice);
        const computedDiscount =
          row.discount_percent && row.discount_percent > 0
            ? Number(row.discount_percent)
            : regPrice > 0
            ? Math.max(0, Math.round(((regPrice - dealPrice) / regPrice) * 100))
            : 0;

        const categoryName = prod.category?.trim() || 'Digital Templates';
        categorySet.add(categoryName);

        const prodTags = Array.isArray(prod.tags) ? prod.tags : [];
        prodTags.forEach((tag) => techSet.add(tag));

        return {
          id: prod.id,
          deal_id: row.id,
          title: row.deal_title || prod.title,
          slug: prod.slug,
          description: prod.description,
          category: categoryName,
          regular_price: regPrice,
          extended_price: Number(prod.extended_price ?? regPrice * 2),
          discount_price: dealPrice,
          discount_percent: computedDiscount,
          deal_badge: row.deal_badge || (row.is_flash_sale ? 'FLASH SALE' : 'SPECIAL DEAL'),
          is_flash_sale: Boolean(row.is_flash_sale),
          expires_at: row.expires_at,
          quota_limit: row.quota_limit,
          quota_claimed: Number(row.quota_claimed || 0),
          images_url: prod.images_url || '',
          thumbnail_url: prod.images_url || '',
          tags: prodTags,
          rating: Number(prod.rating || 5.0),
          sales_count: Number(prod.sales_count || 0),
          status: prod.status,
        };
      });

    // Pick 1 featured deal (highest discount / active flash sale) for Hero Banner
    const featuredDeal =
      [...allMappedDeals].sort((a, b) => b.discount_percent - a.discount_percent)[0] || null;

    // Apply server-side filters
    let filtered = allMappedDeals.filter((item) => {
      if (filters.flashSaleOnly && !item.is_flash_sale) {
        return false;
      }

      if (
        filters.category &&
        filters.category !== 'All Deals' &&
        item.category.toLowerCase() !== filters.category.toLowerCase()
      ) {
        return false;
      }

      if (filters.maxPrice !== undefined && item.discount_price > filters.maxPrice) {
        return false;
      }

      if (filters.tech && filters.tech.length > 0) {
        const lowerItemTags = item.tags.map((t) => t.toLowerCase());
        const hasMatchingTech = filters.tech.some((t) =>
          lowerItemTags.includes(t.toLowerCase())
        );
        if (!hasMatchingTech) return false;
      }

      if (filters.search && filters.search.trim() !== '') {
        const q = filters.search.trim().toLowerCase();
        const inTitle = item.title.toLowerCase().includes(q);
        const inDesc = (item.description || '').toLowerCase().includes(q);
        if (!inTitle && !inDesc) return false;
      }

      return true;
    });

    // Apply server-side sorting
    if (filters.sortBy === 'lowest') {
      filtered = filtered.sort((a, b) => a.discount_price - b.discount_price);
    } else if (filters.sortBy === 'highest') {
      filtered = filtered.sort((a, b) => b.discount_price - a.discount_price);
    } else if (filters.sortBy === 'discount') {
      filtered = filtered.sort((a, b) => b.discount_percent - a.discount_percent);
    }

    return {
      items: filtered,
      availableCategories: Array.from(categorySet),
      availableTech: Array.from(techSet),
      featuredDeal,
    };
  },
};