// src/modules/products/product.service.ts
import { productRepo } from './product.repo';
import { ProductQueryParams } from '../../types/product';

export const productService = {
  async getProducts(params: ProductQueryParams) {
    return await productRepo.getProducts(params);
  },

  // 3 Special Endpoints for Landing Page
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
      throw new Error('Invalid product slug');
    }
    return await productRepo.getProductBySlug(slug);
  },

  async getProductGalleries(productId: string) {
    if (!productId) throw new Error('Invalid product ID');
    return await productRepo.getProductGalleries(productId);
  },

  async getCategories() {
    return await productRepo.getCategories();
  },

  // --- LIKES / WISHLIST ---
  async getProductLikes(productId: string, userId?: string) {
    if (!productId) throw new Error('Invalid product ID');
    return await productRepo.getProductLikes(productId, userId);
  },

  async toggleProductLike(productId: string, userId: string) {
    if (!productId) throw new Error('Invalid product ID');
    if (!userId) throw new Error('Please sign in to like this product');
    return await productRepo.toggleProductLike(productId, userId);
  },

  // --- REVIEWS & RATINGS ---
  async getProductReviews(productId: string) {
    if (!productId) throw new Error('Invalid product ID');
    return await productRepo.getProductReviews(productId);
  },

  async submitProductReview(productId: string, userId: string, rating: number, comment: string) {
    if (!productId) throw new Error('Invalid product ID');
    if (!userId) throw new Error('Please sign in to submit a review');

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new Error('Rating must be a whole number between 1 and 5');
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 3) {
      throw new Error('Review comment must be at least 3 characters long');
    }

    return await productRepo.submitProductReview(productId, userId, parsedRating, comment);
  },
};