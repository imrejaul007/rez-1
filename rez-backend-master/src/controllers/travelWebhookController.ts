/**
 * Travel Webhook Controller
 *
 * Stubbed endpoints for future travel partner integrations.
 * Partners can push booking updates, PNR assignments, and price changes.
 */

import { Request, Response } from 'express';
import { ServiceBooking } from '../models/ServiceBooking';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../config/logger';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Verify HMAC-SHA256 webhook signature from travel partners
 */
function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.TRAVEL_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('[TRAVEL WEBHOOK] TRAVEL_WEBHOOK_SECRET not configured');
    return false;
  }
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * POST /api/travel-webhooks/booking-update
 *
 * Receives booking status updates from travel partners.
 * Expected payload:
 * {
 *   bookingNumber: string,
 *   externalReference?: string,
 *   pnr?: string,
 *   status?: 'confirmed' | 'cancelled',
 *   eTicketUrl?: string,
 *   signature: string  // HMAC signature for verification
 * }
 */
export const handleBookingUpdate = asyncHandler(async (req: Request, res: Response) => {
    const {
      bookingNumber,
      externalReference,
      pnr,
      status,
      eTicketUrl,
      signature,
    } = req.body;

    // Verify webhook signature — use raw body captured by express.json({verify})
    const sig = (req.headers['x-webhook-signature'] as string) || signature;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    if (!sig || !verifyWebhookSignature(rawBody, sig)) {
      logger.warn('[TRAVEL WEBHOOK] Invalid or missing signature for booking update');
      return sendError(res, 'Invalid webhook signature', 401);
    }
    logger.info('[TRAVEL WEBHOOK] Booking update received:', {
      bookingNumber,
      externalReference,
      pnr,
      status,
      hasETicket: !!eTicketUrl,
    });

    if (!bookingNumber && !externalReference) {
      return sendError(res, 'bookingNumber or externalReference is required', 400);
    }

    // Find booking by booking number or external reference
    const query: any = {};
    if (bookingNumber) query.bookingNumber = bookingNumber;
    if (externalReference) query.externalReference = externalReference;

    const booking = await ServiceBooking.findOne(query);
    if (!booking) {
      logger.warn('[TRAVEL WEBHOOK] Booking not found:', query);
      return sendError(res, 'Booking not found', 404);
    }

    // Apply updates
    if (pnr) booking.pnr = pnr;
    if (eTicketUrl) booking.eTicketUrl = eTicketUrl;
    if (externalReference && !booking.externalReference) {
      booking.externalReference = externalReference;
    }

    if (status === 'confirmed' && booking.status === 'pending') {
      booking.status = 'confirmed';
      booking.confirmedAt = new Date();
    } else if (status === 'cancelled' && booking.status !== 'cancelled') {
      booking.status = 'cancelled';
      booking.cancelledAt = new Date();
      booking.cancellationReason = 'Cancelled by travel partner';
    }

    await booking.save();

    logger.info('[TRAVEL WEBHOOK] Booking updated successfully:', booking.bookingNumber);
    sendSuccess(res, { bookingNumber: booking.bookingNumber, updated: true });
});

/**
 * POST /api/travel-webhooks/price-update
 *
 * Receives fare/price changes from travel partners.
 * Expected payload:
 * {
 *   serviceId: string,
 *   newPrice: number,
 *   effectiveFrom?: string,
 *   signature: string
 * }
 */
export const handlePriceUpdate = asyncHandler(async (req: Request, res: Response) => {
    const { serviceId, newPrice, effectiveFrom, signature } = req.body;

    // Verify webhook signature — use raw body captured by express.json({verify})
    const sig = (req.headers['x-webhook-signature'] as string) || signature;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    if (!sig || !verifyWebhookSignature(rawBody, sig)) {
      logger.warn('[TRAVEL WEBHOOK] Invalid or missing signature for price update');
      return sendError(res, 'Invalid webhook signature', 401);
    }
    logger.info('[TRAVEL WEBHOOK] Price update received:', {
      serviceId,
      newPrice,
      effectiveFrom,
    });

    if (!serviceId || !newPrice) {
      return sendError(res, 'serviceId and newPrice are required', 400);
    }

    logger.info('[TRAVEL WEBHOOK] Price update logged (stub) — will implement with partner API');

    sendSuccess(res, { serviceId, newPrice, acknowledged: true });
});
