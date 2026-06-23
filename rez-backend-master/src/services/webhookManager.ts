/**
 * Webhook Management Service
 * Phase 5 Week 3: Advanced Features
 *
 * Handles webhook registration, delivery, retry, and monitoring
 */

import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as crypto from 'crypto';
import { logger } from '../config/logger';
import redisService from './redisService';

// ─────────────────────────────────────────────────────────────────────────
// WEBHOOK SCHEMA
// ─────────────────────────────────────────────────────────────────────────

interface WebhookDocument extends Document {
  id: string;
  merchantId: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    initialDelayMs: number;
    backoffMultiplier: number;
  };
  metadata: {
    description: string;
    createdAt: Date;
    lastDelivery?: Date;
    successCount: number;
    failureCount: number;
  };
}

const webhookSchema = new Schema<WebhookDocument>(
  {
    id: { type: String, default: () => uuidv4(), unique: true },
    merchantId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    events: [String], // e.g., ['order.created', 'payment.confirmed']
    secret: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    retryPolicy: {
      maxRetries: { type: Number, default: 5 },
      initialDelayMs: { type: Number, default: 1000 },
      backoffMultiplier: { type: Number, default: 2 },
    },
    metadata: {
      description: String,
      createdAt: { type: Date, default: Date.now },
      lastDelivery: Date,
      successCount: { type: Number, default: 0 },
      failureCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

export const Webhook = model<WebhookDocument>('Webhook', webhookSchema);

// ─────────────────────────────────────────────────────────────────────────
// WEBHOOK DELIVERY LOG
// ─────────────────────────────────────────────────────────────────────────

interface DeliveryLogDocument extends Document {
  webhookId: string;
  eventType: string;
  payload: any;
  httpStatus?: number;
  response?: string;
  error?: string;
  attempts: number;
  nextRetry?: Date;
  delivered: boolean;
}

const deliveryLogSchema = new Schema<DeliveryLogDocument>(
  {
    webhookId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    payload: Schema.Types.Mixed,
    httpStatus: Number,
    response: String,
    error: String,
    attempts: { type: Number, default: 0 },
    nextRetry: Date,
    delivered: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const DeliveryLog = model<DeliveryLogDocument>('DeliveryLog', deliveryLogSchema);

// ─────────────────────────────────────────────────────────────────────────
// WEBHOOK MANAGER SERVICE
// ─────────────────────────────────────────────────────────────────────────

export class WebhookManager {
  /**
   * Register a new webhook
   */
  static async register(
    merchantId: string,
    url: string,
    events: string[],
    description?: string,
  ): Promise<WebhookDocument> {
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await Webhook.create({
      merchantId,
      url,
      events,
      secret,
      metadata: {
        description,
      },
    });

    logger.info('[WEBHOOK] Registered', {
      webhookId: webhook.id,
      merchantId,
      url,
      events,
    });

    return webhook;
  }

  /**
   * Update webhook configuration
   */
  static async update(webhookId: string, updates: Partial<WebhookDocument>): Promise<WebhookDocument | null> {
    const webhook = await Webhook.findOneAndUpdate({ id: webhookId }, updates, { new: true });

    if (webhook) {
      logger.info('[WEBHOOK] Updated', { webhookId });
      // Invalidate cache
      await redisService.del(`webhook:${webhookId}`);
    }

    return webhook;
  }

  /**
   * Delete a webhook
   */
  static async delete(webhookId: string): Promise<boolean> {
    const result = await Webhook.deleteOne({ id: webhookId });
    if (result.deletedCount > 0) {
      logger.info('[WEBHOOK] Deleted', { webhookId });
      await redisService.del(`webhook:${webhookId}`);
      return true;
    }
    return false;
  }

  /**
   * Deliver a webhook event
   */
  static async deliver(webhookId: string, eventType: string, payload: any): Promise<boolean> {
    const webhook = await Webhook.findOne({ id: webhookId });

    if (!webhook || !webhook.isActive) {
      logger.warn('[WEBHOOK] Webhook not found or inactive', { webhookId });
      return false;
    }

    if (!webhook.events.includes(eventType)) {
      logger.debug('[WEBHOOK] Event not subscribed', { webhookId, eventType });
      return false;
    }

    // Create delivery log
    const deliveryLog = await DeliveryLog.create({
      webhookId,
      eventType,
      payload,
      attempts: 0,
    });

    // Try delivery
    return this.attemptDelivery(webhook, deliveryLog);
  }

  /**
   * Attempt delivery with retry logic
   */
  private static async attemptDelivery(webhook: WebhookDocument, deliveryLog: DeliveryLogDocument): Promise<boolean> {
    try {
      const signature = this.generateSignature(deliveryLog.payload, webhook.secret);

      const response = await axios.post(webhook.url, deliveryLog.payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': deliveryLog.eventType,
          'X-Webhook-Delivery': deliveryLog.id,
        },
        timeout: 10000,
      });

      if (response.status >= 200 && response.status < 300) {
        // Success
        await DeliveryLog.updateOne(
          { _id: deliveryLog._id },
          {
            delivered: true,
            httpStatus: response.status,
            response: JSON.stringify(response.data),
            attempts: deliveryLog.attempts + 1,
          },
        );

        await Webhook.updateOne(
          { id: webhook.id },
          {
            $inc: { 'metadata.successCount': 1 },
            'metadata.lastDelivery': new Date(),
          },
        );

        logger.info('[WEBHOOK] Delivered successfully', {
          webhookId: webhook.id,
          eventType: deliveryLog.eventType,
          status: response.status,
        });

        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      logger.error('[WEBHOOK] Delivery failed', {
        webhookId: webhook.id,
        eventType: deliveryLog.eventType,
        attempt: deliveryLog.attempts + 1,
        error: error instanceof Error ? error.message : String(error),
      });

      // Schedule retry
      if (deliveryLog.attempts < webhook.retryPolicy.maxRetries) {
        const delayMs =
          webhook.retryPolicy.initialDelayMs * Math.pow(webhook.retryPolicy.backoffMultiplier, deliveryLog.attempts);

        const nextRetry = new Date(Date.now() + delayMs);

        await DeliveryLog.updateOne(
          { _id: deliveryLog._id },
          {
            attempts: deliveryLog.attempts + 1,
            nextRetry,
            error: error instanceof Error ? error.message : String(error),
          },
        );

        await Webhook.updateOne(
          { id: webhook.id },
          {
            $inc: { 'metadata.failureCount': 1 },
          },
        );

        logger.info('[WEBHOOK] Scheduled retry', {
          webhookId: webhook.id,
          nextRetry,
          delayMs,
        });

        // Queue retry job
        const jobQueue = (global as any).jobQueues?.webhook;
        if (jobQueue) {
          await jobQueue.add(
            {
              webhookId: webhook.id,
              eventType: deliveryLog.eventType,
              payload: deliveryLog.payload,
              deliveryLogId: deliveryLog.id,
            },
            { delay: delayMs, attempts: 1 },
          );
        }

        return false;
      }

      // Max retries exceeded
      await DeliveryLog.updateOne(
        { _id: deliveryLog._id },
        {
          error: 'Max retries exceeded',
          attempts: deliveryLog.attempts + 1,
        },
      );

      await Webhook.updateOne(
        { id: webhook.id },
        {
          $inc: { 'metadata.failureCount': 1 },
          isActive: false, // Disable failing webhook
        },
      );

      logger.error('[WEBHOOK] Max retries exceeded - webhook disabled', {
        webhookId: webhook.id,
      });

      return false;
    }
  }

  /**
   * Generate HMAC signature
   */
  private static generateSignature(payload: any, secret: string): string {
    const message = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }

  /**
   * Get webhook statistics
   */
  static async getStats(webhookId: string): Promise<any> {
    const webhook = await Webhook.findOne({ id: webhookId });
    if (!webhook) return null;

    const deliveries = await DeliveryLog.findOne({ webhookId }, {}, { sort: { createdAt: -1 } });

    return {
      webhookId,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      statistics: {
        successCount: webhook.metadata.successCount,
        failureCount: webhook.metadata.failureCount,
        successRate:
          webhook.metadata.successCount + webhook.metadata.failureCount === 0
            ? 0
            : (
                (webhook.metadata.successCount / (webhook.metadata.successCount + webhook.metadata.failureCount)) *
                100
              ).toFixed(2),
        lastDelivery: webhook.metadata.lastDelivery,
      },
    };
  }

  /**
   * List webhooks for merchant
   */
  static async listByMerchant(merchantId: string): Promise<WebhookDocument[]> {
    return Webhook.find({ merchantId }).select('-secret');
  }
}

export default WebhookManager;
