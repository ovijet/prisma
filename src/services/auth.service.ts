import prisma from '../lib/prisma';
import { Role } from '@prisma/client';
import { transformUser } from '../types';

// ─── Register (Email/Password via Firebase) ───────────────────────────────────
export async function register(data: {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role?: string;
}) {
  const { uid, name, email, photoURL = '', role } = data;

  // Validate role
  const validRoles: Role[] = ['creator', 'supporter', 'admin'];
  const userRole: Role = validRoles.includes(role as Role)
    ? (role as Role)
    : 'supporter';

  // Check if user already exists (idempotent)
  const existing = await prisma.user.findFirst({
    where: { OR: [{ uid }, { email }] },
  });

  if (existing) {
    // Update and return existing
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { name, photoURL: photoURL || existing.photoURL },
    });
    return transformUser(updated);
  }

  const user = await prisma.user.create({
    data: { uid, name, email, photoURL, role: userRole },
  });

  return transformUser(user);
}

// ─── Google OAuth Upsert ──────────────────────────────────────────────────────
export async function googleUpsert(data: {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
}) {
  const { uid, name, email, photoURL = '' } = data;

  const user = await prisma.user.upsert({
    where: { uid },
    update: {
      name,
      photoURL: photoURL || undefined,
    },
    create: {
      uid,
      name,
      email,
      photoURL,
      role: 'supporter', // Google sign-in defaults to supporter
    },
  });

  return transformUser(user);
}
