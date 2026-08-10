import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requireAdmin } from '../middleware/auth';
import * as categoryService from '../services/category.service';

const router = Router();

/**
 * GET /api/categories
 * Public: Get all categories with campaign count
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await categoryService.getAllCategories();
    res.json({ success: true, message: 'Categories retrieved successfully', categories });
  })
);

/**
 * GET /api/categories/:id
 * Public: Get a single category by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const category = await categoryService.getCategoryById(req.params.id);
    res.json({ success: true, message: 'Category retrieved successfully', category });
  })
);

/**
 * POST /api/categories
 * Admin: Create a new category
 * Body: { name, slug?, iconName?, color?, description? }
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { name, slug, iconName, color, description } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Category name is required' });
      return;
    }

    const category = await categoryService.createCategory({ name, slug, iconName, color, description });
    res.status(201).json({ success: true, message: 'Category created successfully', category });
  })
);

/**
 * PUT /api/categories/:id
 * Admin: Update a category
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { name, iconName, color, description } = req.body;
    const category = await categoryService.updateCategory(req.params.id, {
      name, iconName, color, description,
    });
    res.json({ success: true, message: 'Category updated successfully', category });
  })
);

/**
 * DELETE /api/categories/:id
 * Admin: Soft delete a category
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const category = await categoryService.softDeleteCategory(req.params.id);
    res.json({ success: true, message: 'Category deleted successfully', category });
  })
);

export default router;
