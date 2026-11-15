// src/modules/cart/cart.service.ts
import { cartRepo, LicenseType } from './cart.repo';
import { Cart } from '../../types/cart';

export const cartService = {
  async getCart(userId: string): Promise<Cart> {
    let cart = await cartRepo.getCartByUserId(userId);
    if (!cart) {
      cart = await cartRepo.createCart(userId);
    }
    return cart;
  },

  async addToCart(
    userId: string,
    productId: string,
    quantity: number,
    withSupport: boolean,
    licenseType: LicenseType = 'regular'
  ): Promise<Cart> {
    if (!productId || quantity < 1) {
      throw new Error('Produk dan kuantitas tidak valid');
    }

    const cart = await this.getCart(userId);
    await cartRepo.upsertCartItem(cart.id, productId, quantity, withSupport, licenseType);
    return await this.getCart(userId);
  },

  async updateCartItem(
    userId: string,
    itemId: string,
    quantity: number,
    withSupport?: boolean,
    licenseType?: LicenseType
  ): Promise<Cart> {
    if (quantity < 1) {
      throw new Error('Kuantitas minimal adalah 1');
    }

    await cartRepo.updateCartItem(itemId, quantity, withSupport, licenseType);
    return await this.getCart(userId);
  },

  async removeCartItem(userId: string, itemId: string): Promise<Cart> {
    await cartRepo.removeCartItem(itemId);
    return await this.getCart(userId);
  },

  async clearCart(userId: string): Promise<Cart> {
    const cart = await cartRepo.getCartByUserId(userId);
    if (cart) {
      await cartRepo.clearCartItems(cart.id);
    }
    return await this.getCart(userId);
  }
};