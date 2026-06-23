// @ts-nocheck
import { Router, Request, Response } from 'express';
import { SalonService, ISalonService, SalonStaff } from '../models/SalonService';
import { SalonBooking, ISalonBooking } from '../models/SalonBooking';
import { Store } from '../models/Store';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import mongoose, { Types } from 'mongoose';
import Joi from 'joi';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────────────────────────

const objectIdSchema = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .messages({ 'string.pattern.base': 'Invalid ID format' });

const createBookingSchema = Joi.object({
  storeId: objectIdSchema.required(),
  serviceId: objectIdSchema.required(),
  staffId: objectIdSchema.optional(),
  bookingDate: Joi.date().iso().required(),
  timeSlot: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({ 'string.pattern.base': 'Time must be in HH:MM format (e.g., 14:30)' }),
  customerName: Joi.string().trim().min(2).max(100).required(),
  customerPhone: Joi.string().trim().min(7).max(20).required(),
  customerEmail: Joi.string().trim().email().optional(),
  notes: Joi.string().trim().max(500).optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show').required(),
  cancellationReason: Joi.string().trim().max(500).when('status', {
    is: 'cancelled',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
  note: Joi.string().trim().max(500).optional(),
});

// ─── Middleware ─────────────────────────────────────────────────────────────────

// Apply authenticate to all routes below this line
router.use(authenticate);

// ─── GET /salon/:merchantId/services ───────────────────────────────────────────
// Returns all active salon services for a merchant's stores.

router.get(
  '/:merchantId/services',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { storeId, category, active } = req.query;

    if (!Types.ObjectId.isValid(merchantId)) {
      res.status(400).json({ success: false, message: 'Invalid merchant ID' });
      return;
    }

    // Find stores belonging to this merchant
    const storeQuery: any = { merchantId: new Types.ObjectId(merchantId) };
    if (storeId && Types.ObjectId.isValid(storeId as string)) {
      storeQuery._id = new Types.ObjectId(storeId as string);
    }

    const stores = await Store.find(storeQuery).select('_id').lean();
    if (stores.length === 0) {
      res.status(404).json({ success: false, message: 'No stores found for this merchant' });
      return;
    }
    const storeIds = stores.map((s) => s._id);

    // Find services for these stores
    const serviceQuery: any = { storeId: { $in: storeIds } };
    if (active !== 'false') serviceQuery.isActive = true;
    if (category && ['salon', 'spa', 'beauty', 'wellness', 'other'].includes(category as string)) {
      serviceQuery.category = category;
    }

    const services = await SalonService.find(serviceQuery)
      .populate('storeId', 'name logo location contact')
      .sort({ category: 1, price: 1 })
      .lean();

    // Also get staff for each service
    const serviceIds = services.map((s) => s._id);
    const staffForServices = await SalonStaff.find({
      storeId: { $in: storeIds },
      services: { $in: serviceIds },
      isActive: true,
    })
      .select('_id name profileImageUrl rating totalReviews storeId')
      .lean();

    const result = services.map((service) => {
      const staffForThisService = staffForServices.filter((staff) =>
        (staff.services as Types.ObjectId[])?.some((sid) => sid.toString() === service._id.toString()),
      );
      return {
        ...service,
        availableStaff: staffForThisService,
      };
    });

    res.json({ success: true, data: result, count: result.length });
  }),
);

// ─── GET /salon/:merchantId/staff ──────────────────────────────────────────────
// Returns staff members for a merchant's stores.

router.get(
  '/:merchantId/staff',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { storeId } = req.query;

    if (!Types.ObjectId.isValid(merchantId)) {
      res.status(400).json({ success: false, message: 'Invalid merchant ID' });
      return;
    }

    const storeQuery: any = { merchantId: new Types.ObjectId(merchantId) };
    if (storeId && Types.ObjectId.isValid(storeId as string)) {
      storeQuery._id = new Types.ObjectId(storeId as string);
    }

    const stores = await Store.find(storeQuery).select('_id').lean();
    if (stores.length === 0) {
      res.status(404).json({ success: false, message: 'No stores found for this merchant' });
      return;
    }
    const storeIds = stores.map((s) => s._id);

    const staff = await SalonStaff.find({ storeId: { $in: storeIds }, isActive: true })
      .populate('storeId', 'name logo')
      .populate('services', 'name category duration price')
      .lean();

    res.json({ success: true, data: staff, count: staff.length });
  }),
);

// ─── GET /salon/:merchantId/slots ─────────────────────────────────────────────
// Returns available time slots for a service on a given date.

router.get(
  '/:merchantId/slots',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { date, serviceId, staffId } = req.query;

    if (!Types.ObjectId.isValid(merchantId)) {
      res.status(400).json({ success: false, message: 'Invalid merchant ID' });
      return;
    }
    if (!serviceId || !Types.ObjectId.isValid(serviceId as string)) {
      res.status(400).json({ success: false, message: 'serviceId is required' });
      return;
    }
    if (!date || isNaN(Date.parse(date as string))) {
      res.status(400).json({ success: false, message: 'Valid date (ISO format) is required' });
      return;
    }

    const parsedDate = new Date(date as string);

    // Find service
    const service = await SalonService.findById(serviceId as string).lean();
    if (!service || !service.isActive) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    // Verify merchant owns this store
    const store = await Store.findById(service.storeId).lean();
    if (!store || store.merchantId?.toString() !== merchantId) {
      res.status(403).json({ success: false, message: 'Service does not belong to this merchant' });
      return;
    }

    const effectiveDuration = service.duration + service.bufferTimeAfter;

    // Get working hours for the date
    const dayOfWeek = parsedDate.getDay();
    let workingHours = { open: '09:00', close: '21:00' };

    if (staffId && Types.ObjectId.isValid(staffId as string)) {
      const staff = await SalonStaff.findById(staffId as string).lean();
      if (staff && staff.isActive) {
        const daySchedule = staff.workingHours.find((w) => w.dayOfWeek === dayOfWeek);
        if (daySchedule && !daySchedule.hours.closed) {
          workingHours = { open: daySchedule.hours.open, close: daySchedule.hours.close };
        }
      }
    } else {
      // Fall back to store's operational hours
      if (store.operationalInfo?.hours) {
        const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
          dayOfWeek
        ] as string;
        const storeDayHours = (store.operationalInfo.hours as any)?.[dayKey];
        if (storeDayHours && !storeDayHours.closed) {
          workingHours = { open: storeDayHours.open || '09:00', close: storeDayHours.close || '21:00' };
        }
      }
    }

    // Get available slots
    const slots = await SalonBooking.getAvailableSlots(
      service.storeId,
      staffId && Types.ObjectId.isValid(staffId as string)
        ? new Types.ObjectId(staffId as string)
        : new Types.ObjectId(),
      parsedDate,
      effectiveDuration,
      workingHours,
    );

    // Also return staff options if no staff was specified
    let availableStaff: any[] = [];
    if (!staffId || !Types.ObjectId.isValid(staffId as string)) {
      const staffMembers = await SalonStaff.find({
        storeId: service.storeId,
        services: service._id,
        isActive: true,
      }).lean();

      availableStaff = await Promise.all(
        staffMembers.map(async (staff) => {
          const staffSlots = await SalonBooking.getAvailableSlots(
            service.storeId,
            staff._id as Types.ObjectId,
            parsedDate,
            effectiveDuration,
            workingHours,
          );
          return {
            _id: staff._id,
            name: staff.name,
            profileImageUrl: staff.profileImageUrl,
            rating: staff.rating,
            availableSlots: staffSlots.filter((s) => s.available),
          };
        }),
      );
    }

    res.json({
      success: true,
      data: {
        serviceId: service._id,
        serviceName: service.name,
        duration: service.duration,
        bufferTimeAfter: service.bufferTimeAfter,
        effectiveDuration,
        date: parsedDate.toISOString().split('T')[0],
        workingHours,
        slots,
        staff: staffId ? undefined : availableStaff,
      },
    });
  }),
);

// ─── POST /salon/book ───────────────────────────────────────────────────────────
// Create a new salon booking.

router.post(
  '/book',
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = createBookingSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }

    const { storeId, serviceId, staffId, bookingDate, timeSlot, customerName, customerPhone, customerEmail, notes } =
      value;

    const userId = (req as any).user?._id || (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Verify store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      res.status(404).json({ success: false, message: 'Store not found' });
      return;
    }

    // Verify service exists and is active
    const service = await SalonService.findById(serviceId).lean();
    if (!service || !service.isActive) {
      res.status(404).json({ success: false, message: 'Service not found or inactive' });
      return;
    }
    if (service.storeId.toString() !== storeId) {
      res.status(400).json({ success: false, message: 'Service does not belong to this store' });
      return;
    }

    const effectiveDuration = service.duration + service.bufferTimeAfter;
    const parsedDate = new Date(bookingDate);

    // Check slot availability
    let resolvedStaffId: Types.ObjectId | null = null;
    if (staffId) {
      resolvedStaffId = new Types.ObjectId(staffId);
      // Verify staff exists and can perform this service
      const staff = await SalonStaff.findById(staffId).lean();
      if (!staff || !staff.isActive) {
        res.status(404).json({ success: false, message: 'Staff member not found or inactive' });
        return;
      }
      if (staff.storeId.toString() !== storeId) {
        res.status(400).json({ success: false, message: 'Staff member does not belong to this store' });
        return;
      }
    }

    const isAvailable = await SalonBooking.isSlotAvailable(
      new Types.ObjectId(storeId),
      resolvedStaffId,
      parsedDate,
      timeSlot,
      effectiveDuration,
    );

    if (!isAvailable) {
      res.status(409).json({
        success: false,
        message: 'The selected time slot is no longer available. Please choose another slot.',
        code: 'SLOT_UNAVAILABLE',
      });
      return;
    }

    // Create booking
    const booking = new SalonBooking({
      merchantId: store.merchantId,
      storeId: new Types.ObjectId(storeId),
      userId: new Types.ObjectId(userId.toString()),
      serviceId: new Types.ObjectId(serviceId),
      serviceName: service.name,
      staffId: resolvedStaffId,
      staffName: staffId ? (await SalonStaff.findById(staffId).select('name').lean())?.name : undefined,
      bookingDate: parsedDate,
      timeSlot,
      duration: service.duration,
      effectiveDuration,
      price: service.price,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      status: 'pending',
    });

    await booking.save();

    const populated = await SalonBooking.findById(booking._id)
      .populate('storeId', 'name logo location contact')
      .populate('serviceId', 'name category duration price imageUrl')
      .lean();

    logger.info(`[SalonBooking] Created booking ${booking.bookingNumber} for user ${userId}`);

    res.status(201).json({
      success: true,
      data: populated,
      message: 'Booking created successfully',
    });
  }),
);

// ─── GET /salon/bookings/user ──────────────────────────────────────────────────
// Get all bookings for the authenticated user.

router.get(
  '/bookings/user',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id || (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = parseInt(req.query.skip as string) || 0;
    const status = req.query.status as string | undefined;

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (status && ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'].includes(status)) {
      query.status = status;
    }

    const [bookings, total] = await Promise.all([
      SalonBooking.find(query)
        .populate('storeId', 'name logo location contact')
        .populate('serviceId', 'name category duration price imageUrl')
        .populate('staffId', 'name profileImageUrl')
        .sort({ bookingDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SalonBooking.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: { total, limit, skip, hasMore: skip + bookings.length < total },
    });
  }),
);

// ─── GET /salon/bookings/:bookingId ───────────────────────────────────────────
// Get a single booking by ID.

router.get(
  '/bookings/:bookingId',
  asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.params;
    if (!Types.ObjectId.isValid(bookingId)) {
      res.status(400).json({ success: false, message: 'Invalid booking ID' });
      return;
    }

    const booking = await SalonBooking.findById(bookingId)
      .populate('storeId', 'name logo location contact')
      .populate('serviceId', 'name category duration price imageUrl')
      .populate('staffId', 'name profileImageUrl')
      .lean();

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    res.json({ success: true, data: booking });
  }),
);

// ─── PATCH /salon/bookings/:bookingId/status ───────────────────────────────────
// Update booking status (user or merchant).

router.patch(
  '/bookings/:bookingId/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.params;

    if (!Types.ObjectId.isValid(bookingId)) {
      res.status(400).json({ success: false, message: 'Invalid booking ID' });
      return;
    }

    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }

    const { status, cancellationReason, note } = value;

    const booking = await SalonBooking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    await (booking as any).updateStatus(status, note || cancellationReason);

    const updated = await SalonBooking.findById(bookingId)
      .populate('storeId', 'name logo location')
      .populate('serviceId', 'name category duration price')
      .populate('staffId', 'name')
      .lean();

    logger.info(`[SalonBooking] ${booking.bookingNumber} status updated to ${status}`);

    res.json({
      success: true,
      data: updated,
      message: `Booking status updated to ${status}`,
    });
  }),
);

// ─── GET /salon/:merchantId/bookings ───────────────────────────────────────────
// Merchant: get all bookings for their stores.

router.get(
  '/:merchantId/bookings',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { date, storeId, status, limit, skip } = req.query;

    if (!Types.ObjectId.isValid(merchantId)) {
      res.status(400).json({ success: false, message: 'Invalid merchant ID' });
      return;
    }

    const storeQuery: any = { merchantId: new Types.ObjectId(merchantId) };
    if (storeId && Types.ObjectId.isValid(storeId as string)) {
      storeQuery._id = new Types.ObjectId(storeId as string);
    }

    const stores = await Store.find(storeQuery).select('_id').lean();
    if (stores.length === 0) {
      res.status(404).json({ success: false, message: 'No stores found for this merchant' });
      return;
    }
    const storeIds = stores.map((s) => s._id);

    const bookingQuery: any = { storeId: { $in: storeIds } };

    if (date && !isNaN(Date.parse(date as string))) {
      const parsedDate = new Date(date as string);
      const startOfDay = new Date(parsedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(parsedDate);
      endOfDay.setHours(23, 59, 59, 999);
      bookingQuery.bookingDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (
      status &&
      ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'].includes(status as string)
    ) {
      bookingQuery.status = status;
    }

    const parsedLimit = Math.min(parseInt(limit as string) || 50, 100);
    const parsedSkip = parseInt(skip as string) || 0;

    const [bookings, total] = await Promise.all([
      SalonBooking.find(bookingQuery)
        .populate('userId', 'profile.firstName profile.lastName profile.phoneNumber')
        .populate('serviceId', 'name category duration price')
        .populate('staffId', 'name profileImageUrl')
        .sort({ bookingDate: 1, timeSlot: 1 })
        .skip(parsedSkip)
        .limit(parsedLimit)
        .lean(),
      SalonBooking.countDocuments(bookingQuery),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: { total, limit: parsedLimit, skip: parsedSkip, hasMore: parsedSkip + bookings.length < total },
    });
  }),
);

export default router;
