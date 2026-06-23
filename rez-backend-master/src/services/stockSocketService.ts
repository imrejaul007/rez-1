import { logger } from '../config/logger';
/**
 * Stock Socket Service
 *
 * This service manages real-time stock updates using Socket.IO.
 * It provides functions to emit stock-related events to connected clients.
 */

import { Server as SocketIOServer } from 'socket.io';
import {
  SocketEvent,
  SocketRoom,
  StockUpdatedPayload,
  StockLowPayload,
  StockOutOfStockPayload,
} from '../types/socket';
import stockNotificationService from './stockNotificationService';
import { CacheInvalidator } from '../utils/cacheHelper';

/**
 * Stock Socket Service Class
 * Manages all stock-related real-time communications
 */
class StockSocketService {
  private io: SocketIOServer | null = null;
  private static instance: StockSocketService;

  // Stock threshold for "low stock" warning (can be configured)
  private readonly LOW_STOCK_THRESHOLD = 10;

  private constructor() {}

  /**
   * Get singleton instance of StockSocketService
   */
  public static getInstance(): StockSocketService {
    if (!StockSocketService.instance) {
      StockSocketService.instance = new StockSocketService();
    }
    return StockSocketService.instance;
  }

  /**
   * Initialize the Socket.IO server
   * @param io - Socket.IO server instance
   */
  public initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupSocketHandlers();
    logger.info('✅ Stock Socket Service initialized');
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on(SocketEvent.CONNECTION, (socket) => {
      logger.info(`📡 Client connected to stock updates: ${socket.id}`);

      // Handle client joining specific rooms
      socket.on(SocketEvent.JOIN_ROOM, (roomName: string) => {
        socket.join(roomName);
        logger.info(`👤 Client ${socket.id} joined room: ${roomName}`);
      });

      // Handle client leaving specific rooms
      socket.on(SocketEvent.LEAVE_ROOM, (roomName: string) => {
        socket.leave(roomName);
        logger.info(`👤 Client ${socket.id} left room: ${roomName}`);
      });

      socket.on(SocketEvent.DISCONNECT, () => {
        logger.info(`📡 Client disconnected from stock updates: ${socket.id}`);
      });
    });
  }

  /**
   * Emit stock update event
   * @param productId - Product ID
   * @param newStock - New stock quantity
   * @param options - Additional options
   */
  public async emitStockUpdate(
    productId: string,
    newStock: number,
    options?: {
      storeId?: string;
      previousStock?: number;
      reason?: 'purchase' | 'restock' | 'adjustment' | 'return';
      productName?: string;
      productImage?: string;
      productPrice?: number;
    }
  ): Promise<void> {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit stock update.');
      return;
    }

    const payload: StockUpdatedPayload = {
      productId,
      newStock,
      storeId: options?.storeId,
      previousStock: options?.previousStock,
      timestamp: new Date(),
      reason: options?.reason,
    };

    // Emit to product-specific room
    this.io.to(SocketRoom.product(productId)).emit(SocketEvent.STOCK_UPDATED, payload);

    // If store is specified, also emit to store room
    if (options?.storeId) {
      this.io.to(SocketRoom.store(options.storeId)).emit(SocketEvent.STOCK_UPDATED, payload);
    }

    // Emit to all users room
    this.io.to(SocketRoom.allUsers).emit(SocketEvent.STOCK_UPDATED, payload);

    logger.info(`📦 Stock updated: Product ${productId}, New Stock: ${newStock}`);

    // Invalidate stock and product cache asynchronously
    CacheInvalidator.invalidateStock(productId).catch(error => {
      logger.error(`❌ Error invalidating stock cache for product ${productId}:`, error);
    });

    // Check if stock was 0 and now is > 0 (back in stock) - trigger notifications
    const wasOutOfStock = options?.previousStock === 0;
    const isNowInStock = newStock > 0;

    if (wasOutOfStock && isNowInStock) {
      logger.info(`🔔 Product ${productId} is back in stock! Notifying subscribers...`);

      // Notify subscribers asynchronously (don't await to not block socket emission)
      stockNotificationService.notifySubscribers({
        productId,
        productName: options?.productName || 'Product',
        productImage: options?.productImage || '',
        productPrice: options?.productPrice || 0,
        newStock
      }).catch(error => {
        logger.error(`❌ Error notifying subscribers for product ${productId}:`, error);
      });
    }

    // Check if stock is low and emit low stock warning
    if (newStock > 0 && newStock <= this.LOW_STOCK_THRESHOLD) {
      this.emitStockLow(productId, newStock, options?.storeId, options?.productName);
    }

    // Check if stock is out and emit out of stock event
    if (newStock === 0) {
      this.emitOutOfStock(productId, options?.storeId, options?.productName);
    }
  }

  /**
   * Emit low stock warning event
   * @param productId - Product ID
   * @param currentStock - Current stock quantity
   * @param storeId - Optional store ID
   * @param productName - Optional product name
   */
  public emitStockLow(
    productId: string,
    currentStock: number,
    storeId?: string,
    productName?: string
  ): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit low stock warning.');
      return;
    }

    const payload: StockLowPayload = {
      productId,
      storeId,
      currentStock,
      threshold: this.LOW_STOCK_THRESHOLD,
      timestamp: new Date(),
      productName,
    };

    // Emit to product-specific room
    this.io.to(SocketRoom.product(productId)).emit(SocketEvent.STOCK_LOW, payload);

    // If store is specified, also emit to store room and merchant room
    if (storeId) {
      this.io.to(SocketRoom.store(storeId)).emit(SocketEvent.STOCK_LOW, payload);
      // Merchants should be notified about low stock in their stores
      this.io.to(SocketRoom.allMerchants).emit(SocketEvent.STOCK_LOW, payload);
    }

    logger.info(`⚠️ Low stock warning: Product ${productId}, Stock: ${currentStock}`);
  }

  /**
   * Emit out of stock event
   * @param productId - Product ID
   * @param storeId - Optional store ID
   * @param productName - Optional product name
   */
  public emitOutOfStock(
    productId: string,
    storeId?: string,
    productName?: string
  ): void {
    if (!this.io) {
      logger.warn('⚠️ Socket.IO not initialized. Cannot emit out of stock event.');
      return;
    }

    const payload: StockOutOfStockPayload = {
      productId,
      storeId,
      timestamp: new Date(),
      productName,
      lastAvailable: new Date(),
    };

    // Emit to product-specific room
    this.io.to(SocketRoom.product(productId)).emit(SocketEvent.STOCK_OUT_OF_STOCK, payload);

    // If store is specified, also emit to store room
    if (storeId) {
      this.io.to(SocketRoom.store(storeId)).emit(SocketEvent.STOCK_OUT_OF_STOCK, payload);
      // Merchants should be notified about out of stock products
      this.io.to(SocketRoom.allMerchants).emit(SocketEvent.STOCK_OUT_OF_STOCK, payload);
    }

    // Emit to all users room
    this.io.to(SocketRoom.allUsers).emit(SocketEvent.STOCK_OUT_OF_STOCK, payload);

    logger.info(`🚫 Out of stock: Product ${productId}`);
  }

  /**
   * Get the Socket.IO server instance
   */
  public getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Set custom low stock threshold
   * @param threshold - New threshold value
   */
  public setLowStockThreshold(threshold: number): void {
    if (threshold < 0) {
      logger.warn('⚠️ Invalid threshold value. Must be >= 0.');
      return;
    }
    (this as any).LOW_STOCK_THRESHOLD = threshold;
    logger.info(`✅ Low stock threshold updated to: ${threshold}`);
  }
}

// Export singleton instance methods
const stockSocketService = StockSocketService.getInstance();

export default stockSocketService;

// Export individual functions for easier use
export const {
  initialize,
  emitStockUpdate,
  emitStockLow,
  emitOutOfStock,
  getIO,
  setLowStockThreshold,
} = stockSocketService;