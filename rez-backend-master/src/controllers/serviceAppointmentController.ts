import { logger } from '../config/logger';
// ServiceAppointment Controller
// Handles service appointment booking API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ServiceAppointment } from '../models/ServiceAppointment';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Create new service appointment
 * POST /api/service-appointments
 */
export const createServiceAppointment = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const {
      storeId,
      serviceType,
      appointmentDate,
      appointmentTime,
      duration,
      customerName,
      customerPhone,
      customerEmail,
      specialInstructions,
    } = req.body;

    // Validate required fields
    if (!storeId || !serviceType || !appointmentDate || !appointmentTime || !customerName || !customerPhone) {
      sendError(res, 'Missing required fields', 400);
      return;
    }

    // Check if store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      sendNotFound(res, 'Store not found');
      return;
    }

    // Verify store type supports appointments
    const storeTypeField = (store as any).type;
    if (storeTypeField && storeTypeField !== 'SERVICE') {
      sendError(res, 'This store does not support service appointments', 400);
      return;
    }

    // Check availability
    const isAvailable = await (ServiceAppointment as any).checkAvailability(
      new Types.ObjectId(storeId),
      new Date(appointmentDate),
      appointmentTime,
      duration || 60
    );

    if (!isAvailable) {
      sendError(res, 'This time slot is not available. Please choose another time.', 409);
      return;
    }

    // Generate appointment number
    const appointmentNumber = await (ServiceAppointment as any).generateAppointmentNumber();

    // Create appointment
    const appointment = await ServiceAppointment.create({
      appointmentNumber,
      store: new Types.ObjectId(storeId),
      user: new Types.ObjectId(userId),
      serviceType,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      duration: duration || 60,
      customerName,
      customerPhone,
      customerEmail,
      specialInstructions,
      status: 'pending',
    });

    // Populate store and user details
    const populatedAppointment = await ServiceAppointment.findById(appointment._id)
      .populate('store', 'name logo location contact')
      .populate('user', 'profile.firstName profile.lastName profile.phoneNumber').lean();

    logger.info(`✅ [SERVICE APPOINTMENT] Created appointment ${appointmentNumber} for store ${storeId}`);

    // SA-01: Award coins for service booking (non-blocking)
    try {
      const { rewardEngine } = await import('../core/rewardEngine');
      await rewardEngine.issue({
        userId,
        amount: 15,
        coinType: 'rez',
        source: 'order',
        rewardType: 'engagement',
        description: `15 coins for booking at ${(store as any).name || 'store'}`,
        operationType: 'store_payment_reward',
        referenceId: `service-appt:${appointment._id}`,
        referenceModel: 'ServiceAppointment',
        metadata: { storeId, serviceType },
      });
    } catch (rewardErr) {
      logger.warn('Non-blocking: Failed to award service booking coins', rewardErr);
    }

    sendCreated(res, populatedAppointment, 'Service appointment created successfully');
});

/**
 * Get user's service appointments
 * GET /api/service-appointments/user
 */
export const getUserServiceAppointments = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { status } = req.query;

    const query: any = { user: new Types.ObjectId(userId) };

    if (status) {
      query.status = status;
    }

    const appointments = await ServiceAppointment.find(query)
      .populate('store', 'name logo location contact operationalInfo')
      .sort({ appointmentDate: -1, createdAt: -1 })
      .lean();

    logger.info(`✅ [SERVICE APPOINTMENT] Retrieved ${appointments.length} appointments for user ${userId}`);

    sendSuccess(res, { appointments, total: appointments.length }, 'Appointments retrieved successfully');
});

/**
 * Get service appointment by ID
 * GET /api/service-appointments/:appointmentId
 */
export const getServiceAppointment = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { appointmentId } = req.params;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!Types.ObjectId.isValid(appointmentId)) {
      sendError(res, 'Invalid appointment ID', 400);
      return;
    }

    const appointment = await ServiceAppointment.findById(appointmentId)
      .populate('store', 'name logo location contact operationalInfo bookingConfig')
      .populate('user', 'profile.firstName profile.lastName profile.phoneNumber profile.email')
      .lean();

    if (!appointment) {
      sendNotFound(res, 'Appointment not found');
      return;
    }

    // Verify the appointment belongs to the user
    if (appointment.user._id.toString() !== userId) {
      sendError(res, 'Unauthorized to access this appointment', 403);
      return;
    }

    logger.info(`✅ [SERVICE APPOINTMENT] Retrieved appointment ${appointmentId}`);

    sendSuccess(res, appointment, 'Appointment retrieved successfully');
});

/**
 * Get store's service appointments
 * GET /api/service-appointments/store/:storeId
 */
export const getStoreServiceAppointments = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { storeId } = req.params;
    const { date, status } = req.query;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!Types.ObjectId.isValid(storeId)) {
      sendError(res, 'Invalid store ID', 400);
      return;
    }

    // Check if store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      sendNotFound(res, 'Store not found');
      return;
    }

    const query: any = { store: new Types.ObjectId(storeId) };

    // Filter by date if provided
    if (date) {
      const filterDate = new Date(date as string);
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      query.appointmentDate = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const appointments = await ServiceAppointment.find(query)
      .populate('user', 'profile.firstName profile.lastName profile.phoneNumber')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .lean();

    logger.info(`✅ [SERVICE APPOINTMENT] Retrieved ${appointments.length} appointments for store ${storeId}`);

    sendSuccess(res, { appointments, total: appointments.length }, 'Store appointments retrieved successfully');
});

/**
 * Cancel service appointment
 * PUT /api/service-appointments/:appointmentId/cancel
 */
export const cancelServiceAppointment = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { appointmentId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!Types.ObjectId.isValid(appointmentId)) {
      sendError(res, 'Invalid appointment ID', 400);
      return;
    }

    const appointment = await ServiceAppointment.findById(appointmentId).lean();

    if (!appointment) {
      sendNotFound(res, 'Appointment not found');
      return;
    }

    // Verify the appointment belongs to the user
    if (appointment.user.toString() !== userId) {
      sendError(res, 'Unauthorized to cancel this appointment', 403);
      return;
    }

    // Check if appointment can be cancelled
    if (appointment.status === 'cancelled') {
      sendError(res, 'Appointment is already cancelled', 400);
      return;
    }

    if (appointment.status === 'completed') {
      sendError(res, 'Cannot cancel a completed appointment', 400);
      return;
    }

    // Cancel the appointment
    await appointment.cancel(reason);

    // Populate for response
    const updatedAppointment = await ServiceAppointment.findById(appointmentId)
      .populate('store', 'name logo location contact')
      .lean();

    logger.info(`✅ [SERVICE APPOINTMENT] Cancelled appointment ${appointmentId}`);

    sendSuccess(res, updatedAppointment, 'Appointment cancelled successfully');
});

/**
 * Check availability for a time slot
 * GET /api/service-appointments/availability/:storeId
 */
export const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { date, time, duration } = req.query;

    if (!Types.ObjectId.isValid(storeId)) {
      sendError(res, 'Invalid store ID', 400);
      return;
    }

    if (!date || !time) {
      sendError(res, 'Date and time are required', 400);
      return;
    }

    // Check if store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      sendNotFound(res, 'Store not found');
      return;
    }

    const appointmentDate = new Date(date as string);
    const appointmentTime = time as string;
    const appointmentDuration = duration ? parseInt(duration as string) : 60;

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(appointmentTime)) {
      sendError(res, 'Invalid time format. Use HH:MM format', 400);
      return;
    }

    const isAvailable = await (ServiceAppointment as any).checkAvailability(
      new Types.ObjectId(storeId),
      appointmentDate,
      appointmentTime,
      appointmentDuration
    );

    logger.info(`✅ [SERVICE APPOINTMENT] Checked availability for ${storeId} on ${date} at ${time}: ${isAvailable}`);

    sendSuccess(
      res,
      {
        available: isAvailable,
        date: appointmentDate,
        time: appointmentTime,
        duration: appointmentDuration,
      },
      isAvailable ? 'Time slot is available' : 'Time slot is not available'
    );
});

/**
 * Get available time slots for a date
 * GET /api/service-appointments/slots/:storeId
 */
export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { date, duration } = req.query;

    if (!Types.ObjectId.isValid(storeId)) {
      sendError(res, 'Invalid store ID', 400);
      return;
    }

    if (!date) {
      sendError(res, 'Date is required', 400);
      return;
    }

    // Check if store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      sendNotFound(res, 'Store not found');
      return;
    }

    const appointmentDate = new Date(date as string);
    const appointmentDuration = duration ? parseInt(duration as string) : 60;

    // Get store working hours (default 9 AM to 9 PM if not specified)
    let workingHours = { start: '09:00', end: '21:00' };

    if ((store as any).bookingConfig?.workingHours) {
      workingHours = (store as any).bookingConfig.workingHours;
    } else if ((store as any).operationalInfo?.hours) {
      // Try to get from operational hours
      const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dayHours = (store as any).operationalInfo.hours[dayName];
      if (dayHours && !dayHours.closed) {
        workingHours = { start: dayHours.open, end: dayHours.close };
      }
    }

    // Generate time slots
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const slots: Array<{ time: string; available: boolean }> = [];

    // Generate slots every 30 minutes
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const min = minutes % 60;
      const timeSlot = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

      // Check if slot is available
      const isAvailable = await (ServiceAppointment as any).checkAvailability(
        new Types.ObjectId(storeId),
        appointmentDate,
        timeSlot,
        appointmentDuration
      );

      slots.push({
        time: timeSlot,
        available: isAvailable,
      });
    }

    logger.info(`✅ [SERVICE APPOINTMENT] Generated ${slots.length} time slots for ${storeId} on ${date}`);

    sendSuccess(
      res,
      {
        date: appointmentDate,
        slots,
        workingHours,
      },
      'Available slots retrieved successfully'
    );
});

/**
 * Update service appointment status
 * PUT /api/service-appointments/:id/status
 */
export const updateServiceAppointmentStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid appointment ID', 400);
      return;
    }

    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      return;
    }

    const appointment = await ServiceAppointment.findById(id);
    if (!appointment) {
      sendNotFound(res, 'Appointment not found');
      return;
    }

    // Update status with timestamps
    appointment.status = status;
    if (status === 'confirmed' && !appointment.confirmedAt) appointment.confirmedAt = new Date();
    if (status === 'completed' && !appointment.completedAt) appointment.completedAt = new Date();
    if (status === 'cancelled' && !appointment.cancelledAt) appointment.cancelledAt = new Date();
    await appointment.save();

    // ED-03: Award coins on completion
    if (status === 'completed') {
      try {
        const { rewardEngine } = await import('../core/rewardEngine');
        await rewardEngine.issue({
          userId: appointment.user.toString(),
          amount: 25,
          coinType: 'rez',
          source: 'order',
          rewardType: 'engagement',
          description: `25 coins for completing ${appointment.serviceType}`,
          operationType: 'store_payment_reward',
          referenceId: `service-appt:${appointment._id}`,
          referenceModel: 'ServiceAppointment',
        });
      } catch (rewardErr) {
        logger.warn('Non-blocking: Failed to award service completion coins', rewardErr);
      }
    }

    logger.info(`✅ [SERVICE APPOINTMENT] Status updated to ${status} for appointment ${id}`);

    sendSuccess(res, appointment, `Appointment status updated to ${status}`);
});
