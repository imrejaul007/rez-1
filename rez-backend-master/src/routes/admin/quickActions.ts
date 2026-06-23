import { logger } from '../../config/logger';
/**
 * Admin Routes - Quick Actions
 * CRUD endpoints for managing QuickAction model
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import QuickAction from '../../models/QuickAction';
import { sendSuccess, sendNotFound, sendBadRequest, sendCreated } from '../../utils/response';
import { sendError, sendPaginated } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// QUICK ACTION CRUD
// ============================================

/**
 * GET /api/admin/quick-actions
 * List all quick actions with pagination and search
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.search) {
      const search = escapeRegex((req.query.search as string).trim());
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
      ];
    }

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const [actions, total] = await Promise.all([
      QuickAction.find(filter)
        .sort({ priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      QuickAction.countDocuments(filter),
    ]);

    return sendPaginated(res, actions, page, limit, total, 'Quick actions fetched');
  }));

/**
 * GET /api/admin/quick-actions/:id
 * Get single quick action
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const action = await QuickAction.findById(req.params.id).lean();
    if (!action) {
      return sendNotFound(res, 'Quick action not found');
    }
    return sendSuccess(res, action, 'Quick action fetched');
  }));

/**
 * PUT /api/admin/quick-actions/reorder
 * Batch reorder quick actions by providing ordered IDs
 * NOTE: Must be defined before /:id routes to avoid "reorder" being treated as an :id param
 */
router.put('/reorder', asyncHandler(async (req: Request, res: Response) => {
    const { orderedIds } = req.body;

    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return sendBadRequest(res, 'orderedIds must be a non-empty array of quick action IDs');
    }

    const bulkOps = orderedIds.map((id: string, index: number) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { priority: index } },
      },
    }));

    const result = await QuickAction.bulkWrite(bulkOps);

    return sendSuccess(res, {
      modifiedCount: result.modifiedCount,
      totalOrdered: orderedIds.length,
    }, `Reordered ${result.modifiedCount} quick actions`);
  }));

/**
 * POST /api/admin/quick-actions
 * Create a new quick action
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      slug, title, subtitle, icon, iconColor,
      deepLinkPath, targetAchievementTypes, priority,
      isActive, regions,
    } = req.body;

    if (!slug || !title || !subtitle || !icon || !deepLinkPath) {
      return sendBadRequest(res, 'slug, title, subtitle, icon, and deepLinkPath are required');
    }

    // Check slug uniqueness
    const existing = await QuickAction.findOne({ slug });
    if (existing) {
      return sendBadRequest(res, `Quick action with slug "${slug}" already exists`);
    }

    const action = await QuickAction.create({
      slug,
      title,
      subtitle,
      icon,
      iconColor,
      deepLinkPath,
      targetAchievementTypes: targetAchievementTypes || [],
      priority: priority || 0,
      isActive: isActive !== undefined ? isActive : true,
      regions: regions || [],
      createdBy: (req as any).user?._id,
    });

    return sendCreated(res, action, 'Quick action created');
  } catch (error: any) {
    logger.error('[Admin] Error creating quick action:', error);
    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }
    if (error.code === 11000) {
      return sendBadRequest(res, 'Duplicate slug - quick action already exists');
    }
    return sendError(res, 'Failed to create quick action', 500);
  }
}));

/**
 * PUT /api/admin/quick-actions/:id
 * Update a quick action
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      slug, title, subtitle, icon, iconColor,
      deepLinkPath, targetAchievementTypes, priority,
      isActive, regions,
    } = req.body;

    const action = await QuickAction.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(slug !== undefined && { slug }),
          ...(title !== undefined && { title }),
          ...(subtitle !== undefined && { subtitle }),
          ...(icon !== undefined && { icon }),
          ...(iconColor !== undefined && { iconColor }),
          ...(deepLinkPath !== undefined && { deepLinkPath }),
          ...(targetAchievementTypes !== undefined && { targetAchievementTypes }),
          ...(priority !== undefined && { priority }),
          ...(isActive !== undefined && { isActive }),
          ...(regions !== undefined && { regions }),
        },
      },
      { new: true, runValidators: true }
    );

    if (!action) {
      return sendNotFound(res, 'Quick action not found');
    }

    return sendSuccess(res, action, 'Quick action updated');
  } catch (error: any) {
    logger.error('[Admin] Error updating quick action:', error);
    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }
    if (error.code === 11000) {
      return sendBadRequest(res, 'Duplicate slug - another quick action already uses this slug');
    }
    return sendError(res, 'Failed to update quick action', 500);
  }
}));

/**
 * DELETE /api/admin/quick-actions/:id
 * Delete a quick action
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const action = await QuickAction.findByIdAndDelete(req.params.id);
    if (!action) {
      return sendNotFound(res, 'Quick action not found');
    }
    return sendSuccess(res, null, 'Quick action deleted');
  }));

/**
 * PATCH /api/admin/quick-actions/:id/toggle
 * Toggle isActive state
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
    const action = await QuickAction.findById(req.params.id);
    if (!action) {
      return sendNotFound(res, 'Quick action not found');
    }

    action.isActive = !action.isActive;
    await action.save();

    return sendSuccess(res, action, `Quick action ${action.isActive ? 'activated' : 'deactivated'}`);
  }));

export default router;
