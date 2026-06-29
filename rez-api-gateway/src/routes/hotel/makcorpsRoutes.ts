/**
 * Makcorps Hotel OTA Routes
 *
 * Integration with Makcorps API for corporate hotel bookings.
 * Handles property search, booking, and cancellation.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdminAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';

const router = Router();

// Types (mirroring the OTA API client)
interface OTARoom {
  roomId: string;
  roomType: string;
  description: string;
  maxOccupancy: number;
  bedType: string;
  baseRate: number;
  corporateRate: number;
  discount: number;
  amenities: string[];
  cancellationPolicy: {
    freeCancellationUntil: string;
    cancellationFee: number;
  };
  available: boolean;
  availableRooms: number;
}

interface OTAProperty {
  propertyId: string;
  name: string;
  description: string;
  address: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  location: { lat: number; lng: number };
  starRating: number;
  userRating: number;
  reviewCount: number;
  images: string[];
  amenities: string[];
  policies: {
    checkIn: string;
    checkOut: string;
    childrenAllowed: boolean;
    petsAllowed: boolean;
  };
  rooms: OTARoom[];
  gstInfo: {
    hsnCode: string;
    taxRate: number;
  };
  corporatePricing: {
    enabled: boolean;
    discountPercent: number;
    markupPercent: number;
  };
}

interface OTABooking {
  bookingId: string;
  confirmationNumber: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  property: {
    propertyId: string;
    name: string;
    address: string;
    phone: string;
  };
  room: {
    roomId: string;
    name: string;
    bedType: string;
  };
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  dates: {
    checkIn: string;
    checkOut: string;
    nights: number;
  };
  pricing: {
    roomRate: number;
    numberOfRooms: number;
    subtotal: number;
    discount: number;
    gstAmount: number;
    totalAmount: number;
    currency: string;
  };
  createdAt: string;
}

// In-memory store for demo (use Redis/MongoDB in production)
const bookingsStore = new Map<string, OTABooking>();

// Validation schemas
const searchSchema = z.object({
  city: z.string().optional(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.string().transform(Number).optional(),
  minRating: z.string().transform(Number).optional(),
  maxPrice: z.string().transform(Number).optional(),
});

const createBookingSchema = z.object({
  propertyId: z.string(),
  roomId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number(),
  guestDetails: z.array(z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string(),
  })),
  specialRequests: z.string().optional(),
  corporateCode: z.string().optional(),
});

// ============================================
// PROPERTY SEARCH
// ============================================

/**
 * Search hotels
 * GET /api/hotels/search
 */
router.get('/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = searchSchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Invalid search parameters' });
    }

    const { city, checkIn, checkOut, guests, minRating, maxPrice } = result.data;

    // In production, call Makcorps API:
    // const response = await fetch(`${MAKCORPS_API_URL}/hotels/search?${params}`, {
    //   headers: { 'Authorization': `Bearer ${MAKCORPS_ACCESS_TOKEN}` }
    // });

    // Demo data - filtered based on search params
    let properties = DEMO_PROPERTIES as OTAProperty[];

    if (city) {
      properties = properties.filter(p =>
        p.address.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    if (minRating) {
      properties = properties.filter(p => p.starRating >= minRating);
    }

    if (maxPrice) {
      properties = properties.map(p => ({
        ...p,
        rooms: p.rooms.filter(r => r.corporateRate <= maxPrice),
      })).filter(p => p.rooms.length > 0);
    }

    logger.info('[Makcorps] Hotel search', { city, checkIn, checkOut, guests, results: properties.length });

    res.json({ success: true, data: properties });
  } catch (err: any) {
    logger.error('[Makcorps] Search failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get property details
 * GET /api/hotels/:propertyId
 */
router.get('/:propertyId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const property = (DEMO_PROPERTIES as OTAProperty[]).find(p => p.propertyId === propertyId);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    res.json({ success: true, data: property });
  } catch (err: any) {
    logger.error('[Makcorps] Get property failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get room availability
 * GET /api/hotels/:propertyId/availability
 */
router.get('/:propertyId/availability', requireAuth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { checkIn, checkOut } = req.query;

    const property = (DEMO_PROPERTIES as OTAProperty[]).find(p => p.propertyId === propertyId);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Filter available rooms
    const availableRooms = property.rooms.filter(r => r.available);

    logger.info('[Makcorps] Room availability', { propertyId, checkIn, checkOut, available: availableRooms.length });

    res.json({ success: true, data: availableRooms });
  } catch (err: any) {
    logger.error('[Makcorps] Availability check failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// BOOKINGS
// ============================================

/**
 * Create booking
 * POST /api/hotels/bookings
 */
router.post('/bookings', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = createBookingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error.errors[0].message });
    }

    const { propertyId, roomId, checkIn, checkOut, guests, guestDetails, specialRequests } = result.data;
    const companyId = req.headers['x-company-id'] as string;

    // Find property and room
    const property = (DEMO_PROPERTIES as OTAProperty[]).find(p => p.propertyId === propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const room = property.rooms.find(r => r.roomId === roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (!room.available) {
      return res.status(400).json({ success: false, message: 'Room not available' });
    }

    // Calculate pricing
    const nights = calculateNights(checkIn, checkOut);
    const subtotal = room.corporateRate * nights;
    const taxableAmount = subtotal / (1 + property.gstInfo.taxRate / 100);
    const gstAmount = subtotal - taxableAmount;
    const totalAmount = subtotal + gstAmount;

    // Create booking
    const bookingId = `HB${Date.now()}`;
    const confirmationNumber = `MCB${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const booking: OTABooking = {
      bookingId,
      confirmationNumber,
      status: 'confirmed',
      property: {
        propertyId: property.propertyId,
        name: property.name,
        address: `${property.address.line1}, ${property.address.city}`,
        phone: '+91 1234 567890',
      },
      room: {
        roomId: room.roomId,
        name: room.name,
        bedType: room.bedType,
      },
      guest: {
        firstName: guestDetails[0].firstName,
        lastName: guestDetails[0].lastName,
        email: guestDetails[0].email,
        phone: guestDetails[0].phone,
      },
      dates: {
        checkIn,
        checkOut,
        nights,
      },
      pricing: {
        roomRate: room.corporateRate,
        numberOfRooms: 1,
        subtotal,
        discount: 0,
        gstAmount,
        totalAmount,
        currency: 'INR',
      },
      createdAt: new Date().toISOString(),
    };

    bookingsStore.set(bookingId, booking);

    logger.info('[Makcorps] Booking created', {
      bookingId,
      confirmationNumber,
      property: property.name,
      room: room.name,
      totalAmount,
      companyId,
    });

    res.status(201).json({ success: true, data: booking });
  } catch (err: any) {
    logger.error('[Makcorps] Create booking failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get bookings
 * GET /api/hotels/bookings
 */
router.get('/bookings', requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string;
    const { status, startDate, endDate, page = '1', limit = '20' } = req.query;

    let bookings = Array.from(bookingsStore.values());

    // Filter by status if provided
    if (status) {
      bookings = bookings.filter(b => b.status === status);
    }

    // Sort by creation date (newest first)
    bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const start = (pageNum - 1) * limitNum;
    const paginatedBookings = bookings.slice(start, start + limitNum);

    logger.info('[Makcorps] Get bookings', { companyId, count: paginatedBookings.length });

    res.json({
      success: true,
      data: paginatedBookings,
      pagination: {
        total: bookings.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(bookings.length / limitNum),
      },
    });
  } catch (err: any) {
    logger.error('[Makcorps] Get bookings failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get single booking
 * GET /api/hotels/bookings/:bookingId
 */
router.get('/bookings/:bookingId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const booking = bookingsStore.get(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, data: booking });
  } catch (err: any) {
    logger.error('[Makcorps] Get booking failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Cancel booking
 * POST /api/hotels/bookings/:bookingId/cancel
 */
router.post('/bookings/:bookingId/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const companyId = req.headers['x-company-id'] as string;

    const booking = bookingsStore.get(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking already cancelled' });
    }

    booking.status = 'cancelled';
    bookingsStore.set(bookingId, booking);

    logger.info('[Makcorps] Booking cancelled', { bookingId, reason, companyId });

    res.json({ success: true, data: booking });
  } catch (err: any) {
    logger.error('[Makcorps] Cancel booking failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// PRICING
// ============================================

/**
 * Calculate price
 * POST /api/hotels/pricing/calculate
 */
router.post('/pricing/calculate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { propertyId, roomId, checkIn, checkOut, corporateCode } = req.body;

    const property = (DEMO_PROPERTIES as OTAProperty[]).find(p => p.propertyId === propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const room = property.rooms.find(r => r.roomId === roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const nights = calculateNights(checkIn, checkOut);
    const subtotal = room.corporateRate * nights;
    const taxableAmount = Math.round(subtotal / 1.12 * 100) / 100;
    const cgstAmount = Math.round(taxableAmount * 0.06 * 100) / 100;
    const sgstAmount = cgstAmount;
    const totalTax = cgstAmount + sgstAmount;
    const totalAmount = subtotal + totalTax;

    logger.info('[Makcorps] Price calculated', { propertyId, roomId, nights, totalAmount });

    res.json({
      success: true,
      data: {
        baseRate: room.baseRate,
        corporateRate: room.corporateRate,
        nights,
        subtotal,
        corporateDiscount: room.discount,
        taxableAmount,
        cgstRate: 6,
        cgstAmount,
        sgstRate: 6,
        sgstAmount,
        totalTax,
        totalAmount,
        itcEligible: true,
      },
    });
  } catch (err: any) {
    logger.error('[Makcorps] Calculate price failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ============================================
// DEMO DATA
// ============================================

const DEMO_PROPERTIES = [
  {
    propertyId: 'P001',
    name: 'The Grand Mumbai',
    description: 'Luxury hotel in the heart of Mumbai with stunning views',
    address: {
      line1: '1 MG Road, Fort',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India',
    },
    location: { lat: 18.916, lng: 72.833 },
    starRating: 5,
    userRating: 4.5,
    reviewCount: 2341,
    images: [],
    amenities: ['Free WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Room Service', 'Business Center'],
    policies: { checkIn: '14:00', checkOut: '11:00', childrenAllowed: true, petsAllowed: false },
    rooms: [
      {
        roomId: 'R001',
        roomType: 'Deluxe',
        description: 'Spacious room with city view and premium amenities',
        maxOccupancy: 2,
        bedType: 'King',
        baseRate: 5500,
        corporateRate: 4500,
        discount: 18,
        amenities: ['King Bed', 'City View', 'Mini Bar', 'Work Desk', 'Safe'],
        cancellationPolicy: { freeCancellationUntil: '2024-12-31', cancellationFee: 0 },
        available: true,
        availableRooms: 5,
      },
      {
        roomId: 'R002',
        roomType: 'Executive Suite',
        description: 'Premium suite with lounge area',
        maxOccupancy: 3,
        bedType: 'King',
        baseRate: 8500,
        corporateRate: 7200,
        discount: 15,
        amenities: ['King Bed', 'Lounge Area', 'Work Desk', 'Bath Tub', 'Mini Bar'],
        cancellationPolicy: { freeCancellationUntil: '2024-12-31', cancellationFee: 1000 },
        available: true,
        availableRooms: 3,
      },
    ],
    gstInfo: { hsnCode: '9963', taxRate: 12 },
    corporatePricing: { enabled: true, discountPercent: 18, markupPercent: 0 },
  },
  {
    propertyId: 'P002',
    name: 'ITC Gardenia Bangalore',
    description: 'Premium business hotel with eco-friendly practices',
    address: {
      line1: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
    },
    location: { lat: 12.971, lng: 77.594 },
    starRating: 5,
    userRating: 4.6,
    reviewCount: 1892,
    images: [],
    amenities: ['Free WiFi', 'Business Center', 'Gym', 'Restaurant', 'Eco-Friendly'],
    policies: { checkIn: '14:00', checkOut: '12:00', childrenAllowed: true, petsAllowed: false },
    rooms: [
      {
        roomId: 'R003',
        roomType: 'Executive Room',
        description: 'Modern room designed for business travelers',
        maxOccupancy: 2,
        bedType: 'Queen',
        baseRate: 7500,
        corporateRate: 6500,
        discount: 13,
        amenities: ['Queen Bed', 'Work Desk', 'Coffee Maker', 'Safe'],
        cancellationPolicy: { freeCancellationUntil: '2024-12-31', cancellationFee: 0 },
        available: true,
        availableRooms: 8,
      },
    ],
    gstInfo: { hsnCode: '9963', taxRate: 12 },
    corporatePricing: { enabled: true, discountPercent: 13, markupPercent: 0 },
  },
  {
    propertyId: 'P003',
    name: 'Hyatt Regency Delhi',
    description: 'International brand hotel with world-class facilities',
    address: {
      line1: 'Bhikaiji Cama Place',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110066',
      country: 'India',
    },
    location: { lat: 28.549, lng: 77.179 },
    starRating: 5,
    userRating: 4.4,
    reviewCount: 3124,
    images: [],
    amenities: ['Free WiFi', 'Pool', 'Spa', 'Gym', 'Multiple Restaurants', 'Concierge'],
    policies: { checkIn: '15:00', checkOut: '12:00', childrenAllowed: true, petsAllowed: true },
    rooms: [
      {
        roomId: 'R004',
        roomType: 'Premium Room',
        description: 'Elegant room with modern amenities',
        maxOccupancy: 2,
        bedType: 'King',
        baseRate: 9500,
        corporateRate: 8000,
        discount: 16,
        amenities: ['King Bed', 'City View', 'Premium Bath', 'Work Desk'],
        cancellationPolicy: { freeCancellationUntil: '2024-12-31', cancellationFee: 0 },
        available: true,
        availableRooms: 6,
      },
    ],
    gstInfo: { hsnCode: '9963', taxRate: 12 },
    corporatePricing: { enabled: true, discountPercent: 16, markupPercent: 0 },
  },
];

export default router;
