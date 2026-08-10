import { Role } from '@prisma/client';

// ─── Response Helpers ─────────────────────────────────────────────────────────

/** Transform Prisma object: add _id alias for frontend compatibility */
export function serializeId<T extends { id: string }>(obj: T): T & { _id: string } {
  return { ...obj, _id: obj.id };
}

export function serializeMany<T extends { id: string }>(
  arr: T[]
): (T & { _id: string })[] {
  return arr.map(serializeId);
}

// ─── Campaign Response Shape (matches frontend field names) ───────────────────
export function transformCampaign(c: {
  id: string;
  title: string;
  story: string;
  imageUrl: string | null;
  rewardInfo: string | null;
  fundingGoal: number;
  amountRaised: number;
  minContribution: number;
  deadline: Date;
  status: string;
  creatorName: string;
  creatorEmail: string;
  creatorId: string;
  categoryId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: { name: string } | null;
}) {
  return {
    _id: c.id,
    id: c.id,
    campaign_title: c.title,
    campaign_story: c.story,
    campaign_image_url: c.imageUrl,
    reward_info: c.rewardInfo,
    funding_goal: c.fundingGoal,
    amount_raised: c.amountRaised,
    minimum_contribution: c.minContribution,
    deadline: c.deadline,
    status: c.status,
    creator_name: c.creatorName,
    creator_email: c.creatorEmail,
    creatorId: c.creatorId,
    categoryId: c.categoryId,
    category: c.category?.name ?? null,
    isDeleted: c.isDeleted,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// ─── Contribution Response Shape ──────────────────────────────────────────────
export function transformContribution(c: {
  id: string;
  amount: number;
  message: string | null;
  status: string;
  campaignId: string;
  supporterId: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  supporter?: { name: string; email: string; photoURL?: string | null } | null;
  campaign?: { title: string } | null;
}) {
  return {
    _id: c.id,
    id: c.id,
    contribution_amount: c.amount,
    message: c.message,
    status: c.status,
    current_date: c.createdAt,
    campaignId: c.campaignId,
    supporterId: c.supporterId,
    supporter_name: c.supporter?.name ?? '',
    supporter_email: c.supporter?.email ?? '',
    supporter_photo: c.supporter?.photoURL ?? null,
    campaign_title: c.campaign?.title ?? '',
    isDeleted: c.isDeleted,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// ─── User Response Shape ──────────────────────────────────────────────────────
export function transformUser(u: {
  id: string;
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  role: Role;
  credits: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: u.id,
    id: u.id,
    uid: u.uid,
    name: u.name,
    email: u.email,
    photoURL: u.photoURL,
    role: u.role,
    credits: u.credits,
    isDeleted: u.isDeleted,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

// ─── Notification Response Shape ──────────────────────────────────────────────
export function transformNotification(n: {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  userId: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: n.id,
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    read: n.read,
    userId: n.userId,
    isDeleted: n.isDeleted,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}
