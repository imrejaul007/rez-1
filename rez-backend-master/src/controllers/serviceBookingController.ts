import { Request, Response } from 'express';
import { ServiceBooking } from '../models/ServiceBooking';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { ServiceCategory } from '../models/ServiceCategory';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import travelCashbackService, { TRAVEL_CATEGORY_SLUGS } from '../services/travelCashbackService';
import { createRefund as createRazorpayRefund } from '../services/razorpayService';
import stripeService from '../services/stripeService';
import { Refund } from '../models/Refund';
import { pct } from '../utils/currency';
import { asyncHandler } from '../utils/asyncHandler';

// Use Express Request with user property (extended globally)

/**
 * Create a new service booking
 * POST /api/service-bookings
 */
export const createBooking = asyncHandler(async (req: Request, res: Response) => {
    const {
      serviceId,
      bookingDate,
      timeSlot,
      serviceType,
      serviceAddress,
      customerNotes,
      paymentMethod
    } = req.body;

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Validate required fields
    if (!serviceId || !bookingDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Service ID, booking date, and time slot are required'
      });
    }

    // Fetch the service
    const service = await Product.findOne({
      _id: serviceId,
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true }
    }).populate('store serviceCategory').lean() as any;

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if service requires address for home service
    const svcType = serviceType || service.serviceDetails?.serviceType || 'store';
    if (svcType === 'home' && !serviceAddress) {
      return res.status(400).json({
        success: false,
        message: 'Service address is required for home services'
      });
    }

    // Get store info
    const store = await Store.findById(service.store).lean();
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Parse booking date
    const bookingDateObj = new Date(bookingDate);
    bookingDateObj.setHours(0, 0, 0, 0);

    // Check slot availability
    const duration = service.serviceDetails?.duration || 60;
    const isAvailable = await (ServiceBooking as any).checkSlotAvailability(
      service._id,
      service.store,
      bookingDateObj,
      timeSlot,
      duration
    );

    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available'
      });
    }

    // Check maxBookingsPerSlot limit
    const maxBookingsPerSlot = service.serviceDetails?.maxBookingsPerSlot;
    if (maxBookingsPerSlot) {
      const bookingsOnSlot = await ServiceBooking.countDocuments({
        service: service._id,
        store: service.store,
        bookingDate: bookingDateObj,
        'timeSlot.start': timeSlot.start,
        status: { $in: ['pending', 'confirmed', 'assigned', 'in_progress'] }
      });

      if (bookingsOnSlot >= maxBookingsPerSlot) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxBookingsPerSlot} bookings allowed for this time slot`
        });
      }
    }

    // Check for duplicate booking (same user, same service, same date)
    const existingBooking = await ServiceBooking.findOne({
      user: userId,
      service: service._id,
      bookingDate: bookingDateObj,
      status: { $in: ['pending', 'confirmed', 'assigned'] }
    }).lean();

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You already have a booking for this service on this date'
      });
    }

    // Calculate pricing
    const basePrice = service.pricing?.selling || service.pricing?.basePrice || service.price?.current || 0;
    const cashbackPercentage = service.cashback?.percentage || 0;

    // Parse customerNotes to extract totalPrice if available
    let totalPrice = basePrice; // Default to base price
    let bookingDetails: any = {};

    if (customerNotes) {
      try {
        bookingDetails = JSON.parse(customerNotes);
        // Use totalPrice from customerNotes if provided and valid
        if (bookingDetails.totalPrice && typeof bookingDetails.totalPrice === 'number' && bookingDetails.totalPrice > 0) {
          totalPrice = bookingDetails.totalPrice;
          logger.info(`[CREATE BOOKING] Using totalPrice from customerNotes: ${totalPrice} (basePrice: ${basePrice})`);
        } else {
          logger.warn(`[CREATE BOOKING] totalPrice in customerNotes is invalid, using basePrice: ${basePrice}`);
        }
      } catch (parseError) {
        logger.warn(`[CREATE BOOKING] Failed to parse customerNotes JSON, using basePrice: ${basePrice}`, parseError);
      }
    }

    // Validate maximum passengers/guests/travelers if specified in booking details
    if (bookingDetails.passengers || bookingDetails.guests || bookingDetails.travelers) {
      const passengers = bookingDetails.passengers || bookingDetails.guests || bookingDetails.travelers;
      const totalPassengers = (passengers.adults || 0) + (passengers.children || 0);

      // Check service-specific limits (if defined in serviceDetails)
      const maxPassengers = service.serviceDetails?.maxPassengers;
      if (maxPassengers && totalPassengers > maxPassengers) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxPassengers} passengers allowed for this service`
        });
      }
    }

    // Validate minimum advance booking time (if specified)
    const minAdvanceHours = service.serviceDetails?.minAdvanceBookingHours;
    if (minAdvanceHours) {
      const hoursUntilBooking = (bookingDateObj.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilBooking < minAdvanceHours) {
        return res.status(400).json({
          success: false,
          message: `Booking must be made at least ${minAdvanceHours} hours in advance`
        });
      }
    }

    // Calculate cashback based on total price (not base price)
    const cashbackEarned = pct(totalPrice, cashbackPercentage);

    // Generate booking number with category-specific prefix
    const categorySlug = (service.serviceCategory as any)?.slug || 'SB';
    const bookingNumberPrefix = (() => {
      if (categorySlug === 'flights') return 'FLT';
      if (categorySlug === 'hotels') return 'HTL';
      if (categorySlug === 'trains') return 'TRN';
      if (categorySlug === 'cab') return 'CAB';
      if (categorySlug === 'bus') return 'BUS';
      if (categorySlug === 'packages') return 'PKG';
      return 'SB';
    })();

    const bookingNumber = await (ServiceBooking as any).generateBookingNumber(bookingNumberPrefix);

    // Get customer info (phoneNumber and email are on user object, not profile)
    // Try to get from customerNotes first (for bookings with custom contact info), then fallback to user profile
    let customerName = req.user?.profile?.firstName
      ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`.trim()
      : 'Customer';
    let customerPhone = req.user?.phoneNumber || '';
    let customerEmail = req.user?.email;

    // Extract contact info from customerNotes if available (for packages, flights, etc. with custom contact)
    if (customerNotes && bookingDetails.contactInfo) {
      if (bookingDetails.contactInfo.name) {
        customerName = bookingDetails.contactInfo.name;
      }
      if (bookingDetails.contactInfo.phone) {
        customerPhone = bookingDetails.contactInfo.phone;
      }
      if (bookingDetails.contactInfo.email) {
        customerEmail = bookingDetails.contactInfo.email;
      }
    }

    // Determine if this is a travel booking
    const isTravelBooking = travelCashbackService.isTravelCategory(categorySlug);

    // For travel bookings: enforce upfront payment, set verification days and refund policy
    const requiresPaymentUpfront = isTravelBooking
      ? true
      : (service.serviceDetails?.requiresPaymentUpfront || false);
    const verificationDays = isTravelBooking
      ? travelCashbackService.getVerificationDays(categorySlug)
      : 7;
    const refundPolicy = isTravelBooking
      ? { tiers: travelCashbackService.getRefundTiers(categorySlug) }
      : undefined;

    // Extract travel details from customerNotes (structured data instead of raw JSON)
    let travelDetails: any = undefined;
    if (isTravelBooking && bookingDetails) {
      travelDetails = {};
      if (bookingDetails.route) {
        travelDetails.route = {
          from: bookingDetails.route.from || bookingDetails.from,
          to: bookingDetails.route.to || bookingDetails.to,
          fromCode: bookingDetails.route.fromCode,
          toCode: bookingDetails.route.toCode,
        };
      }
      if (bookingDetails.class) travelDetails.class = bookingDetails.class;
      if (bookingDetails.passengers) travelDetails.passengers = bookingDetails.passengers;
      if (bookingDetails.tripType) travelDetails.tripType = bookingDetails.tripType;
      if (bookingDetails.returnDate) travelDetails.returnDate = new Date(bookingDetails.returnDate);
    }

    // Price sanity check for travel: reject if totalPrice > basePrice * 10
    if (isTravelBooking && totalPrice > basePrice * 10) {
      return res.status(400).json({
        success: false,
        message: 'Total price exceeds acceptable range for this service'
      });
    }

    // Create booking
    const booking = new ServiceBooking({
      bookingNumber,
      user: userId,
      service: service._id,
      serviceCategory: service.serviceCategory,
      store: service.store,
      merchantId: store.merchantId || service.merchantId,
      customerName,
      customerPhone,
      customerEmail,
      bookingDate: bookingDateObj,
      timeSlot,
      duration,
      serviceType: svcType,
      serviceAddress: svcType === 'home' ? serviceAddress : undefined,
      pricing: {
        basePrice,
        total: totalPrice,
        cashbackEarned,
        cashbackPercentage,
        currency: service.pricing.currency || 'INR'
      },
      requiresPaymentUpfront,
      paymentStatus: 'pending',
      paymentMethod,
      customerNotes,
      status: 'pending',
      // Travel-specific fields
      verificationDays,
      refundPolicy,
      travelDetails,
      cashbackStatus: 'pending',
    });

    await booking.save();

    // Populate booking data for response
    const populatedBooking = await ServiceBooking.findById(booking._id)
      .populate('service', 'name images pricing serviceDetails')
      .populate('serviceCategory', 'name icon cashbackPercentage')
      .populate('store', 'name logo location contact operationalInfo').lean();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: populatedBooking,
      requiresPayment: requiresPaymentUpfront,
    });
});

/**
 * Get user's bookings
 * GET /api/service-bookings
 */
export const getUserBookings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { status, page = '1', limit = '20' } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const query: any = { user: userId };
    if (status) {
      query.status = status;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      ServiceBooking.find(query)
        .populate('service', 'name images pricing serviceDetails')
        .populate('serviceCategory', 'name icon cashbackPercentage')
        .populate('store', 'name logo location contact operationalInfo')
        .sort({ bookingDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ServiceBooking.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
});

/**
 * Get booking by ID
 * GET /api/service-bookings/:id
 */
export const getBookingById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await ServiceBooking.findOne({
      _id: id,
      user: userId
    })
      .populate('service', 'name images pricing serviceDetails description')
      .populate('serviceCategory', 'name icon cashbackPercentage')
      .populate('store', 'name logo location contact operationalInfo')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
});

/**
 * Cancel a booking
 * PUT /api/service-bookings/:id/cancel
 */
export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await ServiceBooking.findOne({
      _id: id,
      user: userId
    }).lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be cancelled
    if (!['pending', 'confirmed', 'assigned'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'This booking cannot be cancelled'
      });
    }

    // Determine category slug for travel-specific logic
    const populatedCategory = await ServiceCategory.findById(booking.serviceCategory).lean();
    const catSlug = populatedCategory?.slug || '';
    const isTravelCancel = travelCashbackService.isTravelCategory(catSlug);

    if (isTravelCancel) {
      // Travel bookings use category-specific refund tiers instead of fixed 2-hour window
      const { refundPercentage } = travelCashbackService.calculateRefundAmount(booking, catSlug);

      if (refundPercentage === 0) {
        return res.status(400).json({
          success: false,
          message: 'This booking is past the cancellation window and cannot be cancelled for a refund'
        });
      }

      // Cancel the booking
      await booking.cancel(reason || 'Cancelled by user', 'user');

      // Handle cashback clawback for travel bookings
      if (booking.cashbackStatus === 'credited' || booking.cashbackStatus === 'held') {
        try {
          await travelCashbackService.handleRefund(
            booking._id.toString(),
            reason || 'Booking cancelled by user'
          );
        } catch (refundError: any) {
          logger.error('Error processing travel cashback refund:', refundError);
          // Booking is still cancelled even if cashback clawback fails — admin will review
        }
      }

      // Process payment gateway refund
      if (booking.paymentStatus === 'paid' && booking.paymentId) {
        try {
          const paymentRefundAmount = (booking.pricing?.total || 0) * (refundPercentage / 100);
          if (paymentRefundAmount > 0) {
            const isRazorpay = booking.paymentId.startsWith('pay_');
            let gatewayRefundId: string | undefined;

            if (isRazorpay) {
              const result = await createRazorpayRefund(booking.paymentId, paymentRefundAmount);
              gatewayRefundId = result.id;
            } else {
              const result = await stripeService.createRefund({
                paymentIntentId: booking.paymentId,
                amount: Math.round(paymentRefundAmount * 100),
                reason: 'requested_by_customer',
              });
              gatewayRefundId = result.id;
            }

            booking.paymentStatus = refundPercentage === 100 ? 'refunded' : 'partial';
            await booking.save();

            if (gatewayRefundId) {
              await Refund.create({
                order: booking._id,
                user: booking.user,
                orderNumber: booking.bookingNumber,
                paymentMethod: isRazorpay ? 'razorpay' : 'stripe',
                refundAmount: paymentRefundAmount,
                refundType: refundPercentage === 100 ? 'full' : 'partial',
                refundReason: reason || 'Travel booking cancelled',
                gatewayRefundId,
                status: 'processing',
                requestedAt: new Date(),
                metadata: { bookingType: 'service_booking', categorySlug: catSlug, refundPercentage },
              });
            }

            logger.info('Payment refund processed:', {
              bookingId: booking._id,
              refundAmount: paymentRefundAmount,
              refundPercentage,
              gateway: isRazorpay ? 'razorpay' : 'stripe',
              gatewayRefundId,
            });
          }
        } catch (refundError: any) {
          logger.error('Payment refund failed (admin will review):', refundError);
        }
      }
    } else {
      // Non-travel: use existing 2-hour cancellation window
      const now = new Date();
      const bookingDateTime = new Date(booking.bookingDate);
      const [hours, minutes] = booking.timeSlot.start.split(':').map(Number);
      bookingDateTime.setHours(hours, minutes, 0, 0);
      const twoHoursBefore = new Date(bookingDateTime.getTime() - 2 * 60 * 60 * 1000);

      if (now >= twoHoursBefore) {
        return res.status(400).json({
          success: false,
          message: 'Bookings can only be cancelled at least 2 hours before the scheduled time'
        });
      }

      await booking.cancel(reason || 'Cancelled by user', 'user');
    }

    // Populate booking data for response
    const updatedBooking = await ServiceBooking.findById(booking._id)
      .populate('service', 'name images pricing')
      .populate('serviceCategory', 'name icon')
      .populate('store', 'name logo location contact')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: updatedBooking
    });
});

/**
 * Reschedule a booking
 * PUT /api/service-bookings/:id/reschedule
 */
export const rescheduleBooking = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { bookingDate, timeSlot } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!bookingDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'New booking date and time slot are required'
      });
    }

    const booking = await ServiceBooking.findOne({
      _id: id,
      user: userId
    }).lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be rescheduled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'This booking cannot be rescheduled'
      });
    }

    if (booking.rescheduleCount >= booking.maxReschedules) {
      return res.status(400).json({
        success: false,
        message: 'Maximum reschedule limit reached'
      });
    }

    // Parse new booking date
    const newBookingDate = new Date(bookingDate);
    newBookingDate.setHours(0, 0, 0, 0);

    // Check slot availability
    const isAvailable = await (ServiceBooking as any).checkSlotAvailability(
      booking.service,
      booking.store,
      newBookingDate,
      timeSlot,
      booking.duration,
      booking._id
    );

    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available'
      });
    }

    await booking.reschedule(newBookingDate, timeSlot);

    // Populate booking data for response
    const updatedBooking = await ServiceBooking.findById(booking._id)
      .populate('service', 'name images pricing')
      .populate('serviceCategory', 'name icon')
      .populate('store', 'name logo location contact')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Booking rescheduled successfully',
      data: updatedBooking
    });
});

/**
 * Add rating to a completed booking
 * POST /api/service-bookings/:id/rate
 */
export const rateBooking = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { score, review } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating score must be between 1 and 5'
      });
    }

    const booking = await ServiceBooking.findOne({
      _id: id,
      user: userId
    }).lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed bookings can be rated'
      });
    }

    if (booking.rating?.score) {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been rated'
      });
    }

    await booking.addRating(score, review);

    res.status(200).json({
      success: true,
      message: 'Rating added successfully',
      data: {
        bookingId: booking._id,
        rating: booking.rating
      }
    });
});

/**
 * Get available time slots for a service on a specific date
 * GET /api/service-bookings/available-slots
 */
export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
    const { serviceId, date } = req.query;

    if (!serviceId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Service ID and date are required'
      });
    }

    // Fetch the service
    const service = await Product.findOne({
      _id: serviceId,
      productType: 'service',
      isActive: true
    }).populate('store').lean() as any;

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Get store info for operating hours
    const store = await Store.findById(service.store).lean();
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Parse date
    const bookingDate = new Date(date as string);
    bookingDate.setHours(0, 0, 0, 0);

    // Get store hours (default if not specified)
    const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as
      'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    const hours = store.operationalInfo?.hours;
    const storeHours = hours?.[dayOfWeek] || {
      open: '09:00',
      close: '18:00'
    };

    // Get service duration
    const duration = service.serviceDetails?.duration || 60;

    // Get available slots
    const availableSlots = await (ServiceBooking as any).getAvailableSlots(
      service.store,
      bookingDate,
      duration,
      storeHours
    );

    res.status(200).json({
      success: true,
      data: {
        serviceId,
        date: bookingDate.toISOString().split('T')[0],
        duration,
        storeHours,
        slots: availableSlots
      }
    });
});

// Export all controller functions
export default {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  rateBooking,
  getAvailableSlots
};
