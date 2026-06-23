import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import HealthRecord from '../models/HealthRecord';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { escapeRegex } from '../utils/sanitize';

// @desc    Upload new health record
// @route   POST /api/health-records
// @access  Private
export const uploadHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const {
    recordType,
    title,
    description,
    documentUrl,
    documentThumbnail,
    documentType,
    fileSize,
    issuedBy,
    issuedDate,
    expiryDate,
    tags,
    originalFileName
  } = req.body;

  logger.info('📋 [HEALTH_RECORD] Uploading health record:', {
    userId,
    recordType,
    title,
    documentType
  });

  // Validate required fields
  if (!recordType || !title || !documentUrl || !documentType || !fileSize || !originalFileName) {
    return sendError(res, 'Missing required fields: recordType, title, documentUrl, documentType, fileSize, originalFileName', 400);
  }

  // Validate record type
  const validRecordTypes = ['prescription', 'lab_report', 'diagnosis', 'vaccination', 'imaging', 'discharge_summary', 'other'];
  if (!validRecordTypes.includes(recordType)) {
    return sendError(res, `Invalid record type. Valid types: ${validRecordTypes.join(', ')}`, 400);
  }

  // Validate document type
  const validDocumentTypes = ['pdf', 'image', 'other'];
  if (!validDocumentTypes.includes(documentType)) {
    return sendError(res, `Invalid document type. Valid types: ${validDocumentTypes.join(', ')}`, 400);
  }

  try {
    const healthRecord = new HealthRecord({
      userId,
      recordType,
      title,
      description,
      documentUrl,
      documentThumbnail,
      documentType,
      fileSize,
      issuedBy,
      issuedDate: issuedDate ? new Date(issuedDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      tags: tags || [],
      metadata: {
        originalFileName,
        uploadedAt: new Date()
      }
    });

    await healthRecord.save();

    logger.info('✅ [HEALTH_RECORD] Health record uploaded:', {
      recordNumber: healthRecord.recordNumber,
      recordId: healthRecord._id
    });

    return sendCreated(res, healthRecord, 'Health record uploaded successfully');

  } catch (error: any) {
    logger.error('❌ [HEALTH_RECORD] Error uploading health record:', error);
    return sendError(res, error.message || 'Failed to upload health record', 500);
  }
});

// @desc    Get user's health records
// @route   GET /api/health-records
// @access  Private
export const getUserHealthRecords = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const { recordType, isArchived, tags, limit = 20, offset = 0, search } = req.query;

  logger.info('📋 [HEALTH_RECORD] Fetching user health records:', {
    userId,
    recordType,
    isArchived,
    tags,
    limit,
    offset
  });

  try {
    const query: any = { userId };

    if (recordType) {
      query.recordType = recordType;
    }

    if (typeof isArchived !== 'undefined') {
      query.isArchived = isArchived === 'true';
    } else {
      // By default, don't show archived records
      query.isArchived = false;
    }

    if (tags) {
      const tagsArray = (tags as string).split(',').map(t => t.trim().toLowerCase());
      query.tags = { $in: tagsArray };
    }

    if (search) {
      const escaped = escapeRegex(String(search).substring(0, 200));
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { 'issuedBy.name': { $regex: escaped, $options: 'i' } }
      ];
    }

    const healthRecords = await HealthRecord.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .lean();

    const total = await HealthRecord.countDocuments(query);

    // Get counts by type
    const typeCounts = await HealthRecord.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isArchived: false } },
      { $group: { _id: '$recordType', count: { $sum: 1 } } }
    ]);

    logger.info('✅ [HEALTH_RECORD] Found health records:', {
      count: healthRecords.length,
      total
    });

    return sendSuccess(res, {
      records: healthRecords,
      total,
      hasMore: Number(offset) + healthRecords.length < total,
      limit: Number(limit),
      offset: Number(offset),
      typeCounts: typeCounts.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    }, 'Health records retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [HEALTH_RECORD] Error fetching health records:', error);
    return sendError(res, error.message || 'Failed to fetch health records', 500);
  }
});

// @desc    Get health record by ID
// @route   GET /api/health-records/:id
// @access  Private
export const getHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid health record ID format', 400);
  }

  logger.info('📋 [HEALTH_RECORD] Fetching health record:', {
    recordId: id,
    userId
  });

  try {
    // Check if user owns the record or has access via sharing
    const healthRecord = await HealthRecord.findOne({
      _id: id,
      $or: [
        { userId },
        { 'sharedWith.userId': userId }
      ]
    }).populate('userId', 'name phoneNumber email');

    if (!healthRecord) {
      logger.error('❌ [HEALTH_RECORD] Health record not found:', id);
      return sendNotFound(res, 'Health record not found');
    }

    // Update last accessed
    healthRecord.metadata.lastAccessedAt = new Date();
    await healthRecord.save();

    logger.info('✅ [HEALTH_RECORD] Health record found:', {
      recordNumber: healthRecord.recordNumber
    });

    return sendSuccess(res, healthRecord, 'Health record retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [HEALTH_RECORD] Error fetching health record:', error);
    return sendError(res, error.message || 'Failed to fetch health record', 500);
  }
});

// @desc    Update health record metadata
// @route   PUT /api/health-records/:id
// @access  Private
export const updateHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid health record ID format', 400);
  }

  const { title, description, recordType, issuedBy, issuedDate, expiryDate, tags } = req.body;

  logger.info('📋 [HEALTH_RECORD] Updating health record:', {
    recordId: id,
    userId
  });

  try {
    const healthRecord = await HealthRecord.findOne({ _id: id, userId });

    if (!healthRecord) {
      logger.error('❌ [HEALTH_RECORD] Health record not found:', id);
      return sendNotFound(res, 'Health record not found');
    }

    // Update allowed fields
    if (title) healthRecord.title = title;
    if (description !== undefined) healthRecord.description = description;
    if (recordType) healthRecord.recordType = recordType;
    if (issuedBy) healthRecord.issuedBy = issuedBy;
    if (issuedDate) healthRecord.issuedDate = new Date(issuedDate);
    if (expiryDate) healthRecord.expiryDate = new Date(expiryDate);
    if (tags) healthRecord.tags = tags;

    await healthRecord.save();

    logger.info('✅ [HEALTH_RECORD] Health record updated:', {
      recordNumber: healthRecord.recordNumber
    });

    return sendSuccess(res, healthRecord, 'Health record updated successfully');

  } catch (error: any) {
    logger.error('❌ [HEALTH_RECORD] Error updating health record:', error);
    return sendError(res, error.message || 'Failed to update health record', 500);
  }
});

// @desc    Delete health record
// @route   DELETE /api/health-records/:id
// @access  Private
export const deleteHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid health record ID format', 400);
  }

  logger.info('📋 [HEALTH_RECORD] Deleting health record:', {
    recordId: id,
    userId
  });

  try {
    const healthRecord = await HealthRecord.findOneAndDelete({ _id: id, userId });

    if (!healthRecord) {
      logger.error('❌ [HEALTH_RECORD] Health record not found:', id);
      return sendNotFound(res, 'Health record not found');
    }

    logger.info('✅ [HEALTH_RECORD] Health record deleted:', {
      recordNumber: healthRecord.recordNumber
    });

    return sendSuccess(res, { deleted: true }, 'Health record deleted successfully');

  } catch (error: any) {
    logger.error('❌ [HEALTH_RECORD] Error deleting health record:', error);
    return sendError(res, error.message || 'Failed to delete health record', 500);
  }
});

// @desc    Share health record with another user
// @route   POST /api/health-records/:id/share
// @access  Private
export const shareHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  const { shareWithUserId, accessLevel = 'view', expiresInDays } = req.body;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid health record ID format', 400);
  }

  if (!shareWithUserId || !mongoose.Types.ObjectId.isValid(shareWithUserId)) {
    return sendError(res, 'Invalid user ID to share with', 400);
  }

  if (shareWithUserId === userId) {
    return sendError(res, 'Cannot share record with yourself', 400);
  }

  logger.info('📋 [HEALTH_RECORD] Sharing health record:', {
    recordId: id,
    userId,
    shareWithUserId,
    accessLevel
  });

  try {
    const healthRecord = await HealthRecord.findOne({ _id: id, userId }).lean();

    if (!healthRecord) {
      logger.error('❌ [HEALTH_RECORD] Health record not found:', id);
      return sendNotFound(res, 'Health record not found');
    }

    // Calculate expiry date if specified
    let expiresAt: Date | undefined;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Add share
    await healthRecord.addShare(
      new mongoose.Types.ObjectId(shareWithUserId),
      accessLevel,
      expiresAt
    );

    logger.info('✅ [HEALTH_RECORD] Health record shared:', {
      recordNumber: healthRecord.recordNumber,
      sharedWith: shareWithUserId
    });

    return sendSuccess(res, healthRecord, 'Health record shared successfully');

  } catch (error: any) {
    logger.error('❌ [HEALTH_RECORD] Error sharing health record:', error);
    return sendError(res, error.message || 'Failed to share health record', 500);
  }
});

// @desc    Revoke share access
// @route   DELETE /api/health-records/:id/share/:shareId
// @access  Private
export const revokeShare = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id, shareId } = req.params;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(shareId)) {
    return sendError(res, 'Invalid ID format', 400);
  }

  logger.info('📋 [HEALTH_RECORD] Revoking share access:', {
    recordId: id,
    shareId,
    userId
  });

  try {
    const healthRecord = await HealthRecord.findOne({ _id: id, userId }).lean();

    if (!healthRecord) {
      logger.error('❌ [HEALTH_RECORD] Health record not found:', id);
      return sendNotFound(res, 'Health record not found');
    }

    await healthRecord.removeShare(new mongoose.Types.ObjectId(shareId));

    logger.info('✅ [HEALTH_RECORD] Share access revoked:', {
      recordNumber: healthRecord.recordNumber,
      shareId
    });

    return sendSuccess(res, healthRecord, 'Share access revoked successfully');

  } catch (error: any) {
    logger.error('❌ [HEALTH_RECORD] Error revoking share:', error);
    return sendError(res, error.message || 'Failed to revoke share', 500);
  }
});

// @desc    Archive health record
// @route   POST /api/health-records/:id/archive
// @access  Private
export const archiveHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  const { archive = true } = req.body;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid health record ID format', 400);
  }

  logger.info('📋 [HEALTH_RECORD] Archiving health record:', {
    recordId: id,
    userId,
    archive
  });

  try {
    const healthRecord = await HealthRecord.findOne({ _id: id, userId }).lean();

    if (!healthRecord) {
      logger.error('❌ [HEALTH_RECORD] Health record not found:', id);
      return sendNotFound(res, 'Health record not found');
    }

    if (archive) {
      await healthRecord.archive();
    } else {
      await healthRecord.unarchive();
    }

    logger.info('✅ [HEALTH_RECORD] Health record archive status updated:', {
      recordNumber: healthRecord.recordNumber,
      isArchived: healthRecord.isArchived
    });

    return sendSuccess(res, healthRecord, archive ? 'Health record archived successfully' : 'Health record unarchived successfully');

  } catch (error: any) {
    logger.error('❌ [HEALTH_RECORD] Error archiving health record:', error);
    return sendError(res, error.message || 'Failed to archive health record', 500);
  }
});

// @desc    Get records shared with user
// @route   GET /api/health-records/shared-with-me
// @access  Private
export const getSharedWithMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const { limit = 20, offset = 0 } = req.query;

  logger.info('📋 [HEALTH_RECORD] Fetching records shared with user:', {
    userId
  });

  try {
    const now = new Date();

    const sharedRecords = await HealthRecord.find({
      'sharedWith.userId': userId,
      $or: [
        { 'sharedWith.expiresAt': { $exists: false } },
        { 'sharedWith.expiresAt': null },
        { 'sharedWith.expiresAt': { $gt: now } }
      ]
    })
      .populate('userId', 'name phoneNumber email')
      .sort({ 'sharedWith.sharedAt': -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .lean();

    const total = await HealthRecord.countDocuments({
      'sharedWith.userId': userId,
      $or: [
        { 'sharedWith.expiresAt': { $exists: false } },
        { 'sharedWith.expiresAt': null },
        { 'sharedWith.expiresAt': { $gt: now } }
      ]
    });

    logger.info('✅ [HEALTH_RECORD] Found shared records:', {
      count: sharedRecords.length,
      total
    });

    return sendSuccess(res, {
      records: sharedRecords,
      total,
      hasMore: Number(offset) + sharedRecords.length < total,
      limit: Number(limit),
      offset: Number(offset)
    }, 'Shared records retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [HEALTH_RECORD] Error fetching shared records:', error);
    return sendError(res, error.message || 'Failed to fetch shared records', 500);
  }
});
