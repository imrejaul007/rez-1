import cron from 'node-cron';
import { SupportTicket } from '../models/SupportTicket';
import supportSocketService from '../services/supportSocketService';
import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('sla-breach-job');

/**
 * SLA Breach Detection Job
 *
 * Runs every 5 minutes. Finds open/in-progress tickets past their SLA deadline
 * and marks them as breached + bumps priority to urgent.
 */
export function initializeSLABreachJob(): void {
  // Every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    const lockKey = 'lock:sla-breach-job';
    const lockToken = await redisService.acquireLock(lockKey, 60);
    if (!lockToken) return; // Another instance is running

    try {
      const now = new Date();

      // Find tickets that breached SLA but haven't been flagged yet
      const breachedTickets = await SupportTicket.find({
        status: { $in: ['open', 'in_progress'] },
        slaDeadline: { $lte: now },
        slaBreached: false,
      }).select('_id ticketNumber user priority slaDeadline');

      if (breachedTickets.length === 0) {
        await redisService.releaseLock(lockKey, lockToken);
        return;
      }

      const ticketIds = breachedTickets.map(t => t._id);

      // Bulk update: mark as breached + bump priority to urgent
      await SupportTicket.updateMany(
        { _id: { $in: ticketIds } },
        { $set: { slaBreached: true, priority: 'urgent' } },
      );

      // Notify agents via socket for each breached ticket
      for (const ticket of breachedTickets) {
        supportSocketService.emitToSupportAgents('ticket:sla_breached', {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          slaDeadline: ticket.slaDeadline,
        });
      }

      logger.info(`SLA breach job: flagged ${breachedTickets.length} ticket(s)`);
    } catch (error) {
      logger.error('SLA breach job failed', error as Error);
    } finally {
      await redisService.releaseLock(lockKey, lockToken);
    }
  });
}
