import { Router } from 'express';
import { authMiddleware as authenticateMerchant } from '../../middleware/merchantauth';
import {
  getMerchantEvents,
  createMerchantEvent,
  getMerchantEventById,
  updateMerchantEvent,
  getMerchantEventParticipants,
  checkInParticipant,
  completeParticipant,
  bulkCompleteParticipants,
  generateQRCheckIn,
  verifyQRCheckIn,
  generateOTPCheckIn,
  getSponsors,
  getSponsorById,
} from '../../controllers/merchant/socialImpactController';

const router = Router();

// All routes require merchant authentication
router.use(authenticateMerchant);

// Sponsors (read-only for merchants)
router.get('/sponsors', getSponsors);
router.get('/sponsors/:id', getSponsorById);

// Event CRUD
router.get('/', getMerchantEvents);
router.post('/', createMerchantEvent);
router.get('/:id', getMerchantEventById);
router.put('/:id', updateMerchantEvent);

// Participant management
router.get('/:id/participants', getMerchantEventParticipants);
router.post('/:id/check-in', checkInParticipant);
router.post('/:id/complete', completeParticipant);
router.post('/:id/bulk-complete', bulkCompleteParticipants);

// Attendance verification
router.post('/:id/generate-qr', generateQRCheckIn);
router.post('/:id/verify-qr', verifyQRCheckIn);
router.post('/:id/generate-otp', generateOTPCheckIn);

export default router;
