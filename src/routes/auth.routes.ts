import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import * as authService from '../services/auth.service';

const router = Router();

/**
 * POST /api/auth/register
 * Body: { uid, name, email, photoURL?, role }
 */
router.post(
  '/register',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid, name, email, photoURL, role } = req.body;

    if (!uid || !name || !email) {
      res.status(400).json({ success: false, message: 'uid, name and email are required' });
      return;
    }

    const user = await authService.register({ uid, name, email, photoURL, role });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user,
    });
  })
);

/**
 * POST /api/auth/google
 * Body: { uid, name, email, photoURL? }
 */
router.post(
  '/google',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid, name, email, photoURL } = req.body;

    if (!uid || !name || !email) {
      res.status(400).json({ success: false, message: 'uid, name and email are required' });
      return;
    }

    const user = await authService.googleUpsert({ uid, name, email, photoURL });

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      user,
    });
  })
);

export default router;
