// src/modules/products/product.controller.ts
import { Request, Response } from 'express';
import { productService } from './product.service';
import { AppError } from '../../utils/app-error';

// ---------- Helpers ----------

interface HandlerResult {
  status?: number;
  body: Record<string, unknown>;
}

type ControllerHandler = (req: Request) => Promise<HandlerResult>;

/**
 * Membungkus handler agar try/catch dan format respons seragam:
 * - sukses  -> { success: true, ...body }
 * - AppError -> status sesuai error, pesan dikirim apa adanya
 * - error lain -> 500 dengan pesan generik (detail hanya di log server)
 */
const handle =
  (handler: ControllerHandler) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { status = 200, body } = await handler(req);
      res.status(status).json({ success: true, ...body });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error('[ProductController] Unexpected error:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  };

const ok = (data: unknown): HandlerResult => ({ body: { data } });

const getParam = (req: Request, name: string): string => req.params[name] as string;

// ---------- Controller ----------

export const productController = {
  // --- CATALOG ---
  getProducts: handle(async (req) => ok(await productService.getProducts(req.query))),

  getFeaturedProducts: handle(async () => ok(await productService.getFeaturedProducts())),

  getPopularProducts: handle(async () => ok(await productService.getPopularProducts())),

  getBestDeals: handle(async () => ok(await productService.getBestDeals())),

  getProductBySlug: handle(async (req) =>
    ok(await productService.getProductBySlug(getParam(req, 'slug')))
  ),

  getProductGalleries: handle(async (req) =>
    ok(await productService.getProductGalleries(getParam(req, 'id')))
  ),

  getCategories: handle(async () => ok(await productService.getCategories())),

  // --- PURCHASE VERIFICATION ---
  // Respons sengaja di-spread: { success, has_purchased }
  checkProductPurchase: handle(async (req) => {
    const result = await productService.checkPurchaseEligibility(getParam(req, 'id'), req.userId);
    return { body: { ...result } };
  }),

  // --- LIKES / WISHLIST ---
  getProductLikes: handle(async (req) =>
    ok(await productService.getProductLikes(getParam(req, 'id'), req.userId))
  ),

  toggleProductLike: handle(async (req) =>
    ok(await productService.toggleProductLike(getParam(req, 'id'), req.userId))
  ),

  // --- REVIEWS & RATINGS ---
  getProductReviews: handle(async (req) =>
    ok(await productService.getProductReviews(getParam(req, 'id')))
  ),

  submitProductReview: handle(async (req) => {
    const { rating, comment } = req.body ?? {};
    const data = await productService.submitProductReview(
      getParam(req, 'id'),
      req.userId,
      rating,
      comment
    );
    return {
      status: 201,
      body: { message: 'Verified review submitted successfully', data },
    };
  }),
};