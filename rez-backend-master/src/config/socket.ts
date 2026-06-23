import { Server as SocketIOServer } from 'socket.io';
import { logger } from './logger';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO instance
 * Called once during server startup
 */
export const initializeSocket = (socketInstance: SocketIOServer): void => {
  io = socketInstance;
  logger.info('✅ Socket.IO instance initialized');
};

/**
 * Get Socket.IO instance
 * Returns the initialized Socket.IO server
 * @throws Error if Socket.IO is not initialized
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

/**
 * Check if Socket.IO is initialized
 */
export const isSocketInitialized = (): boolean => {
  return io !== null;
};
