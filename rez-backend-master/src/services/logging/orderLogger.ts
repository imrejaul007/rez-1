import { createServiceLogger } from '../../config/logger';

const orderLogger = createServiceLogger('OrderService');

export class OrderLogger {
  static logOrderCreation(userId: string, orderId: string, totalAmount: number, itemCount: number, correlationId?: string) {
    orderLogger.info('Order created', {
      orderId,
      userId,
      totalAmount,
      itemCount,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOrderConfirmation(orderId: string, userId: string, totalAmount: number, correlationId?: string) {
    orderLogger.info('Order confirmed', {
      orderId,
      userId,
      totalAmount,
      status: 'CONFIRMED',
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOrderProcessing(orderId: string, userId: string, correlationId?: string) {
    orderLogger.info('Order processing', {
      orderId,
      userId,
      status: 'PROCESSING',
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOrderShipped(orderId: string, trackingNumber: string, carrier: string, correlationId?: string) {
    orderLogger.info('Order shipped', {
      orderId,
      trackingNumber,
      carrier,
      status: 'SHIPPED',
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOrderDelivered(orderId: string, deliveryDate: Date, correlationId?: string) {
    orderLogger.info('Order delivered', {
      orderId,
      deliveryDate,
      status: 'DELIVERED',
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOrderCancellation(orderId: string, userId: string, reason: string, correlationId?: string) {
    orderLogger.warn('Order cancelled', {
      orderId,
      userId,
      reason,
      status: 'CANCELLED',
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOrderRefund(orderId: string, refundAmount: number, reason: string, correlationId?: string) {
    orderLogger.info('Order refund processed', {
      orderId,
      refundAmount,
      reason,
      status: 'REFUNDED',
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOrderError(orderId: string, error: any, context: string, correlationId?: string) {
    orderLogger.error(`Order error: ${context}`, error, {
      orderId,
      errorCode: error?.code,
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOrderStatusUpdate(orderId: string, oldStatus: string, newStatus: string, correlationId?: string) {
    orderLogger.info('Order status updated', {
      orderId,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOrderItemRestockIssue(orderId: string, itemId: string, requestedQty: number, availableQty: number, correlationId?: string) {
    orderLogger.warn('Restock issue detected', {
      orderId,
      itemId,
      requestedQty,
      availableQty,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logBulkOrderCreation(orderCount: number, totalAmount: number, correlationId?: string) {
    orderLogger.info('Bulk orders created', {
      orderCount,
      totalAmount,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOrderExport(exportId: string, format: string, recordCount: number, correlationId?: string) {
    orderLogger.info('Orders exported', {
      exportId,
      format,
      recordCount,
      timestamp: new Date().toISOString()
    }, correlationId);
  }
}
