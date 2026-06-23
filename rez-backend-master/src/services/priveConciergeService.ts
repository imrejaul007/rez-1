/**
 * Prive Concierge Service
 *
 * Handles creation and management of Prive concierge support tickets.
 * Prive members get tier-based SLA and priority.
 */

import { Types } from 'mongoose';
import { SupportTicket } from '../models/SupportTicket';

class PriveConciergeService {
  /**
   * Create a new concierge ticket for a Prive member.
   * Enforces a maximum of 3 open concierge tickets per user.
   */
  async createTicket(userId: string, tier: string, subject: string, message: string) {
    const userObjectId = new Types.ObjectId(userId);

    // Check open ticket limit (max 3)
    const openCount = await SupportTicket.countDocuments({
      user: userObjectId,
      isPriveTicket: true,
      status: { $in: ['open', 'in_progress', 'waiting_customer'] },
    });
    if (openCount >= 3) {
      throw new Error('Maximum 3 open concierge tickets allowed');
    }

    const ticketNumber = await (SupportTicket as any).generateTicketNumber();
    const ticket = new SupportTicket({
      ticketNumber,
      user: userObjectId,
      subject,
      category: 'prive_concierge',
      isPriveTicket: true,
      priveTier: tier,
      messages: [{
        sender: userObjectId,
        senderType: 'user',
        message,
        timestamp: new Date(),
      }],
    });

    await ticket.save();
    return ticket;
  }

  /**
   * Get all concierge tickets for a user, sorted by most recent first.
   */
  async getTickets(userId: string) {
    return SupportTicket.find({
      user: new Types.ObjectId(userId),
      isPriveTicket: true,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  }

  /**
   * Get a single concierge ticket by ID, scoped to the user.
   */
  async getTicketById(userId: string, ticketId: string) {
    return SupportTicket.findOne({
      _id: new Types.ObjectId(ticketId),
      user: new Types.ObjectId(userId),
      isPriveTicket: true,
    }).lean();
  }

  /**
   * Add a message to an existing concierge ticket.
   * Prevents messages on resolved/closed tickets.
   */
  async addMessage(userId: string, ticketId: string, message: string) {
    const ticket = await this.getTicketById(userId, ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (['resolved', 'closed'].includes(ticket.status)) {
      throw new Error('Cannot add message to resolved/closed ticket');
    }

    await ticket.addMessage(new Types.ObjectId(userId), 'user', message);
    return ticket;
  }

  /**
   * Mark all overdue Prive tickets as SLA-breached.
   * Called by the SLA breach cron job.
   */
  async markSlaBreached(): Promise<number> {
    const now = new Date();
    const result = await SupportTicket.updateMany(
      {
        isPriveTicket: true,
        slaBreached: false,
        slaDeadline: { $lt: now },
        status: { $in: ['open', 'in_progress'] },
      },
      { slaBreached: true }
    );
    return result.modifiedCount;
  }
}

export const priveConciergeService = new PriveConciergeService();
export default priveConciergeService;
