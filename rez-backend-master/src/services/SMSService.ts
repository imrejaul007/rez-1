import { logger } from '../config/logger';
import twilio from 'twilio';
import { twilioCircuit } from '../utils/circuitBreaker';
import EmailService from './EmailService';

// Configure Twilio
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: any = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// Default SMS timeout (8s — Twilio typically responds in <2s, but a slow call
// should not block OTP flows indefinitely).
const SMS_TIMEOUT_MS = parseInt(process.env.TWILIO_HTTP_TIMEOUT_MS || '8000', 10);

/**
 * Race a promise against a timeout.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`[SMS] ${label} timed out after ${ms}ms`)), ms);
    if (timer && typeof (timer as any).unref === 'function') (timer as any).unref();
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface SMSOptions {
  to: string;
  message: string;
  /** Optional email address to fall back to if SMS fails / Twilio is unavailable */
  emailFallback?: string;
  /** Optional subject for the email fallback (defaults to "REZ Notification") */
  emailSubject?: string;
}

export class SMSService {
  /**
   * Send SMS
   *
   * Per AUDIT_REPORT.md finding #3, this now:
   * 1. Wraps the Twilio call in a circuit breaker
   * 2. Adds an explicit HTTP timeout
   * 3. Falls back to email when the circuit is OPEN or Twilio errors
   * 4. In dev (no Twilio config), logs the message but never the OTP body
   */
  static async send(options: SMSOptions): Promise<void> {
    // No Twilio config — dev only
    if (!twilioClient) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SMS service not configured (TWILIO_* env vars required). Cannot send OTP in production.');
      }
      // Dev only: log destination but NEVER the OTP/message body
      logger.info(`[DEV] SMS would be sent to ***${options.to.slice(-4)} (Twilio not configured)`);
      return;
    }

    try {
      // Run the Twilio call through the circuit breaker + timeout. If the
      // circuit is OPEN, twilioCircuit.exec() throws synchronously with a
      // clear "Circuit is OPEN" message — we catch and fall through to
      // the email fallback below.
      const result: any = await twilioCircuit.exec(() =>
        withTimeout(
          twilioClient.messages.create({
            body: options.message,
            from: TWILIO_PHONE_NUMBER,
            to: options.to,
          }),
          SMS_TIMEOUT_MS,
          `messages.create(${options.to})`
        )
      );

      logger.info(`✅ SMS sent successfully to ***${options.to.slice(-4)} (SID: ${result.sid})`);
    } catch (error: any) {
      logger.error('❌ SMS send error — attempting email fallback', {
        to: options.to,
        error: error?.message,
        hasEmailFallback: Boolean(options.emailFallback),
      });

      // Fall back to email if we have an address to send to. This prevents
      // a Twilio outage from completely blocking OTP / verification flows.
      if (options.emailFallback) {
        try {
          await EmailService.send({
            to: options.emailFallback,
            subject: options.emailSubject || 'REZ Notification',
            text: options.message,
            html: `<p>${options.message.replace(/\n/g, '<br>')}</p>`,
          });
          logger.info(`✅ Email fallback sent to ${options.emailFallback}`);
          return;
        } catch (emailErr: any) {
          logger.error('❌ Email fallback also failed', {
            to: options.emailFallback,
            error: emailErr?.message,
          });
          // Fall through to the original throw so the caller knows delivery
          // failed through both channels.
        }
      }

      throw new Error(`Failed to send SMS: ${error?.message || String(error)}`);
    }
  }

  /**
   * Send OTP for merchant 2FA
   */
  static async sendMerchantOTP(phoneNumber: string, otp: string, merchantName: string): Promise<void> {
    const message = `${otp} is your OTP for ${merchantName} merchant login. Valid for 10 minutes. Do not share this OTP with anyone.`;

    await this.send({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send OTP for user authentication / transfer verification
   *
   * If `email` is provided, OTP will fall back to email delivery when SMS
   * fails (Twilio outage, circuit open, network timeout).
   */
  static async sendOTP(phoneNumber: string, otp: string, email?: string): Promise<boolean> {
    try {
      await this.send({
        to: phoneNumber,
        message: `Your REZ App OTP is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`,
        emailFallback: email,
        emailSubject: 'Your REZ OTP code',
      });
      return true;
    } catch (error) {
      logger.error('❌ [SMSService] Failed to send OTP (no fallback succeeded):', error);
      return false;
    }
  }

  /**
   * Send order confirmation to customer
   */
  static async sendOrderConfirmation(
    phoneNumber: string,
    orderNumber: string,
    storeName: string
  ): Promise<void> {
    const message = `Your order #${orderNumber} from ${storeName} has been confirmed! We'll notify you once it's ready for delivery.`;

    await this.send({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send order status update to customer
   */
  static async sendOrderStatusUpdate(
    phoneNumber: string,
    orderNumber: string,
    status: string,
    storeName: string
  ): Promise<void> {
    let message = '';

    switch (status.toLowerCase()) {
      case 'preparing':
        message = `Your order #${orderNumber} from ${storeName} is being prepared. We'll update you soon!`;
        break;
      case 'ready':
        message = `Good news! Your order #${orderNumber} from ${storeName} is ready for pickup/delivery!`;
        break;
      case 'out_for_delivery':
        message = `Your order #${orderNumber} from ${storeName} is out for delivery. It will arrive soon!`;
        break;
      case 'delivered':
        message = `Your order #${orderNumber} from ${storeName} has been delivered. Thank you for your order!`;
        break;
      case 'cancelled':
        message = `Your order #${orderNumber} from ${storeName} has been cancelled. Please contact support if you have questions.`;
        break;
      default:
        message = `Update: Your order #${orderNumber} from ${storeName} status is now: ${status}`;
    }

    await this.send({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send new order alert to merchant
   */
  static async sendNewOrderAlertToMerchant(
    phoneNumber: string,
    orderNumber: string,
    customerName: string,
    total: number
  ): Promise<void> {
    const message = `🎉 New order #${orderNumber} from ${customerName}! Total: ₹${total}. Login to your merchant dashboard to process.`;

    await this.send({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send low stock alert to merchant
   */
  static async sendLowStockAlert(
    phoneNumber: string,
    productName: string,
    stock: number
  ): Promise<void> {
    const message = `⚠️ Low stock alert: ${productName} has only ${stock} unit(s) left. Consider restocking soon!`;

    await this.send({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send high-value order alert to merchant
   */
  static async sendHighValueOrderAlert(
    phoneNumber: string,
    orderNumber: string,
    total: number
  ): Promise<void> {
    const message = `💰 High-value order alert! Order #${orderNumber} worth ₹${total} received. Please prioritize processing.`;

    await this.send({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send payment received confirmation
   */
  static async sendPaymentReceived(
    phoneNumber: string,
    orderNumber: string,
    amount: number
  ): Promise<void> {
    const message = `Payment of ₹${amount} received for order #${orderNumber}. Thank you!`;

    await this.send({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send refund notification
   */
  static async sendRefundNotification(
    phoneNumber: string,
    orderNumber: string,
    amount: number
  ): Promise<void> {
    const message = `Refund of ₹${amount} for order #${orderNumber} has been processed. It will reflect in your account within 5-7 business days.`;

    await this.send({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send refund request notification to merchant
   */
  static async sendRefundRequestNotification(
    phoneNumber: string,
    orderNumber: string,
    refundAmount: number,
    refundType: string
  ): Promise<void> {
    const message = `Refund request received for Order #${orderNumber}. Amount: ₹${refundAmount} (${refundType}). Please review and process within 24-48 hours.`;

    await this.send({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send account locked alert to merchant
   */
  static async sendAccountLockedAlert(
    phoneNumber: string,
    merchantName: string,
    unlockTime: Date
  ): Promise<void> {
    const minutes = Math.ceil((unlockTime.getTime() - Date.now()) / 60000);
    const message = `Your ${merchantName} merchant account has been locked due to multiple failed login attempts. It will unlock automatically in ${minutes} minutes. You can also reset your password to unlock immediately.`;

    await this.send({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Check if SMS service is configured
   */
  static isConfigured(): boolean {
    return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
  }

  /**
   * Format phone number to E.164 format
   */
  static formatPhoneNumber(phoneNumber: string, countryCode: string = '+91'): string {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // If already has country code, return as is
    if (cleaned.startsWith(countryCode.replace('+', ''))) {
      return `+${cleaned}`;
    }

    // Add country code
    return `${countryCode}${cleaned}`;
  }
}

export default SMSService;
