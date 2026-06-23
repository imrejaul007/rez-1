import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AutomationRule } from '../models/AutomationRule';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Resolve the storeId for the authenticated merchant.
 * Returns null and sends an error response if the store cannot be resolved or access is denied.
 */
async function resolveStore(req: Request, res: Response, storeIdParam?: string): Promise<Types.ObjectId | null> {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return null;
  }

  const rawId = storeIdParam ?? (req.query.storeId as string | undefined);
  if (!rawId || !Types.ObjectId.isValid(rawId)) {
    sendError(res, 'Valid storeId is required', 400);
    return null;
  }

  const store = await Store.findById(rawId).select('merchantId').lean();
  if (!store) {
    sendNotFound(res, 'Store not found');
    return null;
  }

  if ((store as any).merchantId?.toString() !== userId) {
    sendError(res, 'Unauthorized: you do not own this store', 403);
    return null;
  }

  return new Types.ObjectId(rawId);
}

/**
 * GET /api/automation-rules?storeId=...
 * List all automation rules for a merchant's store.
 */
export const getRules = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await resolveStore(req, res);
  if (!storeId) return;

  const rules = await AutomationRule.find({ storeId }).sort({ createdAt: -1 }).lean();
  sendSuccess(res, { rules, total: rules.length }, 'Automation rules retrieved');
});

/**
 * GET /api/automation-rules/:id
 * Get a single automation rule by id.
 */
export const getRule = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid id', 400);
    return;
  }

  const rule = await AutomationRule.findById(id).lean();
  if (!rule) {
    sendNotFound(res, 'Automation rule not found');
    return;
  }

  // Verify ownership via store
  const store = await Store.findById(rule.storeId).select('merchantId').lean();
  if (!store || (store as any).merchantId?.toString() !== userId) {
    sendError(res, 'Unauthorized: you do not own this rule', 403);
    return;
  }

  sendSuccess(res, { rule }, 'Automation rule retrieved');
});

/**
 * POST /api/automation-rules
 * Create a new automation rule.
 */
export const createRule = asyncHandler(async (req: Request, res: Response) => {
  const { storeId: rawStoreId, name, status, trigger, action } = req.body;

  const storeId = await resolveStore(req, res, rawStoreId);
  if (!storeId) return;

  if (!name || !trigger?.type || !action?.type || !action?.config?.message) {
    sendError(res, 'name, trigger.type, action.type, and action.config.message are required', 400);
    return;
  }

  const rule = await AutomationRule.create({
    storeId,
    name,
    status: status ?? 'draft',
    trigger,
    action,
    stats: { sent: 0, opened: 0, converted: 0 },
  });

  sendCreated(res, rule, 'Automation rule created');
});

/**
 * PUT /api/automation-rules/:id
 * Update an existing automation rule.
 */
export const updateRule = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid id', 400);
    return;
  }

  const existing = await AutomationRule.findById(id);
  if (!existing) {
    sendNotFound(res, 'Automation rule not found');
    return;
  }

  const store = await Store.findById(existing.storeId).select('merchantId').lean();
  if (!store || (store as any).merchantId?.toString() !== userId) {
    sendError(res, 'Unauthorized: you do not own this rule', 403);
    return;
  }

  const { name, status, trigger, action } = req.body;

  if (name !== undefined) existing.name = name;
  if (status !== undefined) existing.status = status;
  if (trigger !== undefined) existing.trigger = trigger;
  if (action !== undefined) existing.action = action;

  await existing.save();
  sendSuccess(res, existing, 'Automation rule updated');
});

/**
 * PATCH /api/automation-rules/:id/toggle
 * Flip rule status between active and paused.
 */
export const toggleRule = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid id', 400);
    return;
  }

  const rule = await AutomationRule.findById(id);
  if (!rule) {
    sendNotFound(res, 'Automation rule not found');
    return;
  }

  const store = await Store.findById(rule.storeId).select('merchantId').lean();
  if (!store || (store as any).merchantId?.toString() !== userId) {
    sendError(res, 'Unauthorized: you do not own this rule', 403);
    return;
  }

  // Draft rules become active; active rules become paused; paused rules become active
  rule.status = rule.status === 'active' ? 'paused' : 'active';
  await rule.save();

  sendSuccess(res, rule, `Automation rule ${rule.status === 'active' ? 'activated' : 'paused'}`);
});

/**
 * DELETE /api/automation-rules/:id
 * Delete an automation rule.
 */
export const deleteRule = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid id', 400);
    return;
  }

  const rule = await AutomationRule.findById(id).lean();
  if (!rule) {
    sendNotFound(res, 'Automation rule not found');
    return;
  }

  const store = await Store.findById(rule.storeId).select('merchantId').lean();
  if (!store || (store as any).merchantId?.toString() !== userId) {
    sendError(res, 'Unauthorized: you do not own this rule', 403);
    return;
  }

  await AutomationRule.findByIdAndDelete(id);
  sendSuccess(res, null, 'Automation rule deleted');
});
