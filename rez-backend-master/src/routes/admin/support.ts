import { logger } from '../../config/logger';
// Admin Support Ticket Routes
// CRUD and management for support tickets

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { SupportTicket } from '../../models/SupportTicket';
import { SupportMacro } from '../../models/SupportMacro';
import { User } from '../../models/User';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import supportSocketService from '../../services/supportSocketService';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All routes require authenticated admin
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /admin/support/tickets — list with pagination + filters
 */
router.get('/tickets', asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      assignedTo,
      search,
      dateFrom,
      dateTo,
    } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = new Types.ObjectId(assignedTo as string);
    if (search) {
      const escapedSearch = escapeRegex(search as string);
      query.$or = [
        { ticketNumber: { $regex: escapedSearch, $options: 'i' } },
        { subject: { $regex: escapedSearch, $options: 'i' } },
      ];
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('user', 'fullName phoneNumber')
        .populate('assignedTo', 'fullName')
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    sendSuccess(res, {
      tickets,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  }));

/**
 * GET /admin/support/tickets/:id — detail with full message thread
 */
router.get('/tickets/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ticket ID', 400);
    }

    const ticket = await SupportTicket.findById(id)
      .populate('user', 'fullName phoneNumber')
      .populate('assignedTo', 'fullName')
      .lean();

    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }

    sendSuccess(res, { ticket });
  }));

/**
 * PUT /admin/support/tickets/:id/assign — assign to admin user
 */
router.put('/tickets/:id/assign', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { agentId } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ticket ID', 400);
    }

    const update: any = {};
    if (agentId) {
      if (!Types.ObjectId.isValid(agentId)) {
        return sendError(res, 'Invalid agent ID', 400);
      }
      update.assignedTo = new Types.ObjectId(agentId);
      update.status = 'in_progress';
    } else {
      update.assignedTo = null;
    }

    const ticket = await SupportTicket.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .populate('user', 'fullName phoneNumber')
      .populate('assignedTo', 'fullName profile.firstName profile.lastName')
      .lean();

    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }

    // Emit agent assigned event to user
    const userId = (ticket as any).user?._id?.toString();
    if (userId && agentId) {
      const assignedAgent = (ticket as any).assignedTo;
      supportSocketService.emitAgentAssigned(userId, id, {
        id: agentId,
        name: assignedAgent?.fullName || 'Support Agent',
        status: 'online',
      });
    }

    sendSuccess(res, { ticket });
  }));

/**
 * POST /admin/support/tickets/:id/messages — agent reply
 */
router.post('/tickets/:id/messages', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { message, attachments } = req.body;
    const adminId = (req as any).userId;

    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ticket ID', 400);
    }
    if (!message || message.trim().length === 0) {
      return sendError(res, 'Message is required', 400);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }

    // Add agent message
    const newMessage = {
      sender: new Types.ObjectId(adminId),
      senderType: 'agent',
      message: message.trim(),
      attachments: attachments || [],
      timestamp: new Date(),
      isRead: false,
    };
    (ticket as any).messages.push(newMessage);

    // Update status to waiting_customer and set first response time if needed
    if (ticket.status === 'open' || ticket.status === 'in_progress') {
      ticket.status = 'waiting_customer' as any;
    }
    if (!ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
    }

    await ticket.save();

    // Emit real-time message to user only (not ticket room — admin already added optimistically)
    const userId = ticket.user?.toString();
    if (userId) {
      const admin = await User.findById(adminId).select('profile.firstName profile.lastName').lean();
      const agentName = admin
        ? `${(admin as any).profile?.firstName || ''} ${(admin as any).profile?.lastName || ''}`.trim() || 'Support Agent'
        : 'Support Agent';

      const addedMsg = (ticket as any).messages[(ticket as any).messages.length - 1];
      const messagePayload = {
        ticketId: id,
        message: {
          id: addedMsg._id?.toString(),
          ticketId: id,
          content: message.trim(),
          sender: 'agent',
          senderType: 'agent',
          type: 'text',
          timestamp: addedMsg.timestamp,
          agentName,
          read: false,
          delivered: true,
        },
      };
      // Only emit to user — admin added optimistically, skip ticket room to avoid duplicate
      supportSocketService.emitToUser(userId, 'support_message_received', messagePayload);
    }

    sendSuccess(res, { ticket });
  }));

/**
 * PUT /admin/support/tickets/:id/status — change status
 * When resolving: accepts optional `resolution` (note) and `walletAdjustment` (credit/debit user)
 */
router.put('/tickets/:id/status', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, resolution, walletAdjustment } = req.body;
    const adminId = (req as any).userId;

    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ticket ID', 400);
    }

    const validStatuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const update: any = { status };
    if (status === 'resolved') {
      update.resolvedAt = new Date();
      if (resolution && typeof resolution === 'string') {
        update.resolution = resolution.trim().substring(0, 2000);
      }
      // Calculate resolution time
      const ticketDoc = await SupportTicket.findById(id).select('createdAt').lean();
      if (ticketDoc) {
        update.resolutionTime = Math.round((Date.now() - new Date((ticketDoc as any).createdAt).getTime()) / 60000);
      }
    }
    if (status === 'closed') {
      update.closedAt = new Date();
    }

    const ticket = await SupportTicket.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .populate('user', 'fullName phoneNumber')
      .populate('assignedTo', 'fullName')
      .lean();

    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }

    // Wallet adjustment on resolution (optional)
    let walletResult: any = null;
    if (status === 'resolved' && walletAdjustment) {
      const { amount, type, reason } = walletAdjustment;
      const parsedAmount = Number(amount);
      if (
        parsedAmount > 0 &&
        parsedAmount <= 100000 &&
        ['credit', 'debit'].includes(type) &&
        reason?.trim()
      ) {
        const userId = (ticket as any).user?._id?.toString();
        if (userId) {
          try {
            const { walletService } = await import('../../services/walletService');
            const walletParams = {
              userId,
              amount: parsedAmount,
              source: 'admin' as const,
              description: `Ticket ${(ticket as any).ticketNumber} resolution: ${reason.trim()}`,
              operationType: 'admin_adjustment' as const,
              referenceId: `ticket-resolve:${id}:${Date.now()}`,
              referenceModel: 'SupportTicket' as const,
              metadata: { adminUserId: adminId, ticketId: id, ticketNumber: (ticket as any).ticketNumber, reason: reason.trim() },
            };
            if (type === 'credit') {
              await walletService.credit(walletParams);
            } else {
              await walletService.debit(walletParams);
            }
            walletResult = { success: true, amount: parsedAmount, type };
            logger.info(`[Admin Support] Wallet ${type} of ${parsedAmount} for ticket ${(ticket as any).ticketNumber}`);
          } catch (walletErr: any) {
            logger.error('[Admin Support] Wallet adjustment failed:', walletErr.message);
            walletResult = { success: false, error: walletErr.message };
          }
        }
      }
    }

    // Emit status change event to user
    const userId = (ticket as any).user?._id?.toString();
    if (userId) {
      supportSocketService.emitStatusChanged(userId, id, status);
    }

    sendSuccess(res, { ticket, walletResult });
  }));

/**
 * GET /admin/support/agents — list available agents for assignment
 */
router.get('/agents', asyncHandler(async (req: Request, res: Response) => {
    const admins = await User.find({ role: 'admin', isActive: true })
      .select('profile.firstName profile.lastName email')
      .lean();

    // For each admin, count their open assigned tickets
    const agents = await Promise.all(
      admins.map(async (admin: any) => {
        const openTickets = await SupportTicket.countDocuments({
          assignedTo: admin._id,
          status: { $in: ['open', 'in_progress', 'waiting_customer'] },
        });
        return {
          _id: admin._id,
          fullName: `${admin.profile?.firstName || ''} ${admin.profile?.lastName || ''}`.trim() || 'Admin',
          email: admin.email,
          openTickets,
        };
      })
    );

    sendSuccess(res, { agents });
  }));

/**
 * GET /admin/support/statistics — dashboard metrics
 */
router.get('/statistics', asyncHandler(async (req: Request, res: Response) => {
    const [total, byStatus, byCategory, avgRating] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      SupportTicket.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      SupportTicket.aggregate([
        { $match: { 'rating.score': { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$rating.score' }, count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s: any) => { statusMap[s._id] = s.count; });

    const categoryMap: Record<string, number> = {};
    byCategory.forEach((c: any) => { categoryMap[c._id] = c.count; });

    sendSuccess(res, {
      total,
      byStatus: statusMap,
      byCategory: categoryMap,
      averageRating: avgRating[0]?.avg || 0,
      ratingCount: avgRating[0]?.count || 0,
      openCount: statusMap.open || 0,
      inProgressCount: statusMap.in_progress || 0,
    });
  }));

/**
 * POST /admin/support/tickets/:id/read — mark user messages as read by agent
 */
router.post('/tickets/:id/read', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ticket ID', 400);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }

    await ticket.markMessagesAsRead('agent');

    // Notify user in real-time so they see double ticks
    const userId = ticket.user?.toString();
    if (userId) {
      supportSocketService.emitMessagesRead(userId, id, 'agent');
    }

    sendSuccess(res, { message: 'Messages marked as read' });
  }));

// ==================== ESCALATION ====================

/**
 * POST /admin/support/tickets/:id/escalate — Escalate ticket to specialist team
 */
router.post('/tickets/:id/escalate', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { team, reason } = req.body;
    const adminId = (req as any).userId;

    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ticket ID', 400);
    }
    const validTeams = ['technical', 'finance', 'fraud', 'merchant_ops'];
    if (!team || !validTeams.includes(team)) {
      return sendError(res, `Team must be one of: ${validTeams.join(', ')}`, 400);
    }
    if (!reason?.trim()) {
      return sendError(res, 'Escalation reason is required', 400);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return sendError(res, 'Ticket not found', 404);

    const currentLevel = ticket.escalation?.level || 1;
    ticket.escalation = {
      level: Math.min(currentLevel + 1, 3),
      team,
      escalatedAt: new Date(),
      escalatedBy: new Types.ObjectId(adminId),
      escalationReason: reason.trim(),
    };
    ticket.priority = 'urgent';
    await ticket.save();

    // Notify agents of escalation
    supportSocketService.emitToSupportAgents('ticket:escalated', {
      ticketId: id,
      ticketNumber: ticket.ticketNumber,
      team,
      level: ticket.escalation.level,
    });

    sendSuccess(res, { ticket, message: `Ticket escalated to ${team} team (L${ticket.escalation.level})` });
  }));

// ==================== MACROS ====================

/**
 * GET /admin/support/macros — List all macros
 */
router.get('/macros', asyncHandler(async (req: Request, res: Response) => {
    const { category, audience } = req.query;
    const query: any = {};
    if (category) query.category = category;
    if (audience) query.audience = audience;

    const macros = await SupportMacro.find(query)
      .sort({ category: 1, sortOrder: 1 })
      .lean();

    sendSuccess(res, { macros });
  }));

/**
 * POST /admin/support/macros — Create a macro
 */
router.post('/macros', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { title, content, category, audience, shortcut, tags } = req.body;
    const adminId = (req as any).userId;

    if (!title?.trim() || !content?.trim()) {
      return sendError(res, 'Title and content are required', 400);
    }

    const macro = await SupportMacro.create({
      title: title.trim(),
      content: content.trim(),
      category: category || 'all',
      audience: audience || 'all',
      shortcut: shortcut?.trim() || undefined,
      tags: tags || [],
      createdBy: new Types.ObjectId(adminId),
    });

    res.status(201).json({ success: true, data: { macro } });
  } catch (error: any) {
    if (error.code === 11000) {
      return sendError(res, 'A macro with this shortcut already exists', 409);
    }
    logger.error('[Admin Support] Error creating macro:', error.message);
    sendError(res, 'Failed to create macro', 500);
  }
}));

/**
 * PUT /admin/support/macros/:id — Update a macro
 */
router.put('/macros/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return sendError(res, 'Invalid macro ID', 400);

    const updates: any = {};
    const { title, content, category, audience, shortcut, tags, isActive, sortOrder } = req.body;
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (category !== undefined) updates.category = category;
    if (audience !== undefined) updates.audience = audience;
    if (shortcut !== undefined) updates.shortcut = shortcut?.trim() || null;
    if (tags !== undefined) updates.tags = tags;
    if (isActive !== undefined) updates.isActive = isActive;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const macro = await SupportMacro.findByIdAndUpdate(id, updates, { new: true });
    if (!macro) return sendError(res, 'Macro not found', 404);

    sendSuccess(res, { macro });
  } catch (error: any) {
    if (error.code === 11000) {
      return sendError(res, 'A macro with this shortcut already exists', 409);
    }
    logger.error('[Admin Support] Error updating macro:', error.message);
    sendError(res, 'Failed to update macro', 500);
  }
}));

/**
 * DELETE /admin/support/macros/:id — Delete a macro
 */
router.delete('/macros/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return sendError(res, 'Invalid macro ID', 400);

    const macro = await SupportMacro.findByIdAndDelete(id);
    if (!macro) return sendError(res, 'Macro not found', 404);

    sendSuccess(res, { message: 'Macro deleted' });
  }));

export default router;
