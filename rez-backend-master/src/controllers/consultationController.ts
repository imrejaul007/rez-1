import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import Consultation from '../models/Consultation';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

// @desc    Create new consultation booking
// @route   POST /api/consultations
// @access  Private
export const createConsultation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const {
    storeId,
    consultationType,
    consultationDate,
    consultationTime,
    duration = 30,
    patientName,
    patientAge,
    patientPhone,
    patientEmail,
    reasonForConsultation,
    medicalHistory
  } = req.body;

  logger.info('📋 [CONSULTATION] Creating consultation:', {
    userId,
    storeId,
    consultationType,
    consultationDate,
    consultationTime,
    patientName,
    patientAge
  });

  // Validate required fields
  if (!storeId || !consultationType || !consultationDate || !consultationTime ||
      !patientName || !patientAge || !patientPhone || !reasonForConsultation) {
    return sendError(res, 'Missing required fields', 400);
  }

  // Validate patient age
  if (typeof patientAge !== 'number' || patientAge <= 0 || patientAge > 150) {
    return sendError(res, 'Patient age must be a positive number between 1 and 150', 400);
  }

  // Validate storeId format
  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    return sendError(res, 'Invalid store ID format', 400);
  }

  try {
    // Check if store exists
    const store = await Store.findById(storeId).lean();

    if (!store) {
      logger.error('❌ [CONSULTATION] Store not found:', storeId);
      return sendNotFound(res, 'Store not found');
    }

    // Check if store supports consultations
    if (store.bookingType !== 'CONSULTATION' && store.bookingType !== 'HYBRID') {
      return sendError(res, 'This store does not offer consultation services', 400);
    }

    // Validate consultation type is supported by store
    if (store.consultationTypes && store.consultationTypes.length > 0) {
      if (!store.consultationTypes.includes(consultationType)) {
        return sendError(
          res,
          `Consultation type "${consultationType}" not available. Available types: ${store.consultationTypes.join(', ')}`,
          400
        );
      }
    }

    // Check if consultation date is in the future
    const selectedDate = new Date(consultationDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (selectedDate < now) {
      return sendError(res, 'Consultation date must be in the future', 400);
    }

    // Create consultation
    const consultation = new Consultation({
      storeId,
      userId,
      consultationType,
      consultationDate: selectedDate,
      consultationTime,
      duration,
      patientName,
      patientAge,
      patientPhone,
      patientEmail,
      reasonForConsultation,
      medicalHistory,
      status: 'pending'
    });

    await consultation.save();

    logger.info('✅ [CONSULTATION] Consultation created:', {
      consultationNumber: consultation.consultationNumber,
      consultationId: consultation._id
    });

    // Populate store and user details
    await consultation.populate('storeId', 'name location contact');
    await consultation.populate('userId', 'name phoneNumber email');

    return sendCreated(res, consultation, 'Consultation booked successfully');

  } catch (error: any) {
    logger.error('❌ [CONSULTATION] Error creating consultation:', error);
    return sendError(res, error.message || 'Failed to create consultation', 500);
  }
});

// @desc    Get user's consultations
// @route   GET /api/consultations/user
// @access  Private
export const getUserConsultations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const { status, limit = 20, offset = 0 } = req.query;

  logger.info('📋 [CONSULTATION] Fetching user consultations:', {
    userId,
    status,
    limit,
    offset
  });

  try {
    const query: any = { userId };

    if (status) {
      query.status = status;
    }

    const consultations = await Consultation.find(query)
      .populate('storeId', 'name location contact consultationTypes')
      .sort({ consultationDate: -1, createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .lean();

    const total = await Consultation.countDocuments(query);

    logger.info('✅ [CONSULTATION] Found consultations:', {
      count: consultations.length,
      total
    });

    return sendSuccess(res, {
      consultations,
      total,
      hasMore: Number(offset) + consultations.length < total,
      limit: Number(limit),
      offset: Number(offset)
    }, 'Consultations retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [CONSULTATION] Error fetching user consultations:', error);
    return sendError(res, error.message || 'Failed to fetch consultations', 500);
  }
});

// @desc    Get consultation by ID
// @route   GET /api/consultations/:consultationId
// @access  Private
export const getConsultation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { consultationId } = req.params;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(consultationId)) {
    return sendError(res, 'Invalid consultation ID format', 400);
  }

  logger.info('📋 [CONSULTATION] Fetching consultation:', {
    consultationId,
    userId
  });

  try {
    const consultation = await Consultation.findOne({
      _id: consultationId,
      userId
    })
      .populate('storeId', 'name location contact consultationTypes bookingConfig')
      .populate('userId', 'name phoneNumber email').lean();

    if (!consultation) {
      logger.error('❌ [CONSULTATION] Consultation not found:', consultationId);
      return sendNotFound(res, 'Consultation not found');
    }

    logger.info('✅ [CONSULTATION] Consultation found:', {
      consultationNumber: consultation.consultationNumber,
      status: consultation.status
    });

    return sendSuccess(res, consultation, 'Consultation retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [CONSULTATION] Error fetching consultation:', error);
    return sendError(res, error.message || 'Failed to fetch consultation', 500);
  }
});

// @desc    Get store's consultations
// @route   GET /api/consultations/store/:storeId
// @access  Private
export const getStoreConsultations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { storeId } = req.params;
  const { date, status, limit = 50, offset = 0 } = req.query;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    return sendError(res, 'Invalid store ID format', 400);
  }

  logger.info('📋 [CONSULTATION] Fetching store consultations:', {
    storeId,
    date,
    status,
    userId
  });

  try {
    // Check if store exists
    const store = await Store.findById(storeId).lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    const query: any = { storeId };

    if (status) {
      query.status = status;
    }

    if (date) {
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      query.consultationDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const consultations = await Consultation.find(query)
      .populate('userId', 'name phoneNumber email')
      .sort({ consultationDate: 1, consultationTime: 1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .lean();

    const total = await Consultation.countDocuments(query);

    logger.info('✅ [CONSULTATION] Found store consultations:', {
      count: consultations.length,
      total
    });

    return sendSuccess(res, {
      consultations,
      total,
      hasMore: Number(offset) + consultations.length < total,
      limit: Number(limit),
      offset: Number(offset)
    }, 'Store consultations retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [CONSULTATION] Error fetching store consultations:', error);
    return sendError(res, error.message || 'Failed to fetch store consultations', 500);
  }
});

// @desc    Cancel consultation
// @route   PUT /api/consultations/:consultationId/cancel
// @access  Private
export const cancelConsultation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { consultationId } = req.params;
  const { reason } = req.body;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(consultationId)) {
    return sendError(res, 'Invalid consultation ID format', 400);
  }

  logger.info('📋 [CONSULTATION] Cancelling consultation:', {
    consultationId,
    userId,
    reason
  });

  try {
    const consultation = await Consultation.findOne({
      _id: consultationId,
      userId
    });

    if (!consultation) {
      logger.error('❌ [CONSULTATION] Consultation not found:', consultationId);
      return sendNotFound(res, 'Consultation not found');
    }

    if (consultation.status === 'cancelled') {
      return sendError(res, 'Consultation is already cancelled', 400);
    }

    if (consultation.status === 'completed') {
      return sendError(res, 'Cannot cancel a completed consultation', 400);
    }

    // Update status to cancelled
    await consultation.updateStatus('cancelled');

    if (reason) {
      consultation.notes = `Cancellation reason: ${reason}`;
      await consultation.save();
    }

    logger.info('✅ [CONSULTATION] Consultation cancelled:', {
      consultationNumber: consultation.consultationNumber
    });

    return sendSuccess(res, consultation, 'Consultation cancelled successfully');

  } catch (error: any) {
    logger.error('❌ [CONSULTATION] Error cancelling consultation:', error);
    return sendError(res, error.message || 'Failed to cancel consultation', 500);
  }
});

// @desc    Check available time slots for consultation
// @route   GET /api/consultations/availability/:storeId
// @access  Public
export const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { date, consultationType } = req.query;

  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    return sendError(res, 'Invalid store ID format', 400);
  }

  if (!date) {
    return sendError(res, 'Date parameter is required', 400);
  }

  logger.info('📋 [CONSULTATION] Checking availability:', {
    storeId,
    date,
    consultationType
  });

  try {
    // Check if store exists
    const store = await Store.findById(storeId).lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Check if store supports consultations
    if (store.bookingType !== 'CONSULTATION' && store.bookingType !== 'HYBRID') {
      return sendError(res, 'This store does not offer consultation services', 400);
    }

    const targetDate = new Date(date as string);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all consultations for the specified date
    const query: any = {
      storeId,
      consultationDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['pending', 'confirmed', 'in_progress'] }
    };

    if (consultationType) {
      query.consultationType = consultationType;
    }

    const bookedConsultations = await Consultation.find(query)
      .select('consultationTime duration')
      .lean();

    // Generate available time slots based on store working hours
    const workingHours = store.bookingConfig?.workingHours || {
      start: '09:00',
      end: '21:00'
    };

    const slotDuration = store.bookingConfig?.slotDuration || 30;

    const availableSlots: string[] = [];
    const bookedSlots = bookedConsultations.map(c => c.consultationTime);

    // Generate slots from working hours
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMin < endMin)
    ) {
      const timeSlot = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

      if (!bookedSlots.includes(timeSlot)) {
        availableSlots.push(timeSlot);
      }

      currentMin += slotDuration;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }

    logger.info('✅ [CONSULTATION] Availability checked:', {
      totalSlots: availableSlots.length,
      bookedSlots: bookedSlots.length
    });

    return sendSuccess(res, {
      date: targetDate,
      availableSlots,
      bookedSlots,
      slotDuration,
      workingHours,
      consultationTypes: store.consultationTypes || []
    }, 'Availability retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [CONSULTATION] Error checking availability:', error);
    return sendError(res, error.message || 'Failed to check availability', 500);
  }
});
