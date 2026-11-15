// src/modules/deals/deals.service.ts
import { dealsRepo, DealQueryFilters } from './deals.repo';

export const dealsService = {
  async listDeals(filters: DealQueryFilters) {
    return await dealsRepo.getActiveDeals(filters);
  },
};