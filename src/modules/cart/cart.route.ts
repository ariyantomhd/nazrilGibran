// src/modules/cart/cart.route.ts
import { Router } from 'express';
import { cartController } from './cart.controller';
import { verifyAuth } from '../../middlewares/auth.middleware'; // Sesuaikan path jika pakai "middleware"

const router = Router();

router.get('/', verifyAuth, cartController.getCart);
router.post('/add', verifyAuth, cartController.addToCart);
router.delete('/clear', verifyAuth, cartController.clearCart); // Taruh /clear di atas /:itemId
router.put('/:itemId', verifyAuth, cartController.updateCartItem);
router.delete('/:itemId', verifyAuth, cartController.removeCartItem);

export default router;