import prisma from '../lib/prisma';
import { serializeId } from '../types';
import { createError } from '../middleware/errorHandler';

// ─── Get Reviews for Campaign ─────────────────────────────────────────────────
export async function getCampaignReviews(campaignId: string) {
  const reviews = await prisma.review.findMany({
    where: { campaignId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { name: true, photoURL: true } },
    },
  });

  // Calculate average rating
  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  return {
    reviews: reviews.map((r) => ({
      ...serializeId(r),
      author_name: r.author.name,
      author_photo: r.author.photoURL,
    })),
    avgRating: Math.round(avg * 10) / 10,
    totalReviews: reviews.length,
  };
}

// ─── Get All Reviews (Admin) ──────────────────────────────────────────────────
export async function getAllReviews(query: { page?: number; limit?: number }) {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { isDeleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true, photoURL: true } },
        campaign: { select: { title: true } },
      },
    }),
    prisma.review.count({ where: { isDeleted: false } }),
  ]);

  return {
    reviews: reviews.map((r) => ({
      ...serializeId(r),
      author_name: r.author.name,
      author_photo: r.author.photoURL,
      campaign_title: r.campaign.title,
    })),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

// ─── Create Review ────────────────────────────────────────────────────────────
export async function createReview(
  authorId: string,
  data: { campaignId: string; rating: number; comment?: string }
) {
  const { campaignId, rating, comment } = data;

  if (rating < 1 || rating > 5) throw createError('Rating must be between 1 and 5', 400);

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, isDeleted: false },
  });
  if (!campaign) throw createError('Campaign not found', 404);

  // Check if user already reviewed this campaign
  const existing = await prisma.review.findFirst({
    where: { campaignId, authorId, isDeleted: false },
  });
  if (existing) throw createError('You have already reviewed this campaign', 409);

  const review = await prisma.review.create({
    data: { campaignId, authorId, rating, comment },
    include: { author: { select: { name: true, photoURL: true } } },
  });

  return {
    ...serializeId(review),
    author_name: review.author.name,
    author_photo: review.author.photoURL,
  };
}

// ─── Update Review ────────────────────────────────────────────────────────────
export async function updateReview(
  id: string,
  authorId: string,
  requesterRole: string,
  data: { rating?: number; comment?: string }
) {
  const review = await prisma.review.findFirst({ where: { id, isDeleted: false } });
  if (!review) throw createError('Review not found', 404);

  if (review.authorId !== authorId && requesterRole !== 'admin') {
    throw createError('Access denied', 403);
  }

  if (data.rating && (data.rating < 1 || data.rating > 5)) {
    throw createError('Rating must be between 1 and 5', 400);
  }

  const updated = await prisma.review.update({
    where: { id },
    data,
    include: { author: { select: { name: true, photoURL: true } } },
  });

  return {
    ...serializeId(updated),
    author_name: updated.author.name,
    author_photo: updated.author.photoURL,
  };
}

// ─── Soft Delete Review ───────────────────────────────────────────────────────
export async function softDeleteReview(
  id: string,
  authorId: string,
  requesterRole: string
) {
  const review = await prisma.review.findFirst({ where: { id, isDeleted: false } });
  if (!review) throw createError('Review not found', 404);

  if (review.authorId !== authorId && requesterRole !== 'admin') {
    throw createError('Access denied', 403);
  }

  const deleted = await prisma.review.update({
    where: { id },
    data: { isDeleted: true },
    include: { author: { select: { name: true, photoURL: true } } },
  });

  return {
    ...serializeId(deleted),
    author_name: deleted.author.name,
    author_photo: deleted.author.photoURL,
  };
}
