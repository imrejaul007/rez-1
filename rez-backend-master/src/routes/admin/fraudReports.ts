import { logger } from '../../config/logger';
// Admin Fraud Report Routes
// CRUD and management for fraud reports

import { Router, Request, Response } from 'express';
import mongoose, { Schema, Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

// ---------------------------------------------------------------------------
// Inline FraudReport model (avoids dependency on a separate model file)
// ---------------------------------------------------------------------------
const fraudReportSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: [
        'unauthorized_transaction',
        'account_takeover',
        'phishing',
        'fake_merchant',
        'counterfeit_product',
        'other',
      ],
      required: true,
    },
    description: { type: String, required: true },
    evidence: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['new', 'investigating', 'resolved', 'dismissed'],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    internalNotes: [
      {
        note: { type: String },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    resolution: { type: String },
  },
  { timestamps: true },
);

const FraudReport =
  mongoose.models.FraudReport ||
  mongoose.model('FraudReport', fraudReportSchema);

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const router = Router();

// All routes require authenticated admin
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET / — list fraud reports with pagination and filters
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    status,
    priority,
    category,
    dateFrom,
    dateTo,
  } = req.query;

  const query: any = {};

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;

  if (dateFrom || dateTo) {
    query.createdAt = {} as any;
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
    if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [reports, total] = await Promise.all([
    FraudReport.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'fullName phoneNumber')
      .populate('assignedTo', 'fullName')
      .lean(),
    FraudReport.countDocuments(query),
  ]);

  sendSuccess(res, {
    reports,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
}));

/**
 * GET /:id — fraud report detail with populated user info
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid report ID', 400);
  }

  const report = await FraudReport.findById(id)
    .populate('user', 'fullName phoneNumber email')
    .populate('assignedTo', 'fullName')
    .populate('internalNotes.addedBy', 'fullName')
    .lean();

  if (!report) {
    return sendError(res, 'Fraud report not found', 404);
  }

  sendSuccess(res, { report });
}));

/**
 * PUT /:id/status — update report status
 */
router.put('/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid report ID', 400);
  }

  const validStatuses = ['new', 'investigating', 'resolved', 'dismissed'];
  if (!status || !validStatuses.includes(status)) {
    return sendError(
      res,
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      400,
    );
  }

  const report = await FraudReport.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true, runValidators: true },
  )
    .populate('user', 'fullName phoneNumber')
    .populate('assignedTo', 'fullName')
    .lean();

  if (!report) {
    return sendError(res, 'Fraud report not found', 404);
  }

  sendSuccess(res, { report });
}));

/**
 * PUT /:id/priority — set report priority
 */
router.put('/:id/priority', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { priority } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid report ID', 400);
  }

  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (!priority || !validPriorities.includes(priority)) {
    return sendError(
      res,
      `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
      400,
    );
  }

  const report = await FraudReport.findByIdAndUpdate(
    id,
    { $set: { priority } },
    { new: true, runValidators: true },
  )
    .populate('user', 'fullName phoneNumber')
    .populate('assignedTo', 'fullName')
    .lean();

  if (!report) {
    return sendError(res, 'Fraud report not found', 404);
  }

  sendSuccess(res, { report });
}));

/**
 * POST /:id/notes — add an internal note
 */
router.post('/:id/notes', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { note } = req.body;
  const adminId = (req as any).userId;

  if (!Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid report ID', 400);
  }

  if (!note || (typeof note === 'string' && note.trim().length === 0)) {
    return sendError(res, 'Note is required', 400);
  }

  const report = await FraudReport.findByIdAndUpdate(
    id,
    {
      $push: {
        internalNotes: {
          note: note.trim(),
          addedBy: new Types.ObjectId(adminId),
          addedAt: new Date(),
        },
      },
    },
    { new: true, runValidators: true },
  )
    .populate('user', 'fullName phoneNumber')
    .populate('assignedTo', 'fullName')
    .populate('internalNotes.addedBy', 'fullName')
    .lean();

  if (!report) {
    return sendError(res, 'Fraud report not found', 404);
  }

  sendSuccess(res, { report });
}));

export default router;
