import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requireAdmin } from '../middleware/auth';
import * as notificationService from '../services/notification.service';

const router = Router();

/**
 * GET /api/notifications
 * Authenticated: Get current user's notifications
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const notifications = await notificationService.getUserNotifications(req.user!.id);
    res.json({ success: true, message: 'Notifications retrieved', notifications });
  })
);

/**
 * PATCH /api/notifications/mark-read
 * Authenticated: Mark all notifications as read
 */
router.patch(
  '/mark-read',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await notificationService.markAllRead(req.user!.id);
    res.json({ success: true, ...result });
  })
);

/**
 * PATCH /api/notifications/:id/read
 * Authenticated: Mark a single notification as read
 */
router.patch(
  '/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const notification = await notificationService.markOneRead(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Notification marked as read', notification });
  })
);

/**
 * DELETE /api/notifications/:id
 * Authenticated: Soft delete a notification
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const notification = await notificationService.softDeleteNotification(
      req.params.id,
      req.user!.id
    );
    res.json({ success: true, message: 'Notification deleted', notification });
  })
);

/**
 * POST /api/notifications/broadcast
 * Admin: Send a system notification to all users
 * Body: { title, message }
 */
router.post(
  '/broadcast',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { title, message } = req.body;
    if (!title || !message) {
      res.status(400).json({ success: false, message: 'title and message are required' });
      return;
    }
    const result = await notificationService.broadcastNotification({ title, message });
    res.status(201).json({ success: true, message: `Sent to ${result.sent} users`, ...result });
  })
);

export default router;
