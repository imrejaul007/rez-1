import { logger } from '../config/logger';
// Support Controller
// Handles customer support and FAQ API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import supportService from '../services/supportService';
import { SupportConfig } from '../models/SupportConfig';
import { SupportTicket } from '../models/SupportTicket';
import supportSocketService from '../services/supportSocketService';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Create new support ticket
 * POST /api/support/tickets
 */
export const createTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { subject, category, message, relatedEntity, attachments, priority, idempotencyKey, tags } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!subject || !category || !message) {
      res.status(400).json({
        success: false,
        message: 'Subject, category, and message are required',
      });
      return;
    }

    const ticket = await supportService.createTicket({
      userId: new Types.ObjectId(userId),
      subject,
      category,
      initialMessage: message,
      relatedEntity,
      attachments,
      priority,
      idempotencyKey,
      tags,
    });

    // Re-fetch with populated assignedTo so frontend gets agent info
    // (auto-assignment updates the DB document but the original ticket object is stale)
    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('assignedTo', 'profile.firstName profile.lastName')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: { ticket: populatedTicket || ticket },
    });
});

/**
 * Get user's tickets with filters
 * GET /api/support/tickets
 */
export const getMyTickets = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { status, category, priority, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (priority) filters.priority = priority;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);

    const result = await supportService.getUserTickets(
      new Types.ObjectId(userId),
      filters,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
});

/**
 * Get ticket by ID
 * GET /api/support/tickets/:id
 */
export const getTicketById = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const ticket = await supportService.getTicketById(
      new Types.ObjectId(id),
      new Types.ObjectId(userId)
    );

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
      return;
    }

    // Mark messages as read
    await supportService.markMessagesAsRead(
      new Types.ObjectId(id),
      new Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: { ticket },
    });
});

/**
 * Add message to ticket
 * POST /api/support/tickets/:id/messages
 */
export const addMessageToTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { message, attachments } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!message) {
      res.status(400).json({
        success: false,
        message: 'Message is required',
      });
      return;
    }

    const ticket = await supportService.addMessageToTicket(
      new Types.ObjectId(id),
      new Types.ObjectId(userId),
      message,
      attachments
    );

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
      return;
    }

    // Emit real-time event so admin sees the message instantly
    const lastMsg = (ticket as any).messages?.[(ticket as any).messages.length - 1];
    if (lastMsg) {
      const messagePayload = {
        ticketId: id,
        message: {
          id: lastMsg._id?.toString(),
          ticketId: id,
          content: lastMsg.message || message,
          sender: 'user',
          senderType: 'user',
          type: 'text',
          timestamp: lastMsg.timestamp,
          read: false,
          delivered: true,
        },
      };

      // Emit to support-agents room only (all admins are in this room)
      // Do NOT also emit to ticket room or personal agent room to avoid duplicate delivery
      supportSocketService.emitToSupportAgents('support_message_received', messagePayload);

      logger.info(`[SupportController] Emitted user message to support-agents room for ticket ${id}`);
    }

    res.status(200).json({
      success: true,
      message: 'Message added successfully',
      data: { ticket },
    });
});

/**
 * Close ticket
 * POST /api/support/tickets/:id/close
 */
export const closeTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const ticket = await supportService.closeTicket(
      new Types.ObjectId(id),
      new Types.ObjectId(userId)
    );

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Ticket closed successfully',
      data: { ticket },
    });
});

/**
 * Reopen ticket
 * POST /api/support/tickets/:id/reopen
 */
export const reopenTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { reason } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!reason) {
      res.status(400).json({
        success: false,
        message: 'Reason for reopening is required',
      });
      return;
    }

    const ticket = await supportService.reopenTicket(
      new Types.ObjectId(id),
      new Types.ObjectId(userId),
      reason
    );

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Ticket reopened successfully',
      data: { ticket },
    });
});

/**
 * Rate ticket
 * POST /api/support/tickets/:id/rate
 */
export const rateTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { score, comment } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!score || score < 1 || score > 5) {
      res.status(400).json({
        success: false,
        message: 'Valid rating score (1-5) is required',
      });
      return;
    }

    const ticket = await supportService.rateTicket(
      new Types.ObjectId(id),
      new Types.ObjectId(userId),
      score,
      comment || ''
    );

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Ticket rated successfully',
      data: { ticket },
    });
});

/**
 * Get active tickets summary
 * GET /api/support/tickets/summary
 */
export const getTicketsSummary = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const summary = await supportService.getActiveTicketsSummary(
      new Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: summary,
    });
});

// ==================== FAQ ENDPOINTS ====================

/**
 * Get all FAQs
 * GET /api/support/faq
 */
export const getAllFAQs = asyncHandler(async (req: Request, res: Response) => {
    const { category, subcategory, limit = 100 } = req.query;

    let faqs;

    if (category) {
      faqs = await supportService.getFAQsByCategory(
        category as string,
        subcategory as string
      );
    } else {
      faqs = await supportService.getPopularFAQs(Number(limit));
    }

    res.status(200).json({
      success: true,
      data: { faqs, total: faqs.length },
    });
});

/**
 * Search FAQs
 * GET /api/support/faq/search
 */
export const searchFAQs = asyncHandler(async (req: Request, res: Response) => {
    const { q, limit = 10 } = req.query;

    if (!q) {
      res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
      return;
    }

    const faqs = await supportService.searchFAQs(q as string, Number(limit));

    res.status(200).json({
      success: true,
      data: { faqs, total: faqs.length },
    });
});

/**
 * Get FAQ categories
 * GET /api/support/faq/categories
 */
export const getFAQCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await supportService.getFAQCategories();

    res.status(200).json({
      success: true,
      data: { categories },
    });
});

/**
 * Get popular FAQs
 * GET /api/support/faq/popular
 */
export const getPopularFAQs = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;

    const faqs = await supportService.getPopularFAQs(Number(limit));

    res.status(200).json({
      success: true,
      data: { faqs, total: faqs.length },
    });
});

/**
 * Mark FAQ as helpful
 * POST /api/support/faq/:id/helpful
 */
export const markFAQHelpful = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { helpful } = req.body;

    if (helpful) {
      await supportService.markFAQAsHelpful(new Types.ObjectId(id));
    } else {
      await supportService.markFAQAsNotHelpful(new Types.ObjectId(id));
    }

    res.status(200).json({
      success: true,
      message: 'Feedback recorded successfully',
    });
});

/**
 * Track FAQ view
 * POST /api/support/faq/:id/view
 */
export const trackFAQView = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await supportService.incrementFAQView(new Types.ObjectId(id));

    res.status(200).json({
      success: true,
      message: 'View tracked',
    });
});

// ==================== QUICK ACTIONS ====================

/**
 * Create ticket from order issue
 * POST /api/support/quick-actions/order-issue
 */
export const createOrderIssueTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { orderId, issueType, description } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!orderId || !issueType || !description) {
      res.status(400).json({
        success: false,
        message: 'Order ID, issue type, and description are required',
      });
      return;
    }

    const ticket = await supportService.createTicket({
      userId: new Types.ObjectId(userId),
      subject: `Order Issue: ${issueType}`,
      category: 'order',
      initialMessage: description,
      relatedEntity: {
        type: 'order',
        id: new Types.ObjectId(orderId),
      },
      priority: 'high',
    });

    res.status(201).json({
      success: true,
      message: 'Order issue ticket created successfully',
      data: { ticket },
    });
});

/**
 * Report product issue
 * POST /api/support/quick-actions/report-product
 */
export const reportProductIssue = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { productId, issueType, description, images } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!productId || !issueType || !description) {
      res.status(400).json({
        success: false,
        message: 'Product ID, issue type, and description are required',
      });
      return;
    }

    const ticket = await supportService.createTicket({
      userId: new Types.ObjectId(userId),
      subject: `Product Issue: ${issueType}`,
      category: 'product',
      initialMessage: description,
      relatedEntity: {
        type: 'product',
        id: new Types.ObjectId(productId),
      },
      attachments: images,
      priority: 'medium',
    });

    res.status(201).json({
      success: true,
      message: 'Product issue reported successfully',
      data: { ticket },
    });
});

// ==================== SUPPORT CONFIG & CALLBACK ====================

/**
 * Get public support config (hours, phones, categories)
 * GET /api/support/config/public
 */
export const getPublicSupportConfig = asyncHandler(async (req: Request, res: Response) => {
    const config = await SupportConfig.getOrCreate();

    const activePhones = config.phoneNumbers
      .filter(p => p.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const activeCategories = config.categories
      .filter(c => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const isOpen = config.isCurrentlyOpen();

    res.status(200).json({
      success: true,
      data: {
        supportHours: config.supportHours,
        phoneNumbers: activePhones,
        categories: activeCategories,
        callbackEnabled: config.callbackSettings.enabled,
        estimatedWaitMinutes: config.callbackSettings.estimatedWaitMinutes,
        queueStatus: config.queueStatus,
        isCurrentlyOpen: isOpen,
      },
    });
});

/**
 * Request a callback
 * POST /api/support/callback
 */
export const requestCallback = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { category, phoneNumber, countryCode, notes, idempotencyKey } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Load config
    const config = await SupportConfig.getOrCreate();

    // Check if callbacks are enabled
    if (!config.callbackSettings.enabled) {
      res.status(503).json({
        success: false,
        message: 'Callback requests are currently disabled',
      });
      return;
    }

    // Per-user daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCallbacks = await SupportTicket.countDocuments({
      user: new Types.ObjectId(userId),
      tags: 'callback',
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    if (todayCallbacks >= config.callbackSettings.maxPerUserPerDay) {
      res.status(429).json({
        success: false,
        message: `You can request up to ${config.callbackSettings.maxPerUserPerDay} callbacks per day`,
      });
      return;
    }

    // Idempotency check
    if (idempotencyKey) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existing = await SupportTicket.findOne({
        user: new Types.ObjectId(userId),
        tags: 'callback',
        'metadata.idempotencyKey': idempotencyKey,
        createdAt: { $gte: fiveMinAgo },
      }).lean();

      if (existing) {
        res.status(201).json({
          success: true,
          message: 'Callback already requested',
          data: {
            ticketId: existing._id,
            ticketNumber: existing.ticketNumber,
            estimatedWaitMinutes: config.callbackSettings.estimatedWaitMinutes,
            category,
          },
        });
        return;
      }
    }

    // Resolve category name and priority
    const configCategory = config.categories.find(c => c.id === category);
    const categoryName = configCategory?.name || category;
    const priority = configCategory?.priority || 'medium';

    // Create the callback ticket
    const ticket = await supportService.createTicket({
      userId: new Types.ObjectId(userId),
      subject: `Callback Request: ${categoryName}`,
      category: 'other',
      priority,
      initialMessage: `[Callback Request]\nCategory: ${categoryName}\nPhone: ${countryCode}${phoneNumber}${notes ? `\n\nNotes: ${notes}` : ''}`,
      tags: ['callback', category],
      idempotencyKey,
    });

    // Store callback metadata
    if (ticket.metadata instanceof Map) {
      ticket.metadata.set('callbackPhone', `${countryCode}${phoneNumber}`);
      ticket.metadata.set('callbackCategory', category);
      if (idempotencyKey) {
        ticket.metadata.set('idempotencyKey', idempotencyKey);
      }
      ticket.markModified('metadata');
      await ticket.save();
    }

    res.status(201).json({
      success: true,
      message: 'Callback requested successfully',
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        estimatedWaitMinutes: config.callbackSettings.estimatedWaitMinutes,
        category: categoryName,
      },
    });
});

/**
 * Mark ticket messages as read
 * POST /api/support/tickets/:id/read
 */
export const markTicketAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const ticket = await SupportTicket.findOne({
      _id: id,
      user: userId,
    }).lean();

    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    await ticket.markMessagesAsRead('user');

    // Notify agents that user read their messages
    supportSocketService.emitMessagesRead(userId, id, 'user');

    res.json({ success: true, message: 'Messages marked as read' });
});
