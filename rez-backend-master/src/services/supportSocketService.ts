import { logger } from '../config/logger';
// Support Socket Service
// Emits WebSocket events for real-time support chat functionality

import { getIO, isSocketInitialized } from '../config/socket';

class SupportSocketService {
  /**
   * Emit event to a specific user's room
   */
  emitToUser(userId: string, event: string, data: any): void {
    if (!isSocketInitialized()) {
      logger.warn(`[SupportSocket] Socket NOT initialized, skipping ${event} to user ${userId}`);
      return;
    }
    try {
      const io = getIO();
      const room = `user-${userId}`;
      const socketsInRoom = io.sockets.adapter.rooms.get(room);
      logger.info(`[SupportSocket] Emitting ${event} to room "${room}" (${socketsInRoom?.size || 0} sockets in room)`);
      io.to(room).emit(event, data);
    } catch (err) {
      logger.error(`[SupportSocket] Failed to emit ${event} to user ${userId}:`, err);
    }
  }

  /**
   * Emit event to all support agents room
   */
  emitToSupportAgents(event: string, data: any): void {
    if (!isSocketInitialized()) {
      logger.warn(`[SupportSocket] Socket NOT initialized, skipping ${event} to support-agents`);
      return;
    }
    try {
      const io = getIO();
      const socketsInRoom = io.sockets.adapter.rooms.get('support-agents');
      logger.info(`[SupportSocket] Emitting ${event} to room "support-agents" (${socketsInRoom?.size || 0} sockets in room)`);
      io.to('support-agents').emit(event, data);
    } catch (err) {
      logger.error(`[SupportSocket] Failed to emit ${event} to support-agents:`, err);
    }
  }

  /**
   * Emit event to a specific ticket room
   */
  emitToTicketRoom(ticketId: string, event: string, data: any): void {
    if (!isSocketInitialized()) {
      logger.warn(`[SupportSocket] Socket NOT initialized, skipping ${event} to ticket ${ticketId}`);
      return;
    }
    try {
      const io = getIO();
      const room = `support-ticket-${ticketId}`;
      const socketsInRoom = io.sockets.adapter.rooms.get(room);
      logger.info(`[SupportSocket] Emitting ${event} to room "${room}" (${socketsInRoom?.size || 0} sockets in room)`);
      io.to(room).emit(event, data);
    } catch (err) {
      logger.error(`[SupportSocket] Failed to emit ${event} to ticket ${ticketId}:`, err);
    }
  }

  /**
   * Notify user that an agent has been assigned
   */
  emitAgentAssigned(userId: string, ticketId: string, agent: { id: string; name: string; status?: string }): void {
    this.emitToUser(userId, 'support_agent_assigned', { ticketId, agent });
    this.emitToTicketRoom(ticketId, 'support_agent_assigned', { ticketId, agent });
    logger.info(`[SupportSocket] Emitted agent_assigned to user ${userId} for ticket ${ticketId}`);
  }

  /**
   * Emit new message to user and ticket room
   */
  emitNewMessage(userId: string, ticketId: string, message: any): void {
    const payload = { ticketId, message };
    this.emitToUser(userId, 'support_message_received', payload);
    this.emitToTicketRoom(ticketId, 'support_message_received', payload);
    logger.info(`[SupportSocket] Emitted message to user ${userId} and ticket room ${ticketId}`);
  }

  /**
   * Notify user of ticket status change
   */
  emitStatusChanged(userId: string, ticketId: string, status: string): void {
    this.emitToUser(userId, 'support_ticket_status_changed', { ticketId, status });
    this.emitToTicketRoom(ticketId, 'support_ticket_status_changed', { ticketId, status });
    logger.info(`[SupportSocket] Emitted status_changed (${status}) to user ${userId}`);
  }

  /**
   * Notify agents room about a new ticket
   */
  emitNewTicket(ticket: any): void {
    this.emitToSupportAgents('support_new_ticket', {
      ticketId: ticket._id?.toString(),
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      userId: ticket.user?.toString(),
      createdAt: ticket.createdAt,
    });
    logger.info(`[SupportSocket] Emitted new_ticket to support-agents`);
  }

  /**
   * Emit agent typing indicator to user
   */
  emitAgentTyping(userId: string, ticketId: string, agentName: string, isTyping: boolean): void {
    const event = isTyping ? 'support_agent_typing_start' : 'support_agent_typing_stop';
    this.emitToUser(userId, event, { ticketId, agentName });
    this.emitToTicketRoom(ticketId, event, { ticketId, agentName });
  }

  /**
   * Emit user typing indicator to ticket room (for admin to see)
   */
  emitUserTyping(ticketId: string, isTyping: boolean): void {
    const event = isTyping ? 'support_user_typing_start' : 'support_user_typing_stop';
    this.emitToTicketRoom(ticketId, event, { ticketId });
  }

  /**
   * Emit read receipt — notify the other side that their messages were read
   */
  emitMessagesRead(userId: string, ticketId: string, readBy: 'user' | 'agent'): void {
    const payload = { ticketId, readBy };
    if (readBy === 'agent') {
      // Agent read user messages → notify user so they see double ticks
      this.emitToUser(userId, 'support_messages_read', payload);
      this.emitToTicketRoom(ticketId, 'support_messages_read', payload);
    } else {
      // User read agent messages → notify agents
      this.emitToSupportAgents('support_messages_read', payload);
      this.emitToTicketRoom(ticketId, 'support_messages_read', payload);
    }
  }
}

export const supportSocketService = new SupportSocketService();
export default supportSocketService;
