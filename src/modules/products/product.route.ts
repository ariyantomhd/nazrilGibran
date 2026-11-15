// src/modules/products/product.route.ts
import { Router } from 'express';
import { productController } from './product.controller';
import { verifyAuth, optionalAuth } from '../../middlewares/auth.middleware';

const router = Router();

// === ENDPOINT STATIS HARUS DI ATAS ===
router.get('/categories', productController.getCategories);
router.get('/featured', productController.getFeaturedProducts);
router.get('/popular', productController.getPopularProducts);
router.get('/deals', productController.getBestDeals);
router.get('/', productController.getProducts);

// === ENDPOINT DINAMIS (:slug / :id) HARUS DI BAWAH ===
router.get('/:slug', productController.getProductBySlug);
router.get('/:id/galleries', productController.getProductGalleries);

// === INTERAKSI PRODUK (LIKES & REVIEWS) ===
router.get('/:id/likes', optionalAuth, productController.getProductLikes);
router.post('/:id/like', verifyAuth, productController.toggleProductLike);
router.get('/:id/reviews', productController.getProductReviews);
router.post('/:id/reviews', verifyAuth, productController.submitProductReview);

export default router;