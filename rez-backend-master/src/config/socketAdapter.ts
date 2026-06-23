/**
 * Socket.IO Redis Adapter
 *
 * Uses the shared Redis client from redisService for the pub connection,
 * and creates a single duplicate for the sub connection.
 */

import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redisService from '../services/redisService';
import { logger } from './logger';

/** Holds the duplicated sub-client so it can be closed on shutdown */
let _subClient: any = null;

export async function attachRedisAdapter(io: SocketIOServer): Promise<void> {
  const pubClient = redisService.getClient();
  if (!pubClient) {
    logger.warn('⚠️  [Socket.IO] Redis not available — using in-memory adapter');
    return;
  }

  // Socket.IO needs a separate sub connection — duplicate the shared client
  _subClient = (pubClient as any).duplicate();
  _subClient.on('error', (err: Error) =>
    logger.error('[Socket.IO Redis Adapter] sub client error:', err.message)
  );
  await _subClient.connect();

  io.adapter(createAdapter(pubClient, _subClient));
  logger.info('✅ [Socket.IO] Redis adapter attached — events shared across all pods');
}

/** Disconnect the duplicated sub-client (called during graceful shutdown) */
export async function disconnectRedisAdapter(): Promise<void> {
  if (_subClient) {
    try {
      await _subClient.quit();
      _subClient = null;
      logger.info('✅ [Socket.IO] Redis adapter sub-client disconnected');
    } catch { /* already closed */ }
  }
}
