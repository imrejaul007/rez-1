import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { validateRequest, validateQuery, validateParams } from '../middleware/merchantvalidation';
import Event from '../models/Event';
import EventBooking from '../models/EventBooking';
import { Merchant } from '../models/Merchant';
import Joi from 'joi';
import AuditService from '../services/AuditService';
import mongoose from 'mongoose';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';
import { escapeRegex } from '../utils/sanitize';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schemas
const eventSlotSchema = Joi.object({
  id: Joi.string().required(),
  time: Joi.string().required(),
  maxCapacity: Joi.number().min(1).required(),
  available: Joi.boolean().default(true),
  bookedCount: Joi.number().min(0).default(0)
});

const createEventSchema = Joi.object({
  title: Joi.string().required().min(3).max(200),
  subtitle: Joi.string().max(100).optional(),
  description: Joi.string().required().max(2000),
  image: Joi.string().uri().required(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  price: Joi.object({
    amount: Joi.number().min(0).required(),
    currency: Joi.string().default('₹'),
    isFree: Joi.boolean().default(false),
    originalPrice: Joi.number().min(0).optional(),
    discount: Joi.number().min(0).max(100).optional()
  }).required(),
  location: Joi.object({
    name: Joi.string().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().optional(),
    country: Joi.string().default('India'),
    coordinates: Joi.object({
      lat: Joi.number(),
      lng: Joi.number()
    }).optional(),
    isOnline: Joi.boolean().default(false),
    meetingUrl: Joi.string().uri().when('isOnline', { is: true, then: Joi.required() })
  }).required(),
  date: Joi.date().required(),
  time: Joi.string().required(),
  endTime: Joi.string().optional(),
  category: Joi.string().required().min(1).max(100), // Dynamic categories from backend, no hardcoded enum
  subcategory: Joi.string().optional(),
  organizer: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().optional(),
    website: Joi.string().uri().optional(),
    description: Joi.string().optional(),
    logo: Joi.string().uri().optional()
  }).required(),
  isOnline: Joi.boolean().default(false),
  registrationRequired: Joi.boolean().default(true),
  bookingUrl: Joi.string().uri().optional(),
  availableSlots: Joi.array().items(eventSlotSchema).optional(),
  maxCapacity: Joi.number().min(1).optional(),
  minAge: Joi.number().min(0).optional(),
  requirements: Joi.array().items(Joi.string()).optional(),
  includes: Joi.array().items(Joi.string()).optional(),
  refundPolicy: Joi.string().optional(),
  cancellationPolicy: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid('draft', 'published').default('draft'),
  featured: Joi.boolean().default(false),
  priority: Joi.number().min(0).default(0),
  cashback: Joi.number().min(0).max(100).default(0),
  schedule: Joi.array().items(Joi.object({
    title: Joi.string().required().max(200),
    startTime: Joi.string().required(),
    endTime: Joi.string().required(),
    description: Joi.string().max(500).optional().allow(''),
  })).optional(),
  ticketTypes: Joi.array().items(Joi.object({
    name: Joi.string().required().max(100),
    price: Joi.number().min(0).required(),
    currency: Joi.string().default('₹'),
    maxQuantity: Joi.number().min(1).required(),
    description: Joi.string().max(300).optional().allow(''),
  })).optional(),
  sponsors: Joi.array().items(Joi.object({
    name: Joi.string().required().max(200),
    logo: Joi.string().uri().optional().allow(''),
  })).optional(),
});

const updateEventSchema = createEventSchema.fork(
  ['title', 'description', 'image', 'price', 'location', 'date', 'time', 'category', 'organizer'],
  (schema) => schema.optional()
);

const eventIdSchema = Joi.object({
  id: Joi.string().required()
});

const listEventsQuerySchema = Joi.object({
  status: Joi.string().valid('draft', 'published', 'cancelled', 'completed', 'sold_out').optional(),
  category: Joi.string().optional(),
  search: Joi.string().optional(),
  featured: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  sort: Joi.string().valid('newest', 'oldest', 'date_asc', 'date_desc', 'popular').default('newest')
});

const bookingsQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed', 'refunded').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

/**
 * @route   POST /api/merchant/events
 * @desc    Create a new event
 * @access  Private (Merchant)
 */
router.post('/', validateRequest(createEventSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Verify merchant exists
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    const eventData = req.body;

    // Set price.isFree based on amount
    if (eventData.price.amount === 0) {
      eventData.price.isFree = true;
    }

    // Set isOnline based on location
    if (eventData.location?.isOnline) {
      eventData.isOnline = true;
    }

    // Generate slot IDs if not provided
    if (eventData.availableSlots && eventData.availableSlots.length > 0) {
      eventData.availableSlots = eventData.availableSlots.map((slot: any, index: number) => ({
        ...slot,
        id: slot.id || `slot-${Date.now()}-${index}`,
        bookedCount: 0,
        available: true
      }));
    }

    // Create event
    const event = new Event({
      ...eventData,
      merchantId: merchant._id,
      analytics: {
        views: 0,
        bookings: 0,
        shares: 0,
        favorites: 0
      }
    });

    await event.save();

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'event.created',
      resourceType: 'event',
      resourceId: (event._id as mongoose.Types.ObjectId).toString(),
      details: {
        after: event.toObject(),
        metadata: { title: event.title, status: event.status }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${merchantId}`).emit('event_created', {
        eventId: event._id,
        eventTitle: event.title
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error: any) {
    logger.error('Create event error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create event'
    });
  }
});

/**
 * @route   GET /api/merchant/events
 * @desc    Get all events for the merchant
 * @access  Private (Merchant)
 */
router.get('/', validateQuery(listEventsQuerySchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const { status, category, search, featured, page = 1, limit = 20, sort = 'newest' } = req.query;

    // Build query
    const query: any = { merchantId: new mongoose.Types.ObjectId(merchantId) };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    if (search) {
      const escaped = escapeRegex(search as string);
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { 'location.city': { $regex: escaped, $options: 'i' } }
      ];
    }

    // Sorting
    let sortOptions: any = {};
    switch (sort) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'date_asc':
        sortOptions = { date: 1 };
        break;
      case 'date_desc':
        sortOptions = { date: -1 };
        break;
      case 'popular':
        sortOptions = { 'analytics.views': -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [events, totalCount] = await Promise.all([
      Event.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Event.countDocuments(query)
    ]);

    return res.json({
      success: true,
      message: 'Events retrieved successfully',
      data: {
        events,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          hasNext: pageNum < Math.ceil(totalCount / limitNum),
          hasPrevious: pageNum > 1
        }
      }
    });
  } catch (error: any) {
    logger.error('Get events error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve events'
    });
  }
});

/**
 * @route   GET /api/merchant/events/:id
 * @desc    Get event by ID
 * @access  Private (Merchant)
 */
router.get('/:id', validateParams(eventIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const eventId = req.params.id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const event = await Event.findOne({
      _id: eventId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    }).lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    return res.json({
      success: true,
      message: 'Event retrieved successfully',
      data: event
    });
  } catch (error: any) {
    logger.error('Get event error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve event'
    });
  }
});

/**
 * @route   PUT /api/merchant/events/:id
 * @desc    Update event
 * @access  Private (Merchant)
 */
router.put('/:id', validateParams(eventIdSchema), validateRequest(updateEventSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const eventId = req.params.id;
    const updates = req.body;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Find event and verify ownership
    const event = await Event.findOne({
      _id: eventId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Store old values for audit
    const oldValues = event.toObject();

    // Update fields
    const allowedUpdates = [
      'title', 'subtitle', 'description', 'image', 'images', 'price',
      'location', 'date', 'time', 'endTime', 'category', 'categoryId', 'subcategory',
      'organizer', 'isOnline', 'registrationRequired', 'bookingUrl',
      'availableSlots', 'maxCapacity', 'minAge', 'requirements', 'includes',
      'refundPolicy', 'cancellationPolicy', 'cancellationPolicyDetails',
      'tags', 'featured', 'priority',
      'schedule', 'ticketTypes', 'sponsors'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        (event as any)[field] = updates[field];
      }
    });

    // Update price.isFree based on amount
    if (updates.price?.amount === 0) {
      event.price.isFree = true;
    }

    // Update isOnline based on location
    if (updates.location?.isOnline !== undefined) {
      event.isOnline = updates.location.isOnline;
    }

    await event.save();

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'event.updated',
      resourceType: 'event',
      resourceId: eventId,
      details: {
        before: oldValues,
        after: event.toObject(),
        metadata: { title: event.title }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${merchantId}`).emit('event_updated', {
        eventId: event._id,
        eventTitle: event.title
      });
    }

    return res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error: any) {
    logger.error('Update event error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update event'
    });
  }
});

/**
 * @route   DELETE /api/merchant/events/:id
 * @desc    Delete event
 * @access  Private (Merchant)
 */
router.delete('/:id', validateParams(eventIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const eventId = req.params.id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Find event and verify ownership
    const event = await Event.findOne({
      _id: eventId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if there are confirmed bookings
    const confirmedBookings = await EventBooking.countDocuments({
      eventId: new mongoose.Types.ObjectId(eventId),
      status: { $in: ['confirmed', 'pending'] }
    });

    if (confirmedBookings > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete event with ${confirmedBookings} active booking(s). Please cancel the event instead.`
      });
    }

    // Store for audit
    const deletedEvent = event.toObject();

    // Hard delete (since no active bookings)
    await Event.findByIdAndDelete(eventId);

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'event.deleted',
      resourceType: 'event',
      resourceId: eventId,
      details: {
        before: deletedEvent,
        metadata: { title: deletedEvent.title }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'warning'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${merchantId}`).emit('event_deleted', {
        eventId: eventId,
        eventTitle: deletedEvent.title
      });
    }

    return res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error: any) {
    logger.error('Delete event error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete event'
    });
  }
});

/**
 * @route   POST /api/merchant/events/:id/publish
 * @desc    Publish a draft event
 * @access  Private (Merchant)
 */
router.post('/:id/publish', validateParams(eventIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const eventId = req.params.id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const event = await Event.findOne({
      _id: eventId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Event is already published'
      });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish a cancelled event'
      });
    }

    // Check if event date is in the future
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish an event with a past date'
      });
    }

    const oldStatus = event.status;
    event.status = 'published';
    event.publishedAt = new Date();
    await event.save();

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'event.published',
      resourceType: 'event',
      resourceId: eventId,
      details: {
        before: { status: oldStatus },
        after: { status: 'published', publishedAt: event.publishedAt },
        metadata: { title: event.title }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${merchantId}`).emit('event_published', {
        eventId: event._id,
        eventTitle: event.title
      });
    }

    return res.json({
      success: true,
      message: 'Event published successfully',
      data: event
    });
  } catch (error: any) {
    logger.error('Publish event error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to publish event'
    });
  }
});

/**
 * @route   POST /api/merchant/events/:id/cancel
 * @desc    Cancel an event
 * @access  Private (Merchant)
 */
router.post('/:id/cancel', validateParams(eventIdSchema), validateRequest(Joi.object({
  reason: Joi.string().max(500).optional()
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const eventId = req.params.id;
    const { reason } = req.body;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const event = await Event.findOne({
      _id: eventId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Event is already cancelled'
      });
    }

    if (event.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed event'
      });
    }

    const oldStatus = event.status;
    event.status = 'cancelled';
    if (reason) {
      // Store cancellation reason in policyDetails, not in the user-facing cancellationPolicy text
      if (!event.cancellationPolicyDetails) {
        (event as any).cancellationPolicyDetails = {};
      }
      (event as any).cancellationPolicyDetails.policyText = reason;
    }
    await event.save();

    // Get all confirmed bookings for this event
    const bookings = await EventBooking.find({
      eventId: new mongoose.Types.ObjectId(eventId),
      status: { $in: ['confirmed', 'pending'] }
    });

    // Cancel all bookings
    if (bookings.length > 0) {
      await EventBooking.updateMany(
        {
          eventId: new mongoose.Types.ObjectId(eventId),
          status: { $in: ['confirmed', 'pending'] }
        },
        {
          $set: {
            status: 'cancelled',
            'paymentStatus': 'refunded',
            refundReason: reason || 'Event cancelled by organizer',
            refundedAt: new Date()
          }
        }
      );
    }

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'event.cancelled',
      resourceType: 'event',
      resourceId: eventId,
      details: {
        before: { status: oldStatus },
        after: { status: 'cancelled', cancellationReason: reason },
        metadata: {
          title: event.title,
          affectedBookings: bookings.length
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'warning'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${merchantId}`).emit('event_cancelled', {
        eventId: event._id,
        eventTitle: event.title,
        affectedBookings: bookings.length
      });
    }

    return res.json({
      success: true,
      message: `Event cancelled successfully. ${bookings.length} booking(s) have been cancelled.`,
      data: {
        event,
        cancelledBookings: bookings.length
      }
    });
  } catch (error: any) {
    logger.error('Cancel event error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel event'
    });
  }
});

/**
 * @route   GET /api/merchant/events/:id/bookings
 * @desc    Get all bookings for an event
 * @access  Private (Merchant)
 */
router.get('/:id/bookings', validateParams(eventIdSchema), validateQuery(bookingsQuerySchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const eventId = req.params.id;
    const { status, page = 1, limit = 20 } = req.query;

    if (!merchantId) {
      return sendBadRequest(res, 'Merchant ID not found. Authentication required.');
    }

    // Verify event belongs to merchant
    const event = await Event.findOne({
      _id: eventId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!event) {
      return sendNotFound(res, 'Event not found');
    }

    // Build query
    const query: any = { eventId: new mongoose.Types.ObjectId(eventId) };

    if (status) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [bookings, totalCount] = await Promise.all([
      EventBooking.find(query)
        .populate('userId', 'profile.firstName profile.lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EventBooking.countDocuments(query)
    ]);

    // Get booking stats
    const stats = await EventBooking.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const bookingStats = {
      total: totalCount,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      completed: 0,
      totalRevenue: 0
    };

    stats.forEach((stat: any) => {
      if (stat._id === 'confirmed') {
        bookingStats.confirmed = stat.count;
        bookingStats.totalRevenue += stat.totalAmount;
      } else if (stat._id === 'pending') {
        bookingStats.pending = stat.count;
      } else if (stat._id === 'cancelled') {
        bookingStats.cancelled = stat.count;
      } else if (stat._id === 'completed') {
        bookingStats.completed = stat.count;
        bookingStats.totalRevenue += stat.totalAmount;
      }
    });

    return sendSuccess(res, {
      bookings: bookings.map((booking: any) => ({
        id: booking._id.toString(),
        bookingReference: booking.bookingReference,
        user: {
          id: booking.userId?._id?.toString() || '',
          name: booking.attendeeInfo?.name ||
            `${booking.userId?.profile?.firstName || ''} ${booking.userId?.profile?.lastName || ''}`.trim() ||
            'Unknown',
          email: booking.attendeeInfo?.email || booking.userId?.email || '',
          phone: booking.attendeeInfo?.phone || booking.userId?.phone || ''
        },
        slotId: booking.slotId,
        bookingDate: booking.bookingDate,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        amount: booking.amount,
        currency: booking.currency,
        attendeeInfo: booking.attendeeInfo,
        checkInTime: booking.checkInTime,
        checkOutTime: booking.checkOutTime,
        createdAt: booking.createdAt
      })),
      stats: bookingStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNext: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevious: pageNum > 1
      }
    }, 'Event bookings retrieved successfully');
  } catch (error: any) {
    logger.error('Get event bookings error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch event bookings'
    });
  }
});

/**
 * @route   GET /api/merchant/events/:id/analytics
 * @desc    Get analytics for an event
 * @access  Private (Merchant)
 */
router.get('/:id/analytics', validateParams(eventIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const eventId = req.params.id;

    if (!merchantId) {
      return sendBadRequest(res, 'Merchant ID not found. Authentication required.');
    }

    // Verify event belongs to merchant
    const event = await Event.findOne({
      _id: eventId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!event) {
      return sendNotFound(res, 'Event not found');
    }

    // Get booking stats
    const bookingStats = await EventBooking.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['confirmed', 'completed']] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    // Calculate capacity utilization
    let capacityUtilization = 0;
    if (event.maxCapacity && event.availableSlots) {
      const totalBooked = event.availableSlots.reduce((sum, slot) => sum + slot.bookedCount, 0);
      capacityUtilization = Math.round((totalBooked / event.maxCapacity) * 100);
    } else if (event.maxCapacity && bookingStats.length > 0) {
      capacityUtilization = Math.round((bookingStats[0].confirmedBookings / event.maxCapacity) * 100);
    }

    const analytics = {
      views: event.analytics?.views || 0,
      bookings: event.analytics?.bookings || 0,
      shares: event.analytics?.shares || 0,
      favorites: event.analytics?.favorites || 0,
      totalBookings: bookingStats.length > 0 ? bookingStats[0].totalBookings : 0,
      confirmedBookings: bookingStats.length > 0 ? bookingStats[0].confirmedBookings : 0,
      completedBookings: bookingStats.length > 0 ? bookingStats[0].completedBookings : 0,
      cancelledBookings: bookingStats.length > 0 ? bookingStats[0].cancelledBookings : 0,
      totalRevenue: bookingStats.length > 0 ? bookingStats[0].totalRevenue : 0,
      currency: event.price?.currency || '₹',
      capacityUtilization,
      conversionRate: event.analytics?.views > 0
        ? Math.round((event.analytics.bookings / event.analytics.views) * 100)
        : 0
    };

    return sendSuccess(res, analytics, 'Event analytics retrieved successfully');
  } catch (error: any) {
    logger.error('Get event analytics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch event analytics'
    });
  }
});

/**
 * @route   POST /api/merchant/events/:id/bookings/:bookingId/checkin
 * @desc    Check in a booking
 * @access  Private (Merchant)
 */
router.post('/:id/bookings/:bookingId/checkin', validateParams(Joi.object({
  id: Joi.string().required(),
  bookingId: Joi.string().required()
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const eventId = req.params.id;
    const bookingId = req.params.bookingId;

    if (!merchantId) {
      return sendBadRequest(res, 'Merchant ID not found. Authentication required.');
    }

    // Verify event belongs to merchant
    const event = await Event.findOne({
      _id: eventId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!event) {
      return sendNotFound(res, 'Event not found');
    }

    // Find booking
    const booking = await EventBooking.findOne({
      _id: bookingId,
      eventId: new mongoose.Types.ObjectId(eventId)
    });

    if (!booking) {
      return sendNotFound(res, 'Booking not found');
    }

    if (booking.status !== 'confirmed') {
      return sendBadRequest(res, `Cannot check in a booking with status: ${booking.status}`);
    }

    if (booking.checkInTime) {
      return sendBadRequest(res, 'Booking is already checked in');
    }

    booking.checkInTime = new Date();
    await booking.save();

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'booking.checkin',
      resourceType: 'booking',
      resourceId: bookingId,
      details: {
        after: { checkInTime: booking.checkInTime },
        metadata: {
          eventId: eventId,
          eventTitle: event.title,
          bookingReference: booking.bookingReference
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    return sendSuccess(res, {
      booking: {
        id: booking._id.toString(),
        bookingReference: booking.bookingReference,
        checkInTime: booking.checkInTime
      }
    }, 'Booking checked in successfully');
  } catch (error: any) {
    logger.error('Check in booking error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check in booking'
    });
  }
});

export default router;
