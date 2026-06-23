import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { ServiceAppointment } from '../../models/ServiceAppointment';
import { sendSuccess, sendError } from '../../utils/response';
import { logger } from '../../config/logger';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/service-appointments
 * @desc    List all service appointments (admin)
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status, date, storeId } = req.query;

  const query: any = {};
  if (status && status !== 'all') query.status = status;
  if (storeId) query.store = storeId;
  if (date) {
    const d = new Date(date as string);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    query.appointmentDate = { $gte: start, $lte: end };
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const [appointments, total] = await Promise.all([
    ServiceAppointment.find(query)
      .populate('store', 'name logo')
      .populate('user', 'profile.firstName profile.lastName phoneNumber')
      .sort({ appointmentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ServiceAppointment.countDocuments(query),
  ]);

  sendSuccess(res, {
    appointments,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
}));

/**
 * @route   PUT /api/admin/service-appointments/:id/status
 * @desc    Update appointment status (admin)
 * @access  Admin
 */
router.put('/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const appointment = await ServiceAppointment.findById(id);
  if (!appointment) {
    sendError(res, 'Appointment not found', 404);
    return;
  }

  appointment.status = status;
  if (status === 'confirmed' && !appointment.confirmedAt) appointment.confirmedAt = new Date();
  if (status === 'completed' && !appointment.completedAt) appointment.completedAt = new Date();
  if (status === 'cancelled' && !appointment.cancelledAt) appointment.cancelledAt = new Date();
  await appointment.save();

  logger.info(`✅ [ADMIN] Service appointment ${id} status → ${status}`);

  sendSuccess(res, appointment, `Status updated to ${status}`);
}));

export default router;
