import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requireAdmin, requireCreator } from '../middleware/auth';
import * as campaignService from '../services/campaign.service';

const router = Router();

/**
 * GET /api/campaigns/top-funded
 * Public: Get top funded campaigns (for homepage)
 */
router.get(
  '/top-funded',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
    const campaigns = await campaignService.getTopFundedCampaigns(limit);
    res.json({ success: true, message: 'Top campaigns retrieved successfully', campaigns });
  })
);

/**
 * GET /api/campaigns/creator-stats
 * Creator: Get own campaign statistics (total, active, raised)
 */
router.get(
  '/creator-stats',
  authenticate,
  requireCreator,
  asyncHandler(async (req, res) => {
    const stats = await campaignService.getCreatorStats(req.user!.id);
    // NOTE: Stats are spread at top-level so frontend can access stats.total, stats.active, stats.raised
    res.json({ success: true, ...stats });
  })
);

/**
 * GET /api/campaigns/my
 * Creator: Get creator's own campaigns
 */
router.get(
  '/my',
  authenticate,
  requireCreator,
  asyncHandler(async (req, res) => {
    const campaigns = await campaignService.getCreatorCampaigns(req.user!.id);
    res.json({ success: true, message: 'Your campaigns retrieved successfully', campaigns });
  })
);

/**
 * GET /api/campaigns
 * Public: Get all campaigns (paginated, filterable)
 * Query: page, limit, category, status, search
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, category, status, search } = req.query as Record<string, string>;
    const result = await campaignService.getAllCampaigns({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 12,
      category,
      status,
      search,
    });
    res.json({ success: true, message: 'Campaigns retrieved successfully', ...result });
  })
);

/**
 * GET /api/campaigns/:id
 * Public: Get a single campaign by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const campaign = await campaignService.getCampaignById(req.params.id);
    res.json({ success: true, message: 'Campaign retrieved successfully', campaign });
  })
);

/**
 * POST /api/campaigns
 * Creator: Create a new campaign
 */
router.post(
  '/',
  authenticate,
  requireCreator,
  asyncHandler(async (req, res) => {
    const campaign = await campaignService.createCampaign(req.user!.id, req.body);
    res.status(201).json({ success: true, message: 'Campaign submitted for review', campaign });
  })
);

/**
 * PUT /api/campaigns/:id
 * Creator/Admin: Update a campaign
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const campaign = await campaignService.updateCampaign(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body
    );
    res.json({ success: true, message: 'Campaign updated successfully', campaign });
  })
);

/**
 * PATCH /api/campaigns/:id/status
 * Admin: Approve / reject / complete a campaign
 * Body: { status: 'active' | 'rejected' | 'completed' | 'cancelled' }
 */
router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, message: 'status is required' });
      return;
    }
    const campaign = await campaignService.updateCampaignStatus(
      req.params.id,
      status,
      req.user!.id
    );
    res.json({ success: true, message: `Campaign ${status} successfully`, campaign });
  })
);

/**
 * DELETE /api/campaigns/:id
 * Creator/Admin: Soft delete a campaign
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const campaign = await campaignService.softDeleteCampaign(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, message: 'Campaign deleted successfully', campaign });
  })
);

export default router;
