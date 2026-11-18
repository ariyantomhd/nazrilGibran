// src/modules/products/product.route.ts
import { Router } from 'express';
import { productController } from './product.controller';
import { verifyAuth, optionalAuth } from '../../middlewares/auth.middleware';
import { interactionRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// === STATIC ENDPOINTS (harus di atas route dinamis) ===
router.get('/categories', productController.getCategories);
router.get('/featured', productController.getFeaturedProducts);
router.get('/popular', productController.getPopularProducts);
router.get('/deals', productController.getBestDeals);
router.get('/', productController.getProducts);

// === DYNAMIC ENDPOINTS ===
router.get('/:slug', productController.getProductBySlug);
router.get('/:id/galleries', productController.getProductGalleries);
router.get('/:id/check-purchase', optionalAuth, productController.checkProductPurchase);

// === LIKES ===
router.get('/:id/likes', optionalAuth, productController.getProductLikes);
router.post('/:id/like', verifyAuth, interactionRateLimiter, productController.toggleProductLike);

// === REVIEWS ===
router.get('/:id/reviews', productController.getProductReviews);
router.post(
  '/:id/reviews',
  verifyAuth,
  interactionRateLimiter,
  productController.submitProductReview
);

export default router;