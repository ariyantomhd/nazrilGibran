// src/modules/deals/deals.route.ts
import { Router } from 'express';
import { dealsController } from './deals.controller';

const router = Router();

// Endpoint publik untuk halaman /deals
router.get('/', dealsController.getDeals);

export default router;