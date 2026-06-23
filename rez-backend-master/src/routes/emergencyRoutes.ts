import express from 'express';
import {
  getEmergencyContacts,
  getNearbyContacts,
  bookEmergencyService,
  getEmergencyBookingStatus,
  getUserEmergencyBookings,
  cancelEmergencyBooking,
  updateEmergencyBookingStatus,
  getActiveEmergencyBooking
} from '../controllers/emergencyController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes - emergency contacts should be accessible without login
router.get('/contacts', getEmergencyContacts);
router.get('/contacts/nearby', getNearbyContacts);

// Protected routes (require authentication)
router.post('/book', authenticate, bookEmergencyService);
router.get('/active', authenticate, getActiveEmergencyBooking);
router.get('/bookings', authenticate, getUserEmergencyBookings);
router.get('/booking/:id', authenticate, getEmergencyBookingStatus);
router.put('/booking/:id/cancel', authenticate, cancelEmergencyBooking);

// Admin routes (should have additional admin middleware in production)
router.put('/booking/:id/status', authenticate, updateEmergencyBookingStatus);

export default router;
