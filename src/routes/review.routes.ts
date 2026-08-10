import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requireAdmin } from '../middleware/auth';
import * as reviewService from '../services/review.service';

const router = Router();

/**
 * GET /api/reviews
 * Public: Get all reviews for a campaign
 * Query: ?campaignId=xxx
 * Admin: Get all reviews if no campaignId provided
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { campaignId, page, limit } = req.query as Record<string, string>;

    if (campaignId) {
      const result = await reviewService.getCampaignReviews(campaignId);
      res.json({ success: true, message: 'Reviews retrieved successfully', ...result });
    } else {
      const result = await reviewService.getAllReviews({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      });
      res.json({ success: true, message: 'All reviews retrieved', ...result });
    }
  })
);

/**
 * GET /api/reviews/campaign/:campaignId
 * Public: Get reviews for a specific campaign
 */
router.get(
  '/campaign/:campaignId',
  asyncHandler(async (req, res) => {
    const result = await reviewService.getCampaignReviews(req.params.campaignId);
    res.json({ success: true, message: 'Reviews retrieved successfully', ...result });
  })
);

/**
 * POST /api/reviews
 * Authenticated: Post a review for a campaign
 * Body: { campaignId, rating, comment? }
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { campaignId, rating, comment } = req.body;

    if (!campaignId || !rating) {
      res.status(400).json({ success: false, message: 'campaignId and rating are required' });
      return;
    }

    const review = await reviewService.createReview(req.user!.id, {
      campaignId,
      rating: Number(rating),
      comment,
    });

    res.status(201).json({ success: true, message: 'Review posted successfully', review });
  })
);

/**
 * PUT /api/reviews/:id
 * Owner/Admin: Update a review
 * Body: { rating?, comment? }
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    const review = await reviewService.updateReview(
      req.params.id,
      req.user!.id,
      req.user!.role,
      { rating: rating ? Number(rating) : undefined, comment }
    );
    res.json({ success: true, message: 'Review updated successfully', review });
  })
);

/**
 * DELETE /api/reviews/:id
 * Owner/Admin: Soft delete a review
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const review = await reviewService.softDeleteReview(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, message: 'Review deleted successfully', review });
  })
);

export default router;
