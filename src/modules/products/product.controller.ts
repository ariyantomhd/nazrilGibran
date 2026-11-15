// src/modules/products/product.controller.ts
import { Request, Response } from 'express';
import { productService } from './product.service';
import { ProductQueryParams } from '../../types/product';

export const productController = {
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const queryParams = req.query as unknown as ProductQueryParams;
      const data = await productService.getProducts(queryParams);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getFeaturedProducts(req: Request, res: Response): Promise<void> {
    try {
      const data = await productService.getFeaturedProducts();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getPopularProducts(req: Request, res: Response): Promise<void> {
    try {
      const data = await productService.getPopularProducts();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getBestDeals(req: Request, res: Response): Promise<void> {
    try {
      const data = await productService.getBestDeals();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getProductBySlug(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug as string;
      const data = await productService.getProductBySlug(slug);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async getProductGalleries(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await productService.getProductGalleries(id);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const data = await productService.getCategories();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // --- LIKES / WISHLIST ---
  async getProductLikes(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await productService.getProductLikes(id, req.userId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async toggleProductLike(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await productService.toggleProductLike(id, req.userId as string);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // --- REVIEWS & RATINGS ---
  async getProductReviews(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await productService.getProductReviews(id);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async submitProductReview(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { rating, comment } = req.body;
      const data = await productService.submitProductReview(
        id,
        req.userId as string,
        rating,
        comment,
      );
      res.status(201).json({
        success: true,
        message: 'Ulasan berhasil disimpan',
        data,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};