import { Router } from 'express';
import {
  createTableBooking,
  getUserTableBookings,
  getTableBooking,
  getStoreTableBookings,
  getMerchantTableBookings,
  cancelTableBooking,
  updateTableBookingStatus,
  checkAvailability,
  addPreOrder,
} from '../controllers/tableBookingController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { TableBooking } from '../models/TableBooking';
import { Request, Response } from 'express';

const router = Router();

// Public route - Check table availability
router.get('/availability/:storeId', checkAvailability);

// Protected routes - require authentication
router.use(authenticate);

// Create new table booking
router.post('/', createTableBooking);

// Get user's table bookings
router.get('/user', getUserTableBookings);

// Get all bookings across all merchant's stores
router.get('/merchant', getMerchantTableBookings);

// Get specific booking by ID
router.get('/:bookingId', getTableBooking);

// Get store's table bookings (for store owners/admin)
router.get('/store/:storeId', getStoreTableBookings);

// Update booking status (for store owners/merchants)
router.put('/:bookingId/status', updateTableBookingStatus);

// Cancel table booking (for customers)
router.put('/:bookingId/cancel', cancelTableBooking);

// Pre-order food linked to a table booking
router.post('/:bookingId/preorder', addPreOrder);

// ==================== ADMIN ROUTES ====================

// Admin: view all bookings across stores
router.get('/admin', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status, storeId, date } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(50, parseInt(limit as string) || 20);
  const skip = (pageNum - 1) * limitNum;

  const query: any = {};
  if (status) query.status = status;
  if (storeId) query.storeId = storeId;
  if (date) {
    const d = new Date(date as string);
    query.bookingDate = {
      $gte: new Date(d.setHours(0, 0, 0, 0)),
      $lte: new Date(d.setHours(23, 59, 59, 999)),
    };
  }

  const [bookings, total] = await Promise.all([
    TableBooking.find(query)
      .populate('storeId', 'name logo')
      .populate('userId', 'profile.firstName profile.lastName phoneNumber')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    TableBooking.countDocuments(query),
  ]);

  return sendSuccess(res, {
    bookings,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  }, 'Admin table bookings retrieved');
}));

export default router;
