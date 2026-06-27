/**
 * Push Notification Service
 *
 * Handles sending push notifications via Expo Server SDK and SMS via Twilio.
 * Supports sending to individual users (by userId) and batch sending to multiple users.
 * Invalid/expired tokens are tracked for cleanup by the receipt processing job.
 *
 * Circuit breakers are used for both Expo Push and Twilio SMS to prevent cascading failures.
 */

import Expo, { ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
import twilio from 'twilio';
import { User } from '../models/User';
import { MerchantUser } from '../models/MerchantUser';
import { createServiceLogger } from '../config/logger';
import { BRAND } from '../config/brand';
import { getCircuitBreaker } from '../utils/circuitBreaker';
import { withTimeout } from '../utils/timeout';

const logger = createServiceLogger('push-notification');

// Circuit breakers for notification services
const expoCircuit = getCircuitBreaker('expo-push');
const pushTwilioCircuit = getCircuitBreaker('twilio-push'); // Separate circuit for push service SMS

// Timeouts for notification services
const EXPO_PUSH_TIMEOUT_MS = parseInt(process.env.EXPO_PUSH_TIMEOUT_MS || '10000', 10);
const PUSH_SMS_TIMEOUT_MS = parseInt(process.env.PUSH_SMS_TIMEOUT_MS || '8000', 10);

/**
 * Expo push ticket error codes that indicate a token should be removed
 * from the user record. Per Expo docs:
 *   - DeviceNotRegistered: the user uninstalled the app or revoked notification
 *     permission. The push token is permanently dead.
 *   - InvalidExpoPushToken[xxx]: the token format is invalid (e.g. not actually
 *     an Expo push token, or from a different Expo project). Same action.
 */
const INVALID_TOKEN_ERRORS = new Set([
  'DeviceNotRegistered',
  // Expo uses templated error names — match the prefix
  'InvalidExpoPushToken',
]);

/**
 * Returns true if the Expo ticket error indicates the token is dead
 * and should be removed from the user's pushTokens array.
 */
function isInvalidTokenError(details: any): boolean {
  if (!details?.error) return false;
  if (INVALID_TOKEN_ERRORS.has(details.error)) return true;
  // Match the templated form: "InvalidExpoPushToken[xxx]"
  if (typeof details.error === 'string' && details.error.startsWith('InvalidExpoPushToken')) {
    return true;
  }
  return false;
}

interface NotificationPayload {
  userId: string;
  phone: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface OrderNotificationData {
  orderId: string;
  orderNumber: string;
  status: string;
  deliveryPartner?: {
    name: string;
    phone: string;
  };
  estimatedDelivery?: Date;
  trackingUrl?: string;
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

class PushNotificationService {
  private twilioClient: twilio.Twilio | null = null;
  private expo: Expo;
  private static instance: PushNotificationService;

  // Store ticket IDs for receipt checking
  private pendingTickets: Array<{ ticketId: string; token: string; userId: string }> = [];

  private constructor() {
    // Initialize Expo SDK
    this.expo = new Expo();

    // Initialize Twilio client if credentials are available
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken && accountSid.startsWith('AC') && authToken.length > 10) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        logger.info('Twilio SMS client initialized');
      } catch (error: any) {
        logger.error('Failed to initialize Twilio client', { error: error.message });
      }
    } else {
      logger.warn('Twilio credentials not found or invalid. SMS notifications disabled.');
    }
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Send push notification to a single user (all their registered devices)
   */
  public async sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('pushTokens').lean();
      if (!user?.pushTokens?.length) {
        logger.debug(`No push tokens for user ${userId}`);
        return false;
      }

      const validTokens = user.pushTokens.filter(
        (t: any) => t.token && Expo.isExpoPushToken(t.token)
      );

      if (validTokens.length === 0) {
        logger.debug(`No valid Expo push tokens for user ${userId}`);
        return false;
      }

      const messages: ExpoPushMessage[] = validTokens.map((t: any) => ({
        to: t.token,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        channelId: payload.channelId || 'default',
        sound: payload.sound ?? 'default',
        priority: payload.priority || 'high',
      }));

      const chunks = this.expo.chunkPushNotifications(messages);

      // Check circuit breaker state
      if (expoCircuit.getState() === 'OPEN') {
        logger.warn('[Expo Push] Circuit breaker OPEN, skipping push notification', { userId });
        return false; // Non-blocking: log and continue
      }

      for (const chunk of chunks) {
        try {
          // Wrap with circuit breaker and timeout
          const tickets = await expoCircuit.exec(() =>
            withTimeout(
              this.expo.sendPushNotificationsAsync(chunk),
              {
                timeout: EXPO_PUSH_TIMEOUT_MS,
                operation: 'send-push-notification',
              }
            )
          );
          this.processTickets(tickets, validTokens, userId);
        } catch (error: any) {
          // Check if circuit breaker is OPEN
          if (error.message?.includes('Circuit is OPEN')) {
            logger.warn('[Expo Push] Circuit breaker OPEN, skipping chunk', { userId });
            break;
          }
          // Check for timeout
          if (error.name === 'TimeoutError') {
            logger.error('[Expo Push] Push notification timed out', { userId, error: error.message });
          } else {
            logger.error('Failed to send push notification chunk', { userId, error: error.message });
          }
        }
      }

      return true;
    } catch (error: any) {
      logger.error('sendPushToUser failed', { userId, error: error.message });
      return false;
    }
  }

  /**
   * Send push notification to ALL team members of a merchant (by Merchant._id)
   * Looks up all MerchantUser records with matching merchantId and sends to all their devices
   */
  public async sendPushToMerchant(merchantId: string, payload: PushPayload): Promise<boolean> {
    try {
      // Find ALL merchant team members with push tokens (merchantId references the Merchant model)
      const merchantUsers = await MerchantUser.find({
        merchantId,
        status: 'active',
        'pushTokens.0': { $exists: true }
      }).select('pushTokens').lean();

      if (!merchantUsers.length) {
        logger.debug(`No merchant users with push tokens for merchant ${merchantId}`);
        return false;
      }

      const messages: ExpoPushMessage[] = [];
      const tokenUserMap: Array<{ token: string; merchantUserId: string }> = [];

      for (const mu of merchantUsers) {
        for (const t of (mu.pushTokens || [])) {
          if (t.token && Expo.isExpoPushToken(t.token)) {
            messages.push({
              to: t.token,
              title: payload.title,
              body: payload.body,
              data: payload.data || {},
              channelId: payload.channelId || 'merchant-alerts',
              sound: payload.sound ?? 'default',
              priority: payload.priority || 'high',
            });
            tokenUserMap.push({ token: t.token, merchantUserId: (mu as any)._id.toString() });
          }
        }
      }

      if (messages.length === 0) {
        logger.debug(`No valid Expo push tokens for merchant ${merchantId}`);
        return false;
      }

      // Check circuit breaker state
      if (expoCircuit.getState() === 'OPEN') {
        logger.warn('[Expo Push] Circuit breaker OPEN, skipping merchant push notification', { merchantId });
        return false; // Non-blocking: log and continue
      }

      const chunks = this.expo.chunkPushNotifications(messages);
      let tokenIndex = 0;

      for (const chunk of chunks) {
        try {
          // Wrap with circuit breaker and timeout
          const tickets = await expoCircuit.exec(() =>
            withTimeout(
              this.expo.sendPushNotificationsAsync(chunk),
              {
                timeout: EXPO_PUSH_TIMEOUT_MS,
                operation: 'send-merchant-push',
              }
            )
          );
          for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            const mapping = tokenUserMap[tokenIndex + i];
            if (!mapping) continue;
            if (ticket.status === 'ok' && ticket.id) {
              this.pendingTickets.push({ ticketId: ticket.id, token: mapping.token, userId: mapping.merchantUserId });
            } else if (ticket.status === 'error') {
              const details = (ticket as any).details;
              if (isInvalidTokenError(details)) {
                MerchantUser.findByIdAndUpdate(mapping.merchantUserId, {
                  $pull: { pushTokens: { token: mapping.token } }
                }).catch(err => logger.error('Failed to remove invalid merchant token', { error: err.message }));
                logger.info(`Removed invalid push token for merchant user ${mapping.merchantUserId}`, {
                  expoError: details?.error,
                });
              }
            }
          }
          tokenIndex += chunk.length;
        } catch (error: any) {
          // Check if circuit breaker is OPEN
          if (error.message?.includes('Circuit is OPEN')) {
            logger.warn('[Expo Push] Circuit breaker OPEN, skipping merchant chunk', { merchantId });
            break;
          }
          // Check for timeout
          if (error.name === 'TimeoutError') {
            logger.error('[Expo Push] Merchant push notification timed out', { merchantId, error: error.message });
          } else {
            logger.error('Failed to send merchant push notification chunk', { merchantId, error: error.message });
          }
          tokenIndex += chunk.length;
        }
      }

      return true;
    } catch (error: any) {
      logger.error('sendPushToMerchant failed', { merchantId, error: error.message });
      return false;
    }
  }

  /**
   * Send push notification to multiple users (batch)
   */
  public async sendPushToMultiple(userIds: string[], payload: PushPayload): Promise<number> {
    if (!userIds.length) return 0;

    try {
      const users = await User.find(
        { _id: { $in: userIds }, 'pushTokens.0': { $exists: true } }
      ).select('pushTokens').lean();

      const messages: ExpoPushMessage[] = [];
      const tokenUserMap: Array<{ token: string; userId: string }> = [];

      for (const user of users) {
        for (const t of (user.pushTokens || [])) {
          if (t.token && Expo.isExpoPushToken(t.token)) {
            messages.push({
              to: t.token,
              title: payload.title,
              body: payload.body,
              data: payload.data || {},
              channelId: payload.channelId || 'default',
              sound: payload.sound ?? 'default',
              priority: payload.priority || 'high',
            });
            tokenUserMap.push({ token: t.token, userId: (user as any)._id.toString() });
          }
        }
      }

      if (messages.length === 0) return 0;

      // Check circuit breaker state
      if (expoCircuit.getState() === 'OPEN') {
        logger.warn('[Expo Push] Circuit breaker OPEN, skipping batch push', { userCount: userIds.length });
        return 0; // Non-blocking: log and continue
      }

      let sent = 0;
      const chunks = this.expo.chunkPushNotifications(messages);
      let tokenIndex = 0;

      for (const chunk of chunks) {
        try {
          // Wrap with circuit breaker and timeout
          const tickets = await expoCircuit.exec(() =>
            withTimeout(
              this.expo.sendPushNotificationsAsync(chunk),
              {
                timeout: EXPO_PUSH_TIMEOUT_MS,
                operation: 'send-batch-push',
              }
            )
          );
          for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            const mapping = tokenUserMap[tokenIndex + i];
            if (ticket.status === 'ok' && ticket.id) {
              this.pendingTickets.push({
                ticketId: ticket.id,
                token: mapping.token,
                userId: mapping.userId
              });
              sent++;
            } else if (ticket.status === 'error') {
              this.handleTicketError(ticket, mapping.token, mapping.userId);
            }
          }
          tokenIndex += chunk.length;
        } catch (error: any) {
          // Check if circuit breaker is OPEN
          if (error.message?.includes('Circuit is OPEN')) {
            logger.warn('[Expo Push] Circuit breaker OPEN, stopping batch', { userCount: userIds.length });
            break;
          }
          // Check for timeout
          if (error.name === 'TimeoutError') {
            logger.error('[Expo Push] Batch push timed out', { error: error.message });
          } else {
            logger.error('Failed to send batch push chunk', { error: error.message });
          }
          tokenIndex += chunk.length;
        }
      }

      logger.info(`Batch push sent: ${sent}/${messages.length} delivered to ${users.length} users`);
      return sent;
    } catch (error: any) {
      logger.error('sendPushToMultiple failed', { error: error.message });
      return 0;
    }
  }

  /**
   * Check delivery receipts and remove invalid tokens
   */
  public async handleReceipts(): Promise<{ checked: number; invalidRemoved: number }> {
    if (this.pendingTickets.length === 0) {
      return { checked: 0, invalidRemoved: 0 };
    }

    // Take a snapshot and clear pending
    const ticketsToCheck = [...this.pendingTickets];
    this.pendingTickets = [];

    const ticketIdMap = new Map<string, { token: string; userId: string }>();
    const receiptIds = ticketsToCheck.map(t => {
      ticketIdMap.set(t.ticketId, { token: t.token, userId: t.userId });
      return t.ticketId;
    });

    let checked = 0;
    let invalidRemoved = 0;

    const receiptChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
    for (const chunk of receiptChunks) {
      try {
        const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);

        for (const [receiptId, receipt] of Object.entries(receipts)) {
          checked++;
          const mapping = ticketIdMap.get(receiptId);
          if (!mapping) continue;

          if ((receipt as any).status === 'error') {
            const details = (receipt as any).details;
            if (isInvalidTokenError(details)) {
              // Remove invalid token from user
              await User.findByIdAndUpdate(mapping.userId, {
                $pull: { pushTokens: { token: mapping.token } }
              });
              invalidRemoved++;
              logger.info(`Removed invalid push token for user ${mapping.userId}`, {
                expoError: details?.error,
              });
            } else {
              logger.warn('Push receipt error', {
                userId: mapping.userId,
                error: details?.error,
                message: (receipt as any).message
              });
            }
          }
        }
      } catch (error: any) {
        logger.error('Failed to fetch push receipts', { error: error.message });
        // Re-queue failed tickets for next check
        for (const id of chunk) {
          const mapping = ticketIdMap.get(id);
          if (mapping) {
            this.pendingTickets.push({ ticketId: id, ...mapping });
          }
        }
      }
    }

    logger.info(`Push receipts processed: ${checked} checked, ${invalidRemoved} invalid tokens removed`);
    return { checked, invalidRemoved };
  }

  /**
   * Process tickets from a send operation
   */
  private processTickets(
    tickets: ExpoPushTicket[],
    tokens: Array<{ token: string }>,
    userId: string
  ): void {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const token = tokens[i]?.token;
      if (!token) continue;

      if (ticket.status === 'ok' && ticket.id) {
        this.pendingTickets.push({ ticketId: ticket.id, token, userId });
      } else if (ticket.status === 'error') {
        this.handleTicketError(ticket, token, userId);
      }
    }
  }

  /**
   * Handle a ticket-level error
   */
  private handleTicketError(ticket: ExpoPushTicket, token: string, userId: string): void {
    if (ticket.status !== 'error') return;

    const details = (ticket as any).details;
    if (isInvalidTokenError(details)) {
      // Remove invalid token immediately (DeviceNotRegistered OR InvalidExpoPushToken)
      User.findByIdAndUpdate(userId, {
        $pull: { pushTokens: { token } }
      }).catch(err => logger.error('Failed to remove invalid token', { error: err.message }));
      logger.info(`Removed invalid push token for user ${userId}`, {
        expoError: details?.error,
      });
    } else {
      logger.warn('Push ticket error', {
        userId,
        error: details?.error,
        message: ticket.message
      });
    }
  }

  // ==================== SMS Methods (Twilio) ====================

  private async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.twilioClient) {
      logger.debug(`[SMS] Twilio not configured. Would send to ${to.slice(-4)}`);
      return false;
    }

    try {
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
      if (!twilioPhone) {
        logger.error('[SMS] Twilio phone number not configured');
        return false;
      }

      // Check circuit breaker state before attempting
      if (pushTwilioCircuit.getState() === 'OPEN') {
        logger.warn('[SMS] Circuit breaker OPEN, skipping SMS', { to: to.slice(-4) });
        return false; // Non-blocking: log warning and continue
      }

      // Wrap with circuit breaker and timeout
      const result: any = await pushTwilioCircuit.exec(() =>
        withTimeout(
          this.twilioClient!.messages.create({
            body: message,
            to,
            from: twilioPhone,
          }),
          {
            timeout: PUSH_SMS_TIMEOUT_MS,
            operation: `send-sms-to-${to.slice(-4)}`,
          }
        )
      );

      logger.info(`[SMS] Sent to ***${to.slice(-4)}: ${result.sid}`);
      return true;
    } catch (error: any) {
      // Check if circuit breaker is OPEN
      if (error.message?.includes('Circuit is OPEN')) {
        logger.warn('[SMS] Circuit breaker OPEN, skipping SMS', { to: to.slice(-4) });
        return false; // Non-blocking: log warning and continue
      }

      // Check for timeout
      if (error.name === 'TimeoutError') {
        logger.error('[SMS] Failed to send (timeout)', { to: to.slice(-4), error: error.message });
      } else {
        logger.error('[SMS] Failed to send', { to: to.slice(-4), error: error.message });
      }
      return false; // Non-blocking: return false without throwing
    }
  }

  // ==================== Order SMS Methods ====================

  public async sendOrderConfirmed(data: OrderNotificationData, phone: string): Promise<void> {
    const message = `Your order #${data.orderNumber} has been confirmed! We're preparing your items. Track your order: ${data.trackingUrl || 'Open REZ app'}`;
    await this.sendSMS(phone, message);
    logger.info(`Order confirmed notification sent for ${data.orderNumber}`);
  }

  public async sendOrderOutForDelivery(data: OrderNotificationData, phone: string): Promise<void> {
    let message = `Your order #${data.orderNumber} is out for delivery!`;
    if (data.deliveryPartner) {
      message += ` Delivery partner: ${data.deliveryPartner.name} (${data.deliveryPartner.phone})`;
    }
    if (data.estimatedDelivery) {
      const time = new Date(data.estimatedDelivery).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      message += ` ETA: ${time}`;
    }
    message += ` Track: ${data.trackingUrl || 'Open REZ app'}`;
    await this.sendSMS(phone, message);
    logger.info(`Out for delivery notification sent for ${data.orderNumber}`);
  }

  public async sendOrderDelivered(data: OrderNotificationData, phone: string): Promise<void> {
    const message = `Your order #${data.orderNumber} has been delivered successfully! Thank you for shopping with REZ. Rate your experience in the app.`;
    await this.sendSMS(phone, message);
    logger.info(`Order delivered notification sent for ${data.orderNumber}`);
  }

  public async sendOrderCancelled(data: OrderNotificationData, phone: string, reason?: string): Promise<void> {
    let message = `Your order #${data.orderNumber} has been cancelled.`;
    if (reason) message += ` Reason: ${reason}`;
    message += ` Any payment will be refunded within 5-7 business days.`;
    await this.sendSMS(phone, message);
    logger.info(`Order cancelled notification sent for ${data.orderNumber}`);
  }

  public async sendOrderRefunded(data: OrderNotificationData, phone: string, refundAmount: number): Promise<void> {
    const message = `Refund processed for order #${data.orderNumber}. Amount: ${refundAmount} has been credited to your original payment method. It may take 5-7 business days to reflect.`;
    await this.sendSMS(phone, message);
    logger.info(`Refund notification sent for ${data.orderNumber}`);
  }

  public async sendDeliveryPartnerAssigned(data: OrderNotificationData, phone: string): Promise<void> {
    if (!data.deliveryPartner) return;
    const message = `Delivery partner assigned for order #${data.orderNumber}! ${data.deliveryPartner.name} (${data.deliveryPartner.phone}) will deliver your order. Track in the app.`;
    await this.sendSMS(phone, message);
    logger.info(`Delivery partner assigned notification sent for ${data.orderNumber}`);
  }

  public async sendOrderUpdate(orderNumber: string, phone: string, title: string, message: string): Promise<void> {
    const fullMessage = `${title}\nOrder #${orderNumber}: ${message}`;
    await this.sendSMS(phone, fullMessage);
    logger.info(`Order update notification sent for ${orderNumber}`);
  }

  // ==================== Visit/Queue SMS Methods ====================

  public async sendQueueNumberAssigned(
    storeName: string, queueNumber: number, visitNumber: string, phone: string,
    estimatedWaitTime?: string, currentQueueSize?: number
  ): Promise<void> {
    let message = `Queue Number Assigned!\n\nStore: ${storeName}\nYour Queue #: ${queueNumber}\nVisit #: ${visitNumber}`;
    if (estimatedWaitTime) message += `\nEstimated Wait: ${estimatedWaitTime}`;
    if (currentQueueSize) message += `\nCurrent Queue Size: ${currentQueueSize}`;
    message += `\n\nWe'll notify you when it's your turn. Thank you for using REZ!`;
    await this.sendSMS(phone, message);
    logger.info(`Queue number sent for ${visitNumber}`);
  }

  public async sendVisitScheduled(
    storeName: string, visitNumber: string, visitDate: Date, visitTime: string,
    phone: string, storeAddress?: string
  ): Promise<void> {
    const dateStr = new Date(visitDate).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    let message = `Visit Scheduled Successfully!\n\nStore: ${storeName}\nVisit #: ${visitNumber}\nDate: ${dateStr}\nTime: ${visitTime}`;
    if (storeAddress) message += `\nAddress: ${storeAddress}`;
    message += `\n\nWe look forward to seeing you! Open REZ app to manage your visit.`;
    await this.sendSMS(phone, message);
    logger.info(`Visit scheduled notification sent for ${visitNumber}`);
  }

  public async sendVisitCancelled(storeName: string, visitNumber: string, phone: string, reason?: string): Promise<void> {
    let message = `Visit Cancelled\n\nStore: ${storeName}\nVisit #: ${visitNumber} has been cancelled.`;
    if (reason) message += `\nReason: ${reason}`;
    message += `\n\nYou can reschedule anytime through the REZ app.`;
    await this.sendSMS(phone, message);
    logger.info(`Visit cancellation notification sent for ${visitNumber}`);
  }

  public async sendVisitCheckedIn(storeName: string, visitNumber: string, phone: string): Promise<void> {
    const message = `You're Checked In!\n\nStore: ${storeName}\nVisit #: ${visitNumber}\n\nYou have been checked in. The store team is ready for you!`;
    await this.sendSMS(phone, message);
    logger.info(`Visit check-in notification sent for ${visitNumber}`);
  }

  public async sendVisitCompleted(storeName: string, visitNumber: string, phone: string): Promise<void> {
    const message = `Visit Complete!\n\nStore: ${storeName}\nVisit #: ${visitNumber}\n\nThank you for visiting! We hope you had a great experience.`;
    await this.sendSMS(phone, message);
    logger.info(`Visit completion notification sent for ${visitNumber}`);
  }

  // ==================== Wallet/Social SMS Methods ====================

  public async sendGiftReceived(senderName: string, amount: number, themeEmoji: string, phone: string): Promise<void> {
    const message = `${themeEmoji} You received a gift!\n\n${senderName} sent you ${amount} ${BRAND.COIN_SHORT} on ${BRAND.APP_NAME}! Open the app to claim your gift before it expires.\n\nOpen ${BRAND.APP_NAME} app to claim now!`;
    await this.sendSMS(phone, message);
    logger.info(`Gift received notification sent to ***${phone.slice(-4)}`);
  }

  public async sendGiftExpiredRefund(recipientName: string, amount: number, phone: string): Promise<void> {
    const message = `Gift Refund\n\nYour gift of ${amount} NC to ${recipientName} was not claimed and has expired. The coins have been returned to your wallet.`;
    await this.sendSMS(phone, message);
    logger.info(`Gift expiry refund notification sent to ***${phone.slice(-4)}`);
  }

  public async sendTransferReceived(recipientPhone: string, senderName: string, amount: number): Promise<void> {
    const message = `You received ${amount} NC from ${senderName}! Open REZ to view your balance.`;
    await this.sendSMS(recipientPhone, message);
    logger.info(`Transfer received notification sent to ***${recipientPhone.slice(-4)}`);
  }

  public async sendAchievementUnlocked(userPhone: string, achievementName: string, reward: number): Promise<void> {
    const message = `Achievement unlocked: ${achievementName}! You earned ${reward} NC. Keep going!`;
    await this.sendSMS(userPhone, message);
    logger.info(`Achievement unlocked notification sent to ***${userPhone.slice(-4)}`);
  }

  public async sendChallengeCompleted(userPhone: string, challengeName: string, reward: number): Promise<void> {
    const message = `Challenge complete: ${challengeName}! Claim your ${reward} NC reward.`;
    await this.sendSMS(userPhone, message);
    logger.info(`Challenge completed notification sent to ***${userPhone.slice(-4)}`);
  }

  public async sendTournamentEndingSoon(userPhone: string, tournamentName: string, hoursLeft: number): Promise<void> {
    const message = `${tournamentName} tournament ends in ${hoursLeft}h! Check your rank now.`;
    await this.sendSMS(userPhone, message);
    logger.info(`Tournament ending soon notification sent to ***${userPhone.slice(-4)}`);
  }

  public async sendCoinsExpiringSoon(userPhone: string, amount: number, expiryDate: string): Promise<void> {
    const message = `${amount} NC expires on ${expiryDate}. Use them before they're gone!`;
    await this.sendSMS(userPhone, message);
    logger.info(`Coins expiring soon notification sent to ***${userPhone.slice(-4)}`);
  }
}

// Export singleton instance
const pushNotificationService = PushNotificationService.getInstance();

export default pushNotificationService;

// Export individual functions for easier use
export const {
  sendPushToUser,
  sendPushToMerchant,
  sendPushToMultiple,
  handleReceipts,
  sendOrderConfirmed,
  sendOrderOutForDelivery,
  sendOrderDelivered,
  sendOrderCancelled,
  sendOrderRefunded,
  sendDeliveryPartnerAssigned,
  sendOrderUpdate,
  sendQueueNumberAssigned,
  sendVisitScheduled,
  sendVisitCancelled,
  sendVisitCheckedIn,
  sendVisitCompleted,
  sendTransferReceived,
  sendAchievementUnlocked,
  sendChallengeCompleted,
  sendTournamentEndingSoon,
  sendCoinsExpiringSoon,
} = pushNotificationService;
