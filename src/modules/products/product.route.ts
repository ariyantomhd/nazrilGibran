// src/modules/products/product.route.ts
import { Router } from 'express';
import { productController } from './product.controller';
import { verifyAuth, optionalAuth } from '../../middlewares/auth.middleware';

const router = Router();

// === STATIC ENDPOINTS MUST BE PLACED ABOVE DYNAMIC ROUTES ===
router.get('/categories', productController.getCategories);
router.get('/featured', productController.getFeaturedProducts);
router.get('/popular', productController.getPopularProducts);
router.get('/deals', productController.getBestDeals);
router.get('/', productController.getProducts);

// === DYNAMIC ENDPOINTS (:slug / :id) ===
router.get('/:slug', productController.getProductBySlug);
router.get('/:id/galleries', productController.getProductGalleries);

// === PRODUCT INTERACTIONS (LIKES & REVIEWS) ===
router.get('/:id/likes', optionalAuth, productController.getProductLikes);
router.post('/:id/like', verifyAuth, productController.toggleProductLike);
router.get('/:id/reviews', productController.getProductReviews);
router.post('/:id/reviews', verifyAuth, productController.submitProductReview);

export default router;