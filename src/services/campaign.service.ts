import prisma from '../lib/prisma';
import { transformCampaign } from '../types';
import { createError } from '../middleware/errorHandler';
import { createNotification } from './notification.service';

// ─── Get All Campaigns ────────────────────────────────────────────────────────
export async function getAllCampaigns(query: {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
  search?: string;
}) {
  const { page = 1, limit = 12, category, status = 'active', search } = query;
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };

  // Public API only shows active campaigns by default
  if (status) where.status = status;

  if (category) {
    where.category = { name: { contains: category, mode: 'insensitive' } };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { story: { contains: search, mode: 'insensitive' } },
      { creatorName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [campaigns, total] = await prisma.$transaction([
    prisma.campaign.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { name: true } } },
    }),
    prisma.campaign.count({ where }),
  ]);

  return {
    campaigns: campaigns.map(transformCampaign),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

// ─── Get Top Funded Campaigns ─────────────────────────────────────────────────
export async function getTopFundedCampaigns(limit = 6) {
  const campaigns = await prisma.campaign.findMany({
    where: { isDeleted: false, status: 'active' },
    orderBy: { amountRaised: 'desc' },
    take: limit,
    include: { category: { select: { name: true } } },
  });

  return campaigns.map(transformCampaign);
}

// ─── Get Campaign By ID ───────────────────────────────────────────────────────
export async function getCampaignById(id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, isDeleted: false },
    include: {
      category: { select: { name: true } },
      _count: { select: { contributions: { where: { status: 'approved', isDeleted: false } } } },
    },
  });

  if (!campaign) throw createError('Campaign not found', 404);

  return {
    ...transformCampaign(campaign),
    backerCount: campaign._count.contributions,
  };
}

// ─── Get Creator Stats ────────────────────────────────────────────────────────
export async function getCreatorStats(creatorId: string) {
  const [campaigns, raisedResult] = await prisma.$transaction([
    prisma.campaign.findMany({
      where: { creatorId, isDeleted: false },
      select: { status: true, amountRaised: true },
    }),
    prisma.campaign.aggregate({
      where: { creatorId, isDeleted: false },
      _sum: { amountRaised: true },
    }),
  ]);

  const total = campaigns.length;
  const active = campaigns.filter((c) => c.status === 'active').length;
  const raised = raisedResult._sum.amountRaised || 0;

  return { total, active, raised };
}

// ─── Get Creator Campaigns ─────────────────────────────────────────────────────
export async function getCreatorCampaigns(creatorId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { creatorId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { name: true } } },
  });

  return campaigns.map(transformCampaign);
}

// ─── Create Campaign ──────────────────────────────────────────────────────────
export async function createCampaign(
  creatorId: string,
  data: {
    campaign_title: string;
    campaign_story: string;
    category: string;
    funding_goal: number;
    minimum_contribution: number;
    deadline: string;
    reward_info?: string;
    campaign_image_url?: string;
    creator_name: string;
    creator_email: string;
  }
) {
  const {
    campaign_title,
    campaign_story,
    category,
    funding_goal,
    minimum_contribution,
    deadline,
    reward_info,
    campaign_image_url,
    creator_name,
    creator_email,
  } = data;

  // Validate
  if (funding_goal <= 0) throw createError('Funding goal must be positive', 400);
  if (minimum_contribution <= 0) throw createError('Minimum contribution must be positive', 400);
  if (new Date(deadline) <= new Date()) throw createError('Deadline must be in the future', 400);

  // Find category
  const cat = await prisma.category.findFirst({
    where: { name: { equals: category, mode: 'insensitive' }, isDeleted: false },
  });

  const campaign = await prisma.campaign.create({
    data: {
      title: campaign_title,
      story: campaign_story,
      fundingGoal: funding_goal,
      minContribution: minimum_contribution,
      deadline: new Date(deadline),
      rewardInfo: reward_info,
      imageUrl: campaign_image_url,
      creatorName: creator_name,
      creatorEmail: creator_email,
      creatorId,
      categoryId: cat?.id,
      status: 'pending',
    },
    include: { category: { select: { name: true } } },
  });

  return transformCampaign(campaign);
}

// ─── Update Campaign ──────────────────────────────────────────────────────────
export async function updateCampaign(
  id: string,
  requesterId: string,
  requesterRole: string,
  data: Partial<{
    campaign_title: string;
    campaign_story: string;
    funding_goal: number;
    minimum_contribution: number;
    deadline: string;
    reward_info: string;
    campaign_image_url: string;
  }>
) {
  const campaign = await prisma.campaign.findFirst({ where: { id, isDeleted: false } });
  if (!campaign) throw createError('Campaign not found', 404);

  // Only creator or admin can update
  if (campaign.creatorId !== requesterId && requesterRole !== 'admin') {
    throw createError('Access denied', 403);
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      ...(data.campaign_title && { title: data.campaign_title }),
      ...(data.campaign_story && { story: data.campaign_story }),
      ...(data.funding_goal && { fundingGoal: data.funding_goal }),
      ...(data.minimum_contribution && { minContribution: data.minimum_contribution }),
      ...(data.deadline && { deadline: new Date(data.deadline) }),
      ...(data.reward_info !== undefined && { rewardInfo: data.reward_info }),
      ...(data.campaign_image_url !== undefined && { imageUrl: data.campaign_image_url }),
    },
    include: { category: { select: { name: true } } },
  });

  return transformCampaign(updated);
}

// ─── Update Campaign Status (Admin) ──────────────────────────────────────────
export async function updateCampaignStatus(
  id: string,
  status: string,
  adminId: string
) {
  const validStatuses = ['active', 'rejected', 'completed', 'cancelled', 'pending'];
  if (!validStatuses.includes(status)) {
    throw createError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const campaign = await prisma.campaign.findFirst({ where: { id, isDeleted: false } });
  if (!campaign) throw createError('Campaign not found', 404);

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: status as any },
    include: { category: { select: { name: true } } },
  });

  // Notify campaign creator
  const notifTitle = status === 'active' ? '🎉 Campaign Approved!' : `Campaign ${status}`;
  const notifMessage =
    status === 'active'
      ? `Your campaign "${campaign.title}" has been approved and is now live!`
      : `Your campaign "${campaign.title}" has been ${status}.`;

  await createNotification({
    userId: campaign.creatorId,
    title: notifTitle,
    message: notifMessage,
    type: status === 'active' ? 'campaign_approved' : 'campaign_rejected',
  });

  return transformCampaign(updated);
}

// ─── Soft Delete Campaign ─────────────────────────────────────────────────────
export async function softDeleteCampaign(
  id: string,
  requesterId: string,
  requesterRole: string
) {
  const campaign = await prisma.campaign.findFirst({ where: { id, isDeleted: false } });
  if (!campaign) throw createError('Campaign not found', 404);

  if (campaign.creatorId !== requesterId && requesterRole !== 'admin') {
    throw createError('Access denied', 403);
  }

  const deleted = await prisma.campaign.update({
    where: { id },
    data: { isDeleted: true },
    include: { category: { select: { name: true } } },
  });

  return transformCampaign(deleted);
}
