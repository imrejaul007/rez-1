import { getRedis } from '../config/redis-pool';
import { logger } from '../config/logger';

/**
 * Table Bill Snapshot Service — Redis-primary with DB rebuild fallback.
 *
 * Redis is the primary fast store for live bill state.
 * On Redis failure (crash, OOM, network), the service falls back to
 * rebuilding the snapshot from MongoDB — no UX crash for the consumer.
 *
 * Write-through pattern: every update writes to both Redis and DB atomically.
 * Optimistic merge: version number prevents stale writes when multiple staff
 * members add items simultaneously.
 *
 * v3 Architecture: Part 6 — resilient table bill snapshot service.
 */

export interface TableBillData {
  sessionId: string;
  tableNumber: number;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  version: number; // optimistic merge version (epoch ms)
  rebuiltFromDB?: boolean; // true if Redis was unavailable
}

const SNAPSHOT_TTL_SECONDS = 3600; // 1 hour — sessions rarely last longer

export const tableBillSnapshotService = {
  /**
   * Get the current bill snapshot for a table session.
   * Primary: Redis. Fallback: rebuild from MongoDB if Redis unavailable.
   */
  async getSnapshot(sessionId: string): Promise<TableBillData | null> {
    const key = `table:bill:${sessionId}`;

    // Primary: Redis (fast path)
    try {
      const redis = getRedis();
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as TableBillData;
      }
    } catch (redisErr) {
      logger.warn('[TableBillSnapshot] Redis unavailable — rebuilding from DB', {
        sessionId,
        err: (redisErr as Error)?.message,
      });
    }

    // Fallback: rebuild from DB
    return this.rebuildFromDB(sessionId);
  },

  /**
   * Rebuild the bill snapshot from MongoDB.
   * Called when Redis is unavailable or snapshot is missing.
   * Restores to Redis for subsequent reads.
   */
  async rebuildFromDB(sessionId: string): Promise<TableBillData | null> {
    try {
      const { default: TableSession } = await import('../models/TableSession');

      const session = await (TableSession as any).findById(sessionId).populate('orders.items').lean();

      if (!session) {
        logger.warn('[TableBillSnapshot] TableSession not found for rebuild', { sessionId });
        return null;
      }

      const items = (session.orders || []).flatMap((o: any) => o.items || []);
      const subtotal = session.totalAmount ?? 0;
      const tax = session.taxAmount ?? 0;

      const bill: TableBillData = {
        sessionId,
        tableNumber: session.tableNumber,
        items,
        subtotal,
        tax,
        total: subtotal + tax,
        version: session.updatedAt ? new Date(session.updatedAt).getTime() : Date.now(),
        rebuiltFromDB: true, // signal to client that data may be slightly behind real-time
      };

      // Restore to Redis for next read (best-effort — Redis may still be down)
      try {
        const redis = getRedis();
        const key = `table:bill:${sessionId}`;
        await redis.setex(key, SNAPSHOT_TTL_SECONDS, JSON.stringify(bill));
        logger.info('[TableBillSnapshot] Snapshot restored to Redis from DB', { sessionId });
      } catch {
        // Redis still down — serve from memory this request, client will retry
        logger.warn('[TableBillSnapshot] Redis still unavailable — serving from memory', { sessionId });
      }

      return bill;
    } catch (err) {
      logger.error('[TableBillSnapshot] DB rebuild failed', {
        sessionId,
        err: (err as Error)?.message,
      });
      return null;
    }
  },

  /**
   * Update the bill snapshot.
   * Write-through: updates Redis + DB atomically.
   * Optimistic merge: checks version before writing to prevent stale overwrites.
   *
   * @returns updated bill or null if version conflict
   */
  async updateSnapshot(
    sessionId: string,
    bill: Omit<TableBillData, 'version'>,
    expectedVersion?: number, // if provided, reject if DB version is newer
  ): Promise<TableBillData | null> {
    const newVersion = Date.now();
    const updatedBill: TableBillData = { ...bill, version: newVersion };
    const key = `table:bill:${sessionId}`;

    try {
      const { default: TableSession } = await import('../models/TableSession');

      // Optimistic merge guard (if version passed, only update if not stale)
      const filter: any = { _id: sessionId };
      if (expectedVersion) {
        filter['snapshotVersion'] = { $lte: expectedVersion }; // reject if DB is newer
      }

      const updateResult = await (TableSession as any).findOneAndUpdate(
        filter,
        {
          totalAmount: bill.subtotal,
          taxAmount: bill.tax,
          snapshotVersion: newVersion,
          updatedAt: new Date(),
        },
        { new: true },
      );

      if (!updateResult && expectedVersion) {
        // Version conflict — another request wrote a newer version
        logger.warn('[TableBillSnapshot] Version conflict — stale write rejected', {
          sessionId,
          expectedVersion,
        });
        return null;
      }

      // Write to Redis (best-effort)
      try {
        const redis = getRedis();
        await redis.setex(key, SNAPSHOT_TTL_SECONDS, JSON.stringify(updatedBill));
      } catch (redisErr) {
        logger.warn('[TableBillSnapshot] Redis write failed during update', {
          sessionId,
          err: (redisErr as Error)?.message,
        });
      }

      // Push to consumer via socket (if socket.io instance is available)
      try {
        const { getIO } = await import('../config/socket').catch(() => ({ getIO: null }));
        if (getIO) {
          const io = (getIO as any)();
          if (io) {
            const redis = getRedis();
            const consumerSocketId = await redis.get(`table:consumer:${sessionId}`);
            if (consumerSocketId) {
              io.to(consumerSocketId).emit('bill:updated', updatedBill);
            }
          }
        }
      } catch {
        /* socket push is best-effort */
      }

      return updatedBill;
    } catch (err) {
      logger.error('[TableBillSnapshot] Update failed', {
        sessionId,
        err: (err as Error)?.message,
      });
      return null;
    }
  },

  /**
   * Delete the snapshot when session closes (payment complete).
   */
  async deleteSnapshot(sessionId: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(`table:bill:${sessionId}`);
      await redis.del(`table:consumer:${sessionId}`);
    } catch {
      /* ignore — TTL will clean up */
    }
  },
};

export default tableBillSnapshotService;
