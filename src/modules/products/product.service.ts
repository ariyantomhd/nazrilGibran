// src/modules/products/product.service.ts
import { productRepo } from './product.repo';
import { ProductQueryParams } from '../../types/product';

export const productService = {
  async getProducts(params: ProductQueryParams) {
    return await productRepo.getProducts(params);
  },

  // 3 Endpoint Khusus Landing Page
  async getFeaturedProducts() {
    return await productRepo.getProducts({ is_featured: true, limit: 4 });
  },

  async getPopularProducts() {
    return await productRepo.getProducts({ is_popular: true, limit: 6 });
  },

  async getBestDeals() {
    return await productRepo.getProducts({ is_flash_sale: true, sort: 'latest', limit: 6 });
  },

  async getProductBySlug(slug: string) {
    if (!slug || typeof slug !== 'string') {
      throw new Error('Slug produk tidak valid');
    }
    return await productRepo.getProductBySlug(slug);
  },

  async getProductGalleries(productId: string) {
    if (!productId) throw new Error('ID Produk tidak valid');
    return await productRepo.getProductGalleries(productId);
  },

  async getCategories() {
    return await productRepo.getCategories();
  },

  // --- LIKES / WISHLIST ---
  async getProductLikes(productId: string, userId?: string) {
    if (!productId) throw new Error('ID Produk tidak valid');
    return await productRepo.getProductLikes(productId, userId);
  },

  async toggleProductLike(productId: string, userId: string) {
    if (!productId) throw new Error('ID Produk tidak valid');
    if (!userId) throw new Error('Silakan login untuk menyukai produk');
    return await productRepo.toggleProductLike(productId, userId);
  },

  // --- REVIEWS & RATINGS ---
  async getProductReviews(productId: string) {
    if (!productId) throw new Error('ID Produk tidak valid');
    return await productRepo.getProductReviews(productId);
  },

  async submitProductReview(productId: string, userId: string, rating: number, comment: string) {
    if (!productId) throw new Error('ID Produk tidak valid');
    if (!userId) throw new Error('Silakan login untuk memberikan ulasan');

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new Error('Rating harus berupa angka bulat antara 1 sampai 5');
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 3) {
      throw new Error('Komentar ulasan minimal 3 karakter');
    }

    return await productRepo.submitProductReview(productId, userId, parsedRating, comment);
  },
};