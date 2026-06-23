import { logger } from '../config/logger';
import { Request, Response } from 'express';
import { StoreVisit, VisitType, VisitStatus, IStoreVisit } from '../models/StoreVisit';
import { Store } from '../models/Store';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import pushNotificationService from '../services/pushNotificationService';
import merchantNotificationService from '../services/merchantNotificationService';

// Schedule a store visit
export const scheduleStoreVisit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const {
    storeId,
    visitDate,
    visitTime,
    customerName,
    customerPhone,
    customerEmail,
    estimatedDuration,
    paymentMethod
  } = req.body;

  // Validate required fields
  if (!storeId || !visitDate || !visitTime || !customerName || !customerPhone) {
    return sendBadRequest(res, 'Store ID, visit date, visit time, customer name, and phone are required');
  }

  logger.info('📅 [STORE VISIT] Scheduling visit:', {
    storeId,
    visitDate,
    visitTime,
    userId
  });

  // Validate visit date is not in the past
  const parsedVisitDate = new Date(visitDate);
  if (isNaN(parsedVisitDate.getTime())) {
    return sendBadRequest(res, 'Invalid date format. Please provide a valid date.');
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsedVisitDate < today) {
    return sendBadRequest(res, 'Cannot schedule a visit in the past. Please select a future date.');
  }

  // Validate visitTime format
  const timeRegex = /^(\d{1,2}):(\d{2})(\s*(AM|PM))?$/i;
  if (!timeRegex.test(visitTime.trim())) {
    return sendBadRequest(res, 'Invalid time format. Use "HH:MM AM/PM" or "HH:MM" (24-hour).');
  }

  // Check if store exists
  const store = await Store.findById(storeId).lean();
  if (!store) {
    return sendNotFound(res, 'Store not found');
  }

  // Prevent duplicate bookings by same user for same store/date/time
  const existingBooking = await StoreVisit.findOne({
    userId,
    storeId,
    visitDate: parsedVisitDate,
    visitTime,
    status: { $in: [VisitStatus.PENDING, VisitStatus.CHECKED_IN] }
  }).lean();
  if (existingBooking) {
    return sendBadRequest(res, 'You already have a visit scheduled at this store for this date and time.');
  }

  // Check time slot availability (prevent overlaps)
  const duration = estimatedDuration || 30;
  const isAvailable = await StoreVisit.checkSlotAvailability(storeId, parsedVisitDate, visitTime, duration);
  if (!isAvailable) {
    return sendBadRequest(res, 'This time slot is already booked. Please select a different time.');
  }

  // Create scheduled visit
  const visit = await StoreVisit.create({
    storeId,
    userId,
    visitType: VisitType.SCHEDULED,
    visitDate: parsedVisitDate,
    visitTime,
    customerName,
    customerPhone,
    customerEmail,
    status: VisitStatus.PENDING,
    estimatedDuration: duration,
    paymentMethod: paymentMethod || 'none',
    paymentStatus: paymentMethod === 'pay_at_store' ? 'pending' : 'not_required'
  });

  const populatedVisit = await StoreVisit.findById(visit._id)
    .populate('storeId', 'name location contact images')
    .populate('userId', 'name phoneNumber email').lean();

  logger.info('✅ [STORE VISIT] Visit scheduled successfully:', {
    visitNumber: visit.visitNumber,
    visitId: visit._id
  });

  // Send SMS notification
  try {
    const storeAddress = store.location?.city
      ? `${store.location.address}, ${store.location.city}`
      : store.location?.address;

    await pushNotificationService.sendVisitScheduled(
      store.name,
      visit.visitNumber,
      visit.visitDate,
      visitTime,
      customerPhone,
      storeAddress
    );
    logger.info('📱 [SMS] Visit scheduled notification sent');
  } catch (smsError) {
    logger.error('❌ [SMS] Failed to send visit notification:', smsError);
  }

  // Notify merchant
  if ((store as any).merchantId) {
    merchantNotificationService.notifyNewVisit({
      merchantId: (store as any).merchantId.toString(),
      visitId: (visit._id as any).toString(),
      visitNumber: visit.visitNumber,
      customerName,
      visitDate: parsedVisitDate.toLocaleDateString('en-IN'),
      visitTime,
      visitType: 'scheduled',
      storeName: store.name,
    }).catch(err => logger.error('❌ [MERCHANT] Visit notification failed:', err));
  }

  sendSuccess(res, populatedVisit, 'Visit scheduled successfully', 201);
});

// Get queue number for walk-in
export const getQueueNumber = asyncHandler(async (req: Request, res: Response) => {
  const {
    storeId,
    customerName,
    customerPhone,
    customerEmail
  } = req.body;

  // Validate required fields
  if (!storeId || !customerName || !customerPhone) {
    return sendBadRequest(res, 'Store ID, customer name, and phone are required');
  }

  logger.info('🎫 [QUEUE] Generating queue number:', {
    storeId,
    customerPhone
  });

  // Check if store exists
  const store = await Store.findById(storeId).lean();
  if (!store) {
    return sendNotFound(res, 'Store not found');
  }

  // Get next queue number
  const queueNumber = await StoreVisit.getNextQueueNumber(storeId);

  // Create queue visit
  const visit = await StoreVisit.create({
    storeId,
    userId: req.userId || undefined,
    visitType: VisitType.QUEUE,
    visitDate: new Date(),
    queueNumber,
    customerName,
    customerPhone,
    customerEmail,
    status: VisitStatus.PENDING,
    estimatedDuration: 30
  });

  const populatedVisit = await StoreVisit.findById(visit._id)
    .populate('storeId', 'name location contact images')
    .populate('userId', 'name phoneNumber email').lean();

  logger.info('✅ [QUEUE] Queue number generated:', {
    queueNumber,
    visitNumber: visit.visitNumber
  });

  // Send SMS notification
  try {
    // Get current queue status for estimated wait time
    const currentQueueSize = await StoreVisit.countDocuments({
      storeId,
      visitType: VisitType.QUEUE,
      status: { $in: [VisitStatus.PENDING, VisitStatus.CHECKED_IN] },
      visitDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    const estimatedWaitTime = currentQueueSize > 0
      ? `${currentQueueSize * 15} minutes`
      : 'Less than 15 minutes';

    await pushNotificationService.sendQueueNumberAssigned(
      store.name,
      queueNumber,
      visit.visitNumber,
      customerPhone,
      estimatedWaitTime,
      currentQueueSize
    );
    logger.info('📱 [SMS] Queue number notification sent');
  } catch (smsError) {
    logger.error('❌ [SMS] Failed to send queue notification:', smsError);
    // Don't fail the request if SMS fails
  }

  // Notify merchant
  if ((store as any).merchantId) {
    merchantNotificationService.notifyNewVisit({
      merchantId: (store as any).merchantId.toString(),
      visitId: (visit._id as any).toString(),
      visitNumber: visit.visitNumber,
      customerName,
      visitDate: new Date().toLocaleDateString('en-IN'),
      visitTime: '',
      visitType: 'queue',
      queueNumber,
      storeName: store.name,
    }).catch(err => logger.error('❌ [MERCHANT] Queue notification failed:', err));
  }

  sendSuccess(res, populatedVisit, 'Queue number generated successfully', 201);
});

// Get user's store visits
export const getUserStoreVisits = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const { page = 1, limit = 20, status } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  logger.info('📋 [STORE VISIT] Fetching user visits:', { userId, page: pageNum, limit: limitNum });

  const query: any = { userId };
  if (status) query.status = status;

  const [visits, total] = await Promise.all([
    StoreVisit.find(query)
      .populate('storeId', 'name location contact images logo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    StoreVisit.countDocuments(query),
  ]);

  logger.info('✅ [STORE VISIT] Found visits:', { count: visits.length, total });

  sendSuccess(res, {
    visits,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  }, 'Visits retrieved successfully');
});

// Get visit by ID
export const getStoreVisit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const { visitId } = req.params;

  logger.info('🔍 [STORE VISIT] Fetching visit:', { visitId, userId });

  const visit = await StoreVisit.findById(visitId)
    .populate('storeId', 'name location contact images')
    .populate('userId', 'name phoneNumber email').lean();

  if (!visit) {
    return sendNotFound(res, 'Visit not found');
  }

  // Check if user owns this visit
  if (visit.userId && visit.userId.toString() !== userId) {
    return sendError(res, 'Unauthorized access', 403);
  }

  logger.info('✅ [STORE VISIT] Visit found:', {
    visitNumber: visit.visitNumber,
    status: visit.status
  });

  sendSuccess(res, visit, 'Visit retrieved successfully');
});

// Get store's visits (for store owners)
export const getStoreVisits = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const { storeId } = req.params;
  const { date } = req.query;

  logger.info('🏪 [STORE VISIT] Fetching store visits:', {
    storeId,
    date,
    userId
  });

  // Check if store exists
  const store = await Store.findById(storeId).lean();
  if (!store) {
    return sendNotFound(res, 'Store not found');
  }

  // Authorization check: verify user owns this store or is a merchant
  if ((store as any).merchantId && (store as any).merchantId.toString() !== userId) {
    // Also check if this is the store owner
    if ((store as any).owner && (store as any).owner.toString() !== userId) {
      return sendError(res, 'Unauthorized: You do not have access to this store\'s visits', 403);
    }
  }

  const visitDate = date ? new Date(date as string) : undefined;
  const visits = await StoreVisit.findStoreVisits(storeId, visitDate);

  logger.info('✅ [STORE VISIT] Found store visits:', { count: visits.length });

  sendSuccess(res, visits, 'Store visits retrieved successfully');
});

// Cancel store visit
export const cancelStoreVisit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const { visitId } = req.params;

  logger.info('❌ [STORE VISIT] Cancelling visit:', { visitId, userId });

  const visit = await StoreVisit.findById(visitId).lean();

  if (!visit) {
    return sendNotFound(res, 'Visit not found');
  }

  // Check if user owns this visit
  if (visit.userId && visit.userId.toString() !== userId) {
    return sendError(res, 'Unauthorized access', 403);
  }

  // Check if visit can be cancelled
  if (visit.status === VisitStatus.COMPLETED) {
    return sendBadRequest(res, 'Cannot cancel a completed visit');
  }

  if (visit.status === VisitStatus.CANCELLED) {
    return sendBadRequest(res, 'Visit is already cancelled');
  }

  // Update status to cancelled
  await visit.updateStatus(VisitStatus.CANCELLED);

  logger.info('✅ [STORE VISIT] Visit cancelled:', {
    visitNumber: visit.visitNumber
  });

  // Notify merchant of cancellation
  const cancelStore = await Store.findById(visit.storeId).lean();
  if (cancelStore && (cancelStore as any).merchantId) {
    merchantNotificationService.notifyVisitCancelled({
      merchantId: (cancelStore as any).merchantId.toString(),
      visitId: (visit._id as any).toString(),
      visitNumber: visit.visitNumber,
      customerName: visit.customerName,
      storeName: cancelStore.name,
    }).catch(err => logger.error('❌ [MERCHANT] Cancel notification failed:', err));
  }

  // Send cancellation SMS to customer
  try {
    await pushNotificationService.sendVisitCancelled(
      cancelStore?.name || '',
      visit.visitNumber,
      visit.customerPhone
    );
  } catch (smsError) {
    logger.error('❌ [SMS] Failed to send cancellation notification:', smsError);
  }

  sendSuccess(res, visit, 'Visit cancelled successfully');
});

// Get current queue status (public endpoint)
export const getCurrentQueueStatus = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  logger.info('📊 [QUEUE STATUS] Fetching queue status:', { storeId });

  // Check if store exists
  const store = await Store.findById(storeId).lean();
  if (!store) {
    return sendNotFound(res, 'Store not found');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's queue visits
  const queueVisits = await StoreVisit.find({
    storeId,
    visitType: VisitType.QUEUE,
    visitDate: { $gte: today, $lt: tomorrow }
  }).sort({ queueNumber: 1 }).lean();

  // Calculate statistics
  const totalInQueue = queueVisits.filter(v => v.status === VisitStatus.PENDING).length;
  const currentlyServing = queueVisits.filter(v => v.status === VisitStatus.CHECKED_IN).length;
  const completed = queueVisits.filter(v => v.status === VisitStatus.COMPLETED).length;

  const lastServedVisit = queueVisits.find(v => v.status === VisitStatus.CHECKED_IN);
  const lastServedNumber = lastServedVisit?.queueNumber;

  // Estimate wait time (rough calculation: 30 mins per person)
  const estimatedWaitTime = totalInQueue * 30;

  const queueStatus = {
    storeId,
    storeName: store.name,
    totalInQueue,
    currentlyServing,
    completed,
    lastServedNumber,
    estimatedWaitTime: `${estimatedWaitTime} minutes`,
    queueList: queueVisits.map(v => ({
      queueNumber: v.queueNumber,
      status: v.status,
      visitNumber: v.visitNumber,
      customerName: v.customerName
    }))
  };

  logger.info('✅ [QUEUE STATUS] Queue status retrieved:', {
    totalInQueue,
    currentlyServing
  });

  sendSuccess(res, queueStatus, 'Queue status retrieved successfully');
});

// Check store availability / crowd status (public endpoint)
export const checkStoreAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  logger.info('🏪 [AVAILABILITY] Checking store availability:', { storeId });

  // Check if store exists
  const store = await Store.findById(storeId).lean();
  if (!store) {
    return sendNotFound(res, 'Store not found');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's visits
  const todayVisits = await StoreVisit.find({
    storeId,
    visitDate: { $gte: today, $lt: tomorrow },
    status: { $in: [VisitStatus.PENDING, VisitStatus.CHECKED_IN] }
  }).lean();

  const currentCrowd = todayVisits.length;

  // Mock crowd status based on count (can be enhanced with real-time data)
  let crowdStatus: 'Low' | 'Medium' | 'High';
  if (currentCrowd < 5) {
    crowdStatus = 'Low';
  } else if (currentCrowd < 15) {
    crowdStatus = 'Medium';
  } else {
    crowdStatus = 'High';
  }

  const availability = {
    storeId,
    storeName: store.name,
    crowdStatus,
    currentVisitors: currentCrowd,
    isOpen: true, // Can be enhanced with business hours check
    nextAvailableSlot: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins from now
    recommendedAction: crowdStatus === 'Low'
      ? 'Walk-in recommended'
      : crowdStatus === 'Medium'
        ? 'Moderate wait expected'
        : 'Schedule visit recommended'
  };

  logger.info('✅ [AVAILABILITY] Availability checked:', {
    crowdStatus,
    currentVisitors: currentCrowd
  });

  sendSuccess(res, availability, 'Store availability retrieved successfully');
});

// Get available time slots for a date (public endpoint)
export const getAvailableSlotsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { date, duration } = req.query;

  if (!date) {
    return sendBadRequest(res, 'Date query parameter is required (YYYY-MM-DD)');
  }

  const store = await Store.findById(storeId).lean();
  if (!store) {
    return sendNotFound(res, 'Store not found');
  }

  const visitDate = new Date(date as string);
  const visitDuration = duration ? parseInt(duration as string, 10) : 30;

  // Try to get store hours for the day
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[visitDate.getDay()];
  const storeOperationalHours = (store as any).operationalInfo?.hours;
  const dayHours = storeOperationalHours?.[dayName];

  let storeHours = { open: '09:00', close: '21:00' }; // Default
  if (dayHours && !dayHours.closed) {
    storeHours = { open: dayHours.open || '09:00', close: dayHours.close || '21:00' };
  } else if (dayHours?.closed) {
    return sendSuccess(res, { availableSlots: [], date, storeId, closed: true }, 'Store is closed on this day');
  }

  const availableSlots = await StoreVisit.getAvailableSlots(storeId, visitDate, visitDuration, storeHours);

  sendSuccess(res, { availableSlots, date, storeId }, 'Available slots retrieved successfully');
});

// Reschedule a store visit
export const rescheduleStoreVisit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const { visitId } = req.params;
  const { visitDate, visitTime } = req.body;

  if (!visitDate || !visitTime) {
    return sendBadRequest(res, 'New visit date and time are required');
  }

  // Validate date is not in the past
  const parsedNewDate = new Date(visitDate);
  if (isNaN(parsedNewDate.getTime())) {
    return sendBadRequest(res, 'Invalid date format.');
  }
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (parsedNewDate < todayStart) {
    return sendBadRequest(res, 'Cannot reschedule to a past date.');
  }

  // Validate time format
  const timeRegex = /^(\d{1,2}):(\d{2})(\s*(AM|PM))?$/i;
  if (!timeRegex.test(visitTime.trim())) {
    return sendBadRequest(res, 'Invalid time format. Use "HH:MM AM/PM" or "HH:MM" (24-hour).');
  }

  const visit = await StoreVisit.findById(visitId).lean();
  if (!visit) {
    return sendNotFound(res, 'Visit not found');
  }

  // Check ownership
  if (visit.userId && visit.userId.toString() !== userId) {
    return sendError(res, 'Unauthorized access', 403);
  }

  // Only pending visits can be rescheduled
  if (visit.status !== VisitStatus.PENDING) {
    return sendBadRequest(res, 'Only pending visits can be rescheduled');
  }

  // Check slot availability (exclude current visit from conflict check)
  const isAvailable = await StoreVisit.checkSlotAvailability(
    visit.storeId,
    parsedNewDate,
    visitTime,
    visit.estimatedDuration || 30,
    visit._id as any
  );

  if (!isAvailable) {
    return sendBadRequest(res, 'The new time slot is already booked. Please select a different time.');
  }

  // Update visit
  visit.visitDate = parsedNewDate;
  visit.visitTime = visitTime;
  await visit.save();

  const populatedVisit = await StoreVisit.findById(visit._id)
    .populate('storeId', 'name location contact images')
    .populate('userId', 'name phoneNumber email').lean();

  logger.info('✅ [STORE VISIT] Visit rescheduled:', { visitNumber: visit.visitNumber });

  // Notify merchant of reschedule
  const store = await Store.findById(visit.storeId).lean();
  if (store && (store as any).merchantId) {
    merchantNotificationService.notifyNewVisit({
      merchantId: (store as any).merchantId.toString(),
      visitId: (visit._id as any).toString(),
      visitNumber: visit.visitNumber,
      customerName: visit.customerName,
      visitDate: parsedNewDate.toLocaleDateString('en-IN'),
      visitTime,
      visitType: 'rescheduled',
      storeName: store.name,
    }).catch(err => logger.error('❌ [MERCHANT] Reschedule notification failed:', err));
  }

  // Send SMS confirmation to customer
  try {
    await pushNotificationService.sendVisitScheduled(
      store?.name || '',
      visit.visitNumber,
      parsedNewDate,
      visitTime,
      visit.customerPhone,
      store?.location?.address
    );
  } catch (smsError) {
    logger.error('❌ [SMS] Failed to send reschedule notification:', smsError);
  }

  sendSuccess(res, populatedVisit, 'Visit rescheduled successfully');
});

// ============================================
// MERCHANT-FACING ENDPOINTS
// ============================================

// Get visits for merchant's store (with filters)
export const getStoreVisitsForMerchant = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  const { storeId, date, status, page = '1', limit = '20' } = req.query;

  if (!storeId) {
    return sendBadRequest(res, 'Store ID is required');
  }

  // Verify store belongs to merchant
  const store = await Store.findById(storeId).lean();
  if (!store || (store as any).merchantId?.toString() !== merchantId) {
    return sendNotFound(res, 'Store not found');
  }

  const query: any = { storeId };

  if (date) {
    const visitDate = new Date(date as string);
    const startOfDay = new Date(visitDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(visitDate);
    endOfDay.setHours(23, 59, 59, 999);
    query.visitDate = { $gte: startOfDay, $lte: endOfDay };
  }

  if (status && status !== 'all') {
    query.status = status;
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const [visits, totalCount] = await Promise.all([
    StoreVisit.find(query)
      .populate('userId', 'name phoneNumber email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    StoreVisit.countDocuments(query)
  ]);

  sendSuccess(res, {
    visits,
    totalCount,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(totalCount / limitNum)
  }, 'Merchant visits retrieved successfully');
});

// Get visit stats for merchant's store
export const getVisitStats = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  const { storeId } = req.query;

  if (!storeId) {
    return sendBadRequest(res, 'Store ID is required');
  }

  const store = await Store.findById(storeId).lean();
  if (!store || (store as any).merchantId?.toString() !== merchantId) {
    return sendNotFound(res, 'Store not found');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Week start (Monday) — handle Sunday (getDay()=0) correctly
  const weekStart = new Date(today);
  const dayOfWeek = weekStart.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysFromMonday);

  const [todayVisits, weekVisits] = await Promise.all([
    StoreVisit.find({
      storeId,
      visitDate: { $gte: today, $lt: tomorrow }
    }).lean(),
    StoreVisit.countDocuments({
      storeId,
      visitDate: { $gte: weekStart, $lt: tomorrow }
    })
  ]);

  const stats = {
    totalToday: todayVisits.length,
    upcoming: todayVisits.filter((v: any) => v.status === VisitStatus.PENDING).length,
    checkedIn: todayVisits.filter((v: any) => v.status === VisitStatus.CHECKED_IN).length,
    completed: todayVisits.filter((v: any) => v.status === VisitStatus.COMPLETED).length,
    cancelled: todayVisits.filter((v: any) => v.status === VisitStatus.CANCELLED).length,
    totalThisWeek: weekVisits
  };

  sendSuccess(res, stats, 'Visit stats retrieved successfully');
});

// Update visit status (merchant action: check-in, complete, cancel)
export const updateVisitStatusByMerchant = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  const { visitId } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return sendBadRequest(res, 'Status is required');
  }

  const validTransitions: Record<string, string[]> = {
    [VisitStatus.PENDING]: [VisitStatus.CHECKED_IN, VisitStatus.CANCELLED],
    [VisitStatus.CHECKED_IN]: [VisitStatus.COMPLETED, VisitStatus.CANCELLED],
  };

  const visit = await StoreVisit.findById(visitId).lean();
  if (!visit) {
    return sendNotFound(res, 'Visit not found');
  }

  // Verify store belongs to merchant
  const store = await Store.findById(visit.storeId).lean();
  if (!store || (store as any).merchantId?.toString() !== merchantId) {
    return sendError(res, 'Unauthorized access', 403);
  }

  const allowed = validTransitions[visit.status];
  if (!allowed || !allowed.includes(status)) {
    return sendBadRequest(res, `Cannot transition from '${visit.status}' to '${status}'`);
  }

  const previousStatus = visit.status;
  await visit.updateStatus(status as VisitStatus);

  logger.info('✅ [MERCHANT] Visit status updated:', {
    visitNumber: visit.visitNumber,
    from: previousStatus,
    to: status
  });

  // Notify customer of status change via SMS
  try {
    if (status === VisitStatus.CHECKED_IN) {
      await pushNotificationService.sendVisitCheckedIn(
        store.name,
        visit.visitNumber,
        visit.customerPhone
      );
    } else if (status === VisitStatus.COMPLETED) {
      await pushNotificationService.sendVisitCompleted(
        store.name,
        visit.visitNumber,
        visit.customerPhone
      );
    } else if (status === VisitStatus.CANCELLED) {
      await pushNotificationService.sendVisitCancelled(
        store.name,
        visit.visitNumber,
        visit.customerPhone
      );
    }
  } catch (smsError) {
    logger.error('❌ [SMS] Failed to send status change notification:', smsError);
  }

  sendSuccess(res, visit, 'Visit status updated successfully');
});
