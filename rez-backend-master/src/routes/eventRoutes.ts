import express from 'express';
import {
  getAllEvents,
  getEventById,
  getEventsByCategory,
  searchEvents,
  getFeaturedEvents,
  bookEventSlot,
  getUserBookings,
  confirmBooking,
  cancelBooking,
  toggleEventFavorite,
  shareEvent,
  getEventAnalytics,
  getRelatedEvents,
  trackEventAnalytics,
  getEventCategories,
  getGlobalRewardConfig,
  checkInToEvent,
  getMyFavorites,
  getMyEvents,
  getEventRewardInfo,
  getFavoriteStatus,
} from '../controllers/eventController';
import {
  getEventReviews,
  submitReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  getUserReview
} from '../controllers/eventReviewController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes (must be before parameterized routes)
router.get('/', getAllEvents);
router.get('/featured', getFeaturedEvents);
router.get('/search', searchEvents);
router.get('/categories', getEventCategories); // NEW: dynamic categories
router.get('/reward-config', getGlobalRewardConfig); // NEW: global reward config for entry card
router.get('/category/:category', getEventsByCategory);
router.post('/analytics/track', trackEventAnalytics);

// Protected routes (must be before /:id routes)
router.get('/my-bookings', authenticate, getUserBookings);
router.get('/my-favorites', authenticate, getMyFavorites); // NEW: user's favorited events
router.get('/my-events', authenticate, getMyEvents); // NEW: user's events overview
router.put('/bookings/:bookingId/confirm', authenticate, confirmBooking);
router.delete('/bookings/:bookingId', authenticate, cancelBooking);

// Review routes (must be before /:id routes)
router.put('/reviews/:reviewId', authenticate, updateReview);
router.delete('/reviews/:reviewId', authenticate, deleteReview);
router.put('/reviews/:reviewId/helpful', markReviewHelpful);

// Parameterized routes (must be last)
router.get('/:id', getEventById);
router.get('/:id/related', getRelatedEvents);
router.get('/:id/reviews', getEventReviews);
router.get('/:id/my-review', authenticate, getUserReview);
router.get('/:id/rewards', getEventRewardInfo); // NEW: event-specific reward info
router.get('/:id/favorite-status', authenticate, getFavoriteStatus); // NEW: lightweight favorite check
router.post('/:id/reviews', authenticate, submitReview);
router.post('/:id/share', shareEvent); // Enhanced: awards sharing reward if authenticated
router.post('/:id/book', authenticate, bookEventSlot); // Enhanced: atomic + idempotent + rewards
router.post('/:id/favorite', authenticate, toggleEventFavorite); // Enhanced: per-user persistence
router.post('/:id/checkin', authenticate, checkInToEvent); // NEW: verified check-in + reward
router.get('/:id/analytics', authenticate, getEventAnalytics);

export default router;
