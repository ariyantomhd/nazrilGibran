// src/modules/affiliates/affiliate.controller.ts
import { Request, Response } from 'express';
import { affiliateService } from './affiliate.service';

export const affiliateController = {
  async apply(req: Request, res: Response): Promise<void> {
    try {
      const { affiliate_code, payout_account } = req.body;
      const data = await affiliateService.applyAffiliate(
        req.userId!,
        affiliate_code,
        payout_account
      );
      res.status(201).json({
        success: true,
        message: 'Affiliate application submitted and is pending admin approval.',
        data,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit affiliate application.';
      res.status(400).json({
        success: false,
        message,
      });
    }
  },

  async getMyDashboard(req: Request, res: Response): Promise<void> {
    try {
      const data = await affiliateService.getMyAffiliateDashboard(req.userId!);
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load affiliate dashboard.';
      res.status(400).json({
        success: false,
        message,
      });
    }
  },

  async trackAndGetUrl(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.body.productId || req.body.product_id;
      const userAffiliateId = req.body.userAffiliateId || req.body.affiliate_code;
      const data = await affiliateService.generateAndValidateProductLink(
        productId,
        userAffiliateId
      );
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate affiliate link.';
      res.status(400).json({
        success: false,
        message,
      });
    }
  },

  async trackClick(req: Request, res: Response): Promise<void> {
    try {
      const { ref } = req.body;
      const data = await affiliateService.trackReferralClick(ref);
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to track referral click.';
      res.status(400).json({
        success: false,
        message,
      });
    }
  },
};