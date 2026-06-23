import { logger } from '../../config/logger';
/**
 * Admin Routes - Notification Management
 * Template CRUD, send notifications, and stats
 */

import { Router, Request, Response } from 'express';
import mongoose, { Schema, Types, Document, Model } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { escapeRegex } from '../../utils/sanitize';
import {
  sendSuccess,
  sendError,
  sendCreated,
  sendNotFound,
  sendBadRequest,
  sendPaginated,
} from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

// ---------------------------------------------------------------------------
// NotificationTemplate model (inline – avoids creating a separate model file)
// ---------------------------------------------------------------------------

interface INotificationTemplate extends Document {
  title: string;
  body: string;
  channel: 'push' | 'email' | 'sms';
  category?: string;
  variables: string[];
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    channel: {
      type: String,
      enum: ['push', 'email', 'sms'],
      required: true,
    },
    category: { type: String },
    variables: [{ type: String }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Re-use existing model if it was already compiled (e.g. during hot-reload)
const NotificationTemplate: Model<INotificationTemplate> =
  (mongoose.models.NotificationTemplate as Model<INotificationTemplate>) ||
  mongoose.model<INotificationTemplate>('NotificationTemplate', NotificationTemplateSchema);

// ---------------------------------------------------------------------------
// Router setup
// ---------------------------------------------------------------------------

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// ---------------------------------------------------------------------------
// 1. GET /templates — list templates (paginated, filterable)
// ---------------------------------------------------------------------------

router.get('/templates', asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (req.query.channel) {
      filter.channel = req.query.channel;
    }
    if (req.query.category) {
      filter.category = { $regex: escapeRegex(req.query.category as string), $options: 'i' };
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const [templates, total] = await Promise.all([
      NotificationTemplate.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'fullName phoneNumber')
        .lean(),
      NotificationTemplate.countDocuments(filter),
    ]);

    return sendPaginated(res, templates, page, limit, total, 'Templates fetched');
  }));

// ---------------------------------------------------------------------------
// 2. POST /templates — create template
// ---------------------------------------------------------------------------

router.post('/templates', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { title, body, channel, category, variables } = req.body;

    if (!title || !body || !channel) {
      return sendBadRequest(res, 'title, body, and channel are required');
    }

    if (!['push', 'email', 'sms'].includes(channel)) {
      return sendBadRequest(res, 'channel must be one of: push, email, sms');
    }

    const template = await NotificationTemplate.create({
      title,
      body,
      channel,
      category: category || undefined,
      variables: variables || [],
      createdBy: req.user?._id,
    });

    return sendCreated(res, template, 'Notification template created');
  } catch (error: any) {
    logger.error('[Admin] Error creating notification template:', error);
    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }
    return sendError(res, 'Failed to create template', 500);
  }
}));

// ---------------------------------------------------------------------------
// 3. PUT /templates/:id — update template
// ---------------------------------------------------------------------------

router.put('/templates/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendBadRequest(res, 'Invalid template ID');
    }

    const { title, body, channel, category, variables, isActive } = req.body;

    if (channel && !['push', 'email', 'sms'].includes(channel)) {
      return sendBadRequest(res, 'channel must be one of: push, email, sms');
    }

    const template = await NotificationTemplate.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(title !== undefined && { title }),
          ...(body !== undefined && { body }),
          ...(channel !== undefined && { channel }),
          ...(category !== undefined && { category }),
          ...(variables !== undefined && { variables }),
          ...(isActive !== undefined && { isActive }),
        },
      },
      { new: true, runValidators: true }
    );

    if (!template) {
      return sendNotFound(res, 'Template not found');
    }

    return sendSuccess(res, template, 'Template updated');
  } catch (error: any) {
    logger.error('[Admin] Error updating notification template:', error);
    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }
    return sendError(res, 'Failed to update template', 500);
  }
}));

// ---------------------------------------------------------------------------
// 4. DELETE /templates/:id — delete template
// ---------------------------------------------------------------------------

router.delete('/templates/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendBadRequest(res, 'Invalid template ID');
    }

    const template = await NotificationTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return sendNotFound(res, 'Template not found');
    }

    return sendSuccess(res, null, 'Template deleted');
  }));

// ---------------------------------------------------------------------------
// 5. POST /send — send notification (validate + log for now)
// ---------------------------------------------------------------------------

router.post('/send', asyncHandler(async (req: Request, res: Response) => {
    const { templateId, target, schedule } = req.body;

    // --- Validation ---
    if (!templateId || !Types.ObjectId.isValid(templateId)) {
      return sendBadRequest(res, 'A valid templateId is required');
    }

    if (!target || !target.type) {
      return sendBadRequest(res, 'target with a type field is required');
    }

    if (!['all', 'segment', 'user'].includes(target.type)) {
      return sendBadRequest(res, 'target.type must be one of: all, segment, user');
    }

    if (target.type === 'user' && !target.userId) {
      return sendBadRequest(res, 'target.userId is required when target.type is "user"');
    }

    if (target.type === 'segment' && !target.segment) {
      return sendBadRequest(res, 'target.segment is required when target.type is "segment"');
    }

    // Verify template exists
    const template = await NotificationTemplate.findById(templateId).lean();
    if (!template) {
      return sendNotFound(res, 'Notification template not found');
    }

    if (!template.isActive) {
      return sendBadRequest(res, 'Cannot send using an inactive template');
    }

    // Determine schedule
    const scheduledAt = schedule && schedule !== 'now' ? new Date(schedule) : new Date();
    const isImmediate = !schedule || schedule === 'now';

    if (!isImmediate && isNaN(scheduledAt.getTime())) {
      return sendBadRequest(res, 'schedule must be "now" or a valid ISO date string');
    }

    // Log the send request (actual delivery not yet implemented)
    logger.info('[Admin] Notification send request:', {
      templateId,
      templateTitle: template.title,
      channel: template.channel,
      target,
      scheduledAt: scheduledAt.toISOString(),
      immediate: isImmediate,
      requestedBy: req.userId,
    });

    return sendSuccess(
      res,
      {
        templateId,
        channel: template.channel,
        target,
        scheduledAt: scheduledAt.toISOString(),
        immediate: isImmediate,
        status: 'queued',
      },
      isImmediate
        ? 'Notification queued for immediate delivery'
        : `Notification scheduled for ${scheduledAt.toISOString()}`
    );
  }));

// ---------------------------------------------------------------------------
// 6. GET /stats — basic counts by channel and active status
// ---------------------------------------------------------------------------

router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
    const [byChannel, byStatus, total] = await Promise.all([
      NotificationTemplate.aggregate([
        { $group: { _id: '$channel', count: { $sum: 1 } } },
      ]),
      NotificationTemplate.aggregate([
        { $group: { _id: '$isActive', count: { $sum: 1 } } },
      ]),
      NotificationTemplate.countDocuments(),
    ]);

    // Transform aggregation results into friendlier objects
    const channelCounts: Record<string, number> = {};
    for (const entry of byChannel) {
      channelCounts[String(entry._id)] = entry.count;
    }

    let activeCount = 0;
    let inactiveCount = 0;
    for (const entry of byStatus) {
      if (entry._id === true) {
        activeCount = entry.count;
      } else {
        inactiveCount = entry.count;
      }
    }

    return sendSuccess(
      res,
      {
        total,
        byChannel: channelCounts,
        byStatus: { active: activeCount, inactive: inactiveCount },
      },
      'Notification stats fetched'
    );
  }));

export default router;
