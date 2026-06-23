import { Router } from 'express';
import {
  handleBookingUpdate,
  handlePriceUpdate,
} from '../controllers/travelWebhookController';

const router = Router();

// Webhook endpoints — no auth required (use signature verification instead)
router.post('/booking-update', handleBookingUpdate);
router.post('/price-update', handlePriceUpdate);

export default router;
