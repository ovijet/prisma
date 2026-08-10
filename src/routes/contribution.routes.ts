import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requireAdmin, requireCreator } from '../middleware/auth';
import * as contributionService from '../services/contribution.service';

const router = Router();

/**
 * GET /api/contributions/pending
 * Creator: Get pending contributions awaiting review
 */
router.get(
  '/pending',
  authenticate,
  requireCreator,
  asyncHandler(async (req, res) => {
    const contributions = await contributionService.getPendingContributions(req.user!.id);
    res.json({ success: true, message: 'Pending contributions retrieved', contributions });
  })
);

/**
 * GET /api/contributions/my
 * Supporter: Get own contribution history
 */
router.get(
  '/my',
  authenticate,
  asyncHandler(async (req, res) => {
    const contributions = await contributionService.getMyContributions(req.user!.id);
    res.json({ success: true, message: 'Your contributions retrieved', contributions });
  })
);

/**
 * GET /api/contributions
 * Admin: Get all contributions (paginated)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as Record<string, string>;
    const result = await contributionService.getAllContributions({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    res.json({ success: true, message: 'All contributions retrieved', ...result });
  })
);

/**
 * POST /api/contributions
 * Supporter: Make a contribution to a campaign
 * Body: { campaignId, amount, message? }
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { campaignId, amount, message } = req.body;

    if (!campaignId || !amount) {
      res.status(400).json({ success: false, message: 'campaignId and amount are required' });
      return;
    }

    const contribution = await contributionService.makeContribution(req.user!.id, {
      campaignId,
      amount: Number(amount),
      message,
    });

    res.status(201).json({ success: true, message: 'Contribution submitted successfully', contribution });
  })
);

/**
 * PATCH /api/contributions/:id/approve
 * Creator: Approve a pending contribution (credits transferred to creator)
 */
router.patch(
  '/:id/approve',
  authenticate,
  requireCreator,
  asyncHandler(async (req, res) => {
    const contribution = await contributionService.approveContribution(
      req.params.id,
      req.user!.id
    );
    res.json({ success: true, message: 'Contribution approved successfully', contribution });
  })
);

/**
 * PATCH /api/contributions/:id/reject
 * Creator: Reject a pending contribution (credits refunded to supporter)
 */
router.patch(
  '/:id/reject',
  authenticate,
  requireCreator,
  asyncHandler(async (req, res) => {
    const contribution = await contributionService.rejectContribution(
      req.params.id,
      req.user!.id
    );
    res.json({ success: true, message: 'Contribution rejected and credits refunded', contribution });
  })
);

/**
 * DELETE /api/contributions/:id
 * Admin: Soft delete a contribution
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const contribution = await contributionService.softDeleteContribution(req.params.id);
    res.json({ success: true, message: 'Contribution deleted successfully', contribution });
  })
);

export default router;
