import { logger } from '../config/logger';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { EmergencyContact, EmergencyBooking } from '../models/EmergencyContact';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

// @desc    Get all emergency contacts
// @route   GET /api/emergency/contacts
// @access  Public
export const getEmergencyContacts = asyncHandler(async (req: Request, res: Response) => {
  const { type, city, state, isNational } = req.query;

  logger.info('📋 [EMERGENCY] Fetching emergency contacts:', {
    type,
    city,
    state,
    isNational
  });

  try {
    const query: any = { isActive: true };

    if (type) {
      query.type = type;
    }

    if (city) {
      query.$or = [
        { city: new RegExp(city as string, 'i') },
        { isNational: true }
      ];
    }

    if (state) {
      query.$or = query.$or || [];
      query.$or.push(
        { state: new RegExp(state as string, 'i') },
        { isNational: true }
      );
    }

    if (isNational === 'true') {
      query.isNational = true;
    }

    const contacts = await EmergencyContact.find(query)
      .sort({ priority: 1, name: 1 })
      .lean();

    // Group contacts by type
    const groupedContacts: any = {};
    contacts.forEach((contact: any) => {
      if (!groupedContacts[contact.type]) {
        groupedContacts[contact.type] = [];
      }
      groupedContacts[contact.type].push(contact);
    });

    logger.info('✅ [EMERGENCY] Emergency contacts retrieved:', {
      count: contacts.length
    });

    return sendSuccess(res, {
      contacts,
      groupedContacts,
      total: contacts.length
    }, 'Emergency contacts retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [EMERGENCY] Error fetching emergency contacts:', error);
    return sendError(res, error.message || 'Failed to fetch emergency contacts', 500);
  }
});

// @desc    Get nearby emergency services
// @route   GET /api/emergency/contacts/nearby
// @access  Public
export const getNearbyContacts = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, maxDistance = 50, type } = req.query;

  if (!latitude || !longitude) {
    return sendError(res, 'Latitude and longitude are required', 400);
  }

  const lat = parseFloat(latitude as string);
  const lng = parseFloat(longitude as string);
  const maxDist = parseFloat(maxDistance as string);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return sendError(res, 'Invalid coordinates', 400);
  }

  logger.info('📋 [EMERGENCY] Fetching nearby emergency services:', {
    latitude: lat,
    longitude: lng,
    maxDistance: maxDist,
    type
  });

  try {
    // Get contacts with coordinates
    const query: any = {
      'coordinates.latitude': { $exists: true },
      'coordinates.longitude': { $exists: true },
      isActive: true
    };

    if (type) {
      query.type = type;
    }

    const contacts = await EmergencyContact.find(query).lean();

    // Calculate distance for each contact and filter
    const nearbyContacts = contacts
      .map((contact: any) => {
        const distance = calculateDistance(
          lat,
          lng,
          contact.coordinates.latitude,
          contact.coordinates.longitude
        );
        return { ...contact, distance: Math.round(distance * 10) / 10 };
      })
      .filter((contact: any) => contact.distance <= maxDist)
      .sort((a: any, b: any) => a.distance - b.distance);

    // Also include national emergency numbers
    const nationalContacts = await EmergencyContact.find({
      isNational: true,
      isActive: true
    })
      .sort({ priority: 1 })
      .lean();

    logger.info('✅ [EMERGENCY] Nearby contacts found:', {
      nearbyCount: nearbyContacts.length,
      nationalCount: nationalContacts.length
    });

    return sendSuccess(res, {
      nearbyContacts,
      nationalContacts,
      searchLocation: { latitude: lat, longitude: lng },
      searchRadius: maxDist
    }, 'Nearby emergency services retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [EMERGENCY] Error fetching nearby contacts:', error);
    return sendError(res, error.message || 'Failed to fetch nearby contacts', 500);
  }
});

// @desc    Book emergency service (ambulance, doctor visit)
// @route   POST /api/emergency/book
// @access  Private
export const bookEmergencyService = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const {
    serviceType,
    emergencyType,
    patientName,
    patientAge,
    patientPhone,
    patientCondition,
    pickupAddress,
    destinationAddress,
    notes
  } = req.body;

  logger.info('📋 [EMERGENCY] Booking emergency service:', {
    userId,
    serviceType,
    emergencyType,
    patientName
  });

  // Validate required fields
  if (!serviceType || !emergencyType || !patientName || !patientPhone || !pickupAddress?.address) {
    return sendError(res, 'Missing required fields: serviceType, emergencyType, patientName, patientPhone, pickupAddress', 400);
  }

  // Validate service type
  const validServiceTypes = ['ambulance', 'doctor_visit', 'hospital_admission'];
  if (!validServiceTypes.includes(serviceType)) {
    return sendError(res, `Invalid service type. Valid types: ${validServiceTypes.join(', ')}`, 400);
  }

  // Validate emergency type
  const validEmergencyTypes = ['accident', 'cardiac', 'respiratory', 'pregnancy', 'injury', 'other'];
  if (!validEmergencyTypes.includes(emergencyType)) {
    return sendError(res, `Invalid emergency type. Valid types: ${validEmergencyTypes.join(', ')}`, 400);
  }

  try {
    // Check if user already has an active emergency booking
    const activeBooking = await EmergencyBooking.findOne({
      userId,
      status: { $in: ['pending', 'confirmed', 'dispatched', 'en_route'] }
    }).lean();

    if (activeBooking) {
      return sendError(res, 'You already have an active emergency booking', 400);
    }

    const emergencyBooking = new EmergencyBooking({
      userId,
      serviceType,
      emergencyType,
      patientName,
      patientAge,
      patientPhone,
      patientCondition,
      pickupAddress,
      destinationAddress,
      notes,
      status: 'pending'
    });

    await emergencyBooking.save();

    logger.info('✅ [EMERGENCY] Emergency booking created:', {
      bookingNumber: emergencyBooking.bookingNumber,
      bookingId: emergencyBooking._id
    });

    // In a real app, you would trigger notifications to ambulance services here

    return sendCreated(res, emergencyBooking, 'Emergency service booked successfully. Help is on the way!');

  } catch (error: any) {
    logger.error('❌ [EMERGENCY] Error booking emergency service:', error);
    return sendError(res, error.message || 'Failed to book emergency service', 500);
  }
});

// @desc    Get emergency booking status
// @route   GET /api/emergency/booking/:id
// @access  Private
export const getEmergencyBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid booking ID format', 400);
  }

  logger.info('📋 [EMERGENCY] Fetching emergency booking status:', {
    bookingId: id,
    userId
  });

  try {
    const booking = await EmergencyBooking.findOne({ _id: id, userId }).lean();

    if (!booking) {
      logger.error('❌ [EMERGENCY] Emergency booking not found:', id);
      return sendNotFound(res, 'Emergency booking not found');
    }

    logger.info('✅ [EMERGENCY] Emergency booking found:', {
      bookingNumber: booking.bookingNumber,
      status: booking.status
    });

    return sendSuccess(res, booking, 'Emergency booking status retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [EMERGENCY] Error fetching booking status:', error);
    return sendError(res, error.message || 'Failed to fetch booking status', 500);
  }
});

// @desc    Get user's emergency bookings
// @route   GET /api/emergency/bookings
// @access  Private
export const getUserEmergencyBookings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const { status, limit = 20, offset = 0 } = req.query;

  logger.info('📋 [EMERGENCY] Fetching user emergency bookings:', {
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

    const bookings = await EmergencyBooking.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .lean();

    const total = await EmergencyBooking.countDocuments(query);

    // Check for active booking
    const activeBooking = bookings.find((b: any) =>
      ['pending', 'confirmed', 'dispatched', 'en_route'].includes(b.status)
    );

    logger.info('✅ [EMERGENCY] User emergency bookings retrieved:', {
      count: bookings.length,
      total,
      hasActive: !!activeBooking
    });

    return sendSuccess(res, {
      bookings,
      total,
      hasMore: Number(offset) + bookings.length < total,
      limit: Number(limit),
      offset: Number(offset),
      activeBooking: activeBooking || null
    }, 'Emergency bookings retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [EMERGENCY] Error fetching user bookings:', error);
    return sendError(res, error.message || 'Failed to fetch emergency bookings', 500);
  }
});

// @desc    Cancel emergency booking
// @route   PUT /api/emergency/booking/:id/cancel
// @access  Private
export const cancelEmergencyBooking = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  const { reason } = req.body;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid booking ID format', 400);
  }

  logger.info('📋 [EMERGENCY] Cancelling emergency booking:', {
    bookingId: id,
    userId,
    reason
  });

  try {
    const booking = await EmergencyBooking.findOne({ _id: id, userId }).lean();

    if (!booking) {
      logger.error('❌ [EMERGENCY] Emergency booking not found:', id);
      return sendNotFound(res, 'Emergency booking not found');
    }

    if (booking.status === 'cancelled') {
      return sendError(res, 'Booking is already cancelled', 400);
    }

    if (booking.status === 'completed') {
      return sendError(res, 'Cannot cancel a completed booking', 400);
    }

    if (booking.status === 'arrived') {
      return sendError(res, 'Cannot cancel - ambulance has already arrived', 400);
    }

    await booking.updateStatus('cancelled', { reason });

    logger.info('✅ [EMERGENCY] Emergency booking cancelled:', {
      bookingNumber: booking.bookingNumber
    });

    return sendSuccess(res, booking, 'Emergency booking cancelled successfully');

  } catch (error: any) {
    logger.error('❌ [EMERGENCY] Error cancelling booking:', error);
    return sendError(res, error.message || 'Failed to cancel emergency booking', 500);
  }
});

// @desc    Update emergency booking status (Admin/Service provider)
// @route   PUT /api/emergency/booking/:id/status
// @access  Private (Admin)
export const updateEmergencyBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, assignedUnit, estimatedArrival, notes } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid booking ID format', 400);
  }

  logger.info('📋 [EMERGENCY] Updating emergency booking status:', {
    bookingId: id,
    status,
    assignedUnit
  });

  try {
    const booking = await EmergencyBooking.findById(id).lean();

    if (!booking) {
      logger.error('❌ [EMERGENCY] Emergency booking not found:', id);
      return sendNotFound(res, 'Emergency booking not found');
    }

    const updateData: any = {};

    if (assignedUnit) {
      updateData.assignedUnit = assignedUnit;
    }

    if (estimatedArrival) {
      updateData.estimatedArrival = new Date(estimatedArrival);
    }

    if (notes) {
      booking.notes = notes;
    }

    await booking.updateStatus(status, updateData);

    logger.info('✅ [EMERGENCY] Emergency booking status updated:', {
      bookingNumber: booking.bookingNumber,
      newStatus: status
    });

    // In a real app, you would send push notification to user here

    return sendSuccess(res, booking, 'Emergency booking status updated successfully');

  } catch (error: any) {
    logger.error('❌ [EMERGENCY] Error updating booking status:', error);
    return sendError(res, error.message || 'Failed to update booking status', 500);
  }
});

// @desc    Get active emergency booking for user
// @route   GET /api/emergency/active
// @access  Private
export const getActiveEmergencyBooking = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  logger.info('📋 [EMERGENCY] Fetching active emergency booking:', { userId });

  try {
    const activeBooking = await EmergencyBooking.findOne({
      userId,
      status: { $in: ['pending', 'confirmed', 'dispatched', 'en_route'] }
    }).lean();

    logger.info('✅ [EMERGENCY] Active booking check:', {
      hasActive: !!activeBooking
    });

    return sendSuccess(res, {
      hasActiveBooking: !!activeBooking,
      activeBooking: activeBooking || null
    }, 'Active booking status retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [EMERGENCY] Error fetching active booking:', error);
    return sendError(res, error.message || 'Failed to fetch active booking', 500);
  }
});

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
