import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { TableBooking } from '../models/TableBooking';
import { Store } from '../models/Store';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendBadRequest,
  sendError
} from '../utils/response';
import { NotificationService } from '../services/notificationService';
import merchantNotificationService from '../services/merchantNotificationService';
import { asyncHandler } from '../utils/asyncHandler';

// Create new table booking
export const createTableBooking = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const {
      storeId,
      bookingDate,
      bookingTime,
      partySize,
      customerName,
      customerPhone,
      customerEmail,
      specialRequests
    } = req.body;

    // Validate required fields
    if (!storeId || !bookingDate || !bookingTime || !partySize || !customerName || !customerPhone) {
      logger.error('[TABLE BOOKING] Missing required fields');
      return sendBadRequest(res, 'All required fields must be provided');
    }

    // Check if store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      logger.error('[TABLE BOOKING] Store not found:', storeId);
      return sendNotFound(res, 'Store not found');
    }

    const bookingConfig = (store as any).bookingConfig;

    // Check if bookings are enabled for this store
    if (bookingConfig && bookingConfig.enabled === false) {
      return sendBadRequest(res, 'Table bookings are not available for this restaurant');
    }

    // Validate booking date is not in the past
    const bookingDateTime = new Date(bookingDate);
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0); // Reset time to start of day for comparison

    if (bookingDateTime < now) {
      logger.error('[TABLE BOOKING] Booking date is in the past');
      return sendBadRequest(res, 'Booking date cannot be in the past');
    }

    // Validate advance booking window
    if (bookingConfig?.advanceBookingDays) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + bookingConfig.advanceBookingDays);
      maxDate.setUTCHours(23, 59, 59, 999);
      if (bookingDateTime > maxDate) {
        return sendBadRequest(res, `Bookings can only be made up to ${bookingConfig.advanceBookingDays} days in advance`);
      }
    }

    // Validate booking time is within store working hours
    if (bookingConfig?.workingHours?.start && bookingConfig?.workingHours?.end) {
      const workStart = bookingConfig.workingHours.start;
      const workEnd = bookingConfig.workingHours.end;
      if (bookingTime < workStart || bookingTime > workEnd) {
        return sendBadRequest(res, `Bookings are only available between ${workStart} and ${workEnd}`);
      }
    }

    // Validate party size
    const minParty = bookingConfig?.minPartySize || 1;
    const maxParty = bookingConfig?.maxPartySize || 50;
    if (partySize < minParty || partySize > maxParty) {
      return sendBadRequest(res, `Party size must be between ${minParty} and ${maxParty}`);
    }

    // Check for duplicate booking (same user, store, date, time)
    const startOfBookingDay = new Date(bookingDateTime);
    startOfBookingDay.setUTCHours(0, 0, 0, 0);
    const endOfBookingDay = new Date(bookingDateTime);
    endOfBookingDay.setUTCHours(23, 59, 59, 999);

    const duplicateBooking = await TableBooking.findOne({
      userId: new Types.ObjectId(userId),
      storeId: new Types.ObjectId(storeId),
      bookingDate: { $gte: startOfBookingDay, $lte: endOfBookingDay },
      bookingTime,
      status: { $in: ['pending', 'confirmed'] }
    }).lean();

    if (duplicateBooking) {
      return sendBadRequest(res, 'You already have a booking at this restaurant for this time slot');
    }

    // Check availability before creating booking (prevent overbooking)
    const maxCapacity = bookingConfig?.maxTableCapacity || 50;

    const existingBookings = await TableBooking.find({
      storeId: new Types.ObjectId(storeId),
      bookingDate: { $gte: startOfBookingDay, $lte: endOfBookingDay },
      bookingTime,
      status: { $in: ['pending', 'confirmed'] }
    }).select('partySize').lean();

    const totalBooked = existingBookings.reduce((sum, b) => sum + b.partySize, 0);
    if (totalBooked + partySize > maxCapacity) {
      const remaining = maxCapacity - totalBooked;
      logger.error('[TABLE BOOKING] Slot full. Booked:', totalBooked, 'Requested:', partySize, 'Max:', maxCapacity);
      return sendBadRequest(
        res,
        remaining > 0
          ? `Only ${remaining} seats available at ${bookingTime}. Please choose a different time or reduce party size.`
          : `This time slot (${bookingTime}) is fully booked. Please choose a different time.`
      );
    }

    // Create booking
    const booking = new TableBooking({
      storeId: new Types.ObjectId(storeId),
      userId: new Types.ObjectId(userId),
      bookingDate: bookingDateTime,
      bookingTime,
      partySize,
      customerName,
      customerPhone,
      customerEmail,
      specialRequests,
      status: 'pending'
    });

    await booking.save();


    // Populate booking for response
    const populatedBooking = await TableBooking.findById(booking._id)
      .populate('storeId', 'name logo location contact')
      .populate('userId', 'profile.firstName profile.lastName phoneNumber email').lean();

    // Send notifications (fire-and-forget)
    const formattedDate = bookingDateTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    NotificationService.createNotification({
      userId,
      title: 'Table Booking Received',
      message: `Your table for ${partySize} at ${store.name} on ${formattedDate} at ${bookingTime} has been received. The restaurant will confirm shortly.`,
      type: 'success',
      category: 'order',
      priority: 'medium',
      data: {
        orderId: booking._id?.toString(),
        deepLink: '/BookingsPage',
        actionButton: {
          text: 'View Booking',
          action: 'navigate',
          target: '/BookingsPage'
        }
      },
      deliveryChannels: ['push', 'in_app'],
      source: 'automated'
    }).catch((err: any) => logger.error('[TABLE BOOKING] Failed to send user notification:', err.message));

    if ((store as any).merchantId) {
      merchantNotificationService.notifyNewVisit({
        merchantId: (store as any).merchantId.toString(),
        visitId: booking._id?.toString() || '',
        visitNumber: booking.bookingNumber,
        customerName,
        visitDate: formattedDate,
        visitTime: bookingTime,
        visitType: 'scheduled',
        storeName: store.name
      }).catch((err: any) => logger.error('[TABLE BOOKING] Failed to send merchant notification:', err.message));
    }

    return sendCreated(res, populatedBooking, 'Table booking created successfully');
});

// Get user's table bookings
export const getUserTableBookings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { status, page = 1, limit = 20 } = req.query;

    // Auto-expire past bookings for this user (non-blocking)
    try {
      await TableBooking.markNoShows({ userId: new Types.ObjectId(userId) });
    } catch (err: any) {
      logger.error('[TABLE BOOKING] Auto-expiry error:', err.message);
    }

    const query: any = { userId: new Types.ObjectId(userId) };
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [bookings, total] = await Promise.all([
      TableBooking.find(query)
        .populate('storeId', 'name logo location contact')
        .sort({ bookingDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TableBooking.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / Number(limit));


    return sendSuccess(res, {
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Bookings retrieved successfully');
});

// Get table booking by ID
export const getTableBooking = asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.params;
    const userId = req.userId!;


    const booking = await TableBooking.findOne({
      _id: bookingId,
      userId: new Types.ObjectId(userId)
    })
      .populate('storeId', 'name logo location contact')
      .populate('userId', 'profile.firstName profile.lastName phoneNumber email')
      .lean();

    if (!booking) {
      logger.error('[TABLE BOOKING] Booking not found:', bookingId);
      return sendNotFound(res, 'Booking not found');
    }


    return sendSuccess(res, booking, 'Booking retrieved successfully');
});

// Get store's table bookings (for store owners)
export const getStoreTableBookings = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const userId = req.userId!;
    const { date, status, page = 1, limit = 50 } = req.query;

    // Validate storeId
    if (!Types.ObjectId.isValid(storeId)) {
      return sendBadRequest(res, 'Invalid store ID');
    }

    // Check if store exists and verify ownership
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Verify the requesting user is the store owner (merchant) or admin
    const isOwner = (store as any).merchantId && (store as any).merchantId.toString() === userId;
    const isAdmin = (req as any).user?.role === 'admin';
    if (!isOwner && !isAdmin) {
      return sendBadRequest(res, 'You do not have permission to view this store\'s bookings');
    }

    // Auto-expire past bookings for this store (non-blocking)
    try {
      await TableBooking.markNoShows({ storeId: new Types.ObjectId(storeId) });
    } catch (err: any) {
      logger.error('[TABLE BOOKING] Auto-expiry error:', err.message);
    }

    const query: any = { storeId: new Types.ObjectId(storeId) };

    // Filter by date if provided
    if (date) {
      const bookingDate = new Date(date as string);
      const startOfDay = new Date(bookingDate);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(bookingDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      query.bookingDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [bookings, total] = await Promise.all([
      TableBooking.find(query)
        .populate('userId', 'profile.firstName profile.lastName phoneNumber email')
        .sort({ bookingDate: 1, bookingTime: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TableBooking.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / Number(limit));


    return sendSuccess(res, {
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Store bookings retrieved successfully');
});

// Get all table bookings across all stores owned by the merchant
export const getMerchantTableBookings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { date, status, page = 1, limit = 50 } = req.query;


    // Find all stores owned by this merchant
    const merchantStores = await Store.find({ merchantId: new Types.ObjectId(userId) }).select('_id name').lean();

    if (!merchantStores.length) {
      return sendSuccess(res, {
        bookings: [],
        stores: [],
        pagination: { page: 1, limit: Number(limit), total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      }, 'No stores found');
    }

    const storeIds = merchantStores.map(s => s._id);

    // Auto-expire past bookings for merchant's stores (non-blocking)
    try {
      await TableBooking.markNoShows({ storeId: { $in: storeIds } });
    } catch (err: any) {
      logger.error('[TABLE BOOKING] Auto-expiry error:', err.message);
    }

    const query: any = { storeId: { $in: storeIds } };

    if (date) {
      const bookingDate = new Date(date as string);
      const startOfDay = new Date(bookingDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(bookingDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.bookingDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [bookings, total] = await Promise.all([
      TableBooking.find(query)
        .populate('storeId', 'name logo')
        .populate('userId', 'profile.firstName profile.lastName phoneNumber email')
        .sort({ bookingDate: -1, bookingTime: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TableBooking.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / Number(limit));


    return sendSuccess(res, {
      bookings,
      stores: merchantStores,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Merchant bookings retrieved successfully');
});

// Update table booking status (for store owners/merchants)
export const updateTableBookingStatus = asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.params;
    const userId = req.userId!;
    const { status } = req.body;


    // Validate status
    const validStatuses = ['confirmed', 'completed', 'cancelled', 'no_show'];
    if (!status || !validStatuses.includes(status)) {
      return sendBadRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Find the booking
    const booking = await TableBooking.findById(bookingId).lean();
    if (!booking) {
      return sendNotFound(res, 'Booking not found');
    }

    // Verify the merchant owns the store
    const store = await Store.findOne({
      _id: booking.storeId,
      merchantId: new Types.ObjectId(userId)
    }).lean();

    if (!store) {
      return sendBadRequest(res, 'You do not have permission to update this booking');
    }

    // Validate status transitions — terminal states cannot be changed
    if (booking.status === 'cancelled') {
      return sendBadRequest(res, 'Cannot update a cancelled booking');
    }
    if (booking.status === 'completed') {
      return sendBadRequest(res, 'Cannot update a completed booking');
    }
    if (booking.status === 'no_show') {
      return sendBadRequest(res, 'Cannot update a no-show booking');
    }
    if (status === 'completed' && booking.status !== 'confirmed') {
      return sendBadRequest(res, 'Booking must be confirmed before marking as completed');
    }

    const previousStatus = booking.status as string;

    // Update status via findByIdAndUpdate (booking is lean — .save() won't work)
    await TableBooking.findByIdAndUpdate(bookingId, { $set: { status } });

    // Award REZ coins for table booking milestones
    if (status === 'confirmed' && previousStatus !== 'confirmed') {
      try {
        const rewardEngine = (await import('../core/rewardEngine')).default;
        await rewardEngine.issue({
          userId: booking.userId.toString(),
          amount: 5,
          coinType: 'rez',
          source: 'order',
          rewardType: 'engagement',
          description: `Booking confirmed at ${store.name}`,
          operationType: 'loyalty_credit',
          referenceId: `table-booking-confirm:${booking._id}`,
          referenceModel: 'TableBooking',
        });
      } catch (err) {
        logger.warn('[TABLE BOOKING] Failed to award confirm coins:', (err as Error).message);
      }
    }
    if (status === 'completed' && previousStatus !== 'completed') {
      try {
        const rewardEngine = (await import('../core/rewardEngine')).default;
        await rewardEngine.issue({
          userId: booking.userId.toString(),
          amount: 20,
          coinType: 'rez',
          source: 'order',
          rewardType: 'engagement',
          description: `20 REZ coins for dining at ${store.name}`,
          operationType: 'loyalty_credit',
          referenceId: `table-booking:${booking._id}`,
          referenceModel: 'TableBooking',
          metadata: {
            storeId: booking.storeId.toString(),
            partySize: booking.partySize,
            bookingDate: booking.bookingDate,
          },
        });
      } catch (err) {
        logger.warn('[TABLE BOOKING] Failed to award completion coins:', (err as Error).message);
      }
    }

    const populatedBooking = await TableBooking.findById(booking._id)
      .populate('storeId', 'name logo location contact')
      .populate('userId', 'profile.firstName profile.lastName phoneNumber email').lean();

    // Notify the customer about status change (fire-and-forget)
    const statusMessages: Record<string, { title: string; message: string; type: 'success' | 'warning' | 'info' }> = {
      confirmed: {
        title: 'Booking Confirmed',
        message: `Your table booking at ${store.name} has been confirmed! See you on ${booking.bookingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${booking.bookingTime}.`,
        type: 'success'
      },
      completed: {
        title: 'Booking Completed',
        message: `Thank you for dining at ${store.name}! We hope you enjoyed your visit.`,
        type: 'success'
      },
      cancelled: {
        title: 'Booking Cancelled by Restaurant',
        message: `Unfortunately, ${store.name} has cancelled your booking for ${booking.bookingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${booking.bookingTime}. Please try rebooking or contact the restaurant.`,
        type: 'warning'
      },
      no_show: {
        title: 'Booking Marked as No Show',
        message: `Your booking at ${store.name} was marked as a no-show. If this was a mistake, please contact the restaurant.`,
        type: 'warning'
      }
    };

    const notifConfig = statusMessages[status];
    if (notifConfig) {
      NotificationService.createNotification({
        userId: booking.userId.toString(),
        title: notifConfig.title,
        message: notifConfig.message,
        type: notifConfig.type,
        category: 'order',
        priority: 'medium',
        data: {
          orderId: booking._id?.toString(),
          deepLink: '/BookingsPage',
          actionButton: {
            text: 'View Booking',
            action: 'navigate',
            target: '/BookingsPage'
          }
        },
        deliveryChannels: ['push', 'in_app'],
        source: 'automated'
      }).catch((err: any) => logger.error('[TABLE BOOKING] Failed to send status notification:', err.message));
    }

    return sendSuccess(res, populatedBooking, `Booking ${status} successfully`);
});

// Cancel table booking
export const cancelTableBooking = asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.params;
    const userId = req.userId!;
    const { reason } = req.body;


    const booking = await TableBooking.findOne({
      _id: bookingId,
      userId: new Types.ObjectId(userId)
    });

    if (!booking) {
      logger.error('[TABLE BOOKING] Booking not found:', bookingId);
      return sendNotFound(res, 'Booking not found');
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      logger.error('[TABLE BOOKING] Booking already cancelled');
      return sendBadRequest(res, 'Booking is already cancelled');
    }

    if (booking.status === 'completed') {
      logger.error('[TABLE BOOKING] Cannot cancel completed booking');
      return sendBadRequest(res, 'Cannot cancel a completed booking');
    }

    if (booking.status === 'no_show') {
      return sendBadRequest(res, 'Cannot cancel a no-show booking');
    }

    // Update booking status and save cancellation reason
    booking.status = 'cancelled';
    if (reason) {
      (booking as any).cancellationReason = reason;
    }
    await booking.save();


    // Populate booking for response
    const populatedBooking = await TableBooking.findById(booking._id)
      .populate('storeId', 'name logo location contact')
      .populate('userId', 'profile.firstName profile.lastName phoneNumber email').lean();

    // Notify merchant about cancellation (fire-and-forget)
    const store = await Store.findById(booking.storeId).select('merchantId name').lean();
    if (store && (store as any).merchantId) {
      merchantNotificationService.notifyVisitCancelled({
        merchantId: (store as any).merchantId.toString(),
        visitId: booking._id?.toString() || '',
        visitNumber: booking.bookingNumber,
        customerName: booking.customerName,
        storeName: store.name
      }).catch((err: any) => logger.error('[TABLE BOOKING] Failed to send cancel notification to merchant:', err.message));
    }

    return sendSuccess(res, populatedBooking, 'Booking cancelled successfully');
});

// Check table availability
export const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { date } = req.query;

    if (!date) {
      return sendBadRequest(res, 'Date is required');
    }

    // Check if store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      logger.error('[TABLE BOOKING] Store not found:', storeId);
      return sendNotFound(res, 'Store not found');
    }

    // Get bookings for the specified date
    const bookingDate = new Date(date as string);
    const startOfDay = new Date(bookingDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const bookings = await TableBooking.find({
      storeId: new Types.ObjectId(storeId),
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['pending', 'confirmed'] }
    }).select('bookingTime partySize status').lean();


    // Use store's configured capacity or default
    const maxCapacity = (store as any).bookingConfig?.maxTableCapacity || 50;
    const slotDuration = (store as any).bookingConfig?.slotDuration || 30; // minutes
    const workingStart = (store as any).bookingConfig?.workingHours?.start || '09:00';
    const workingEnd = (store as any).bookingConfig?.workingHours?.end || '22:00';

    const startHour = parseInt(workingStart.split(':')[0]);
    const endHour = parseInt(workingEnd.split(':')[0]);

    // Generate time slots based on store config (half-hour or configured duration)
    const timeSlots = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let min = 0; min < 60; min += slotDuration) {
        if (hour === endHour && min > 0) break; // Don't go past closing
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

        // Count bookings for this time slot
        const bookingsAtTime = bookings.filter(b => b.bookingTime === time);
        const totalPartySize = bookingsAtTime.reduce((sum, b) => sum + b.partySize, 0);

        const remainingCapacity = Math.max(0, maxCapacity - totalPartySize);
        const available = remainingCapacity > 0;

        timeSlots.push({
          time,
          available,
          remainingCapacity,
          bookingsCount: bookingsAtTime.length
        });
      }
    }

    return sendSuccess(res, {
      date: bookingDate,
      storeId,
      storeName: store.name,
      timeSlots,
      totalBookings: bookings.length
    }, 'Availability checked successfully');
});

/**
 * POST /api/table-bookings/:bookingId/preorder
 * User submits a pre-order linked to their table booking.
 */
export const addPreOrder = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const userId = (req as any).user?._id?.toString() || (req as any).userId;
  const { items, paymentMethod, specialInstructions } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return sendBadRequest(res, 'At least one item is required for pre-order');
  }

  const booking = await TableBooking.findOne({ _id: bookingId, userId }).populate('storeId', 'name merchant');
  if (!booking) return sendNotFound(res, 'Booking not found');

  if (booking.status === 'cancelled' || booking.status === 'completed') {
    return sendBadRequest(res, 'Cannot add pre-order to a cancelled or completed booking');
  }

  if (booking.preOrderId) {
    return sendBadRequest(res, 'Pre-order already exists for this booking. Cancel it first to re-order.');
  }

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const storeId = booking.storeId._id || booking.storeId;
  const storeName = (booking.storeId as any).name || '';
  const merchantId = (booking.storeId as any).merchant?.toString() || '';

  const { Order } = await import('../models/Order');

  const order = new Order({
    user: userId,
    store: storeId,
    status: 'placed',
    fulfillmentType: 'dine_in',
    fulfillment: {
      type: 'dine_in',
      status: 'placed',
    },
    fulfillmentDetails: {
      scheduledFor: booking.bookingDate,
    },
    items: items.map((item: any) => ({
      product: item.productId,
      store: storeId,
      storeName,
      name: item.name,
      image: item.image || '',
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
    })),
    subtotal,
    total: subtotal,
    specialInstructions: specialInstructions || '',
    payment: {
      method: paymentMethod || 'cod',
      status: 'pending',
      amount: subtotal,
    },
    metadata: {
      isPreOrder: true,
      tableBookingId: (booking._id as any).toString(),
      scheduledFor: booking.bookingDate,
    },
  });

  await order.save();

  booking.preOrderId = order._id as Types.ObjectId;
  booking.preOrderStatus = 'pending';
  booking.advancePaymentAmount = subtotal;
  await booking.save();

  // Notify merchant
  try {
    await merchantNotificationService.notifyNewOrder({
      merchantId,
      orderId: (order._id as any).toString(),
      orderNumber: order.orderNumber || (order._id as any).toString(),
      customerName: booking.customerName,
      totalAmount: subtotal,
      itemCount: items.length,
      paymentMethod: paymentMethod || 'cod',
    });
  } catch {
    // Non-blocking
  }

  return sendSuccess(res, {
    order: order.toObject(),
    bookingId: booking._id,
    preOrderId: order._id,
    totalAmount: subtotal,
  }, 'Pre-order created successfully');
});
