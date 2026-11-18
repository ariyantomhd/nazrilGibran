// src/modules/products/product.service.ts
import { z } from 'zod';
import { productRepo } from './product.repo';
import { AppError } from '../../utils/app-error';

// ---------- Validation schemas ----------

const uuidSchema = z.string().uuid('Invalid product ID format.');

const slugSchema = z
  .string()
  .trim()
  .min(1, 'Product slug is required.')
  .max(180, 'Product slug is too long.')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid product slug format.');

const booleanFlagSchema = z.union([z.boolean(), z.enum(['true', 'false'])]).optional();

const productQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  category: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  is_featured: booleanFlagSchema,
  is_popular: booleanFlagSchema,
  is_flash_sale: booleanFlagSchema,
  sort: z.enum(['latest', 'price_asc', 'price_desc']).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const submitReviewSchema = z.object({
  rating: z
    .number({ message: 'Rating must be a number.' })
    .int('Rating must be a whole number.')
    .min(1, 'Rating must be at least 1.')
    .max(5, 'Rating cannot exceed 5.'),
  comment: z
    .string()
    .trim()
    .min(5, 'Review comment must be at least 5 characters long.')
    .max(1000, 'Review comment cannot exceed 1,000 characters.'),
});

// ---------- Constants ----------

const LANDING_LIMITS = {
  featured: 8,
  popular: 6,
  deals: 6,
} as const;

// ---------- Helpers ----------

function parseProductId(rawId: string): string {
  const parsed = uuidSchema.safeParse(rawId);
  if (!parsed.success) throw new AppError('Invalid product ID.', 400);
  return parsed.data;
}

function requireUser(userId: string | undefined, message: string): string {
  if (!userId) throw new AppError(message, 401);
  return userId;
}

// Hanya menghapus tag HTML yang lengkap (<b>, </p>, <script ...>).
// Teks seperti "I <3 this" tetap utuh.
function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

// Menerima number atau string numerik. Boolean, null, dan string kosong ditolak (NaN).
function toRatingNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim() !== '') return Number(raw);
  return Number.NaN;
}

// ---------- Service ----------

export const productService = {
  // --- CATALOG ---
  async getProducts(rawParams: unknown) {
    const parsed = productQuerySchema.safeParse(rawParams ?? {});
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || 'Invalid product query parameters.',
        400
      );
    }
    return await productRepo.getProducts(parsed.data);
  },

  // 3 endpoint khusus untuk landing page
  async getFeaturedProducts() {
    return await productRepo.getProducts({ is_featured: true, limit: LANDING_LIMITS.featured });
  },

  async getPopularProducts() {
    return await productRepo.getProducts({ is_popular: true, limit: LANDING_LIMITS.popular });
  },

  async getBestDeals() {
    return await productRepo.getProducts({
      is_flash_sale: true,
      sort: 'latest',
      limit: LANDING_LIMITS.deals,
    });
  },

  async getProductBySlug(rawSlug: string) {
    const parsed = slugSchema.safeParse(rawSlug);
    if (!parsed.success) throw new AppError('Invalid product slug.', 404);
    return await productRepo.getProductBySlug(parsed.data);
  },

  async getProductGalleries(rawProductId: string) {
    return await productRepo.getProductGalleries(parseProductId(rawProductId));
  },

  async getCategories() {
    return await productRepo.getCategories();
  },

  // --- PURCHASE VERIFICATION ---
  async checkPurchaseEligibility(rawProductId: string, userId?: string) {
    const productId = parseProductId(rawProductId);
    if (!userId) return { has_purchased: false };

    const hasPurchased = await productRepo.hasUserPurchasedProduct(productId, userId);
    return { has_purchased: hasPurchased };
  },

  // --- LIKES / WISHLIST ---
  async getProductLikes(rawProductId: string, userId?: string) {
    return await productRepo.getProductLikes(parseProductId(rawProductId), userId);
  },

  async toggleProductLike(rawProductId: string, userId?: string) {
    const productId = parseProductId(rawProductId);
    const verifiedUserId = requireUser(userId, 'Please sign in to like this product.');
    return await productRepo.toggleProductLike(productId, verifiedUserId);
  },

  // --- REVIEWS & RATINGS ---
  async getProductReviews(rawProductId: string) {
    return await productRepo.getProductReviews(parseProductId(rawProductId));
  },

  async submitProductReview(
    rawProductId: string,
    userId: string | undefined,
    rawRating: unknown,
    rawComment: unknown
  ) {
    const productId = parseProductId(rawProductId);
    const verifiedUserId = requireUser(userId, 'Please sign in to submit a review.');

    const parsedBody = submitReviewSchema.safeParse({
      rating: toRatingNumber(rawRating),
      comment: typeof rawComment === 'string' ? stripHtmlTags(rawComment) : '',
    });

    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message || 'Invalid review input.', 400);
    }

    return await productRepo.submitProductReview(
      productId,
      verifiedUserId,
      parsedBody.data.rating,
      parsedBody.data.comment
    );
  },
};