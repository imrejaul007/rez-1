import { Router, RequestHandler } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  rateBooking,
  getAvailableSlots
} from '../controllers/serviceBookingController';

const router = Router();

// Type assertion helper for authenticated routes
const asHandler = (fn: any): RequestHandler => fn;

/**
 * @swagger
 * /api/service-bookings/available-slots:
 *   get:
 *     summary: Get available time slots for a service on a specific date
 *     tags: [Service Bookings]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Available time slots
 *       400:
 *         description: Service ID and date are required
 *       404:
 *         description: Service or store not found
 */
router.get('/available-slots', getAvailableSlots);

/**
 * @swagger
 * /api/service-bookings:
 *   post:
 *     summary: Create a new service booking
 *     tags: [Service Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - bookingDate
 *               - timeSlot
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: Service ID
 *               bookingDate:
 *                 type: string
 *                 format: date
 *                 description: Booking date (YYYY-MM-DD)
 *               timeSlot:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     description: Start time (HH:MM)
 *                   end:
 *                     type: string
 *                     description: End time (HH:MM)
 *               serviceType:
 *                 type: string
 *                 enum: [home, store, online]
 *                 description: Service type
 *               serviceAddress:
 *                 type: object
 *                 description: Address for home services
 *               customerNotes:
 *                 type: string
 *                 description: Customer notes
 *               paymentMethod:
 *                 type: string
 *                 enum: [online, cash, wallet]
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Service not found
 */
router.post('/', authenticate, asHandler(createBooking));

/**
 * @swagger
 * /api/service-bookings:
 *   get:
 *     summary: Get user's bookings
 *     tags: [Service Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, assigned, in_progress, completed, cancelled, no_show]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of bookings
 *       401:
 *         description: Not authenticated
 */
router.get('/', authenticate, asHandler(getUserBookings));

/**
 * @swagger
 * /api/service-bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Service Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details
 *       400:
 *         description: Invalid booking ID
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Booking not found
 */
router.get('/:id', authenticate, asHandler(getBookingById));

/**
 * @swagger
 * /api/service-bookings/{id}/cancel:
 *   put:
 *     summary: Cancel a booking
 *     tags: [Service Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Cannot cancel this booking
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Booking not found
 */
router.put('/:id/cancel', authenticate, asHandler(cancelBooking));

/**
 * @swagger
 * /api/service-bookings/{id}/reschedule:
 *   put:
 *     summary: Reschedule a booking
 *     tags: [Service Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingDate
 *               - timeSlot
 *             properties:
 *               bookingDate:
 *                 type: string
 *                 format: date
 *                 description: New booking date
 *               timeSlot:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                   end:
 *                     type: string
 *     responses:
 *       200:
 *         description: Booking rescheduled successfully
 *       400:
 *         description: Cannot reschedule this booking
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Booking not found
 */
router.put('/:id/reschedule', authenticate, asHandler(rescheduleBooking));

/**
 * @swagger
 * /api/service-bookings/{id}/rate:
 *   post:
 *     summary: Add rating to a completed booking
 *     tags: [Service Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - score
 *             properties:
 *               score:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating score (1-5)
 *               review:
 *                 type: string
 *                 description: Review text
 *     responses:
 *       200:
 *         description: Rating added successfully
 *       400:
 *         description: Invalid rating or booking not completed
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Booking not found
 */
router.post('/:id/rate', authenticate, asHandler(rateBooking));

export default router;
