// src/modules/products/product.repo.ts
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../config/supabase';
import { Product, ProductCategory, ProductGallery } from '../../types/product';
import { AppError } from '../../utils/app-error';

// ---------- Types ----------

type BooleanFlag = boolean | 'true' | 'false';

export interface ProductListParams {
  category_id?: string;
  category?: string;
  is_featured?: BooleanFlag;
  is_popular?: BooleanFlag;
  is_flash_sale?: BooleanFlag;
  sort?: 'latest' | 'price_asc' | 'price_desc';
  limit?: number | string;
}

export interface ProductLikesSummary {
  likes_count: number;
  is_liked: boolean;
}

export interface ProductReviewItem {
  id: string;
  product_id: string;
  user_id?: string;
  reviewer_name: string;
  reviewer_avatar?: string | null;
  reviewer_role?: string | null;
  title?: string | null;
  rating: number;
  comment: string;
  is_verified_purchase?: boolean;
  admin_reply?: string | null;
  created_at: string;
}

export interface ProductReviewsSummary {
  average_rating: number;
  total_reviews: number;
  reviews: ProductReviewItem[];
}

interface ReviewerProfile {
  name: string;
  avatar: string | null;
}

// ---------- Constants ----------

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const PAID_ORDER_STATUSES = ['PAID', 'COMPLETED', 'SETTLED'];
const ACTIVE_LICENSE_STATUSES = ['ACTIVE', 'VALID'];

const USER_PROFILE_COLUMNS = 'id, username, avatar_url';
const FALLBACK_REVIEWER_NAME = 'Themavia Member';

const PUBLIC_REVIEW_COLUMNS =
  'id, product_id, rating, title, review_text, is_verified_purchase, admin_reply, created_at, reviewer_name, reviewer_role, reviewer_avatar';

const LIST_REVIEW_COLUMNS = `${PUBLIC_REVIEW_COLUMNS}, buyer_id`;

const FLAG_COLUMNS = ['is_featured', 'is_popular', 'is_flash_sale'] as const;

const SORT_OPTIONS = {
  latest: { column: 'created_at', ascending: false },
  price_asc: { column: 'regular_price', ascending: true },
  price_desc: { column: 'regular_price', ascending: false },
} as const;

// ---------- Helpers ----------

function sanitizePublicProduct<T extends Record<string, any>>(product: T): T {
  if (!product) return product;
  const {
    file_source_url: _fileSourceUrl,
    file_path: _filePath,
    download_url: _downloadUrl,
    ...publicFields
  } = product;
  return publicFields as T;
}

function isTrue(value: unknown): boolean {
  return value === true || value === 'true';
}

function clampLimit(limit: number | string | undefined): number {
  if (limit === undefined || limit === '') return DEFAULT_LIMIT;
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsed)));
}

async function findCategoryIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('product_categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to resolve category: ${error.message}`);
  return data?.id ?? null;
}

async function assertPublishedProductExists(productId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('status', 'PUBLISHED')
    .maybeSingle();

  if (error) throw new Error(`Failed to verify product: ${error.message}`);
  if (!data) throw new AppError('Product not found', 404);
}

function toReviewerProfile(user: any): ReviewerProfile {
  return {
    name: user?.username || FALLBACK_REVIEWER_NAME,
    avatar: user?.avatar_url || null,
  };
}

function mapReviewRow(row: any, profile?: ReviewerProfile): ProductReviewItem {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    user_id: row.buyer_id ? String(row.buyer_id) : undefined,
    reviewer_name: row.reviewer_name || profile?.name || FALLBACK_REVIEWER_NAME,
    reviewer_avatar: row.reviewer_avatar || profile?.avatar || null,
    reviewer_role: row.reviewer_role ?? null,
    title: row.title ?? null,
    rating: Number(row.rating),
    comment: String(row.review_text ?? ''),
    is_verified_purchase: Boolean(row.is_verified_purchase),
    admin_reply: row.admin_reply ?? null,
    created_at: row.created_at,
  };
}

// ---------- Catalog ----------

async function getProducts(params: ProductListParams): Promise<Product[]> {
  let query = supabaseAdmin
    .from('products')
    .select('*, gallery:product_galleries(*)')
    .eq('status', 'PUBLISHED');

  if (params.category_id) {
    query = query.eq('category_id', params.category_id);
  }

  if (params.category) {
    const categoryId = await findCategoryIdBySlug(params.category);
    if (!categoryId) return [];
    query = query.eq('category_id', categoryId);
  }

  for (const flag of FLAG_COLUMNS) {
    if (isTrue(params[flag])) {
      query = query.eq(flag, true);
    }
  }

  const { column, ascending } = SORT_OPTIONS[params.sort ?? 'latest'] ?? SORT_OPTIONS.latest;
  query = query.order(column, { ascending }).limit(clampLimit(params.limit));

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch products: ${error.message}`);

  return (data ?? []).map((item: any) => sanitizePublicProduct(item)) as Product[];
}

async function getProductBySlug(slug: string): Promise<Product> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(`*, gallery:product_galleries(*), reviews:product_reviews(${PUBLIC_REVIEW_COLUMNS})`)
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch product: ${error.message}`);
  if (!data) throw new AppError('Product not found', 404);

  return sanitizePublicProduct(data) as Product;
}

async function getProductGalleries(productId: string): Promise<ProductGallery[]> {
  const { data, error } = await supabaseAdmin
    .from('product_galleries')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch product galleries: ${error.message}`);
  return data as ProductGallery[];
}

async function getCategories(): Promise<ProductCategory[]> {
  const { data, error } = await supabaseAdmin
    .from('product_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to fetch categories: ${error.message}`);
  return data as ProductCategory[];
}

// ---------- Purchase & Active License Verification (1-to-1 per user & product) ----------

async function hasUserPurchasedProduct(productId: string, userId: string): Promise<boolean> {
  if (!productId || !userId) return false;

  // 1. Primary check: verify active license ownership in `licenses` table for this exact product
  const { data: userLicenses, error: licenseError } = await supabaseAdmin
    .from('licenses')
    .select('id, status')
    .eq('user_id', userId)
    .eq('product_id', productId);

  if (!licenseError && userLicenses && userLicenses.length > 0) {
    const hasActiveLicense = userLicenses.some((lic: any) =>
      ACTIVE_LICENSE_STATUSES.includes(String(lic.status || 'ACTIVE').toUpperCase())
    );
    if (hasActiveLicense) {
      return true;
    }
    // If license exists but was explicitly revoked/suspended, deny review access
    return false;
  }

  // 2. Fallback check: verify paid order + order_item in case license record is still syncing
  const { data: userOrders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('id, payment_status')
    .eq('buyer_id', userId);

  if (ordersError || !userOrders?.length) return false;

  const paidOrderIds = userOrders
    .filter((order: any) =>
      PAID_ORDER_STATUSES.includes(String(order.payment_status || '').toUpperCase())
    )
    .map((order: any) => order.id);

  if (paidOrderIds.length === 0) return false;

  const { data: purchasedItem } = await supabaseAdmin
    .from('order_items')
    .select('id')
    .in('order_id', paidOrderIds)
    .eq('product_id', productId)
    .limit(1)
    .maybeSingle();

  return Boolean(purchasedItem);
}

// ---------- Likes / wishlist ----------

async function getProductLikes(productId: string, userId?: string): Promise<ProductLikesSummary> {
  const { count, error } = await supabaseAdmin
    .from('product_likes')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (error) throw new Error(`Failed to fetch product likes: ${error.message}`);

  let isLiked = false;
  if (userId) {
    const { data: userLike } = await supabaseAdmin
      .from('product_likes')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', userId)
      .maybeSingle();

    isLiked = Boolean(userLike);
  }

  return { likes_count: count ?? 0, is_liked: isLiked };
}

async function toggleProductLike(productId: string, userId: string): Promise<ProductLikesSummary> {
  const { data: existingLike, error: checkError } = await supabaseAdmin
    .from('product_likes')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError) throw new Error(`Failed to check like status: ${checkError.message}`);

  if (existingLike) {
    const { error: deleteError } = await supabaseAdmin
      .from('product_likes')
      .delete()
      .eq('id', existingLike.id);

    if (deleteError) throw new Error(`Failed to remove like: ${deleteError.message}`);
  } else {
    await assertPublishedProductExists(productId);

    const { error: insertError } = await supabaseAdmin
      .from('product_likes')
      .insert({ product_id: productId, user_id: userId });

    if (insertError) throw new Error(`Failed to like product: ${insertError.message}`);
  }

  return await getProductLikes(productId, userId);
}

// ---------- Reviews & ratings ----------

async function getProductReviews(productId: string): Promise<ProductReviewsSummary> {
  const { data: rawReviews, error } = await supabaseAdmin
    .from('product_reviews')
    .select(LIST_REVIEW_COLUMNS)
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch product reviews: ${error.message}`);

  const rows = rawReviews ?? [];

  const buyerIdsNeedingProfile = Array.from(
    new Set(
      rows
        .filter((row: any) => row.buyer_id && !String(row.reviewer_name ?? '').trim())
        .map((row: any) => row.buyer_id)
    )
  );

  const profilesById = new Map<string, ReviewerProfile>();
  if (buyerIdsNeedingProfile.length > 0) {
    const { data: usersData } = await supabaseAdmin
      .from('users')
      .select(USER_PROFILE_COLUMNS)
      .in('id', buyerIdsNeedingProfile);

    (usersData ?? []).forEach((user: any) => {
      profilesById.set(String(user.id), toReviewerProfile(user));
    });
  }

  const reviews = rows.map((row: any) => mapReviewRow(row, profilesById.get(String(row.buyer_id))));

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? Number((reviews.reduce((sum, item) => sum + item.rating, 0) / totalReviews).toFixed(2))
      : 0;

  return { average_rating: averageRating, total_reviews: totalReviews, reviews };
}

async function submitProductReview(
  productId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<ProductReviewItem> {
  // 1. Strictly enforce verified license ownership for this specific product
  const hasEligibleLicense = await hasUserPurchasedProduct(productId, userId);
  if (!hasEligibleLicense) {
    throw new AppError(
      'Verified license required: Only customers who own an active license for this product can submit a review.',
      403
    );
  }

  // 2. Fetch reviewer profile
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select(USER_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  const profile = toReviewerProfile(userData);

  // 3. Upsert: 1 license holder = 1 review per product (update if already reviewed, insert if new)
  const { data: existingReview, error: lookupError } = await supabaseAdmin
    .from('product_reviews')
    .select('id')
    .eq('product_id', productId)
    .eq('buyer_id', userId)
    .maybeSingle();

  if (lookupError) throw new Error(`Failed to check existing review: ${lookupError.message}`);

  const reviewFields = {
    rating,
    review_text: comment.trim(),
    is_verified_purchase: true,
    reviewer_name: profile.name,
    reviewer_avatar: profile.avatar,
  };

  const { data: savedRow, error: saveError } = existingReview
    ? await supabaseAdmin
        .from('product_reviews')
        .update({ ...reviewFields, updated_at: new Date().toISOString() })
        .eq('id', existingReview.id)
        .select('*')
        .single()
    : await supabaseAdmin
        .from('product_reviews')
        .insert({
          id: randomUUID(),
          product_id: productId,
          buyer_id: userId,
          ...reviewFields,
        })
        .select('*')
        .single();

  if (saveError) {
    const action = existingReview ? 'update' : 'submit';
    throw new Error(`Failed to ${action} review: ${saveError.message}`);
  }

  return mapReviewRow(savedRow, profile);
}

// ---------- Public API ----------

export const productRepo = {
  getProducts,
  getProductBySlug,
  getProductGalleries,
  getCategories,
  hasUserPurchasedProduct,
  getProductLikes,
  toggleProductLike,
  getProductReviews,
  submitProductReview,
};