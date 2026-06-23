import { logger } from '../config/logger';
import { MerchantEvent, MerchantEventType } from './merchantEventBus';

/**
 * Merchant Event Subscribers — durable handlers for BullMQ events.
 *
 * These handlers run inside the BullMQ worker (merchantEventWorker.ts).
 * They are the "write side" — update DB, issue rewards, sync aggregators, etc.
 *
 * Each handler must be:
 *   - Idempotent (BullMQ may retry on failure)
 *   - Transactional where possible
 *   - Fast enough to not starve the queue (slow ops use child queues)
 *
 * v3 Architecture: Part 1.3 — handler registry for merchantEventWorker
 */

type EventHandler = (event: MerchantEvent) => Promise<void>;

export function registerMerchantEventSubscribers(): Partial<Record<MerchantEventType, EventHandler>> {
  return {
    // ── Financial events ────────────────────────────────────────────────────

    ORDER_PAID: async (event) => {
      logger.info('[MerchantEvent] ORDER_PAID', {
        merchantId: event.merchantId,
        orderId: event.payload.orderId,
        amount: event.payload.amount,
      });

      // Phase 6: Wire reward engine for order-paid events
      try {
        const { merchantRewardService } = await import('../merchantservices/merchantRewardService');
        if (event.payload.userId && event.payload.storeId && event.payload.amount) {
          await merchantRewardService.processReward({
            merchantId: event.merchantId,
            userId: event.payload.userId,
            storeId: event.payload.storeId,
            sessionId: `order:${event.payload.orderId}`,
            amount: event.payload.amount,
            eventType: 'payment',
          });
        }
      } catch (err: any) {
        logger.error('[MerchantEvent] ORDER_PAID reward processing failed', {
          orderId: event.payload.orderId,
          error: err.message,
        });
        // CS-CRIT-08 FIX: Rethrow so BullMQ retries with backoff. Without this,
        // the handler returns normally and BullMQ marks the job complete — user gets 0 coins.
        throw err;
      }

      // Refresh customer snapshot for merchant CRM
      try {
        const { MerchantCustomerSnapshot } = await import('../models/MerchantCustomerSnapshot');
        if (event.payload.userId && MerchantCustomerSnapshot) {
          await (MerchantCustomerSnapshot as any).updateOne(
            { merchantId: event.merchantId, userId: event.payload.userId },
            {
              $inc: { totalOrders: 1, totalSpent: event.payload.amount || 0 },
              $set: { lastOrderAt: new Date(), isRecent: true },
            },
            { upsert: true },
          );
        }
      } catch (err: any) {
        logger.error('[MerchantEvent] ORDER_PAID snapshot update failed', { error: err.message });
      }
    },

    TABLE_PAID: async (event) => {
      logger.info('[MerchantEvent] TABLE_PAID', {
        merchantId: event.merchantId,
        sessionId: event.payload.sessionId,
      });

      // Phase 6: Wire reward engine for table payment events
      try {
        const { merchantRewardService } = await import('../merchantservices/merchantRewardService');
        if (event.payload.userId && event.payload.storeId && event.payload.amount) {
          await merchantRewardService.processReward({
            merchantId: event.merchantId,
            userId: event.payload.userId,
            storeId: event.payload.storeId,
            sessionId: `table:${event.payload.sessionId}`,
            amount: event.payload.amount,
            eventType: 'table_pay',
          });
        }
      } catch (err: any) {
        logger.error('[MerchantEvent] TABLE_PAID reward processing failed', {
          sessionId: event.payload.sessionId,
          error: err.message,
        });
        // CS-CRIT-09 FIX: Rethrow so BullMQ retries. Users lose coins silently otherwise.
        throw err;
      }
    },

    APPOINTMENT_COMPLETED: async (event) => {
      logger.info('[MerchantEvent] APPOINTMENT_COMPLETED', {
        merchantId: event.merchantId,
        appointmentId: event.payload.appointmentId,
      });

      // Phase 6: Wire reward engine for appointment completion
      try {
        const { merchantRewardService } = await import('../merchantservices/merchantRewardService');
        if (event.payload.userId && event.payload.storeId) {
          await merchantRewardService.processReward({
            merchantId: event.merchantId,
            userId: event.payload.userId,
            storeId: event.payload.storeId,
            sessionId: `appointment:${event.payload.appointmentId}`,
            amount: event.payload.amount || 0,
            eventType: 'appointment',
          });
        }
      } catch (err: any) {
        logger.error('[MerchantEvent] APPOINTMENT_COMPLETED reward failed', { error: err.message });
        // CS-CRIT-09 FIX: Rethrow so BullMQ retries. Users lose coins silently otherwise.
        throw err;
      }
    },

    PURCHASE_ORDER_RECEIVED: async (event) => {
      logger.info('[MerchantEvent] PURCHASE_ORDER_RECEIVED', {
        merchantId: event.merchantId,
        poId: event.payload.purchaseOrderId,
      });
      // Triggers: IngredientCostVersion versioning, food cost snapshot staleness mark
      const { recordCostChange } = await import('../models/IngredientCostVersion');
      const { default: Ingredient } = await import('../models/Ingredient').catch(() => ({ default: null }));
      const MerchantFoodCostSnapshot = await import('../models/MerchantFoodCostSnapshot').catch(() => null);

      for (const item of event.payload.items || []) {
        try {
          // 1. Create new ingredient cost version
          await recordCostChange({
            ingredientId: item.ingredientId,
            merchantId: event.merchantId,
            newCost: item.unitCost,
            unit: item.unit || 'unit',
            source: 'purchase_order',
            purchaseOrderId: event.payload.purchaseOrderId,
            createdBy: 'system',
          });

          // 2. Update Ingredient.currentCost for POS display
          if (Ingredient) {
            await (Ingredient as any).findByIdAndUpdate(item.ingredientId, {
              currentCost: item.unitCost,
              lastPurchasePrice: item.unitCost,
            });
          }

          // 3. Mark food cost snapshots as stale
          if (MerchantFoodCostSnapshot) {
            await (MerchantFoodCostSnapshot as any).default?.updateMany?.(
              { 'ingredients.ingredientId': item.ingredientId },
              { isStale: true },
            );
          }
        } catch (err) {
          logger.error('[MerchantEvent] PURCHASE_ORDER_RECEIVED item processing failed', {
            ingredientId: item.ingredientId,
            err,
          });
        }
      }
    },

    // ── Inventory events ────────────────────────────────────────────────────

    ITEM_EIGHTY_SIXED: async (event) => {
      logger.info('[MerchantEvent] ITEM_EIGHTY_SIXED', {
        merchantId: event.merchantId,
        productId: event.payload.productId,
      });
      // Triggers: aggregator push (mark unavailable on Swiggy/Zomato), inventory alert
    },

    INGREDIENT_COST_UPDATED: async (event) => {
      logger.info('[MerchantEvent] INGREDIENT_COST_UPDATED', {
        merchantId: event.merchantId,
        ingredientId: event.payload.ingredientId,
      });
      // Triggers: food cost snapshot staleness
    },

    // ── Campaign events ─────────────────────────────────────────────────────

    CAMPAIGN_FIRED: async (event) => {
      logger.info('[MerchantEvent] CAMPAIGN_FIRED', {
        merchantId: event.merchantId,
        campaignId: event.payload.campaignId,
      });
      // Triggers: campaign metrics update, ROI tracking start
    },

    BROADCAST_SENT: async (event) => {
      logger.info('[MerchantEvent] BROADCAST_SENT', {
        merchantId: event.merchantId,
        campaignId: event.payload.campaignId,
        channel: event.payload.channel,
        recipientCount: event.payload.recipientCount,
      });
      // Triggers: campaign delivery tracking, analytics update
    },
  };
}

export default registerMerchantEventSubscribers;
