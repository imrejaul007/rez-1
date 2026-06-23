import { Server as SocketIOServer } from 'socket.io';
import { BusinessMetricsService } from './BusinessMetrics';
import { logger } from '../config/logger';
import { OrderModel } from '../models/MerchantOrder';
import { CashbackModel } from '../models/Cashback';
import { ProductModel } from '../models/MerchantProduct';

export interface RealTimeEvent {
  type: 'order_created' | 'order_updated' | 'cashback_created' | 'cashback_updated' | 'product_updated' | 'metrics_updated';
  merchantId?: string;
  data: any;
  timestamp: Date;
}

export class RealTimeService {
  private static instance: RealTimeService;
  private io: SocketIOServer;
  private metricsUpdateInterval: NodeJS.Timeout | null = null;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
    this.startMetricsUpdater();
  }

  static getInstance(io: SocketIOServer): RealTimeService {
    if (!RealTimeService.instance) {
      RealTimeService.instance = new RealTimeService(io);
    }
    return RealTimeService.instance;
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('Real-time client connected:', socket.id);

      // Handle merchant room joining
      socket.on('join-merchant-dashboard', (merchantId: string) => {
        socket.join(`merchant-${merchantId}`);
        socket.join(`dashboard-${merchantId}`);
        logger.info(`Merchant ${merchantId} joined dashboard room`);
        
        // Send initial dashboard data
        this.sendInitialDashboardData(merchantId, socket.id);
      });

      // Handle real-time data subscriptions
      socket.on('subscribe-metrics', (merchantId: string) => {
        socket.join(`metrics-${merchantId}`);
        logger.info(`Subscribed to metrics for merchant ${merchantId}`);
      });

      socket.on('subscribe-orders', (merchantId: string) => {
        socket.join(`orders-${merchantId}`);
        logger.info(`Subscribed to orders for merchant ${merchantId}`);
      });

      socket.on('subscribe-cashback', (merchantId: string) => {
        socket.join(`cashback-${merchantId}`);
        logger.info(`Subscribed to cashback for merchant ${merchantId}`);
      });

      socket.on('unsubscribe-all', () => {
        // Leave all rooms except the default socket room
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
        logger.info(`Client ${socket.id} unsubscribed from all rooms`);
      });

      socket.on('disconnect', () => {
        logger.info('Real-time client disconnected:', socket.id);
      });
    });
  }

  private async sendInitialDashboardData(merchantId: string, socketId: string) {
    try {
      const [metrics, overview, notifications] = await Promise.all([
        BusinessMetricsService.getDashboardMetrics(merchantId),
        this.getDashboardOverview(merchantId),
        this.getNotifications(merchantId)
      ]);

      this.io.to(socketId).emit('initial-dashboard-data', {
        metrics,
        overview,
        notifications,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error sending initial dashboard data:', error);
    }
  }

  private async getDashboardOverview(merchantId: string) {
    const [
      totalProducts,
      totalOrders,
      pendingOrders,
      totalCashback
    ] = await Promise.all([
      ProductModel.countByMerchant(merchantId),
      OrderModel.countByMerchant(merchantId),
      OrderModel.countByStatus(merchantId, 'placed'),
      CashbackModel.getMetrics(merchantId)
    ]);

    return {
      totalProducts,
      totalOrders,
      pendingOrders,
      pendingCashback: totalCashback.totalPendingRequests
    };
  }

  private async getNotifications(merchantId: string) {
    const [
      lowStockProducts,
      pendingOrders,
      pendingCashback
    ] = await Promise.all([
      ProductModel.findLowStock(merchantId),
      OrderModel.findByStatus(merchantId, 'placed'),
(async () => {
        const result = await CashbackModel.search({ merchantId, status: 'pending', flaggedOnly: true });
        return result.requests || [];
      })()
    ]);

    const notifications = [];

    if (lowStockProducts.length > 0) {
      notifications.push({
        id: 'low_stock',
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStockProducts.length} product(s) are running low on stock`,
        count: lowStockProducts.length
      });
    }

    if (pendingOrders.length > 0) {
      notifications.push({
        id: 'pending_orders',
        type: 'info',
        title: 'Pending Orders',
        message: `${pendingOrders.length} order(s) require processing`,
        count: pendingOrders.length
      });
    }

    if (pendingCashback.length > 0) {
      notifications.push({
        id: 'high_risk_cashback',
        type: 'error',
        title: 'High-Risk Cashback',
        message: `${pendingCashback.length} cashback request(s) flagged for review`,
        count: pendingCashback.length
      });
    }

    return notifications;
  }

  private startMetricsUpdater() {
    // Update metrics every 30 seconds for connected merchants
    this.metricsUpdateInterval = setInterval(async () => {
      const connectedRooms = this.io.sockets.adapter.rooms;
      const merchantRooms = new Set<string>();

      // Find all merchant dashboard rooms
      for (const [roomName] of connectedRooms) {
        if (roomName.startsWith('dashboard-')) {
          const merchantId = roomName.replace('dashboard-', '');
          merchantRooms.add(merchantId);
        }
      }

      // Update metrics for each connected merchant
      for (const merchantId of merchantRooms) {
        try {
          const [metrics, overview, notifications] = await Promise.all([
            BusinessMetricsService.getDashboardMetrics(merchantId),
            this.getDashboardOverview(merchantId),
            this.getNotifications(merchantId)
          ]);

          this.io.to(`dashboard-${merchantId}`).emit('metrics-updated', {
            metrics,
            overview,
            notifications,
            timestamp: new Date()
          });

          // Also send to metrics subscribers
          this.io.to(`metrics-${merchantId}`).emit('live-metrics', {
            metrics,
            timestamp: new Date()
          });

        } catch (error) {
          logger.error(`Error updating metrics for merchant ${merchantId}:`, error);
        }
      }
    }, 30000); // 30 seconds
  }

  // Public methods to emit real-time events
  public emitOrderEvent(merchantId: string, event: RealTimeEvent) {
    this.io.to(`orders-${merchantId}`).emit('order-event', event);
    this.io.to(`dashboard-${merchantId}`).emit('dashboard-event', event);
    
    // Trigger metrics update
    this.updateMerchantMetrics(merchantId);
  }

  public emitCashbackEvent(merchantId: string, event: RealTimeEvent) {
    this.io.to(`cashback-${merchantId}`).emit('cashback-event', event);
    this.io.to(`dashboard-${merchantId}`).emit('dashboard-event', event);
    
    // Trigger metrics update
    this.updateMerchantMetrics(merchantId);
  }

  public emitProductEvent(merchantId: string, event: RealTimeEvent) {
    this.io.to(`dashboard-${merchantId}`).emit('dashboard-event', event);
    
    // Trigger metrics update if stock-related
    if (event.type === 'product_updated' && event.data.stockChanged) {
      this.updateMerchantMetrics(merchantId);
    }
  }

  private async updateMerchantMetrics(merchantId: string) {
    try {
      const [metrics, overview, notifications] = await Promise.all([
        BusinessMetricsService.getDashboardMetrics(merchantId),
        this.getDashboardOverview(merchantId),
        this.getNotifications(merchantId)
      ]);

      this.io.to(`dashboard-${merchantId}`).emit('metrics-updated', {
        metrics,
        overview,
        notifications,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error(`Error updating metrics for merchant ${merchantId}:`, error);
    }
  }

  // Broadcast system-wide notifications
  public broadcastSystemNotification(notification: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    merchantIds?: string[]; // If specified, only send to these merchants
  }) {
    if (notification.merchantIds) {
      // Send to specific merchants
      notification.merchantIds.forEach(merchantId => {
        this.io.to(`dashboard-${merchantId}`).emit('system-notification', {
          ...notification,
          timestamp: new Date()
        });
      });
    } else {
      // Broadcast to all connected clients
      this.io.emit('system-notification', {
        ...notification,
        timestamp: new Date()
      });
    }
  }

  // Send live time series data for charts
  public async sendLiveChartData(merchantId: string, period: number = 24) {
    try {
      const timeSeriesData = await BusinessMetricsService.getTimeSeriesData(merchantId, period);
      
      this.io.to(`dashboard-${merchantId}`).emit('live-chart-data', {
        timeSeriesData,
        period,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error(`Error sending live chart data for merchant ${merchantId}:`, error);
    }
  }

  // Performance monitoring
  public getConnectionStats() {
    const sockets = this.io.sockets.sockets;
    const rooms = this.io.sockets.adapter.rooms;
    
    const stats = {
      totalConnections: sockets.size,
      totalRooms: rooms.size,
      merchantDashboards: 0,
      activeSubscriptions: {
        metrics: 0,
        orders: 0,
        cashback: 0
      }
    };

    for (const [roomName, room] of rooms) {
      if (roomName.startsWith('dashboard-')) {
        stats.merchantDashboards++;
      } else if (roomName.startsWith('metrics-')) {
        stats.activeSubscriptions.metrics++;
      } else if (roomName.startsWith('orders-')) {
        stats.activeSubscriptions.orders++;
      } else if (roomName.startsWith('cashback-')) {
        stats.activeSubscriptions.cashback++;
      }
    }

    return stats;
  }

  // Cleanup method
  public cleanup() {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }
  }
}

// Helper functions to emit events from other parts of the application
export function emitOrderUpdate(merchantId: string, order: any, action: 'created' | 'updated') {
  if (global.io) {
    const realTimeService = RealTimeService.getInstance(global.io);
    realTimeService.emitOrderEvent(merchantId, {
      type: action === 'created' ? 'order_created' : 'order_updated',
      merchantId,
      data: order,
      timestamp: new Date()
    });
  }
}

export function emitCashbackUpdate(merchantId: string, cashback: any, action: 'created' | 'updated') {
  if (global.io) {
    const realTimeService = RealTimeService.getInstance(global.io);
    realTimeService.emitCashbackEvent(merchantId, {
      type: action === 'created' ? 'cashback_created' : 'cashback_updated',
      merchantId,
      data: cashback,
      timestamp: new Date()
    });
  }
}

export function emitProductUpdate(merchantId: string, product: any, stockChanged: boolean = false) {
  if (global.io) {
    const realTimeService = RealTimeService.getInstance(global.io);
    realTimeService.emitProductEvent(merchantId, {
      type: 'product_updated',
      merchantId,
      data: { ...product, stockChanged },
      timestamp: new Date()
    });
  }
}