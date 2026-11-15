// src/modules/products/product.repo.ts
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../config/supabase';
import { ProductQueryParams, Product, ProductCategory, ProductGallery } from '../../types/product';

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

export const productRepo = {
  async getProducts(params: ProductQueryParams): Promise<Product[]> {
    let query = supabaseAdmin.from('products').select('*, gallery:product_galleries(*)');

    query = query.eq('status', 'PUBLISHED');

    // 1. Filter menggunakan category_id (UUID mutlak)
    if (params.category_id) {
      query = query.eq('category_id', params.category_id);
    }
    
    // 2. Filter menggunakan slug kategori dari Frontend (?category=mobile-apps)
    const categorySlug = (params as any).category;
    if (categorySlug) {
      const { data: catData } = await supabaseAdmin
        .from('product_categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();
        
      if (catData) {
        query = query.eq('category_id', catData.id);
      } else {
        return [];
      }
    }

    // 3. Filter Section Halaman Utama
    if (params.is_featured === 'true' || params.is_featured === true) query = query.eq('is_featured', true);
    if (params.is_popular === 'true' || params.is_popular === true) query = query.eq('is_popular', true);
    if (params.is_flash_sale === 'true' || params.is_flash_sale === true) query = query.eq('is_flash_sale', true);

    // 4. Sorting
    if (params.sort === 'latest') {
      query = query.order('created_at', { ascending: false });
    } else if (params.sort === 'price_asc') {
      query = query.order('regular_price', { ascending: true });
    } else if (params.sort === 'price_desc') {
      query = query.order('regular_price', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const limit = params.limit ? Number(params.limit) : 20;
    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw new Error(`Gagal mengambil produk: ${error.message}`);
    return data as Product[];
  },

  async getProductBySlug(slug: string): Promise<Product> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, gallery:product_galleries(*), reviews:product_reviews(*)')
      .eq('slug', slug)
      .eq('status', 'PUBLISHED')
      .single();

    if (error) throw new Error('Produk tidak ditemukan');
    return data as Product;
  },

  async getProductGalleries(productId: string): Promise<ProductGallery[]> {
    const { data, error } = await supabaseAdmin
      .from('product_galleries')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data as ProductGallery[];
  },

  async getCategories(): Promise<ProductCategory[]> {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data as ProductCategory[];
  },

  // --- LIKES / WISHLIST ---
  async getProductLikes(productId: string, userId?: string): Promise<ProductLikesSummary> {
    const { count, error } = await supabaseAdmin
      .from('product_likes')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (error) throw new Error(`Gagal mengambil data likes: ${error.message}`);

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

    return {
      likes_count: count ?? 0,
      is_liked: isLiked,
    };
  },

  async toggleProductLike(productId: string, userId: string): Promise<ProductLikesSummary> {
    const { data: existingLike, error: checkError } = await supabaseAdmin
      .from('product_likes')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) throw new Error(`Gagal memeriksa status like: ${checkError.message}`);

    if (existingLike) {
      const { error: deleteError } = await supabaseAdmin
        .from('product_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) throw new Error(`Gagal membatalkan like: ${deleteError.message}`);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('product_likes')
        .insert({
          product_id: productId,
          user_id: userId,
        });

      if (insertError) throw new Error(`Gagal menyukai produk: ${insertError.message}`);
    }

    return await this.getProductLikes(productId, userId);
  },

  // --- REVIEWS & RATINGS ---
  async getProductReviews(productId: string): Promise<ProductReviewsSummary> {
    const { data: rawReviews, error } = await supabaseAdmin
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Gagal mengambil ulasan produk: ${error.message}`);

    const rows = rawReviews ?? [];
    const buyerIds = Array.from(new Set(rows.map((r: any) => r.buyer_id).filter(Boolean)));

    const usersMap = new Map<string, { name: string; avatar: string | null }>();
    if (buyerIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('id', buyerIds);

      (usersData ?? []).forEach((u: any) => {
        const displayName =
          u.full_name ||
          u.name ||
          u.username ||
          (typeof u.email === 'string' ? u.email.split('@')[0] : 'Themavia Buyer');
        const avatarUrl = u.avatar_url || u.avatar || null;
        usersMap.set(String(u.id), { name: displayName, avatar: avatarUrl });
      });
    }

    const reviews: ProductReviewItem[] = rows.map((row: any) => {
      const profile = usersMap.get(String(row.buyer_id));
      return {
        id: String(row.id),
        product_id: String(row.product_id),
        user_id: row.buyer_id ? String(row.buyer_id) : undefined,
        reviewer_name: profile?.name || 'Themavia Member',
        reviewer_avatar: profile?.avatar ?? null,
        rating: Number(row.rating),
        comment: String(row.review_text ?? ''),
        is_verified_purchase: Boolean(row.is_verified_purchase),
        admin_reply: row.admin_reply ?? null,
        created_at: row.created_at,
      };
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((reviews.reduce((sum, item) => sum + item.rating, 0) / totalReviews).toFixed(2))
        : 0;

    return {
      average_rating: averageRating,
      total_reviews: totalReviews,
      reviews,
    };
  },

  async submitProductReview(
    productId: string,
    userId: string,
    rating: number,
    comment: string,
  ): Promise<ProductReviewItem> {
    // 1. Cek apakah pembeli benar-benar pernah membeli produk ini (Verified Purchase)
    let isVerifiedPurchase = false;
    const { data: userOrders } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('buyer_id', userId);

    const paidOrderIds = (userOrders ?? [])
      .filter((o: any) => ['PAID', 'COMPLETED', 'SETTLED'].includes(String(o.status || '').toUpperCase()))
      .map((o: any) => o.id);

    if (paidOrderIds.length > 0) {
      const { data: purchasedItem } = await supabaseAdmin
        .from('order_items')
        .select('id')
        .in('order_id', paidOrderIds)
        .eq('product_id', productId)
        .limit(1)
        .maybeSingle();

      isVerifiedPurchase = Boolean(purchasedItem);
    }

    // 2. Cek apakah user sudah pernah menulis ulasan pada produk ini (jika ada -> update, jika belum -> insert)
    const { data: existingReview } = await supabaseAdmin
      .from('product_reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('buyer_id', userId)
      .maybeSingle();

    let savedRow: any;
    if (existingReview) {
      const { data, error } = await supabaseAdmin
        .from('product_reviews')
        .update({
          rating,
          review_text: comment.trim(),
          is_verified_purchase: isVerifiedPurchase,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingReview.id)
        .select('*')
        .single();

      if (error) throw new Error(`Gagal memperbarui ulasan: ${error.message}`);
      savedRow = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('product_reviews')
        .insert({
          id: randomUUID(),
          product_id: productId,
          buyer_id: userId,
          rating,
          review_text: comment.trim(),
          is_verified_purchase: isVerifiedPurchase,
        })
        .select('*')
        .single();

      if (error) throw new Error(`Gagal mengirim ulasan: ${error.message}`);
      savedRow = data;
    }

    // 3. Ambil profil user untuk dikembalikan ke frontend
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const reviewerName =
      userData?.full_name ||
      userData?.name ||
      userData?.username ||
      (typeof userData?.email === 'string' ? userData.email.split('@')[0] : 'Themavia Member');

    return {
      id: String(savedRow.id),
      product_id: String(savedRow.product_id),
      user_id: String(savedRow.buyer_id),
      reviewer_name: reviewerName,
      reviewer_avatar: userData?.avatar_url || userData?.avatar || null,
      rating: Number(savedRow.rating),
      comment: String(savedRow.review_text ?? ''),
      is_verified_purchase: Boolean(savedRow.is_verified_purchase),
      admin_reply: savedRow.admin_reply ?? null,
      created_at: savedRow.created_at,
    };
  },
};