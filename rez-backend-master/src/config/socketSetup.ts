/**
 * config/socketSetup.ts — Socket.IO setup and event handlers
 * Extracted from server.ts for maintainability.
 */
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './logger';
import { getAllowedOrigins } from './middleware';
import { initializeSocket } from './socket';
import { attachRedisAdapter } from './socketAdapter';
import { isGamificationEnabled } from './gamificationFeatureFlags';
import stockSocketService from '../services/stockSocketService';
import earningsSocketService from '../services/earningsSocketService';
import gamificationSocketService from '../services/gamificationSocketService';
import { RealTimeService } from '../merchantservices/RealTimeService';

declare global {
  var io: any;
  var realTimeService: any;
}

/**
 * Creates the Socket.IO server, registers event handlers, and initializes
 * socket-dependent services (stock, earnings, gamification, real-time).
 *
 * Returns the io instance for use by startServer (Redis adapter attachment).
 */
export function setupSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || getAllowedOrigins(),
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e4,       // 10 KB max payload (prevents memory exhaustion)
    pingTimeout: 10_000,          // 10s (faster dead socket cleanup)
    pingInterval: 25_000,         // 25s keepalive
    connectTimeout: 10_000,       // 10s to complete handshake
    transports: ['websocket', 'polling'],
  });

  // Register Socket.IO instance so services can emit events
  initializeSocket(io);

  // ── JWT authentication middleware ──
  io.use((socket: any, next: any) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string; role: string };
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ──
  io.on('connection', (socket: any) => {
    const userId = socket.userId;
    const userRole = socket.userRole;

    // Auto-join user's personal room
    socket.join(`user-${userId}`);
    logger.info(`[Socket] Connected: userId=${userId}, role=${userRole}, socketId=${socket.id}, rooms=[${[...socket.rooms].join(', ')}]`);

    // Auto-join support-agents room for admin users
    if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin') {
      socket.join('support-agents');
      logger.info(`[Socket] Admin ${userId} joined support-agents room`);
    }

    // Validate socket input is a valid ID string (ObjectId-like: 24 hex chars or alphanumeric up to 50)
    const isValidSocketId = (val: unknown): val is string =>
      typeof val === 'string' && val.length > 0 && val.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(val);

    // Join merchant room (only if merchant/admin role)
    socket.on('join-merchant-room', (merchantId: string) => {
      if (!isValidSocketId(merchantId)) return;
      if (userRole === 'merchant' || userRole === 'admin' || userRole === 'superadmin') {
        socket.join(`merchant-${merchantId}`);
      }
    });

    // Join a specific support ticket room (any authenticated user)
    const handleJoinTicket = (ticketId: string) => {
      if (!isValidSocketId(ticketId)) return;
      socket.join(`support-ticket-${ticketId}`);
      logger.info(`[Socket] User ${userId} (${userRole}) joined support-ticket-${ticketId}`);
    };
    socket.on('join-support-ticket', handleJoinTicket);
    socket.on('join_ticket', (data: any) => {
      const tid = typeof data === 'string' ? data : data?.ticketId;
      if (isValidSocketId(tid)) handleJoinTicket(tid);
    });

    // Leave a specific support ticket room
    socket.on('leave-support-ticket', (ticketId: string) => {
      if (!isValidSocketId(ticketId)) return;
      socket.leave(`support-ticket-${ticketId}`);
    });
    socket.on('leave_ticket', (data: any) => {
      const tid = typeof data === 'string' ? data : data?.ticketId;
      if (isValidSocketId(tid)) socket.leave(`support-ticket-${tid}`);
    });

    // Admin typing indicator for support chat
    socket.on('support-agent-typing', (data: { ticketId: string; isTyping: boolean }) => {
      if (!data || !isValidSocketId(data.ticketId)) return;
      if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin') {
        const event = data.isTyping ? 'support_agent_typing_start' : 'support_agent_typing_stop';
        socket.to(`support-ticket-${data.ticketId}`).emit(event, {
          ticketId: data.ticketId,
          agentId: userId,
        });
      }
    });

    // User typing indicator for support chat
    socket.on('support-user-typing', (data: { ticketId: string; isTyping: boolean }) => {
      if (!data || !isValidSocketId(data.ticketId)) return;
      const event = data.isTyping ? 'support_user_typing_start' : 'support_user_typing_stop';
      socket.to(`support-ticket-${data.ticketId}`).emit(event, {
        ticketId: data.ticketId,
        userId: userId,
      });
      // Also notify support-agents room
      socket.to('support-agents').emit(event, {
        ticketId: data.ticketId,
        userId: userId,
      });
    });

    socket.on('disconnect', () => {
      // cleanup handled by socket.io automatically
    });
  });

  // ── Set globals ──
  global.io = io;

  // Initialize socket-dependent services
  stockSocketService.initialize(io);
  earningsSocketService.initialize(io);

  if (isGamificationEnabled('tournaments')) {
    gamificationSocketService.initialize(io);
  }

  const realTimeServiceInstance = RealTimeService.getInstance(io);
  global.realTimeService = realTimeServiceInstance;

  return io;
}

/**
 * Attaches the Redis adapter to Socket.IO (call after Redis is connected).
 */
export async function attachSocketRedisAdapter(io: SocketIOServer): Promise<void> {
  try {
    await attachRedisAdapter(io);
  } catch (err) {
    logger.error('[Socket.IO] Redis adapter failed, using in-memory fallback:', err);
  }
}
