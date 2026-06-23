import { logger } from '../config/logger';
import { Types } from 'mongoose';
import { SubscriptionAuditLog, SubscriptionAuditAction } from '../models/SubscriptionAuditLog';

interface LogChangeParams {
  subscriptionId?: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  action: SubscriptionAuditAction;
  previousState?: {
    tier?: string;
    status?: string;
    price?: number;
    billingCycle?: string;
  };
  newState?: {
    tier?: string;
    status?: string;
    price?: number;
    billingCycle?: string;
  };
  metadata?: {
    paymentId?: string;
    upgradeId?: string;
    proratedAmount?: number;
    promoCode?: string;
    adminUserId?: string;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    description?: string;
  };
}

class SubscriptionAuditService {
  /**
   * Log a subscription change. Fire-and-forget - never blocks the main flow.
   */
  async logChange(params: LogChangeParams): Promise<void> {
    try {
      await SubscriptionAuditLog.create({
        subscriptionId: params.subscriptionId
          ? new Types.ObjectId(params.subscriptionId.toString())
          : undefined,
        userId: new Types.ObjectId(params.userId.toString()),
        action: params.action,
        previousState: params.previousState,
        newState: params.newState,
        metadata: params.metadata,
      });
    } catch (error) {
      // Audit logging should never crash the main flow
      logger.error('[SUBSCRIPTION_AUDIT] Failed to log change:', error);
    }
  }

  /**
   * Get audit history for a user's subscription
   */
  async getUserAuditHistory(
    userId: string,
    options: { page?: number; limit?: number; action?: SubscriptionAuditAction } = {}
  ) {
    const { page = 1, limit = 20, action } = options;
    const filter: Record<string, any> = { userId: new Types.ObjectId(userId) };
    if (action) filter.action = action;

    const [logs, total] = await Promise.all([
      SubscriptionAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      SubscriptionAuditLog.countDocuments(filter),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get audit history for a specific subscription
   */
  async getSubscriptionAuditHistory(subscriptionId: string, limit = 50) {
    return SubscriptionAuditLog.find({
      subscriptionId: new Types.ObjectId(subscriptionId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }
}

const subscriptionAuditService = new SubscriptionAuditService();
export default subscriptionAuditService;
