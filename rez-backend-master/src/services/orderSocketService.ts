import { logger } from '../config/logger';
/**
 * Order Socket Service
 *
 * This service manages real-time order tracking updates using Socket.IO.
 * It provides functions to emit order-related events to connected clients.
 */

import { Server as SocketIOServer } from 'socket.io';
import { SocketRoom } from '../types/socket';

/**
 * Order Event Names
 */
export enum OrderSocketEvent {
  // Order status events
  ORDER_CREATED = 'order:created',
  ORDER_STATUS_UPDATED = 'order:status_updated',
  ORDER_CONFIRMED = 'order:confirmed',
  ORDER_PREPARING = 'order:preparing',
  ORDER_READY = 'order:ready',
  ORDER_DISPATCHED = 'order:dispatched',
  ORDER_OUT_FOR_DELIVERY = 'order:out_for_delivery',
  ORDER_DELIVERED = 'order:delivered',
  ORDER_CANCELLED = 'order:cancelled',

  // Location tracking events
  ORDER_LOCATION_UPDATED = 'order:location_updated',

  // Delivery partner events
  ORDER_PARTNER_ASSIGNED = 'order:partner_assigned',
  ORDER_PARTNER_ARRIVED = 'order:partner_arrived',

  // Timeline events
  ORDER_TIMELINE_UPDATED = 'order:timeline_updated',

  // Subscription events (client -> server)
  SUBSCRIBE_ORDER = 'subscribe:order',
  UNSUBSCRIBE_ORDER = 'unsubscribe:order',

  // Coin & Wallet events
  COINS_AWARDED = 'coins:awarded',
  WALLET_UPDATED = 'wallet:updated',
  MERCHANT_WALLET_UPDATED = 'merchant:wallet:updated',

  // Order list events (for tracking page)
  ORDER_LIST_UPDATED = 'order:list_updated',

  // Admin events
  PENDING_REWARD_CREATED = 'admin:pending-reward:created',
  PENDING_REWARD_UPDATED = 'admin:pending-reward:updated',
}

/**
 * Payload Interfaces
 */

export interface OrderStatusUpdatePayload {
  orderId: string;
  orderNumber: string;
  status: string;
  previousStatus?: string;
  message: string;
  timestamp: Date;
  estimatedDeliveryTime?: Date;
  metadata?: any;
}

export interface OrderLocationUpdatePayload {
  orderId: string;
  orderNumber: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  deliveryPartner: {
    name: string;
    phone: string;
    vehicle?: string;
    photoUrl?: string;
  };
  estimatedArrival?: Date;
  distanceToDestination?: number; // in meters
  timestamp: Date;
}

export interface OrderPartnerAssignedPayload {
  orderId: string;
  orderNumber: string;
  deliveryPartner: {
    id: string;
    name: string;
    phone: string;
    vehicle?: string;
    vehicleNumber?: string;
    photoUrl?: string;
    rating?: number;
  };
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  timestamp: Date;
}

export interface OrderTimelineUpdatePayload {
  orderId: string;
  orderNumber: string;
  timeline: Array<{
    status: string;
    message: string;
    timestamp: Date;
    updatedBy?: string;
    metadata?: any;
  }>;
  timestamp: Date;
}

export interface OrderDeliveredPayload {
  orderId: string;
  orderNumber: string;
  deliveredAt: Date;
  deliveredTo?: string;
  signature?: string;
  photoUrl?: string;
  otp?: string;
  feedback?: {
    rating?: number;
    comment?: string;
  };
  timestamp: Date;
}

/**
 * Coin & Wallet Event Payloads
 */
export interface CoinsAwardedPayload {
  userId: string;
  amount: number;
  source: string;
  description: string;
  newBalance: number;
  orderId?: string;
  orderNumber?: string;
  timestamp: Date;
}

export interface MerchantWalletUpdatedPayload {
  merchantId: string;
  storeId: string;
  storeName: string;
  transactionType: 'credit' | 'debit' | 'withdrawal';
  amount: number;
  orderId?: string;
  orderNumber?: string;
  newBalance: {
    total: number;
    available: number;
    pending: number;
  };
  timestamp: Date;
}

export interface PendingRewardPayload {
  rewardId: string;
  userId: string;
  amount: number;
  source: string;
  status: 'pending' | 'approved' | 'rejected' | 'credited';
  referenceType?: string;
  referenceId?: string;
  timestamp: Date;
}

/**
 * Order Socket Service Class
 * Manages all order-related real-time communications
 */
class OrderSocketService {
  private io: SocketIOServer | null = null;
  private static instance: OrderSocketService;

  private constructor() {}

  /**
   * Get singleton instance of OrderSocketService
   */
  public static getInstance(): OrderSocketService {
    if (!OrderSocketService.instance) {
      OrderSocketService.instance = new OrderSocketService();
    }
    return OrderSocketService.instance;
  }

  /**
   * Initialize the Socket.IO server
   * @param io - Socket.IO server instance
   */
  public initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupSocketHandlers();
    logger.info('✅ Order Socket Service initialized');
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logger.info(`📡 Client connected to order updates: ${socket.id}`);

      // Handle client subscribing to specific order
      socket.on(OrderSocketEvent.SUBSCRIBE_ORDER, (data: { orderId: string; userId?: string }) => {
        const orderRoom = SocketRoom.order(data.orderId);
        socket.join(orderRoom);
        logger.info(`👤 Client ${socket.id} subscribed to order: ${data.orderId}`);

        // Also join user room if userId provided
        if (data.userId) {
          socket.join(SocketRoom.user(data.userId));
        }
      });

      // Handle client unsubscribing from specific order
      socket.on(OrderSocketEvent.UNSUBSCRIBE_ORDER, (data: { orderId: string }) => {
        const orderRoom = SocketRoom.order(data.orderId);
        socket.leave(orderRoom);
        logger.info(`👤 Client ${socket.id} unsubscribed from order: ${data.orderId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`📡 Client disconnected from order updates: ${socket.id}`);
      });
    });
  }

  /**
   * Emit order status update event
   */
  public emitOrderStatusUpdate(payload: OrderStatusUpdatePayload): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit order status update.');
      return;
    }

    const orderRoom = SocketRoom.order(payload.orderId);

    // Emit to order-specific room
    this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_STATUS_UPDATED, payload);

    // Emit specific status events
    switch (payload.status) {
      case 'confirmed':
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_CONFIRMED, payload);
        break;
      case 'preparing':
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_PREPARING, payload);
        break;
      case 'ready':
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_READY, payload);
        break;
      case 'dispatched':
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_DISPATCHED, payload);
        break;
      case 'out_for_delivery':
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_OUT_FOR_DELIVERY, payload);
        break;
      case 'delivered':
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_DELIVERED, payload);
        break;
      case 'cancelled':
        this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_CANCELLED, payload);
        break;
    }

    logger.info(`📦 Order status updated: ${payload.orderNumber} -> ${payload.status}`);

    // Also emit to user's order list room (if userId is in metadata)
    if (payload.metadata?.userId) {
      this.emitToUserOrderList(payload.metadata.userId, {
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        newStatus: payload.status,
        previousStatus: payload.previousStatus,
        timestamp: payload.timestamp,
      });
    }
  }

  /**
   * Emit order location update event (for delivery tracking)
   */
  public emitOrderLocationUpdate(payload: OrderLocationUpdatePayload): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit order location update.');
      return;
    }

    const orderRoom = SocketRoom.order(payload.orderId);
    this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_LOCATION_UPDATED, payload);

    logger.info(`📍 Order location updated: ${payload.orderNumber} at (${payload.location.latitude}, ${payload.location.longitude})`);
  }

  /**
   * Emit delivery partner assigned event
   */
  public emitPartnerAssigned(payload: OrderPartnerAssignedPayload): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit partner assigned event.');
      return;
    }

    const orderRoom = SocketRoom.order(payload.orderId);
    this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_PARTNER_ASSIGNED, payload);

    logger.info(`🚴 Delivery partner assigned to order ${payload.orderNumber}: ${payload.deliveryPartner.name}`);
  }

  /**
   * Emit delivery partner arrived event
   */
  public emitPartnerArrived(orderId: string, orderNumber: string): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit partner arrived event.');
      return;
    }

    const orderRoom = SocketRoom.order(orderId);
    const payload = {
      orderId,
      orderNumber,
      timestamp: new Date(),
      message: 'Delivery partner has arrived at your location',
    };

    this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_PARTNER_ARRIVED, payload);

    logger.info(`🎯 Delivery partner arrived for order ${orderNumber}`);
  }

  /**
   * Emit order timeline update event
   */
  public emitTimelineUpdate(payload: OrderTimelineUpdatePayload): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit timeline update.');
      return;
    }

    const orderRoom = SocketRoom.order(payload.orderId);
    this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_TIMELINE_UPDATED, payload);

    logger.info(`⏱️ Order timeline updated: ${payload.orderNumber}`);
  }

  /**
   * Emit order delivered event
   */
  public emitOrderDelivered(payload: OrderDeliveredPayload): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit order delivered event.');
      return;
    }

    const orderRoom = SocketRoom.order(payload.orderId);
    this.io.to(orderRoom).emit(OrderSocketEvent.ORDER_DELIVERED, payload);

    logger.info(`✅ Order delivered: ${payload.orderNumber}`);
  }

  /**
   * Emit order created event (to user)
   */
  public emitOrderCreated(userId: string, orderData: any): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit order created event.');
      return;
    }

    const userRoom = SocketRoom.user(userId);
    this.io.to(userRoom).emit(OrderSocketEvent.ORDER_CREATED, {
      ...orderData,
      timestamp: new Date(),
    });

    logger.info(`🆕 New order created for user ${userId}: ${orderData.orderNumber}`);
  }

  /**
   * Get the Socket.IO server instance
   */
  public getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Emit to a specific user
   */
  public emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit to user.');
      return;
    }

    const userRoom = SocketRoom.user(userId);
    this.io.to(userRoom).emit(event, data);
  }

  /**
   * Emit to a specific order room
   */
  public emitToOrder(orderId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit to order.');
      return;
    }

    const orderRoom = SocketRoom.order(orderId);
    this.io.to(orderRoom).emit(event, data);
  }

  /**
   * Emit to a specific merchant room
   */
  public emitToMerchant(merchantId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit to merchant.');
      return;
    }

    const merchantRoom = `merchant-${merchantId}`;
    this.io.to(merchantRoom).emit(event, data);
  }

  /**
   * Emit to admin room
   */
  public emitToAdmin(event: string, data: any): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit to admin.');
      return;
    }

    this.io.to('admin').emit(event, data);
  }

  /**
   * Emit coins awarded event to user
   */
  public emitCoinsAwarded(payload: CoinsAwardedPayload): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit coins awarded event.');
      return;
    }

    this.emitToUser(payload.userId, OrderSocketEvent.COINS_AWARDED, payload);
    logger.info(`🪙 Coins awarded to user ${payload.userId}: +${payload.amount} (${payload.source})`);
  }

  /**
   * Emit merchant wallet updated event
   */
  public emitMerchantWalletUpdated(payload: MerchantWalletUpdatedPayload): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit merchant wallet update.');
      return;
    }

    this.emitToMerchant(payload.merchantId, OrderSocketEvent.MERCHANT_WALLET_UPDATED, payload);
    logger.info(`💰 Merchant wallet updated: ${payload.merchantId} (${payload.transactionType}: ${payload.amount})`);
  }

  /**
   * Emit order list update to user's general room.
   * Used by the tracking page to update orders without full re-fetch.
   */
  public emitToUserOrderList(userId: string, data: {
    orderId: string;
    orderNumber: string;
    newStatus: string;
    previousStatus?: string;
    counts?: { active: number; past: number };
    timestamp: Date;
  }): void {
    if (!this.io) {
      logger.warn('Socket.IO not initialized. Cannot emit order list update.');
      return;
    }

    this.emitToUser(userId, OrderSocketEvent.ORDER_LIST_UPDATED, data);
  }

  /**
   * Emit pending reward created/updated event to admin
   */
  public emitPendingRewardUpdate(payload: PendingRewardPayload, isNew: boolean = false): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit pending reward update.');
      return;
    }

    const event = isNew ? OrderSocketEvent.PENDING_REWARD_CREATED : OrderSocketEvent.PENDING_REWARD_UPDATED;
    this.emitToAdmin(event, payload);
    logger.info(`📋 Pending reward ${isNew ? 'created' : 'updated'}: ${payload.rewardId} (${payload.status})`);
  }
}

// Add order room to SocketRoom if not exists
if (!(SocketRoom as any).order) {
  (SocketRoom as any).order = (orderId: string) => `order-${orderId}`;
}

// Export singleton instance
const orderSocketService = OrderSocketService.getInstance();

export default orderSocketService;

// Export individual functions for easier use
export const {
  initialize,
  emitOrderStatusUpdate,
  emitOrderLocationUpdate,
  emitPartnerAssigned,
  emitPartnerArrived,
  emitTimelineUpdate,
  emitOrderDelivered,
  emitOrderCreated,
  emitToUser,
  emitToOrder,
  emitToMerchant,
  emitToAdmin,
  emitCoinsAwarded,
  emitMerchantWalletUpdated,
  emitPendingRewardUpdate,
  emitToUserOrderList,
  getIO,
} = orderSocketService;
