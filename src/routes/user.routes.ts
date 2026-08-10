import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requireAdmin } from '../middleware/auth';
import * as userService from '../services/user.service';

const router = Router();

/**
 * GET /api/users/me
 * Returns the currently authenticated user's profile
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await userService.getMe(req.user!.id);
    res.json({ success: true, message: 'User retrieved successfully', user });
  })
);

/**
 * GET /api/users
 * Admin: Get all users with pagination and search
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { page, limit, role, search } = req.query as Record<string, string>;
    const result = await userService.getAllUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      role,
      search,
    });
    res.json({ success: true, message: 'Users retrieved successfully', ...result });
  })
);

/**
 * GET /api/users/:id
 * Get a user by ID
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    res.json({ success: true, message: 'User retrieved successfully', user });
  })
);

/**
 * PUT /api/users/:id
 * Update a user (owner or admin)
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, photoURL, role } = req.body;
    const user = await userService.updateUser(
      req.params.id,
      req.user!.id,
      req.user!.role,
      { name, photoURL, role }
    );
    res.json({ success: true, message: 'User updated successfully', user });
  })
);

/**
 * DELETE /api/users/:id
 * Admin: Soft delete a user
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const user = await userService.softDeleteUser(req.params.id);
    res.json({ success: true, message: 'User deleted successfully', user });
  })
);

export default router;
