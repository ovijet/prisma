import prisma from '../lib/prisma';
import { transformNotification } from '../types';
import { NotificationType } from '@prisma/client';
import { createError } from '../middleware/errorHandler';

// ─── Create Notification (Internal Use) ──────────────────────────────────────
export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type: string;
}) {
  const { userId, title, message, type } = data;

  const validTypes: NotificationType[] = [
    'campaign_approved',
    'campaign_rejected',
    'campaign_completed',
    'contribution_received',
    'contribution_approved',
    'contribution_rejected',
    'system',
  ];

  const notifType: NotificationType = validTypes.includes(type as NotificationType)
    ? (type as NotificationType)
    : 'system';

  try {
    const notification = await prisma.notification.create({
      data: { userId, title, message, type: notifType },
    });
    return transformNotification(notification);
  } catch (err) {
    // Silently fail — notifications should never break main flows
    console.error('Failed to create notification:', err);
    return null;
  }
}

// ─── Get Notifications for User ───────────────────────────────────────────────
export async function getUserNotifications(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 50, // Latest 50 notifications
  });

  return notifications.map(transformNotification);
}

// ─── Mark All Notifications as Read ──────────────────────────────────────────
export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false, isDeleted: false },
    data: { read: true },
  });

  return { message: 'All notifications marked as read' };
}

// ─── Mark Single Notification as Read ────────────────────────────────────────
export async function markOneRead(id: string, userId: string) {
  const notif = await prisma.notification.findFirst({
    where: { id, userId, isDeleted: false },
  });

  if (!notif) throw createError('Notification not found', 404);

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return transformNotification(updated);
}

// ─── Soft Delete Notification ─────────────────────────────────────────────────
export async function softDeleteNotification(id: string, userId: string) {
  const notif = await prisma.notification.findFirst({
    where: { id, userId, isDeleted: false },
  });

  if (!notif) throw createError('Notification not found', 404);

  const deleted = await prisma.notification.update({
    where: { id },
    data: { isDeleted: true },
  });

  return transformNotification(deleted);
}

// ─── Admin: Send System Notification to All Users ────────────────────────────
export async function broadcastNotification(data: {
  title: string;
  message: string;
}) {
  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title: data.title,
      message: data.message,
      type: 'system' as NotificationType,
    })),
  });

  return { sent: users.length };
}
