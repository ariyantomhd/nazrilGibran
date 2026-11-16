// src/modules/deals/deals.route.ts
import { Router } from 'express';
import { dealsController } from './deals.controller';

const router = Router();

// Public endpoint for the /deals page
router.get('/', dealsController.getDeals);

export default router;