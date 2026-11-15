// src/modules/deals/deals.controller.ts
import { Request, Response } from 'express';
import { dealsService } from './deals.service';
import { DealQueryFilters } from './deals.repo';

export const dealsController = {
  async getDeals(req: Request, res: Response): Promise<void> {
    try {
      const { category, flash_sale_only, max_price, tech, search, sort } = req.query;

      const parsedTech =
        typeof tech === 'string' && tech.trim() !== ''
          ? tech.split(',').map((item) => item.trim())
          : undefined;

      const allowedSorts: Array<DealQueryFilters['sortBy']> = [
        'lowest',
        'highest',
        'newest',
        'discount',
      ];
      const normalizedSort = allowedSorts.includes(sort as DealQueryFilters['sortBy'])
        ? (sort as DealQueryFilters['sortBy'])
        : 'lowest';

      const filters: DealQueryFilters = {
        category: typeof category === 'string' ? category : undefined,
        flashSaleOnly: flash_sale_only === 'true',
        maxPrice:
          typeof max_price === 'string' && !Number.isNaN(Number(max_price))
            ? Number(max_price)
            : undefined,
        tech: parsedTech,
        search: typeof search === 'string' ? search : undefined,
        sortBy: normalizedSort,
      };

      const result = await dealsService.listDeals(filters);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat daftar deals.';
      res.status(500).json({
        success: false,
        message,
      });
    }
  },
};