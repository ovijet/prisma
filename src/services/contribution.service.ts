import prisma from '../lib/prisma';
import { transformContribution } from '../types';
import { createError } from '../middleware/errorHandler';
import { createNotification } from './notification.service';

// ─── Make a Contribution ──────────────────────────────────────────────────────
export async function makeContribution(
  supporterId: string,
  data: { campaignId: string; amount: number; message?: string }
) {
  const { campaignId, amount, message } = data;

  if (amount <= 0) throw createError('Contribution amount must be positive', 400);

  const [campaign, supporter] = await Promise.all([
    prisma.campaign.findFirst({ where: { id: campaignId, isDeleted: false, status: 'active' } }),
    prisma.user.findFirst({ where: { id: supporterId, isDeleted: false } }),
  ]);

  if (!campaign) throw createError('Campaign not found or not active', 404);
  if (!supporter) throw createError('Supporter not found', 404);
  if (amount < campaign.minContribution) {
    throw createError(`Minimum contribution is ${campaign.minContribution} credits`, 400);
  }
  if (supporter.credits < amount) {
    throw createError('Insufficient credits', 400);
  }

  // Deduct credits from supporter immediately (hold in escrow)
  const contribution = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: supporterId },
      data: { credits: { decrement: amount } },
    });

    const contrib = await tx.contribution.create({
      data: { campaignId, supporterId, amount, message, status: 'pending' },
      include: {
        supporter: { select: { name: true, email: true, photoURL: true } },
        campaign: { select: { title: true } },
      },
    });

    return contrib;
  });

  // Notify campaign creator
  await createNotification({
    userId: campaign.creatorId,
    title: '💰 New Contribution Received!',
    message: `${supporter.name} contributed ${amount} credits to "${campaign.title}". Review and approve it.`,
    type: 'contribution_received',
  });

  return transformContribution(contribution);
}

// ─── Get My Contributions (Supporter) ────────────────────────────────────────
export async function getMyContributions(supporterId: string) {
  const contributions = await prisma.contribution.findMany({
    where: { supporterId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    include: {
      supporter: { select: { name: true, email: true, photoURL: true } },
      campaign: { select: { title: true } },
    },
  });

  return contributions.map(transformContribution);
}

// ─── Get Pending Contributions for Creator ────────────────────────────────────
export async function getPendingContributions(creatorId: string) {
  // Get all campaigns by this creator
  const contributions = await prisma.contribution.findMany({
    where: {
      isDeleted: false,
      status: 'pending',
      campaign: { creatorId, isDeleted: false },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      supporter: { select: { name: true, email: true, photoURL: true } },
      campaign: { select: { title: true } },
    },
  });

  return contributions.map(transformContribution);
}

// ─── Approve Contribution (Creator) ──────────────────────────────────────────
export async function approveContribution(id: string, creatorId: string) {
  const contribution = await prisma.contribution.findFirst({
    where: { id, isDeleted: false, status: 'pending' },
    include: { campaign: true, supporter: true },
  });

  if (!contribution) throw createError('Contribution not found or already processed', 404);

  // Verify requester is the campaign creator
  if (contribution.campaign.creatorId !== creatorId) {
    throw createError('Access denied', 403);
  }

  // Approve: add credits to campaign creator, update campaign amountRaised
  const updated = await prisma.$transaction(async (tx) => {
    // Add credits to creator
    await tx.user.update({
      where: { id: creatorId },
      data: { credits: { increment: contribution.amount } },
    });

    // Update campaign raised amount
    await tx.campaign.update({
      where: { id: contribution.campaignId },
      data: { amountRaised: { increment: contribution.amount } },
    });

    // Update contribution status
    const contrib = await tx.contribution.update({
      where: { id },
      data: { status: 'approved' },
      include: {
        supporter: { select: { name: true, email: true, photoURL: true } },
        campaign: { select: { title: true } },
      },
    });

    return contrib;
  });

  // Notify supporter
  await createNotification({
    userId: contribution.supporterId,
    title: '✅ Contribution Approved!',
    message: `Your contribution of ${contribution.amount} credits to "${contribution.campaign.title}" was approved!`,
    type: 'contribution_approved',
  });

  return transformContribution(updated);
}

// ─── Reject Contribution (Creator — refunds credits) ─────────────────────────
export async function rejectContribution(id: string, creatorId: string) {
  const contribution = await prisma.contribution.findFirst({
    where: { id, isDeleted: false, status: 'pending' },
    include: { campaign: true, supporter: true },
  });

  if (!contribution) throw createError('Contribution not found or already processed', 404);

  if (contribution.campaign.creatorId !== creatorId) {
    throw createError('Access denied', 403);
  }

  // Refund: return credits to supporter
  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: contribution.supporterId },
      data: { credits: { increment: contribution.amount } },
    });

    const contrib = await tx.contribution.update({
      where: { id },
      data: { status: 'rejected' },
      include: {
        supporter: { select: { name: true, email: true, photoURL: true } },
        campaign: { select: { title: true } },
      },
    });

    return contrib;
  });

  // Notify supporter
  await createNotification({
    userId: contribution.supporterId,
    title: '❌ Contribution Rejected',
    message: `Your contribution of ${contribution.amount} credits to "${contribution.campaign.title}" was rejected and refunded.`,
    type: 'contribution_rejected',
  });

  return transformContribution(updated);
}

// ─── Get All Contributions (Admin) ────────────────────────────────────────────
export async function getAllContributions(query: { page?: number; limit?: number }) {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const [contributions, total] = await prisma.$transaction([
    prisma.contribution.findMany({
      where: { isDeleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        supporter: { select: { name: true, email: true, photoURL: true } },
        campaign: { select: { title: true } },
      },
    }),
    prisma.contribution.count({ where: { isDeleted: false } }),
  ]);

  return {
    contributions: contributions.map(transformContribution),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

// ─── Soft Delete Contribution (Admin) ─────────────────────────────────────────
export async function softDeleteContribution(id: string) {
  const contrib = await prisma.contribution.findFirst({ where: { id, isDeleted: false } });
  if (!contrib) throw createError('Contribution not found', 404);

  const deleted = await prisma.contribution.update({
    where: { id },
    data: { isDeleted: true },
    include: {
      supporter: { select: { name: true, email: true, photoURL: true } },
      campaign: { select: { title: true } },
    },
  });

  return transformContribution(deleted);
}
