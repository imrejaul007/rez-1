import { logger } from '../config/logger';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Event, EventBooking } from '../models';
import Payment from '../models/Payment';
import EventCategory from '../models/EventCategory';
import UserEventFavorite from '../models/UserEventFavorite';
import EventAttendance from '../models/EventAttendance';
import { asyncHandler } from '../utils/asyncHandler';
import { IEvent } from '../models/Event';
import { IEventBooking } from '../models/EventBooking';
import paymentGatewayService from '../services/paymentGatewayService';
import eventRewardService from '../services/eventRewardService';
import { regionService, isValidRegion, RegionId } from '../services/regionService';
import { withCache } from '../utils/cacheHelper';

// Helper function to escape regex special characters to prevent ReDoS attacks
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper function to create a safe regex query
const safeRegexQuery = (value: string): RegExp => {
  const escapedValue = escapeRegex(value.trim());
  return new RegExp(escapedValue, 'i');
};

// @desc    Get all published events
// @route   GET /api/events
// @access  Public
export const getAllEvents = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    location,
    date,
    limit: rawLimit = 20,
    offset: rawOffset = 0,
    featured,
    upcoming,
    todayAndFuture,
    sortBy = 'date'
  } = req.query;
  const limit = Math.min(Number(rawLimit) || 20, 100);
  const offset = Math.max(Number(rawOffset) || 0, 0);

  // Build query
  const query: any = { status: 'published' };

  // Apply region filtering from X-Rez-Region header
  const regionHeader = req.headers['x-rez-region'] as string;
  if (regionHeader && isValidRegion(regionHeader)) {
    const regionFilter = regionService.getEventFilter(regionHeader as RegionId);
    Object.assign(query, regionFilter);
    logger.info(`🌍 [EVENTS] Region filter applied: ${regionHeader}`);
  }

  if (category) {
    query.category = category;
  }

  if (location) {
    query['location.city'] = safeRegexQuery(location as string);
  }

  if (date) {
    const targetDate = new Date(date as string);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    query.date = {
      $gte: targetDate,
      $lt: nextDay
    };
  }

  if (featured === 'true') {
    query.featured = true;
  }

  if (upcoming === 'true') {
    query.date = { $gte: new Date() };
  }

  // Filter from start of today (includes today's events even if time has passed)
  if (todayAndFuture === 'true') {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    query.date = { $gte: startOfToday };
  }

  // Build sort
  let sort: any = { date: 1 };
  switch (sortBy) {
    case 'date':
      sort = { date: 1 };
      break;
    case 'popularity':
      sort = { 'analytics.views': -1 };
      break;
    case 'price':
      sort = { 'price.amount': 1 };
      break;
    case 'featured':
      sort = { featured: -1, priority: -1, date: 1 };
      break;
  }

  const cacheKey = `events:list:${offset}:${limit}:${JSON.stringify(query)}:${JSON.stringify(sort)}`;
  const result = await withCache(cacheKey, 1800, async () => {
    const [events, total] = await Promise.all([
      Event.find(query).sort(sort).limit(limit).skip(offset).lean(),
      Event.countDocuments(query),
    ]);
    return { events, total };
  });

  const { events, total } = result;

  res.json({
    success: true,
    data: {
      events,
      total,
      hasMore: offset + events.length < total,
      limit,
      offset: Number(offset)
    }
  });
});

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate that id is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid event ID format'
    });
  }

  const event = await Event.findById(id).lean();
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  if (event.status !== 'published') {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Increment view count
  await (event as any).incrementViews();

  res.json({
    success: true,
    data: event
  });
});

// @desc    Get events by category
// @route   GET /api/events/category/:category
// @access  Public
export const getEventsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const { limit: rawLim = 20, offset: rawOff = 0, subcategory, tags, dateFilter } = req.query;
  const limit = Math.min(Number(rawLim) || 20, 100);
  const offset = Math.max(Number(rawOff) || 0, 0);

  // Build query for category filtering
  const query: any = {
    category: safeRegexQuery(category),
    status: 'published'
  };

  // Apply region filtering from X-Rez-Region header
  const regionHeader = req.headers['x-rez-region'] as string;
  if (regionHeader && isValidRegion(regionHeader)) {
    const regionFilter = regionService.getEventFilter(regionHeader as RegionId);
    Object.assign(query, regionFilter);
  }

  // Apply date filter
  if (dateFilter && dateFilter !== 'all') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === 'today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.date = { $gte: today, $lt: tomorrow };
    } else if (dateFilter === 'thisWeek') {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      query.date = { $gte: today, $lte: endOfWeek };
    } else if (dateFilter === 'thisMonth') {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      query.date = { $gte: today, $lte: endOfMonth };
    }
  }

  // Add subcategory filter if provided
  if (subcategory) {
    query.subcategory = safeRegexQuery(subcategory as string);
  }

  // Add tags filter if provided (useful for frontend category mapping)
  if (tags) {
    const tagArray = (tags as string).split(',').map(t => t.trim().toLowerCase());
    query.tags = { $in: tagArray };
  }

  const events = await Event.find(query)
    .sort({ featured: -1, priority: -1, date: 1 })
    .limit(limit)
    .skip(offset)
    .lean();

  const total = await Event.countDocuments(query);

  res.json({
    success: true,
    data: {
      events,
      total,
      hasMore: offset + events.length < total
    }
  });
});

// @desc    Search events
// @route   GET /api/events/search
// @access  Public
export const searchEvents = asyncHandler(async (req: Request, res: Response) => {
  const {
    q,
    category,
    location,
    date,
    priceMin,
    priceMax,
    isOnline,
    limit: rawLim2 = 20,
    offset: rawOff2 = 0
  } = req.query;
  const limit = Math.min(Number(rawLim2) || 20, 100);
  const offset = Math.max(Number(rawOff2) || 0, 0);

  // Build search query
  const query: any = { status: 'published' };

  // Apply region filtering from X-Rez-Region header
  const regionHeader = req.headers['x-rez-region'] as string;
  if (regionHeader && isValidRegion(regionHeader)) {
    const regionFilter = regionService.getEventFilter(regionHeader as RegionId);
    Object.assign(query, regionFilter);
  }

  if (q) {
    query.$text = { $search: q as string };
  }

  if (category) {
    query.category = new RegExp(category as string, 'i');
  }

  if (location) {
    query['location.city'] = safeRegexQuery(location as string);
  }

  if (date) {
    const targetDate = new Date(date as string);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    query.date = {
      $gte: targetDate,
      $lt: nextDay
    };
  }

  if (priceMin || priceMax) {
    query['price.amount'] = {};
    if (priceMin) query['price.amount'].$gte = Number(priceMin);
    if (priceMax) query['price.amount'].$lte = Number(priceMax);
  }

  if (isOnline !== undefined) {
    query.isOnline = isOnline === 'true';
  }

  // Build sort - prioritize text search score if searching
  let sort: any = { date: 1 };
  if (q) {
    sort = { score: { $meta: 'textScore' }, date: 1 };
  }

  const events = await Event.find(query, q ? { score: { $meta: 'textScore' } } : {})
    .sort(sort)
    .limit(limit)
    .skip(offset)
    .lean();

  const total = await Event.countDocuments(query);

  // Get search suggestions
  const suggestions = await Event.distinct('category', { status: 'published' });

  res.json({
    success: true,
    data: {
      events,
      total,
      hasMore: offset + events.length < total,
      suggestions
    }
  });
});

// @desc    Get featured events for homepage
// @route   GET /api/events/featured
// @access  Public
export const getFeaturedEvents = asyncHandler(async (req: Request, res: Response) => {
  const { limit: rawLimFeat = 10 } = req.query;
  const limit = Math.min(Number(rawLimFeat) || 10, 50);

  // Build query
  const query: any = {
    featured: true,
    status: 'published',
    date: { $gte: new Date() }
  };

  // Apply region filtering from X-Rez-Region header
  const regionHeader = req.headers['x-rez-region'] as string;
  if (regionHeader && isValidRegion(regionHeader)) {
    const regionFilter = regionService.getEventFilter(regionHeader as RegionId);
    Object.assign(query, regionFilter);
  }

  const events = await Event.find(query)
    .sort({ priority: -1, date: 1 })
    .limit(limit)
    .lean();

  res.json({
    success: true,
    data: events
  });
});

// @desc    Book event slot (HARDENED: atomic inventory + idempotency + rewards)
// @route   POST /api/events/:id/book
// @access  Private
export const bookEventSlot = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { slotId, ticketTypeId, attendeeInfo, idempotencyKey } = req.body;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // 1. Idempotency check: if same key was used before, return existing booking
  if (idempotencyKey) {
    const existingByKey = await EventBooking.findOne({ idempotencyKey }).lean();
    if (existingByKey) {
      return res.status(200).json({
        success: true,
        data: { booking: existingByKey },
        message: 'Booking already exists (idempotent)',
      });
    }
  }

  // 2. Validate attendeeInfo
  if (!attendeeInfo || typeof attendeeInfo !== 'object') {
    return res.status(400).json({ success: false, message: 'Attendee information is required' });
  }
  if (!attendeeInfo.name || typeof attendeeInfo.name !== 'string' || attendeeInfo.name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Valid attendee name is required (minimum 2 characters)' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!attendeeInfo.email || !emailRegex.test(attendeeInfo.email)) {
    return res.status(400).json({ success: false, message: 'Valid email address is required' });
  }
  if (attendeeInfo.phone && !/^\+?[\d\s\-()]{10,}$/.test(attendeeInfo.phone)) {
    return res.status(400).json({ success: false, message: 'Invalid phone number format' });
  }
  if (attendeeInfo.age !== undefined && (typeof attendeeInfo.age !== 'number' || attendeeInfo.age < 0 || attendeeInfo.age > 150)) {
    return res.status(400).json({ success: false, message: 'Invalid age (must be between 0 and 150)' });
  }

  // Sanitize input
  attendeeInfo.name = attendeeInfo.name.trim();
  attendeeInfo.email = attendeeInfo.email.toLowerCase().trim();
  if (attendeeInfo.phone) attendeeInfo.phone = attendeeInfo.phone.trim();
  if (attendeeInfo.specialRequirements) attendeeInfo.specialRequirements = attendeeInfo.specialRequirements.trim().substring(0, 500);

  // 3. Find event
  const event = await Event.findById(id).lean();
  if (!event || event.status !== 'published') {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }
  if (event.date < new Date()) {
    return res.status(400).json({ success: false, message: 'Cannot book past events' });
  }

  // 4. Check for existing active booking
  const existingBooking = await EventBooking.findOne({
    eventId: id, userId, status: { $in: ['pending', 'confirmed'] }
  }).lean();
  if (existingBooking) {
    if (existingBooking.status === 'confirmed') {
      return res.status(400).json({ success: false, message: 'You have already booked this event' });
    }
    // Clean up stale pending bookings (expired lock or no payment)
    if (existingBooking.status === 'pending') {
      if (existingBooking.lockedUntil && existingBooking.lockedUntil < new Date()) {
        // Lock expired — release slot and delete
        if (existingBooking.slotId) {
          await Event.findOneAndUpdate(
            { _id: id, 'availableSlots.id': existingBooking.slotId },
            { $inc: { 'availableSlots.$.bookedCount': -1 } }
          );
        }
        await EventBooking.findByIdAndDelete(existingBooking._id);
      } else {
        await EventBooking.findByIdAndDelete(existingBooking._id);
      }
    }
  }

  // 5. ATOMIC slot inventory update (prevents overselling under concurrency)
  if (event.availableSlots && event.availableSlots.length > 0) {
    if (!slotId) {
      return res.status(400).json({ success: false, message: 'Slot ID is required for this event' });
    }

    // Atomic: increment bookedCount only if slot is available AND under capacity
    // Uses $elemMatch to ensure bookedCount < maxCapacity in the same query
    const slotUpdate = await Event.findOneAndUpdate(
      {
        _id: id,
        availableSlots: {
          $elemMatch: {
            id: slotId,
            available: true,
            $expr: { $lt: ['$bookedCount', '$maxCapacity'] },
          },
        },
      },
      {
        $inc: { 'availableSlots.$.bookedCount': 1 },
      },
      { new: true }
    );

    // Fallback: $expr inside $elemMatch isn't supported in all MongoDB versions
    // Try simpler approach if first query didn't match
    if (!slotUpdate) {
      // Check if slot exists but is full vs doesn't exist
      const existingEvent = await Event.findOne(
        { _id: id, 'availableSlots.id': slotId, 'availableSlots.available': true }
      ).lean();
      if (!existingEvent) {
        return res.status(409).json({ success: false, message: 'Selected slot is not available' });
      }
      const slot = existingEvent.availableSlots?.find(s => s.id === slotId);
      if (slot && slot.bookedCount >= slot.maxCapacity) {
        return res.status(409).json({ success: false, message: 'Slot is fully booked' });
      }
      // Try simple atomic increment with post-check
      const simpleUpdate = await Event.findOneAndUpdate(
        { _id: id, 'availableSlots.id': slotId, 'availableSlots.available': true },
        { $inc: { 'availableSlots.$.bookedCount': 1 } },
        { new: true }
      );
      if (!simpleUpdate) {
        return res.status(409).json({ success: false, message: 'Selected slot is not available or fully booked' });
      }
      // Post-check: verify we didn't exceed capacity
      const updatedSlot = simpleUpdate.availableSlots?.find(s => s.id === slotId);
      if (updatedSlot && updatedSlot.bookedCount > updatedSlot.maxCapacity) {
        await Event.findOneAndUpdate(
          { _id: id, 'availableSlots.id': slotId },
          { $inc: { 'availableSlots.$.bookedCount': -1 } }
        );
        return res.status(409).json({ success: false, message: 'Slot is fully booked' });
      }
    }
  }

  // 6. Determine booking amount (support ticketTypes)
  let bookingAmount = event.price.amount;
  if (ticketTypeId && event.ticketTypes && event.ticketTypes.length > 0) {
    const ticketType = event.ticketTypes.find((t: any) => t._id?.toString() === ticketTypeId || t.name === ticketTypeId);
    if (ticketType) {
      bookingAmount = ticketType.price;
    }
  }

  // 7. Generate booking reference
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const bookingReference = `EVT${timestamp}${random}`;

  const isFree = event.price.isFree || bookingAmount === 0;
  const lockDuration = 10 * 60 * 1000; // 10 minutes for payment

  // 8. Create booking
  const booking = new EventBooking({
    eventId: id,
    userId,
    slotId,
    ticketTypeId,
    quantity: 1,
    amount: bookingAmount,
    currency: event.price.currency,
    attendeeInfo,
    bookingReference,
    idempotencyKey: idempotencyKey || undefined,
    status: isFree ? 'confirmed' : 'pending',
    lockedUntil: isFree ? undefined : new Date(Date.now() + lockDuration),
    rewardsEarned: [],
  });

  await booking.save();

  // Increment event booking count
  await Event.findByIdAndUpdate(id, { $inc: { 'analytics.bookings': 1 } });

  // Increment ticketType soldCount if applicable
  if (ticketTypeId && event.ticketTypes && event.ticketTypes.length > 0) {
    await Event.findOneAndUpdate(
      { _id: id, 'ticketTypes._id': ticketTypeId },
      { $inc: { 'ticketTypes.$.soldCount': 1 } }
    );
  }

  // 9. Grant booking reward for free events (paid events get reward on confirmation)
  let rewardResult = null;
  if (isFree) {
    try {
      rewardResult = await eventRewardService.grantEventReward(
        userId.toString(), id, booking._id.toString(),
        'entry_reward',
        { eventName: event.title }
      );
    } catch (err) {
      logger.error('[EVENT BOOKING] Reward grant failed (non-blocking):', err);
    }
  }

  // 10. For paid events, create Stripe payment intent
  let paymentData = null;
  if (!isFree && bookingAmount > 0) {
    try {
      const normalizeCurrency = (currency: string): string => {
        const currencyMap: { [key: string]: string } = {
          '₹': 'inr', '$': 'usd', '€': 'eur', '£': 'gbp', '¥': 'jpy',
          'INR': 'inr', 'USD': 'usd', 'EUR': 'eur', 'GBP': 'gbp', 'JPY': 'jpy',
          'AED': 'aed', 'د.إ': 'aed',
        };
        return currencyMap[currency] || currency.toLowerCase();
      };

      const normalizedCurrency = normalizeCurrency(event.price.currency || '₹');

      const paymentResponse = await paymentGatewayService.initiatePayment(
        {
          amount: bookingAmount,
          currency: normalizedCurrency,
          paymentMethod: 'stripe',
          paymentMethodType: 'card',
          userDetails: {
            name: attendeeInfo?.name || '',
            email: attendeeInfo?.email || '',
            phone: attendeeInfo?.phone || '',
          },
          metadata: {
            eventId: id,
            bookingId: booking._id.toString(),
            userId: userId.toString(),
            eventTitle: event.title,
            slotId: slotId || '',
          },
        },
        userId.toString()
      );

      if (!paymentResponse.gatewayResponse || !paymentResponse.gatewayResponse.clientSecret) {
        throw new Error('Payment gateway did not return client secret');
      }

      const sessionId = paymentResponse.paymentUrl && typeof paymentResponse.paymentUrl === 'string'
        ? paymentResponse.paymentUrl.split('/').pop() || null
        : null;

      paymentData = {
        paymentIntentId: paymentResponse.gatewayResponse?.paymentIntentId || paymentResponse.paymentId || '',
        clientSecret: paymentResponse.gatewayResponse?.clientSecret || '',
        sessionId,
      };
    } catch (paymentError: any) {
      logger.error('❌ [EVENT BOOKING] Failed to create payment intent:', paymentError.message);
      // Rollback slot on payment failure
      if (slotId) {
        await Event.findOneAndUpdate(
          { _id: id, 'availableSlots.id': slotId },
          { $inc: { 'availableSlots.$.bookedCount': -1 } }
        );
      }
      await EventBooking.findByIdAndDelete(booking._id);
      throw new Error(`Failed to create payment intent: ${paymentError.message || 'Payment gateway error'}`);
    }
  }

  res.status(201).json({
    success: true,
    data: {
      booking,
      payment: paymentData,
      reward: rewardResult?.success ? { coinsAwarded: rewardResult.coinsAwarded, message: rewardResult.message } : null,
    },
    message: isFree
      ? `Event booked successfully${rewardResult?.success ? ` — +${rewardResult.coinsAwarded} coins earned!` : ''}`
      : 'Booking created. Please complete payment to confirm your booking.',
  });
});

// @desc    Get user's event bookings
// @route   GET /api/events/my-bookings
// @access  Private
export const getUserBookings = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { status, limit: rawLim3 = 20, offset: rawOff3 = 0 } = req.query;
  const limit = Math.min(Number(rawLim3) || 20, 100);
  const offset = Math.max(Number(rawOff3) || 0, 0);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const query: any = { userId };
  if (status) {
    query.status = status;
  }

  const bookings = await EventBooking.find(query)
    .populate('eventId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .lean();

  const total = await EventBooking.countDocuments(query);

  res.json({
    success: true,
    data: {
      bookings,
      total,
      hasMore: Number(offset) + bookings.length < total
    }
  });
});

// @desc    Confirm booking after payment
// @route   PUT /api/events/bookings/:bookingId/confirm
// @access  Private
export const confirmBooking = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const userId = (req as any).user?.id;
  const { paymentIntentId } = req.body;

  logger.info('🔍 [EVENT BOOKING] Confirm booking request:', {
    bookingId,
    userId,
    paymentIntentId,
    body: req.body
  });

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const booking = await EventBooking.findOne({
    _id: bookingId,
    userId
  }).lean();

  if (!booking) {
    logger.error('❌ [EVENT BOOKING] Booking not found:', { bookingId, userId });
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  logger.info('📋 [EVENT BOOKING] Booking found:', {
    bookingId: booking._id,
    status: booking.status,
    paymentStatus: booking.paymentStatus
  });

  if (booking.status === 'confirmed') {
    logger.info('✅ [EVENT BOOKING] Booking already confirmed');
    return res.json({
      success: true,
      message: 'Booking is already confirmed',
      data: { booking }
    });
  }

  if (booking.status === 'cancelled') {
    logger.error('❌ [EVENT BOOKING] Cannot confirm cancelled booking');
    return res.status(400).json({
      success: false,
      message: 'Cannot confirm a cancelled booking'
    });
  }

  // Verify payment if paymentIntentId is provided
  // For paid events, we require a paymentIntentId and verify it exists
  if (paymentIntentId) {
    try {
      const payment = await Payment.findOne({
        $or: [
          { paymentId: paymentIntentId },
          { 'gatewayResponse.paymentIntentId': paymentIntentId }
        ],
        user: userId
      }).lean();

      if (payment) {
        logger.info('✅ [EVENT BOOKING] Payment found for confirmation:', {
          paymentId: payment.paymentId,
          status: payment.status,
          bookingId
        });
        // Accept if payment is completed or processing (webhook may update later)
        if (payment.status === 'failed' || payment.status === 'cancelled' || payment.status === 'expired') {
          return res.status(400).json({
            success: false,
            message: `Cannot confirm booking — payment is ${payment.status}`,
          });
        }
      } else {
        // Payment record not created yet — allow a small window for webhook to process
        // The webhook will handle final confirmation as a backup
        logger.warn('⚠️ [EVENT BOOKING] Payment not found yet — proceeding with confirmation. Webhook will validate:', paymentIntentId);
      }
    } catch (error) {
      logger.error('❌ [EVENT BOOKING] Error verifying payment:', error);
      // Continue — webhook will handle final validation
    }
  } else if (booking.amount > 0) {
    // Paid booking but no paymentIntentId provided — reject
    return res.status(400).json({
      success: false,
      message: 'Payment intent ID is required to confirm a paid booking',
    });
  }

  // Update booking status to confirmed
  try {
    booking.status = 'confirmed';
    if (booking.paymentStatus) {
      booking.paymentStatus = 'completed';
    }
    booking.lockedUntil = undefined; // Clear inventory lock
    await booking.save();

    logger.info('✅ [EVENT BOOKING] Booking confirmed successfully:', {
      bookingId: booking._id,
      status: booking.status,
      paymentStatus: booking.paymentStatus
    });

    // Grant purchase reward on payment confirmation (paid events)
    let rewardResult = null;
    try {
      const event = await Event.findById(booking.eventId).lean();
      rewardResult = await eventRewardService.grantEventReward(
        userId.toString(),
        booking.eventId.toString(),
        booking._id.toString(),
        'purchase_reward',
        { eventName: event?.title || 'Event' }
      );
    } catch (err) {
      logger.error('[EVENT BOOKING] Reward grant on confirm failed (non-blocking):', err);
    }

    res.json({
      success: true,
      message: `Booking confirmed successfully${rewardResult?.success ? ` — +${rewardResult.coinsAwarded} coins earned!` : ''}`,
      data: {
        booking,
        reward: rewardResult?.success ? { coinsAwarded: rewardResult.coinsAwarded, message: rewardResult.message } : null,
      }
    });
  } catch (error: any) {
    logger.error('❌ [EVENT BOOKING] Error saving booking:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to confirm booking',
      error: error.errors || error
    });
  }
});

// @desc    Cancel event booking
// @route   DELETE /api/events/bookings/:bookingId
// @access  Private
export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const booking = await EventBooking.findOne({
    _id: bookingId,
    userId
  }).lean();

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  if (booking.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'Booking is already cancelled'
    });
  }

  // Update slot availability if applicable
  if (booking.slotId) {
    const event = await Event.findById(booking.eventId).lean();
    if (event && event.availableSlots) {
      const slot = event.availableSlots.find(s => s.id === booking.slotId);
      if (slot) {
        slot.bookedCount = Math.max(0, slot.bookedCount - 1);
        await event.save();
      }
    }
  }

  await (booking as any).cancel('Cancelled by user');

  res.json({
    success: true,
    message: 'Booking cancelled successfully'
  });
});

// @desc    Toggle event favorite (per-user persistence)
// @route   POST /api/events/:id/favorite
// @access  Private
export const toggleEventFavorite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const event = await Event.findById(id).lean();
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  // Toggle using UserEventFavorite model (per-user tracking)
  const result = await (UserEventFavorite as any).toggle(userId, id);

  // Update analytics counter
  if (result.isFavorited) {
    await Event.findByIdAndUpdate(id, { $inc: { 'analytics.favorites': 1 } });
  } else {
    await Event.findByIdAndUpdate(id, { $inc: { 'analytics.favorites': -1 } });
  }

  res.json({
    success: true,
    data: { isFavorited: result.isFavorited },
    message: result.isFavorited ? 'Event added to favorites' : 'Event removed from favorites',
  });
});

// @desc    Get related events
// @route   GET /api/events/:id/related
// @access  Public
export const getRelatedEvents = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit = 6 } = req.query;

  try {
    const event = await Event.findById(id).lean();
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Find related events based on:
    // 1. Same category (highest priority)
    // 2. Same location (secondary)
    const categoryQuery: any = { category: event.category, _id: { $ne: id }, status: 'published' };
    const locationQuery: any = event.location?.city 
      ? { 'location.city': event.location.city, _id: { $ne: id }, status: 'published' }
      : null;

    // Get events from same category first
    const categoryEvents = await Event.find(categoryQuery)
      .limit(Number(limit))
      .sort({ date: 1, 'analytics.views': -1 })
      .lean();

    // If not enough events, add events from same location
    let relatedEvents: any[] = [...categoryEvents];
    if (relatedEvents.length < Number(limit) && locationQuery) {
      const locationEvents = await Event.find(locationQuery)
        .limit(Number(limit) - relatedEvents.length)
        .sort({ date: 1, 'analytics.views': -1 })
        .lean();
      
      relatedEvents = [
        ...relatedEvents,
        ...locationEvents.filter((e: any) => !relatedEvents.some((re: any) => re._id.toString() === e._id.toString()))
      ];
    }

    // Limit to requested count
    relatedEvents = relatedEvents.slice(0, Number(limit));

    res.json({
      success: true,
      data: relatedEvents,
      message: 'Related events retrieved successfully'
    });
  } catch (error) {
    logger.error('❌ [RELATED EVENTS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get related events'
    });
  }
});

// @desc    Share event (with optional reward for authenticated users)
// @route   POST /api/events/:id/share
// @access  Public (reward only for authenticated)
export const shareEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.id;

  const event = await Event.findById(id).lean();
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  await Event.findByIdAndUpdate(id, { $inc: { 'analytics.shares': 1 } });

  // Grant sharing reward if user is authenticated
  let rewardResult = null;
  if (userId) {
    try {
      // Check if user has a booking for this event (required for share reward)
      const hasBooking = await EventBooking.findOne({
        eventId: id, userId, status: { $in: ['confirmed', 'completed'] }
      }).lean();
      if (hasBooking) {
        rewardResult = await eventRewardService.grantEventReward(
          userId.toString(), id, hasBooking._id.toString(),
          'sharing_reward',
          { eventName: event.title }
        );
      }
    } catch (err) {
      logger.error('[EVENT SHARE] Reward grant failed (non-blocking):', err);
    }
  }

  res.json({
    success: true,
    message: rewardResult?.success
      ? `Event shared — +${rewardResult.coinsAwarded} coins earned!`
      : userId
        ? 'Event share recorded. Book this event to earn sharing rewards!'
        : 'Event share recorded',
    data: rewardResult?.success ? { reward: { coinsAwarded: rewardResult.coinsAwarded } } : undefined,
  });
});

// @desc    Get event analytics
// @route   GET /api/events/:id/analytics
// @access  Private (Admin/Organizer)
export const getEventAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const event = await Event.findById(id).lean();
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Get booking statistics
  const bookingStats = await EventBooking.aggregate([
    { $match: { eventId: event._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      event: {
        id: event._id,
        title: event.title,
        analytics: event.analytics
      },
      bookingStats
    }
  });
});

// @desc    Track event analytics events
// @route   POST /api/events/analytics/track
// @access  Public (optional auth)
export const trackEventAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { events } = req.body;

  if (!events || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Events array is required'
    });
  }

  try {
    // Process each event
    const results = await Promise.allSettled(
      events.map(async (eventData: any) => {
        const { eventId, eventType, metadata } = eventData;

        if (!eventId || !eventType) {
          return { success: false, message: 'Missing eventId or eventType' };
        }

        const event = await Event.findById(eventId);
        if (!event) {
          return { success: false, message: `Event ${eventId} not found` };
        }

        // Update analytics based on event type
        switch (eventType) {
          case 'view':
            await event.incrementViews();
            break;
          case 'favorite':
            await event.incrementFavorites();
            break;
          case 'unfavorite':
            // Decrement favorites (if needed, you might want to add a method for this)
            if (event.analytics.favorites > 0) {
              event.analytics.favorites -= 1;
              await event.save();
            }
            break;
          case 'share':
            await event.incrementShares();
            break;
          case 'booking_start':
          case 'booking_complete':
            // These are tracked separately via bookings, but we can log them
            // The actual booking count is updated when booking is created
            break;
          case 'slot_select':
          case 'payment_start':
          case 'payment_complete':
          case 'payment_failed':
          case 'add_to_cart':
            // These are informational events, no direct analytics update needed
            break;
          default:
            // Unknown event type, but we'll still accept it
            break;
        }

        return { success: true, eventId, eventType };
      })
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    res.json({
      success: true,
      message: `Processed ${successful} of ${events.length} events`,
      processed: successful,
      failed
    });
  } catch (error: any) {
    logger.error('❌ [EVENT ANALYTICS] Error tracking events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track events',
      error: error.message
    });
  }
});

// @desc    Get dynamic event categories (public)
// @route   GET /api/events/categories
// @access  Public
export const getEventCategories = asyncHandler(async (req: Request, res: Response) => {
  const { featured } = req.query;

  let categories;
  if (featured === 'true') {
    categories = await (EventCategory as any).getFeatured();
  } else {
    categories = await (EventCategory as any).getActive();
  }

  res.json({
    success: true,
    data: { categories },
  });
});

// @desc    Get global reward config (for entry card "Ways to earn")
// @route   GET /api/events/reward-config
// @access  Public
export const getGlobalRewardConfig = asyncHandler(async (req: Request, res: Response) => {
  const rewardInfo = await eventRewardService.getGlobalRewardConfig();

  res.json({
    success: true,
    data: rewardInfo,
  });
});

// @desc    Check-in to event (verified attendance + reward)
// @route   POST /api/events/:id/checkin
// @access  Private
export const checkInToEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { bookingId, method, location } = req.body;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (!bookingId) {
    return res.status(400).json({ success: false, message: 'bookingId is required' });
  }

  // Verify booking exists and is confirmed
  const booking = await EventBooking.findOne({
    _id: bookingId, eventId: id, userId, status: 'confirmed',
  }).lean();
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Confirmed booking not found' });
  }

  const event = await Event.findById(id).lean();
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  // Validate event is in a checkable state
  if (event.status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Cannot check in to a cancelled event' });
  }
  if (event.status === 'draft') {
    return res.status(400).json({ success: false, message: 'Cannot check in to an unpublished event' });
  }

  // Geo-fence validation (if location provided and event has coordinates)
  if (method === 'geo_fence' && location && event.location?.coordinates) {
    const distance = getDistanceInMeters(
      location.lat, location.lng,
      event.location.coordinates.lat, event.location.coordinates.lng
    );
    if (distance > 500) { // 500m radius
      return res.status(400).json({
        success: false,
        message: 'You are too far from the event venue. Please check in within 500m.',
      });
    }
  }

  // Get or create attendance record (idempotent)
  const attendance = await (EventAttendance as any).getOrCreate(id, userId, bookingId);

  if (attendance.isVerified) {
    return res.json({
      success: true,
      data: { attendance },
      message: 'Already checked in',
    });
  }

  // Mark as verified
  attendance.checkInMethod = method || 'organiser_manual';
  attendance.checkInTime = new Date();
  attendance.isVerified = true;
  if (location) {
    attendance.checkInLocation = { lat: location.lat, lng: location.lng };
  }
  await attendance.save();

  // Update booking status
  booking.checkInTime = new Date();
  booking.status = 'completed';
  await booking.save();

  // Grant check-in reward
  let rewardResult = null;
  try {
    rewardResult = await eventRewardService.grantEventReward(
      userId.toString(), id, bookingId,
      'checkin_reward',
      { eventName: event.title, checkInMethod: method }
    );
  } catch (err) {
    logger.error('[EVENT CHECKIN] Reward grant failed (non-blocking):', err);
  }

  res.json({
    success: true,
    data: {
      attendance,
      reward: rewardResult?.success ? { coinsAwarded: rewardResult.coinsAwarded } : null,
    },
    message: `Checked in successfully${rewardResult?.success ? ` — +${rewardResult.coinsAwarded} coins earned!` : ''}`,
  });
});

// @desc    Check if user has favorited a specific event
// @route   GET /api/events/:id/favorite-status
// @access  Private
export const getFavoriteStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const favorite = await UserEventFavorite.findOne({ userId, eventId: id }).lean();
  res.json({ success: true, data: { isFavorited: !!favorite } });
});

// @desc    Get user's favorited events
// @route   GET /api/events/my-favorites
// @access  Private
export const getMyFavorites = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { limit = 20, offset = 0 } = req.query;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const favoriteIds = await (UserEventFavorite as any).getUserFavoriteIds(userId);

  const events = await Event.find({
    _id: { $in: favoriteIds },
    status: 'published',
  })
    .sort({ date: 1 })
    .limit(Number(limit))
    .skip(Number(offset))
    .lean();

  res.json({
    success: true,
    data: { events, total: favoriteIds.length },
  });
});

// @desc    Get user's event overview (bookings + favorites + attended)
// @route   GET /api/events/my-events
// @access  Private
export const getMyEvents = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { tab = 'upcoming' } = req.query; // upcoming, past, favorites

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (tab === 'favorites') {
    const favoriteIds = await (UserEventFavorite as any).getUserFavoriteIds(userId);
    const events = await Event.find({ _id: { $in: favoriteIds }, status: 'published' })
      .sort({ date: 1 }).limit(50).lean();
    return res.json({ success: true, data: { events, tab: 'favorites' } });
  }

  const now = new Date();
  const bookingFilter: any = { userId };

  if (tab === 'upcoming') {
    bookingFilter.status = { $in: ['confirmed', 'pending'] };
  } else if (tab === 'past') {
    bookingFilter.status = { $in: ['completed', 'cancelled', 'refunded'] };
  }

  const bookings = await EventBooking.find(bookingFilter)
    .populate('eventId')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // For past bookings, enrich with reward info (batch query instead of N+1)
  if (tab === 'past' && bookings.length > 0) {
    const eventIds = bookings
      .map(b => (b as any).eventId?._id)
      .filter(Boolean);
    const attendances = await EventAttendance.find({
      eventId: { $in: eventIds },
      userId,
    }).lean();
    const attendanceMap = new Map(
      attendances.map(a => [String(a.eventId), a])
    );
    for (const booking of bookings) {
      const eid = String((booking as any).eventId?._id);
      (booking as any).attendance = attendanceMap.get(eid) || null;
    }
  }

  res.json({
    success: true,
    data: { bookings, tab },
  });
});

// @desc    Get reward info for an event
// @route   GET /api/events/:id/rewards
// @access  Public
export const getEventRewardInfo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const rewardInfo = await eventRewardService.getEventRewardInfo(id);

  res.json({
    success: true,
    data: rewardInfo,
  });
});

// Helper: calculate distance between two coordinates in meters (Haversine formula)
function getDistanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
