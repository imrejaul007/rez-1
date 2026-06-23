/**
 * Prive Concierge Controller
 *
 * User-facing endpoints for Prive concierge support tickets.
 */

import { Request, Response } from 'express';
import { priveConciergeService } from '../services/priveConciergeService';
import { logger } from '../config/logger';
import priveAccessService from '../services/priveAccessService';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * POST /api/prive/concierge/tickets
 * Create a new concierge ticket
 */
export const createTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, error: 'Subject and message are required' });
    }

    if (typeof subject !== 'string' || subject.trim().length > 200) {
      return res.status(400).json({ success: false, error: 'Subject must be 200 characters or less' });
    }

    if (typeof message !== 'string' || message.trim().length > 5000) {
      return res.status(400).json({ success: false, error: 'Message must be 5000 characters or less' });
    }

    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ success: false, error: 'Prive access required' });
    }

    const tier = accessCheck.effectiveTier || 'entry';
    const ticket = await priveConciergeService.createTicket(userId, tier, subject, message);

    res.status(201).json({
      success: true,
      data: { ticket },
    });
});

/**
 * GET /api/prive/concierge/tickets
 * Get user's concierge tickets
 */
export const getTickets = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const tickets = await priveConciergeService.getTickets(userId);

    res.json({
      success: true,
      data: { tickets },
    });
});

/**
 * GET /api/prive/concierge/tickets/:id
 * Get single concierge ticket
 */
export const getTicketById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket ID' });
    }

    const ticket = await priveConciergeService.getTicketById(userId, id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    res.json({
      success: true,
      data: { ticket },
    });
});

/**
 * POST /api/prive/concierge/tickets/:id/message
 * Add a message to a concierge ticket
 */
export const addMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket ID' });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (typeof message !== 'string' || message.trim().length > 5000) {
      return res.status(400).json({ success: false, error: 'Message must be 5000 characters or less' });
    }

    const ticket = await priveConciergeService.addMessage(userId, id, message);

    res.json({
      success: true,
      data: { ticket },
    });
});
