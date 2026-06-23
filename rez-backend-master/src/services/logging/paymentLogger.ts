import { createServiceLogger, sanitizeLog } from '../../config/logger';

const paymentLogger = createServiceLogger('PaymentService');

export class PaymentLogger {
  static logPaymentInitiation(userId: string, amount: number, method: string, correlationId?: string) {
    paymentLogger.info('Payment initiation', {
      userId,
      amount,
      method,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logPaymentProcessing(transactionId: string, userId: string, amount: number, correlationId?: string) {
    paymentLogger.info('Processing payment', {
      transactionId,
      userId,
      amount,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logPaymentSuccess(transactionId: string, userId: string, amount: number, method: string, correlationId?: string) {
    paymentLogger.info('Payment successful', {
      transactionId,
      userId,
      amount,
      method,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logPaymentFailure(
    transactionId: string,
    userId: string,
    amount: number,
    error: any,
    reason: string,
    correlationId?: string
  ) {
    paymentLogger.error('Payment failed', error, {
      transactionId,
      userId,
      amount,
      reason,
      errorCode: error?.code,
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logRefund(transactionId: string, amount: number, reason: string, correlationId?: string) {
    paymentLogger.info('Processing refund', {
      transactionId,
      amount,
      reason,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logRefundSuccess(transactionId: string, refundId: string, amount: number, correlationId?: string) {
    paymentLogger.info('Refund successful', {
      transactionId,
      refundId,
      amount,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logRefundFailure(transactionId: string, amount: number, error: any, correlationId?: string) {
    paymentLogger.error('Refund failed', error, {
      transactionId,
      amount,
      errorCode: error?.code,
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logPaymentRetry(transactionId: string, attempt: number, maxAttempts: number, correlationId?: string) {
    paymentLogger.warn('Retrying payment', {
      transactionId,
      attempt,
      maxAttempts,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logPaymentTimeout(transactionId: string, timeout: number, correlationId?: string) {
    paymentLogger.warn('Payment timeout', {
      transactionId,
      timeoutMs: timeout,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logStripeEvent(eventType: string, eventId: string, data: any, correlationId?: string) {
    paymentLogger.info('Stripe webhook event', {
      eventType,
      eventId,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logRazorpayEvent(eventType: string, paymentId: string, data: any, correlationId?: string) {
    paymentLogger.info('Razorpay webhook event', {
      eventType,
      paymentId,
      timestamp: new Date().toISOString()
    }, correlationId);
  }
}
