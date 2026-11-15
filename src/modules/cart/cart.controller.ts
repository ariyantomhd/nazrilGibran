// src/modules/cart/cart.controller.ts
import { Response } from 'express';
import { cartService } from './cart.service';
import { AuthenticatedRequest } from '../../types/auth';

const normalizeLicenseType = (rawLicense?: unknown): 'regular' | 'extended' => {
  if (typeof rawLicense === 'string' && rawLicense.trim().toLowerCase() === 'extended') {
    return 'extended';
  }
  return 'regular';
};

export const cartController = {
  async getCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await cartService.getCart(req.userId!);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async addToCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { productId, quantity = 1, withSupport = false, license_type, license } = (req as any).body;
      const normalizedLicense = normalizeLicenseType(license_type ?? license);

      const data = await cartService.addToCart(
        req.userId!,
        productId,
        Number(quantity),
        Boolean(withSupport),
        normalizedLicense
      );
      res.status(200).json({ success: true, message: 'Item ditambahkan ke keranjang', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async updateCartItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const itemId = (req as any).params.itemId as string;
      const { quantity, withSupport, license_type, license } = (req as any).body;
      const rawLicense = license_type ?? license;
      const normalizedLicense = rawLicense !== undefined ? normalizeLicenseType(rawLicense) : undefined;

      const data = await cartService.updateCartItem(
        req.userId!,
        itemId,
        Number(quantity),
        withSupport,
        normalizedLicense
      );
      res.status(200).json({ success: true, message: 'Keranjang diperbarui', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async removeCartItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const itemId = (req as any).params.itemId as string;
      const data = await cartService.removeCartItem(req.userId!, itemId);
      res.status(200).json({ success: true, message: 'Item dihapus dari keranjang', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async clearCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await cartService.clearCart(req.userId!);
      res.status(200).json({ success: true, message: 'Keranjang dikosongkan', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};