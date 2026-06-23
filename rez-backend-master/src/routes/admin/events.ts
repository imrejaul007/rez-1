import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import Event from '../../models/Event';
import EventBooking from '../../models/EventBooking';
import EventAttendance from '../../models/EventAttendance';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/events
 * @desc    Get all events with filters and pagination (any status)
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const skip = (page - 1) * limit;

  const filter: any = {};

  // Status filter
  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }

  // Category filter
  if (req.query.category) {
    filter.category = req.query.category;
  }
  if (req.query.categoryId) {
    filter.categoryId = new Types.ObjectId(req.query.categoryId as string);
  }

  // Featured filter
  if (req.query.featured === 'true') {
    filter.featured = true;
  }

  // Merchant filter
  if (req.query.merchantId) {
    filter.merchantId = new Types.ObjectId(req.query.merchantId as string);
  }

  // Search
  if (req.query.search) {
    filter.$text = { $search: req.query.search as string };
  }

  // Date range
  if (req.query.dateFrom || req.query.dateTo) {
    filter.date = {};
    if (req.query.dateFrom) filter.date.$gte = new Date(req.query.dateFrom as string);
    if (req.query.dateTo) filter.date.$lte = new Date(req.query.dateTo as string);
  }

  const [events, total, statsAgg] = await Promise.all([
    Event.find(filter)
      .populate('categoryId', 'name slug icon')
      .populate('rewardConfigId', 'name rewards')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter),
    // Aggregate stats for dashboard cards
    Event.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          featured: { $sum: { $cond: [{ $eq: ['$featured', true] }, 1, 0] } },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalBookings: { $sum: { $ifNull: ['$analytics.bookings', 0] } },
        },
      },
    ]),
  ]);

  const stats = statsAgg[0] || { total: 0, active: 0, featured: 0, draft: 0, cancelled: 0, completed: 0, totalBookings: 0 };

  res.json({
    success: true,
    data: {
      events,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: skip + events.length < total,
      stats,
    },
  });
}));

/**
 * @route   GET /api/admin/events/:id
 * @desc    Get single event with all details
 * @access  Admin
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid event ID' });
  }

  const event = await Event.findById(req.params.id)
    .populate('categoryId', 'name slug icon color')
    .populate('rewardConfigId')
    .populate('merchantId', 'name email');

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  // Get booking stats
  const bookingStats = await EventBooking.aggregate([
    { $match: { eventId: event._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  // Get attendance count
  const attendanceCount = await EventAttendance.countDocuments({
    eventId: event._id,
    isVerified: true,
  });

  res.json({
    success: true,
    data: { event, bookingStats, attendanceCount },
  });
}));

/**
 * @route   POST /api/admin/events
 * @desc    Create a new event (admin-created)
 * @access  Admin
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    title, subtitle, description, image, images, price, location,
    date, time, endTime, category, categoryId, subcategory, organizer,
    isOnline, registrationRequired, availableSlots, status, tags,
    maxCapacity, minAge, requirements, includes, refundPolicy,
    cancellationPolicy, cancellationPolicyDetails, featured, priority,
    cashback, sponsors, rewardConfigId, schedule, ticketTypes,
  } = req.body;

  if (!title || !description || !image || !price || !location || !date || !time || !category || !organizer) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const event = await Event.create({
    title, subtitle, description, image, images, price, location,
    date: new Date(date), time, endTime, category, categoryId, subcategory,
    organizer, isOnline, registrationRequired, availableSlots,
    status: status || 'draft', tags, maxCapacity, minAge, requirements,
    includes, refundPolicy, cancellationPolicy, cancellationPolicyDetails,
    featured: featured || false, priority: priority || 0,
    cashback: cashback || 0, sponsors, rewardConfigId, schedule, ticketTypes,
  });

  // Update EventCategory event count if published
  if (event.status === 'published' && event.categoryId) {
    const EventCategory = (await import('../../models/EventCategory')).default;
    await (EventCategory as any).incrementEventCount(event.categoryId);
  }

  res.status(201).json({
    success: true,
    data: { event },
    message: 'Event created successfully',
  });
}));

/**
 * @route   PUT /api/admin/events/:id
 * @desc    Update any event
 * @access  Admin
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid event ID' });
  }

  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  const oldStatus = event.status;
  const oldCategoryId = event.categoryId?.toString();

  // Update allowed fields
  const allowedFields = [
    'title', 'subtitle', 'description', 'image', 'images', 'price', 'location',
    'date', 'time', 'endTime', 'category', 'categoryId', 'subcategory', 'organizer',
    'isOnline', 'registrationRequired', 'availableSlots', 'status', 'tags',
    'maxCapacity', 'minAge', 'requirements', 'includes', 'refundPolicy',
    'cancellationPolicy', 'cancellationPolicyDetails', 'featured', 'priority',
    'cashback', 'sponsors', 'rewardConfigId', 'schedule', 'ticketTypes',
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (event as any)[field] = req.body[field];
    }
  }

  await event.save();

  // Update EventCategory counts if status or category changed
  const EventCategory = (await import('../../models/EventCategory')).default;
  const newCategoryId = event.categoryId?.toString();

  if (oldStatus !== 'published' && event.status === 'published' && newCategoryId) {
    await (EventCategory as any).incrementEventCount(newCategoryId);
  } else if (oldStatus === 'published' && event.status !== 'published' && oldCategoryId) {
    await (EventCategory as any).decrementEventCount(oldCategoryId);
  } else if (oldStatus === 'published' && event.status === 'published' && oldCategoryId !== newCategoryId) {
    if (oldCategoryId) await (EventCategory as any).decrementEventCount(oldCategoryId);
    if (newCategoryId) await (EventCategory as any).incrementEventCount(newCategoryId);
  }

  res.json({
    success: true,
    data: { event },
    message: 'Event updated successfully',
  });
}));

/**
 * @route   DELETE /api/admin/events/:id
 * @desc    Delete event (checks for active bookings)
 * @access  Admin
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid event ID' });
  }

  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  // Check for active bookings
  const activeBookings = await EventBooking.countDocuments({
    eventId: event._id,
    status: { $in: ['confirmed', 'pending'] },
  });

  if (activeBookings > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete event with ${activeBookings} active booking(s). Cancel bookings first.`,
    });
  }

  // Update category count if published
  if (event.status === 'published' && event.categoryId) {
    const EventCategory = (await import('../../models/EventCategory')).default;
    await (EventCategory as any).decrementEventCount(event.categoryId);
  }

  await Event.findByIdAndDelete(req.params.id);

  res.json({ success: true, message: 'Event deleted successfully' });
}));

/**
 * @route   PUT /api/admin/events/:id/status
 * @desc    Change event status (publish, unpublish, cancel, complete)
 * @access  Admin
 */
router.put('/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['draft', 'published', 'cancelled', 'completed', 'sold_out'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  const oldStatus = event.status;
  event.status = status;
  await event.save();

  // Update category count
  const EventCategory = (await import('../../models/EventCategory')).default;
  if (oldStatus !== 'published' && status === 'published' && event.categoryId) {
    await (EventCategory as any).incrementEventCount(event.categoryId);
  } else if (oldStatus === 'published' && status !== 'published' && event.categoryId) {
    await (EventCategory as any).decrementEventCount(event.categoryId);
  }

  // If cancelling, cancel all active bookings
  if (status === 'cancelled') {
    await EventBooking.updateMany(
      { eventId: event._id, status: { $in: ['confirmed', 'pending'] } },
      { status: 'cancelled', notes: 'Event cancelled by admin' }
    );
  }

  res.json({
    success: true,
    data: { event },
    message: `Event status changed to ${status}`,
  });
}));

/**
 * @route   PUT /api/admin/events/:id/featured
 * @desc    Toggle featured status and set priority
 * @access  Admin
 */
router.put('/:id/featured', asyncHandler(async (req: Request, res: Response) => {
  const { featured, priority } = req.body;

  const update: any = {};
  if (typeof featured === 'boolean') update.featured = featured;
  if (typeof priority === 'number') update.priority = priority;

  const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  res.json({
    success: true,
    data: { event },
    message: `Event ${featured ? 'featured' : 'unfeatured'} successfully`,
  });
}));

/**
 * @route   GET /api/admin/events/:id/bookings
 * @desc    View all bookings for an event
 * @access  Admin
 */
router.get('/:id/bookings', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const skip = (page - 1) * limit;

  const filter: any = { eventId: new Types.ObjectId(req.params.id) };
  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }

  const [bookings, total] = await Promise.all([
    EventBooking.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EventBooking.countDocuments(filter),
  ]);

  // Aggregate stats
  const stats = await EventBooking.aggregate([
    { $match: { eventId: new Types.ObjectId(req.params.id) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        revenue: { $sum: '$amount' },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      bookings,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats,
    },
  });
}));

/**
 * @route   GET /api/admin/events/:id/analytics
 * @desc    Detailed event analytics
 * @access  Admin
 */
router.get('/:id/analytics', asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id).lean();
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  // Booking stats by status
  const bookingStats = await EventBooking.aggregate([
    { $match: { eventId: new Types.ObjectId(req.params.id) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        revenue: { $sum: '$amount' },
      },
    },
  ]);

  // Attendance stats
  const attendanceStats = await EventAttendance.aggregate([
    { $match: { eventId: new Types.ObjectId(req.params.id) } },
    {
      $group: {
        _id: null,
        totalCheckedIn: { $sum: { $cond: ['$isVerified', 1, 0] } },
        totalRewardsGranted: { $sum: { $size: '$rewardsGranted' } },
        totalCoinsAwarded: { $sum: { $sum: '$rewardsGranted.amount' } },
      },
    },
  ]);

  // Daily booking trend (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyBookings = await EventBooking.aggregate([
    {
      $match: {
        eventId: new Types.ObjectId(req.params.id),
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: {
      event: {
        analytics: event.analytics,
        maxCapacity: event.maxCapacity,
        availableSlots: event.availableSlots,
      },
      bookingStats,
      attendanceStats: attendanceStats[0] || { totalCheckedIn: 0, totalRewardsGranted: 0, totalCoinsAwarded: 0 },
      dailyBookings,
    },
  });
}));

export default router;
