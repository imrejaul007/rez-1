import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Order } from '../models/Order';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest,
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import referralService from '../services/referralService';
import { QueueService } from '../services/QueueService';
import challengeService from '../services/challengeService';
import userProductService from '../services/userProductService';
import activityService from '../services/activityService';
import gamificationEventBus from '../events/gamificationEventBus';
import { reputationService } from '../services/reputationService';
import { processConversion } from '../services/creatorService';
import { Wallet } from '../models/Wallet';
import { calculatePromoCoinsEarned, calculatePromoCoinsWithTierBonus } from '../config/promoCoins.config';
import SmartSpendItem from '../models/SmartSpendItem';
import { Subscription } from '../models/Subscription';
import { Store } from '../models/Store';
import { logger } from '../config/logger';
import merchantWalletService from '../services/merchantWalletService';
import orderSocketService from '../services/orderSocketService';
import merchantNotificationService from '../services/merchantNotificationService';
import { isValidTransition, isValidMerchantTransition, STATUS_TRANSITIONS, MERCHANT_TRANSITIONS, getOrderProgress } from '../config/orderStateMachine';
import { getStoreCategorySlug } from './orderCreateController';

// ─── updateOrderStatus ──────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/{orderId}/status:
 *   patch:
 *     summary: Update order status (admin/store owner only)
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [placed, confirmed, preparing, ready, dispatched, delivered, cancelled, returned, refunded]
 *               estimatedDeliveryTime:
 *                 type: string
 *                 format: date-time
 *               trackingInfo:
 *                 type: object
 *                 properties:
 *                   trackingNumber:
 *                     type: string
 *                   carrier:
 *                     type: string
 *                   estimatedDelivery:
 *                     type: string
 *                     format: date-time
 *                   location:
 *                     type: string
 *                   notes:
 *                     type: string
 *                     maxLength: 500
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid status transition
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, estimatedDeliveryTime, trackingInfo } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Validate status transition using centralized state machine
    if (order.status !== status && !isValidTransition(order.status, status)) {
      const allowed = STATUS_TRANSITIONS[order.status] || [];
      return sendBadRequest(
        res,
        `Invalid status transition from '${order.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`
      );
    }

    // For merchant-initiated updates, enforce stricter transitions
    const userRole = (req as any).userRole;
    if (userRole === 'merchant' || userRole === 'store_owner') {
      if (order.status !== status && !isValidMerchantTransition(order.status, status)) {
        const allowed = MERCHANT_TRANSITIONS[order.status] || [];
        return sendBadRequest(
          res,
          `Merchants can only transition from '${order.status}' to: ${allowed.join(', ') || 'none'}. Cannot skip states.`
        );
      }
    }

    // Update status
    order.status = status;

    // Update tracking info if provided
    if (trackingInfo) {
      order.tracking = {
        ...order.tracking,
        ...trackingInfo,
        lastUpdated: new Date()
      };
    }

    // Update estimated delivery time
    if (estimatedDeliveryTime) {
      order.estimatedDeliveryTime = new Date(estimatedDeliveryTime);
    }

    // Set delivery time if status is delivered
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name images')
      .populate('items.store', 'name')
      .populate('user', 'profile.firstName profile.lastName').lean();

    // Create activity for order delivery
    if (status === 'delivered' && populatedOrder) {
      const storeData = populatedOrder.items[0]?.store as any;
      const storeName = storeData?.name || 'Store';
      const userIdObj = typeof populatedOrder.user === 'object' ? (populatedOrder.user as any)._id : populatedOrder.user;
      await activityService.order.onOrderDelivered(
        userIdObj as Types.ObjectId,
        populatedOrder._id as Types.ObjectId,
        storeName
      );

      // Update challenge progress for order delivery (non-blocking)
      challengeService.updateProgress(
        String(userIdObj), 'order_count', 1,
        { orderId: String(populatedOrder._id) }
      ).catch(err => logger.error('[ORDER] Challenge progress update failed:', err));

      challengeService.updateProgress(
        String(userIdObj), 'spend_amount', populatedOrder.totals.total,
        { orderId: String(populatedOrder._id) }
      ).catch(err => logger.error('[ORDER] Challenge spend progress update failed:', err));

      // Auto-refresh UserLoyalty mission progress so it's current when user next visits (non-blocking)
      setImmediate(async () => {
        try {
          const UserLoyalty = (await import('../models/UserLoyalty')).default;
          const loyalty = await UserLoyalty.findOne({ userId: String(userIdObj) });
          if (loyalty) {
            const { computeMissionProgress } = await import('./loyaltyController');
            const progressMap = await computeMissionProgress(String(userIdObj), loyalty.streak?.current || 0);
            let changed = false;
            for (const mission of loyalty.missions) {
              const real = progressMap.get(mission.missionId);
              if (real !== undefined) {
                const capped = Math.min(real, mission.target);
                if (mission.progress !== capped) {
                  mission.progress = capped;
                  changed = true;
                }
              }
            }
            if (changed) {
              await loyalty.save();
              logger.info('[ORDER] UserLoyalty missions auto-refreshed on delivery', { userId: String(userIdObj) });
            }
          }
        } catch (err) {
          logger.error('[ORDER] UserLoyalty mission refresh failed (non-blocking):', err);
        }
      });

      // Process referral rewards when order is delivered
      try {
        // Check if this is referee's first order (process referral completion)
        await referralService.processFirstOrder({
          refereeId: userIdObj as Types.ObjectId,
          orderId: populatedOrder._id as Types.ObjectId,
          orderAmount: populatedOrder.totals.total,
        });

        // Check for milestone bonus (3rd order)
        const deliveredOrdersCount = await Order.countDocuments({
          user: userIdObj,
          status: 'delivered',
        });

        if (deliveredOrdersCount >= 3) {
          await referralService.processMilestoneBonus(
            userIdObj as Types.ObjectId,
            deliveredOrdersCount
          );
        }
      } catch (error) {
        logger.error('[ORDER] Error processing referral rewards:', error);
        // Don't fail the order update if referral processing fails
      }

      // Skip reward issuance if order has an active dispute hold
      if ((populatedOrder as any).disputeHold) {
        logger.warn('[ORDER] Skipping reward issuance — dispute hold active', {
          orderId: populatedOrder._id,
          orderNumber: populatedOrder.orderNumber,
        });
      } else {

      // Award purchase reward coins on delivery
      // Smart Spend items get enhanced rate; regular items get default 5%
      try {
        const coinService = require('../services/coinService');
        const defaultRate = 0.05;

        // Check if any order items came from Smart Spend
        const smartSpendItems = populatedOrder.items.filter((item: any) => item.smartSpendSource?.coinRewardRate);
        const regularItems = populatedOrder.items.filter((item: any) => !item.smartSpendSource?.coinRewardRate);

        // Award enhanced coins for Smart Spend items
        if (smartSpendItems.length > 0) {
          const smartSpendSubtotal = smartSpendItems.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
          const smartSpendRate = smartSpendItems[0]!.smartSpendSource!.coinRewardRate;
          let smartSpendCoins = smartSpendRate > 1
            ? Math.floor(smartSpendRate) // fixed amount
            : Math.floor(smartSpendSubtotal * smartSpendRate); // percentage

          // Apply max cap if stored
          if (smartSpendCoins > 0) {
            const firstItem = smartSpendItems[0];
            const rewardStoreId = firstItem?.store
              ? (typeof firstItem.store === 'object' ? (firstItem.store as any)._id : firstItem.store)
              : null;
            const rewardCategory = rewardStoreId ? await getStoreCategorySlug(rewardStoreId.toString()) : null;
            const ratePercent = Math.round(smartSpendRate * 100);

            await coinService.awardCoins(
              userIdObj.toString(),
              smartSpendCoins,
              'smart_spend_reward',
              `${ratePercent}% Smart Spend reward for order ${populatedOrder.orderNumber}`,
              { orderId: populatedOrder._id.toString(), smartSpendItemId: smartSpendItems[0]!.smartSpendSource!.smartSpendItemId, idempotencyKey: `smart_spend:${populatedOrder._id}` },
              rewardCategory
            );
            // Increment purchases count on SmartSpendItem
            try {
              await SmartSpendItem.findByIdAndUpdate(
                smartSpendItems[0]!.smartSpendSource!.smartSpendItemId,
                { $inc: { purchases: 1 } }
              );
            } catch (_) { /* non-critical */ }
          }
        }

        // Award default 5% for regular (non-Smart Spend) items
        const regularSubtotal = regularItems.length > 0
          ? regularItems.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0)
          : (smartSpendItems.length === 0 ? populatedOrder.totals.subtotal : 0);
        const regularCoins = Math.floor(regularSubtotal * defaultRate);

        if (regularCoins > 0) {
          const firstItem = regularItems[0] || populatedOrder.items[0];
          const rewardStoreId = firstItem?.store
            ? (typeof firstItem.store === 'object' ? (firstItem.store as any)._id : firstItem.store)
            : null;
          const rewardCategory = rewardStoreId ? await getStoreCategorySlug(rewardStoreId.toString()) : null;

          await coinService.awardCoins(
            userIdObj.toString(),
            regularCoins,
            'purchase_reward',
            `5% purchase reward for order ${populatedOrder.orderNumber}`,
            { orderId: populatedOrder._id.toString(), idempotencyKey: `purchase_reward:${populatedOrder._id}` },
            rewardCategory
          );
        }
      } catch (coinError) {
        logger.error('[ORDER] Failed to award purchase reward coins:', coinError);
      }

      // Auto-trigger matching bonus campaigns on order delivery
      try {
        const bonusCampaignService = require('../services/bonusCampaignService');
        const firstItemForBonus = populatedOrder.items[0];
        const bonusStoreId = firstItemForBonus?.store
          ? (typeof firstItemForBonus.store === 'object' ? (firstItemForBonus.store as any)._id : firstItemForBonus.store)
          : null;
        const bonusCategory = bonusStoreId ? await getStoreCategorySlug(bonusStoreId.toString()) : null;

        const orderIdStr = (populatedOrder as any)._id.toString();
        const baseClaimData = {
          transactionRef: { type: 'order' as const, refId: orderIdStr },
          transactionAmount: populatedOrder.totals.subtotal,
          paymentMethod: populatedOrder.payment?.method,
          category: bonusCategory || undefined,
          storeId: bonusStoreId?.toString(),
        };

        // All bonus campaign claims are independent — run in parallel
        const bonusPromises: Promise<any>[] = [
          bonusCampaignService.autoClaimForTransaction('cashback_boost', userIdObj.toString(), baseClaimData),
          bonusCampaignService.autoClaimForTransaction('first_transaction_bonus', userIdObj.toString(), baseClaimData),
          bonusCampaignService.autoClaimForTransaction('festival_offer', userIdObj.toString(), baseClaimData),
          bonusCampaignService.autoClaimForTransaction('bank_offer', userIdObj.toString(), baseClaimData),
        ];

        if (bonusCategory) {
          bonusPromises.push(
            bonusCampaignService.autoClaimForTransaction('category_multiplier', userIdObj.toString(), {
              ...baseClaimData,
              category: bonusCategory,
            })
          );
        }

        await Promise.all(bonusPromises);
      } catch (bonusErr) {
        logger.error('[ORDER] Bonus campaign auto-claim failed (non-blocking):', bonusErr);
      }

      } // end disputeHold else block

      // Credit merchant wallet on delivery (merchant gets subtotal minus 15% platform fee)
      try {
        const firstItem = populatedOrder.items[0];
        if (firstItem && firstItem.store) {
          const storeId = typeof firstItem.store === 'object'
            ? (firstItem.store as any)._id
            : firstItem.store;

          const store = await Store.findById(storeId).lean();

          if (store && store.merchantId) {
            const grossAmount = populatedOrder.totals.subtotal || 0;
            const platformFee = populatedOrder.totals.platformFee || 0;

            const walletResult = await merchantWalletService.creditOrderPayment(
              store.merchantId.toString(),
              populatedOrder._id as Types.ObjectId,
              populatedOrder.orderNumber,
              grossAmount,
              platformFee,
              storeId
            );

            // Emit real-time notification to merchant
            if (walletResult) {
              orderSocketService.emitMerchantWalletUpdated({
                merchantId: store.merchantId.toString(),
                storeId: storeId.toString(),
                storeName: store.name,
                transactionType: 'credit',
                amount: grossAmount - platformFee,
                orderId: (populatedOrder._id as Types.ObjectId).toString(),
                orderNumber: populatedOrder.orderNumber,
                newBalance: {
                  total: walletResult.balance?.total || 0,
                  available: walletResult.balance?.available || 0,
                  pending: walletResult.balance?.pending || 0
                },
                timestamp: new Date()
              });

              // Send in-app notification for payment received
              await merchantNotificationService.notifyPaymentReceived({
                merchantId: store.merchantId.toString(),
                orderId: (populatedOrder._id as Types.ObjectId).toString(),
                orderNumber: populatedOrder.orderNumber,
                amount: grossAmount - platformFee,
                paymentMethod: populatedOrder.payment?.method || 'online',
              });
            }
          }
        }
      } catch (walletError) {
        logger.error('[ORDER] Failed to credit merchant wallet:', walletError);
      }

      // Credit 5% admin commission to platform wallet on delivery (5% of subtotal)
      try {
        const adminWalletService = require('../services/adminWalletService').default;
        const subtotal = populatedOrder.totals.subtotal || 0;
        const adminCommission = Math.floor(subtotal * 0.05);
        if (adminCommission > 0) {
          await adminWalletService.creditOrderCommission(
            populatedOrder._id as Types.ObjectId,
            populatedOrder.orderNumber,
            subtotal
          );
        }
      } catch (adminError) {
        logger.error('[ORDER] Failed to credit admin wallet:', adminError);
      }

      // Run independent post-delivery tasks in parallel (cashback, user products, creator conversion)
      {
        const postDeliveryTasks: Promise<any>[] = [
          QueueService.enqueueCashback({
            orderId: (populatedOrder._id as Types.ObjectId).toString(),
            triggeredBy: 'order_delivery',
            idempotencyKey: `cashback:order:${populatedOrder._id}`,
          }).catch((err: any) => logger.error('[ORDER] Error enqueuing cashback:', err)),
          userProductService.createUserProductsFromOrder(populatedOrder._id as Types.ObjectId)
            .catch((err: any) => logger.error('[ORDER] Error creating user products:', err)),
        ];

        const attributionPickId = populatedOrder.analytics?.attributionPickId;
        if (attributionPickId) {
          postDeliveryTasks.push(
            processConversion(
              attributionPickId.toString(),
              (populatedOrder._id as Types.ObjectId).toString(),
              userIdObj.toString(),
              populatedOrder.totals.subtotal,
              req.ip
            ).catch((err: any) => logger.error('[ORDER] Error processing creator conversion:', err))
          );
        }

        await Promise.all(postDeliveryTasks);
      }

      // Award store promo coins for delivered order
      try {
        // Get user's subscription tier for bonus calculation
        let userTier = 'free';
        try {
          const subscription = await Subscription.findOne({
            user: userIdObj,
            status: 'active'
          }).select('tier').lean();
          if (subscription?.tier) {
            userTier = subscription.tier;
          }
        } catch (tierError) {
        }

        // Calculate promo coins with tier bonus
        const orderValue = populatedOrder.totals.total;
        const coinsToEarn = calculatePromoCoinsWithTierBonus(orderValue, userTier);
        const baseCoins = calculatePromoCoinsEarned(orderValue);
        const bonusCoins = coinsToEarn - baseCoins;

        if (coinsToEarn > 0) {
          // Get store info from first item (assuming single store per order)
          const firstItem = populatedOrder.items[0];
          const storeData = firstItem.store as any;
          const storeId = typeof storeData === 'object' ? storeData._id : storeData;
          const storeName = typeof storeData === 'object' ? storeData.name : 'Store';
          const storeLogo = typeof storeData === 'object' ? storeData.logo : undefined;

          if (storeId) {
            // Award branded coins (store-specific coins)
            const wallet = await Wallet.findOne({ user: userIdObj });
            if (wallet) {
              await wallet.addBrandedCoins(
                new Types.ObjectId(storeId.toString()),
                storeName,
                coinsToEarn,
                storeLogo
              );
            }
          } else {
          }
        } else {
        }
      } catch (error) {
        logger.error('[ORDER] Error awarding promo coins:', error);
        // Don't fail the order update if promo coin creation fails
      }

      // Emit gamification event for order delivery
      gamificationEventBus.emit('order_delivered', {
        userId: String(populatedOrder.user),
        entityId: String(populatedOrder._id),
        entityType: 'order',
        amount: populatedOrder.totals?.total,
        source: { controller: 'orderController', action: 'updateOrderStatus' }
      });

      // Recalculate Prive reputation on order delivery (fire-and-forget)
      reputationService.onOrderCompleted(userIdObj as Types.ObjectId)
        .catch(err => logger.error('[ORDER] Reputation recalculation failed:', err));

      // Update partner progress for order delivery
      try {
        const partnerService = require('../services/partnerService').default;
        const deliveredOrderId = populatedOrder._id as Types.ObjectId;
        await partnerService.updatePartnerProgress(
          userIdObj.toString(),
          deliveredOrderId.toString()
        );
      } catch (error) {
        logger.error('[ORDER] Error updating partner progress:', error);
        // Don't fail the order update if partner progress update fails
      }
    }

    sendSuccess(res, populatedOrder, 'Order status updated successfully');

  } catch (error) {
    throw new AppError('Failed to update order status', 500);
  }
});

// ─── rateOrder ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/{orderId}/rate:
 *   post:
 *     summary: Rate and review an order
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               review:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Order rated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error (invalid rating, already rated, etc.)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const rateOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;
  const { rating, review } = req.body;

  try {
    const order = await Order.findOne({
      _id: orderId,
      user: userId
    });

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    if (order.status !== 'delivered') {
      return sendBadRequest(res, 'Can only rate delivered orders');
    }

    if (order.rating) {
      return sendBadRequest(res, 'Order already rated');
    }

    // Update order with rating
    order.rating = {
      score: Number(rating),
      review,
      ratedAt: new Date()
    };

    await order.save();

    // Update partner review task progress
    try {
      const partnerService = require('../services/partnerService').default;
      const Partner = require('../models/Partner').default;

      const partner = await Partner.findOne({ userId }).lean();
      if (partner) {
        const reviewTask = partner.tasks.find((t: any) => t.type === 'review');
        if (reviewTask && reviewTask.progress.current < reviewTask.progress.target) {
          reviewTask.progress.current += 1;

          if (reviewTask.progress.current >= reviewTask.progress.target) {
            reviewTask.completed = true;
            reviewTask.completedAt = new Date();
          }

          await partner.save();
        }
      }
    } catch (error) {
      logger.error('[REVIEW] Error updating partner review task:', error);
      // Don't fail the review if partner update fails
    }

    sendSuccess(res, order, 'Order rated successfully');

  } catch (error) {
    throw new AppError('Failed to rate order', 500);
  }
});
