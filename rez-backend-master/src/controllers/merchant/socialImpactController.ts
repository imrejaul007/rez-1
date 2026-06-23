import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Program from '../../models/Program';
import Sponsor from '../../models/Sponsor';
import socialImpactService from '../../services/socialImpactService';
import { sendSuccess, sendNotFound, sendBadRequest, sendInternalError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

/**
 * Verify that the event belongs to the authenticated merchant.
 */
async function verifyEventOwnership(eventId: string, merchantId: string) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) return null;
  return Program.findOne({
    _id: eventId,
    type: 'social_impact',
    merchant: merchantId
  }).lean();
}

// GET / — List merchant's social impact events
export const getMerchantEvents = asyncHandler(async (req: Request, res: Response) => {
    const merchantId = req.merchantId!;
    const { eventStatus, eventType, sponsorId, city, page, limit } = req.query;

    const query: any = {
      type: 'social_impact',
      merchant: merchantId,
      status: { $in: ['active', 'upcoming', 'pending_approval', 'rejected'] }
    };
    if (eventStatus) query.eventStatus = eventStatus;
    if (eventType) query.eventType = eventType;
    if (sponsorId) query.sponsor = sponsorId;
    if (city) query['location.city'] = { $regex: escapeRegex(city as string), $options: 'i' };

    const pg = {
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 20))
    };

    const total = await Program.countDocuments(query);
    const events = await Program.find(query)
      .select('-participants')
      .populate('sponsor', 'name logo brandCoinName brandCoinLogo')
      .sort({ eventDate: 1 })
      .skip((pg.page - 1) * pg.limit)
      .limit(pg.limit).lean();

    return sendSuccess(res, {
      events,
      pagination: { page: pg.page, limit: pg.limit, total, totalPages: Math.ceil(total / pg.limit) }
    });
});

// POST / — Create event for this merchant (requires admin approval)
export const createMerchantEvent = asyncHandler(async (req: Request, res: Response) => {
    const merchantId = req.merchantId!;
    // Merchant-created events start as pending_approval — admin must approve before they go live
    const event = await socialImpactService.createEvent({
      ...req.body,
      merchant: merchantId,
      status: 'pending_approval'
    });
    return sendSuccess(res, event, 'Event created and sent for admin approval', 201);
});

// GET /:id — Get single event
export const getMerchantEventById = asyncHandler(async (req: Request, res: Response) => {
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    await event.populate('sponsor', 'name logo brandCoinName brandCoinLogo description website');
    return sendSuccess(res, event);
});

// PUT /:id — Update event
export const updateMerchantEvent = asyncHandler(async (req: Request, res: Response) => {
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const { merchant, status, ...updateData } = req.body;
    // Merchants cannot change status directly (admin approval required)
    const updated = await socialImpactService.updateEvent(req.params.id, updateData);
    return sendSuccess(res, updated, 'Event updated successfully');
});

// GET /:id/participants — List participants
export const getMerchantEventParticipants = asyncHandler(async (req: Request, res: Response) => {
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const participants = await socialImpactService.getEventParticipants(req.params.id, req.query.status as string);
    return sendSuccess(res, participants);
});

// POST /:id/check-in — Check in participant
export const checkInParticipant = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) return sendBadRequest(res, 'userId is required');
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const enrollment = await socialImpactService.checkInUser(userId, req.params.id, req.merchantId!);
    return sendSuccess(res, enrollment, 'User checked in successfully');
});

// POST /:id/complete — Complete participation
export const completeParticipant = asyncHandler(async (req: Request, res: Response) => {
    const { userId, impactValue } = req.body;
    if (!userId) return sendBadRequest(res, 'userId is required');
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const enrollment = await socialImpactService.completeParticipation(userId, req.params.id, req.merchantId!, impactValue);
    return sendSuccess(res, enrollment, 'Participation completed and coins awarded');
});

// POST /:id/bulk-complete — Bulk complete
export const bulkCompleteParticipants = asyncHandler(async (req: Request, res: Response) => {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return sendBadRequest(res, 'userIds array is required');
    }
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const result = await socialImpactService.bulkComplete(req.params.id, userIds, req.merchantId!);
    return sendSuccess(res, result, `Completed ${result.success} participants, ${result.failed} failed`);
});

// POST /:id/generate-qr — Generate QR for participant
export const generateQRCheckIn = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) return sendBadRequest(res, 'userId is required');
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const result = await socialImpactService.generateCheckInQR(req.params.id, userId);
    return sendSuccess(res, result, 'QR check-in token generated');
});

// POST /:id/verify-qr — Verify scanned QR
export const verifyQRCheckIn = asyncHandler(async (req: Request, res: Response) => {
    const { qrToken } = req.body;
    if (!qrToken) return sendBadRequest(res, 'qrToken is required');
    const enrollment = await socialImpactService.verifyQRCheckIn(qrToken, req.merchantId!);
    // Verify the enrollment's event belongs to this merchant
    const event = await verifyEventOwnership(enrollment.program.toString(), req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    return sendSuccess(res, enrollment, 'User checked in via QR');
});

// POST /:id/generate-otp — Generate OTP for participant
export const generateOTPCheckIn = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) return sendBadRequest(res, 'userId is required');
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const result = await socialImpactService.generateEventOTP(req.params.id, userId);
    return sendSuccess(res, result, 'OTP generated for check-in');
});

// ======== SPONSORS (read-only for merchants) ========

// GET /sponsors — List active sponsors
export const getSponsors = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search } = req.query;
    const query: any = { isActive: true };
    if (search) query.name = { $regex: escapeRegex(search as string), $options: 'i' };

    const pg = {
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 50))
    };

    const total = await Sponsor.countDocuments(query);
    const sponsors = await Sponsor.find(query)
      .select('name slug logo brandCoinName brandCoinLogo industry isActive')
      .sort({ name: 1 })
      .skip((pg.page - 1) * pg.limit)
      .limit(pg.limit).lean();

    return sendSuccess(res, {
      sponsors,
      pagination: { page: pg.page, limit: pg.limit, total, totalPages: Math.ceil(total / pg.limit) }
    });
});

// GET /sponsors/:id — Get single sponsor
export const getSponsorById = asyncHandler(async (req: Request, res: Response) => {
    const sponsor = await Sponsor.findById(req.params.id)
      .select('name slug logo description brandCoinName brandCoinLogo contactPerson website industry isActive').lean();
    if (!sponsor) return sendNotFound(res, 'Sponsor not found');
    return sendSuccess(res, sponsor);
});
