// @ts-nocheck
import { Router, Request, Response } from 'express';
import { Appointment } from '../models/Appointment';
import { CatalogItem } from '../models/CatalogItem';
import { Store } from '../models/Store';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a time string "HH:MM" into minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Format minutes since midnight to "HH:MM".
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Get day name from ISO date string "YYYY-MM-DD".
 */
function getDayName(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  return days[date.getDay()];
}

/**
 * Check if two time ranges overlap.
 */
function rangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

// ─── GET /api/appointments/:storeSlug/slots ────────────────────────────────────
// Get available time slots for a given date and optional service.
// Public endpoint — no auth required.

router.get(
  '/:storeSlug/slots',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug } = req.params;
    const { date, serviceId } = req.query as { date?: string; serviceId?: string };

    if (!date) {
      return res.status(400).json({ success: false, message: 'date query param is required (YYYY-MM-DD)' });
    }

    const store = await Store.findOne({ slug: storeSlug, isActive: true })
      .select('displayMode operatingHours operationalInfo')
      .lean();

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Get service duration if serviceId provided
    let durationMinutes = 30; // default
    if (serviceId) {
      const service = await CatalogItem.findOne({ _id: serviceId, storeSlug, type: 'service' }).lean();
      if (service) {
        durationMinutes = (service as any).durationMinutes || 30;
      }
    }

    // Determine operating hours for the requested date
    const dayName = getDayName(date);
    const rawHours: Record<string, any> =
      (store as any).operatingHours && Object.keys((store as any).operatingHours).length > 0
        ? (store as any).operatingHours
        : (store as any).operationalInfo?.hours || {};

    const dayHours = rawHours[dayName];

    if (!dayHours || dayHours.closed) {
      return res.json({ success: true, data: { date, slots: [], message: 'Store is closed on this day' } });
    }

    const openMinutes = timeToMinutes(dayHours.open ?? '09:00');
    const closeMinutes = timeToMinutes(dayHours.close ?? '22:00');

    // Fetch existing bookings for this date/store
    const existingAppointments = await Appointment.find({
      storeSlug,
      date,
      status: { $in: ['booked'] },
    })
      .select('startTime endTime staffId')
      .lean();

    // Generate time slots
    const slotDuration = durationMinutes;
    const slots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
      bookedBy?: string;
    }> = [];

    for (let start = openMinutes; start + slotDuration <= closeMinutes; start += slotDuration) {
      const slotStart = minutesToTime(start);
      const slotEnd = minutesToTime(start + slotDuration);

      const conflict = existingAppointments.find((apt) =>
        rangesOverlap(slotStart, slotEnd, apt.startTime, apt.endTime),
      );

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        available: !conflict,
        bookedBy: conflict ? (conflict as any).staffId : undefined,
      });
    }

    return res.json({ success: true, data: { date, durationMinutes: slotDuration, slots } });
  }),
);

// ─── POST /api/appointments/:storeSlug/book ────────────────────────────────────
// Book an appointment. Public endpoint — phone-based identification.

router.post(
  '/:storeSlug/book',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug } = req.params;
    const { serviceId, date, startTime, staffId, customerPhone, customerName, notes, depositPaid, paymentId } =
      req.body;

    if (!serviceId || !date || !startTime || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'serviceId, date, startTime, and customerPhone are required',
      });
    }

    // Validate store exists
    const store = await Store.findOne({ slug: storeSlug, isActive: true }).select('_id merchantId displayMode').lean();
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Validate service
    const service = await CatalogItem.findOne({ _id: serviceId, storeSlug, type: 'service' }).lean();
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const durationMinutes = (service as any).durationMinutes || 30;
    const endMinutes = timeToMinutes(startTime) + durationMinutes;
    const endTime = minutesToTime(endMinutes);

    // Atomic upsert — unique index on (storeSlug, date, startTime) guarantees that
    // two concurrent requests for the same slot cannot both succeed. One will throw
    // a MongoError with code 11000 (duplicate key), which we catch and return 409.
    const staffName = (service as any).staff?.find((s: any) => s.id === staffId)?.name;

    try {
      const appointment = await Appointment.create({
        storeId: (store as any)._id,
        storeSlug,
        customerPhone,
        customerName: customerName || '',
        serviceId: new mongoose.Types.ObjectId(serviceId),
        serviceName: (service as any).name,
        staffId,
        staffName,
        date,
        startTime,
        endTime,
        status: 'booked',
        depositPaid: depositPaid || false,
        depositAmount: depositPaid ? (service as any).depositAmount || 0 : 0,
        paymentId,
        notes,
      });

      logger.info(`[Appointment] Booked ${appointment._id} for store ${storeSlug} on ${date} at ${startTime}`);

      return res.status(201).json({
        success: true,
        data: {
          id: appointment._id,
          serviceName: appointment.serviceName,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          staffName: appointment.staffName,
          status: appointment.status,
        },
      });
    } catch (err: any) {
      // MongoError 11000 = duplicate key = another booking won the race
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'This time slot was just booked by another customer. Please choose a different slot.',
        });
      }
      throw err;
    }
  }),
);

// ─── GET /api/appointments/:storeSlug/my ───────────────────────────────────────
// Get user's appointments. Auth required.

router.get(
  '/:storeSlug/my',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const appointments = await Appointment.find({ storeSlug, customerId: userId })
      .sort({ date: -1, startTime: 1 })
      .lean();

    const formatted = appointments.map((apt) => ({
      id: String(apt._id),
      serviceName: apt.serviceName,
      staffName: apt.staffName,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      depositPaid: apt.depositPaid,
      depositAmount: apt.depositAmount,
      notes: apt.notes,
    }));

    return res.json({ success: true, data: formatted });
  }),
);

// ─── PATCH /api/appointments/:storeSlug/:appointmentId/cancel ──────────────────
// Cancel an appointment. Auth required.

router.patch(
  '/:storeSlug/:appointmentId/cancel',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug, appointmentId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      storeSlug,
      customerId: userId,
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Appointment is already cancelled' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed appointment' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    logger.info(`[Appointment] Cancelled ${appointmentId} for store ${storeSlug}`);

    return res.json({ success: true, data: { id: appointment._id, status: appointment.status } });
  }),
);

export default router;
