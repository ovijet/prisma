import prisma from '../lib/prisma';
import { transformUser } from '../types';
import { createError } from '../middleware/errorHandler';

// ─── Get Current User ─────────────────────────────────────────────────────────
export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
  });

  if (!user) throw createError('User not found', 404);

  return transformUser(user);
}

// ─── Get All Users (Admin) ────────────────────────────────────────────────────
export async function getAllUsers(query: {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}) {
  const { page = 1, limit = 20, role, search } = query;
  const skip = (page - 1) * limit;

  const where = {
    isDeleted: false,
    ...(role && { role: role as any }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(transformUser),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

// ─── Get User By ID ───────────────────────────────────────────────────────────
export async function getUserById(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, isDeleted: false },
  });

  if (!user) throw createError('User not found', 404);

  return transformUser(user);
}

// ─── Update User ──────────────────────────────────────────────────────────────
export async function updateUser(
  id: string,
  requesterId: string,
  requesterRole: string,
  data: { name?: string; photoURL?: string; role?: string }
) {
  // Only owner or admin can update
  if (id !== requesterId && requesterRole !== 'admin') {
    throw createError('Access denied', 403);
  }

  const user = await prisma.user.findFirst({ where: { id, isDeleted: false } });
  if (!user) throw createError('User not found', 404);

  // Only admins can change roles
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.photoURL) updateData.photoURL = data.photoURL;
  if (data.role && requesterRole === 'admin') updateData.role = data.role;

  const updated = await prisma.user.update({ where: { id }, data: updateData });

  return transformUser(updated);
}

// ─── Soft Delete User (Admin) ─────────────────────────────────────────────────
export async function softDeleteUser(id: string) {
  const user = await prisma.user.findFirst({ where: { id, isDeleted: false } });
  if (!user) throw createError('User not found', 404);

  const deleted = await prisma.user.update({
    where: { id },
    data: { isDeleted: true },
  });

  return transformUser(deleted);
}

// ─── Update Credits ───────────────────────────────────────────────────────────
export async function adjustCredits(userId: string, amount: number) {
  const user = await prisma.user.findFirst({ where: { id: userId, isDeleted: false } });
  if (!user) throw createError('User not found', 404);

  if (user.credits + amount < 0) {
    throw createError('Insufficient credits', 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });

  return transformUser(updated);
}
