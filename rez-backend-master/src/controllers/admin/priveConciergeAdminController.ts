/**
 * Admin Concierge Controller
 *
 * Admin endpoints for managing Privé concierge support tickets.
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { SupportTicket } from '../../models/SupportTicket';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import { asyncHandler } from '../../utils/asyncHandler';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/admin/prive/concierge/tickets
 * List all Prive concierge tickets with filters
 */
export const getAdminConciergeTickets = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const filter: any = { isPriveTicket: true };

  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.tier) {
    filter.priveTier = req.query.tier;
  }
  if (req.query.slaBreached === 'true') {
    filter.slaBreached = true;
  }
  if (req.query.search) {
    const safeSearch = escapeRegex(req.query.search as string);
    filter.$or = [
      { subject: { $regex: safeSearch, $options: 'i' } },
      { ticketNumber: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .populate('user', 'fullName phoneNumber profile.avatar')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);

  sendSuccess(res, {
    tickets,
    pagination: { current: page, pages: Math.ceil(total / limit), total, limit },
  });
});

/**
 * PUT /api/admin/prive/concierge/tickets/:id/assign
 * Assign a ticket to an admin
 */
export const assignConciergeTicket = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid ticket ID', 400);
  }

  const { assignedTo } = req.body;
  if (!assignedTo) {
    throw new AppError('assignedTo is required', 400);
  }

  const ticket = await SupportTicket.findOneAndUpdate(
    { _id: id, isPriveTicket: true },
    {
      assignedTo: new mongoose.Types.ObjectId(assignedTo),
      status: 'in_progress',
    },
    { new: true }
  );

  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  sendSuccess(res, { ticket }, 'Ticket assigned');
});

/**
 * POST /api/admin/prive/concierge/tickets/:id/respond
 * Admin responds to a ticket
 */
export const respondConciergeTicket = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid ticket ID', 400);
  }

  const { message } = req.body;
  if (!message) {
    throw new AppError('Message is required', 400);
  }

  const adminId = req.user?.id;
  const ticket = await SupportTicket.findOne({ _id: id, isPriveTicket: true });
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  await ticket.addMessage(new mongoose.Types.ObjectId(adminId), 'agent', message);

  // Auto-assign if not yet assigned
  if (!ticket.assignedTo) {
    ticket.assignedTo = new mongoose.Types.ObjectId(adminId);
    ticket.status = 'in_progress';
    await ticket.save();
  }

  sendSuccess(res, { ticket }, 'Response sent');
});

/**
 * POST /api/admin/prive/concierge/tickets/:id/resolve
 * Resolve a concierge ticket
 */
export const resolveConciergeTicket = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid ticket ID', 400);
  }

  const { resolution } = req.body;

  const ticket = await SupportTicket.findOneAndUpdate(
    { _id: id, isPriveTicket: true, status: { $ne: 'closed' } },
    {
      status: 'resolved',
      resolution: resolution || 'Resolved by admin',
      resolvedAt: new Date(),
    },
    { new: true }
  );

  if (!ticket) {
    throw new AppError('Ticket not found or already closed', 404);
  }

  sendSuccess(res, { ticket }, 'Ticket resolved');
});

/**
 * GET /api/admin/prive/concierge/analytics
 * Concierge SLA compliance analytics
 */
export const getConciergeAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalTickets, openTickets, slaBreached, avgResponseTime, tierBreakdown] = await Promise.all([
    SupportTicket.countDocuments({ isPriveTicket: true, createdAt: { $gte: thirtyDaysAgo } }),
    SupportTicket.countDocuments({ isPriveTicket: true, status: { $in: ['open', 'in_progress'] } }),
    SupportTicket.countDocuments({ isPriveTicket: true, slaBreached: true, createdAt: { $gte: thirtyDaysAgo } }),
    SupportTicket.aggregate([
      { $match: { isPriveTicket: true, resolvedAt: { $exists: true }, createdAt: { $gte: thirtyDaysAgo } } },
      { $project: { responseTime: { $subtract: ['$resolvedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$responseTime' } } },
    ]).catch(() => []),
    SupportTicket.aggregate([
      { $match: { isPriveTicket: true, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$priveTier', count: { $sum: 1 }, breached: { $sum: { $cond: ['$slaBreached', 1, 0] } } } },
    ]).catch(() => []),
  ]);

  const avgResponseHours = avgResponseTime?.[0]?.avgMs
    ? Math.round(avgResponseTime[0].avgMs / (1000 * 60 * 60) * 10) / 10
    : null;

  const slaComplianceRate = totalTickets > 0
    ? Math.round(((totalTickets - slaBreached) / totalTickets) * 100 * 10) / 10
    : 100;

  sendSuccess(res, {
    period: '30d',
    totalTickets,
    openTickets,
    slaBreached,
    slaComplianceRate,
    avgResponseHours,
    tierBreakdown: tierBreakdown.map((t: any) => ({
      tier: t._id || 'unknown',
      count: t.count,
      breached: t.breached,
      complianceRate: t.count > 0 ? Math.round(((t.count - t.breached) / t.count) * 100) : 100,
    })),
  });
});
