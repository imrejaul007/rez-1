import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ConsultationForm } from '../models/ConsultationForm';
import { FormSubmission } from '../models/FormSubmission';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Resolve storeId for the authenticated merchant.
 * Returns storeId string or null if not found / unauthorized.
 */
async function resolveStoreForMerchant(userId: string): Promise<string | null> {
  const store = await Store.findOne({ merchantId: new Types.ObjectId(userId) })
    .select('_id')
    .lean();
  if (!store) return null;
  return (store as any)._id.toString();
}

/**
 * GET /api/consultation-forms
 * List all consultation forms for the merchant's store.
 */
export const getForms = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const storeId = await resolveStoreForMerchant(userId);
  if (!storeId) {
    sendNotFound(res, 'Store not found for this merchant');
    return;
  }

  const forms = await ConsultationForm.find({ storeId: new Types.ObjectId(storeId) })
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, { forms, total: forms.length }, 'Consultation forms retrieved');
});

/**
 * GET /api/consultation-forms/:id
 * Get a single consultation form by id.
 */
export const getForm = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  if (!Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid form id', 400);
    return;
  }

  const storeId = await resolveStoreForMerchant(userId);
  if (!storeId) {
    sendNotFound(res, 'Store not found for this merchant');
    return;
  }

  const form = await ConsultationForm.findOne({
    _id: new Types.ObjectId(id),
    storeId: new Types.ObjectId(storeId),
  }).lean();

  if (!form) {
    sendNotFound(res, 'Consultation form not found');
    return;
  }

  sendSuccess(res, form, 'Consultation form retrieved');
});

/**
 * POST /api/consultation-forms
 * Create a new consultation form.
 */
export const createForm = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { name, description, fields, isDefault, serviceIds } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    sendError(res, 'Form name is required', 400);
    return;
  }

  const storeId = await resolveStoreForMerchant(userId);
  if (!storeId) {
    sendNotFound(res, 'Store not found for this merchant');
    return;
  }

  // If setting as default, unset existing defaults for this store
  if (isDefault) {
    await ConsultationForm.updateMany(
      { storeId: new Types.ObjectId(storeId), isDefault: true },
      { $set: { isDefault: false } },
    );
  }

  const form = await ConsultationForm.create({
    storeId: new Types.ObjectId(storeId),
    name: name.trim(),
    description: description?.trim(),
    fields: fields || [],
    isDefault: !!isDefault,
    serviceIds: Array.isArray(serviceIds)
      ? serviceIds.filter((sid: string) => Types.ObjectId.isValid(sid)).map((sid: string) => new Types.ObjectId(sid))
      : [],
    active: true,
  });

  sendCreated(res, form, 'Consultation form created');
});

/**
 * PUT /api/consultation-forms/:id
 * Update an existing consultation form.
 */
export const updateForm = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  if (!Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid form id', 400);
    return;
  }

  const storeId = await resolveStoreForMerchant(userId);
  if (!storeId) {
    sendNotFound(res, 'Store not found for this merchant');
    return;
  }

  const existing = await ConsultationForm.findOne({
    _id: new Types.ObjectId(id),
    storeId: new Types.ObjectId(storeId),
  });

  if (!existing) {
    sendNotFound(res, 'Consultation form not found');
    return;
  }

  const { name, description, fields, isDefault, serviceIds, active } = req.body;

  // If setting as default, unset existing defaults for this store
  if (isDefault && !existing.isDefault) {
    await ConsultationForm.updateMany(
      { storeId: new Types.ObjectId(storeId), isDefault: true, _id: { $ne: existing._id } },
      { $set: { isDefault: false } },
    );
  }

  if (name !== undefined) existing.name = name.trim();
  if (description !== undefined) existing.description = description?.trim();
  if (fields !== undefined) existing.fields = fields;
  if (isDefault !== undefined) existing.isDefault = !!isDefault;
  if (active !== undefined) existing.active = !!active;
  if (serviceIds !== undefined) {
    existing.serviceIds = Array.isArray(serviceIds)
      ? serviceIds.filter((sid: string) => Types.ObjectId.isValid(sid)).map((sid: string) => new Types.ObjectId(sid))
      : [];
  }

  await existing.save();

  sendSuccess(res, existing, 'Consultation form updated');
});

/**
 * DELETE /api/consultation-forms/:id
 * Soft-delete a consultation form (set active=false).
 */
export const deleteForm = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  if (!Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid form id', 400);
    return;
  }

  const storeId = await resolveStoreForMerchant(userId);
  if (!storeId) {
    sendNotFound(res, 'Store not found for this merchant');
    return;
  }

  const form = await ConsultationForm.findOne({
    _id: new Types.ObjectId(id),
    storeId: new Types.ObjectId(storeId),
  });

  if (!form) {
    sendNotFound(res, 'Consultation form not found');
    return;
  }

  form.active = false;
  await form.save();

  sendSuccess(res, null, 'Consultation form deactivated');
});

/**
 * GET /api/consultation-forms/:id/submissions
 * Get all submissions for a form, with optional clientId filter.
 */
export const getSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  const { clientId } = req.query as Record<string, string | undefined>;

  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  if (!Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid form id', 400);
    return;
  }

  const storeId = await resolveStoreForMerchant(userId);
  if (!storeId) {
    sendNotFound(res, 'Store not found for this merchant');
    return;
  }

  const form = await ConsultationForm.findOne({
    _id: new Types.ObjectId(id),
    storeId: new Types.ObjectId(storeId),
  })
    .select('_id')
    .lean();

  if (!form) {
    sendNotFound(res, 'Consultation form not found');
    return;
  }

  const query: Record<string, unknown> = { formId: new Types.ObjectId(id) };

  if (clientId && Types.ObjectId.isValid(clientId)) {
    query.clientId = new Types.ObjectId(clientId);
  }

  const submissions = await FormSubmission.find(query)
    .sort({ submittedAt: -1 })
    .populate('clientId', 'name phone email')
    .lean();

  sendSuccess(res, { submissions, total: submissions.length }, 'Submissions retrieved');
});

/**
 * GET /api/consultation-forms/client/:clientId/submissions
 * Get all form submissions for a specific client across all store forms.
 */
export const getClientSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { clientId } = req.params;

  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  if (!Types.ObjectId.isValid(clientId)) {
    sendError(res, 'Invalid clientId', 400);
    return;
  }

  const storeId = await resolveStoreForMerchant(userId);
  if (!storeId) {
    sendNotFound(res, 'Store not found for this merchant');
    return;
  }

  const submissions = await FormSubmission.find({
    storeId: new Types.ObjectId(storeId),
    clientId: new Types.ObjectId(clientId),
  })
    .sort({ submittedAt: -1 })
    .populate('formId', 'name description')
    .lean();

  sendSuccess(res, { submissions, total: submissions.length }, 'Client submissions retrieved');
});
