// src/modules/cart/cart.route.ts
import { Router } from 'express';
import { cartController } from './cart.controller';
import { verifyAuth } from '../../middlewares/auth.middleware';
import { actionRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.get('/', verifyAuth, cartController.getCart);
router.post('/add', verifyAuth, actionRateLimiter, cartController.addToCart);
router.delete('/clear', verifyAuth, actionRateLimiter, cartController.clearCart); // Place /clear above /:itemId
router.put('/:itemId', verifyAuth, actionRateLimiter, cartController.updateCartItem);
router.delete('/:itemId', verifyAuth, actionRateLimiter, cartController.removeCartItem);

export default router;