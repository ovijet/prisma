import prisma from '../lib/prisma';
import { serializeId, serializeMany } from '../types';
import { createError } from '../middleware/errorHandler';

// ─── Get All Categories ───────────────────────────────────────────────────────
export async function getAllCategories() {
  const categories = await prisma.category.findMany({
    where: { isDeleted: false },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { campaigns: { where: { isDeleted: false, status: 'active' } } } },
    },
  });

  return categories.map((c) => ({
    ...serializeId(c),
    campaignCount: c._count.campaigns,
  }));
}

// ─── Get Category By ID ───────────────────────────────────────────────────────
export async function getCategoryById(id: string) {
  const category = await prisma.category.findFirst({
    where: { id, isDeleted: false },
    include: {
      _count: { select: { campaigns: { where: { isDeleted: false, status: 'active' } } } },
    },
  });

  if (!category) throw createError('Category not found', 404);

  return { ...serializeId(category), campaignCount: category._count.campaigns };
}

// ─── Create Category (Admin) ──────────────────────────────────────────────────
export async function createCategory(data: {
  name: string;
  slug?: string;
  iconName?: string;
  color?: string;
  description?: string;
}) {
  const { name, slug, iconName, color, description } = data;

  const generatedSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Check uniqueness
  const existing = await prisma.category.findFirst({
    where: { OR: [{ name }, { slug: generatedSlug }], isDeleted: false },
  });

  if (existing) throw createError('Category with this name or slug already exists', 409);

  const category = await prisma.category.create({
    data: { name, slug: generatedSlug, iconName, color, description },
  });

  return serializeId(category);
}

// ─── Update Category (Admin) ──────────────────────────────────────────────────
export async function updateCategory(
  id: string,
  data: { name?: string; iconName?: string; color?: string; description?: string }
) {
  const existing = await prisma.category.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw createError('Category not found', 404);

  const updated = await prisma.category.update({ where: { id }, data });

  return serializeId(updated);
}

// ─── Soft Delete Category (Admin) ─────────────────────────────────────────────
export async function softDeleteCategory(id: string) {
  const existing = await prisma.category.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw createError('Category not found', 404);

  const deleted = await prisma.category.update({
    where: { id },
    data: { isDeleted: true },
  });

  return serializeId(deleted);
}
