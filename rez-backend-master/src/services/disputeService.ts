import crypto from 'crypto';
import { Types } from 'mongoose';
import { Dispute, IDispute, DisputeStatus, DisputeTargetType, DisputeReason, DisputePriority, RESOLVABLE_STATUSES, DEFAULT_TIMEOUT_HOURS } from '../models/Dispute';
import { Order } from '../models/Order';
import { Store } from '../models/Store';
import { refundService } from './refundService';
import { NotificationService } from './notificationService';
import { escapeRegex } from '../utils/sanitize';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('dispute-service');

// ─── Types ──────────────────────────────────────────────────

export interface CreateDisputeParams {
  userId: string;
  targetType: DisputeTargetType;
  targetId: string;
  reason: DisputeReason;
  description: string;
  evidence?: { description: string; attachments: string[] };
}

export interface ResolveDisputeParams {
  disputeId: string;
  adminId: string;
  decision: 'refund' | 'reject' | 'partial_refund';
  amount?: number;
  reason: string;
}

export interface AdminDisputeFilters {
  status?: DisputeStatus;
  priority?: DisputePriority;
  assignedTo?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ─── Helpers ────────────────────────────────────────────────

function generateIdempotencyKey(userId: string, targetType: string, targetId: string): string {
  return crypto.createHash('sha256')
    .update(`dispute:${userId}:${targetType}:${targetId}`)
    .digest('hex');
}

// ─── Service ────────────────────────────────────────────────

class DisputeService {

  /**
   * User creates a dispute against an order (or other target).
   */
  async createDispute(params: CreateDisputeParams): Promise<IDispute> {
    const { userId, targetType, targetId, reason, description, evidence } = params;

    // 1. Validate target exists and belongs to user
    let amount = 0;
    let targetRef = '';
    let storeId: Types.ObjectId | undefined;
    let merchantId: Types.ObjectId | undefined;

    if (targetType === 'order') {
      const order = await Order.findOne({ _id: targetId, user: userId })
        .select('orderNumber totals store status disputeHold')
        .lean();

      if (!order) {
        throw new Error('Order not found or does not belong to you');
      }

      if ((order as any).disputeHold) {
        throw new Error('An active dispute already exists for this order');
      }

      const orderStatus = (order as any).status;
      if (!['delivered', 'confirmed', 'preparing', 'ready', 'dispatched'].includes(orderStatus)) {
        throw new Error(`Cannot dispute an order with status "${orderStatus}"`);
      }

      amount = (order as any).totals?.total || 0;
      targetRef = (order as any).orderNumber;
      storeId = (order as any).store;

      // Get merchant from store
      if (storeId) {
        const store = await Store.findById(storeId).select('merchantId').lean();
        if (store && (store as any).merchantId) {
          merchantId = (store as any).merchantId;
        }
      }
    } else {
      throw new Error(`Dispute target type "${targetType}" is not supported yet`);
    }

    // 2. Idempotency check
    const idempotencyKey = generateIdempotencyKey(userId, targetType, targetId);

    const existingDispute = await Dispute.findOne({
      idempotencyKey,
      status: { $in: ['open', 'under_review', 'escalated'] },
    }).lean();

    if (existingDispute) {
      throw new Error('An active dispute already exists for this target');
    }

    // 3. Lock reward issuance on order
    if (targetType === 'order') {
      const lockResult = await Order.findOneAndUpdate(
        { _id: targetId, disputeHold: { $ne: true } },
        { $set: { disputeHold: true } },
        { new: true }
      );

      if (!lockResult) {
        throw new Error('Failed to lock order — it may already have an active dispute');
      }
    }

    // 4. Create dispute
    const dispute = new Dispute({
      user: new Types.ObjectId(userId),
      targetType,
      targetId: new Types.ObjectId(targetId),
      targetRef,
      store: storeId,
      merchant: merchantId,
      reason,
      description,
      amount,
      currency: 'RC',
      status: 'open',
      rewardLocked: true,
      lockedRewardIds: [],
      idempotencyKey,
      autoResolveAt: new Date(Date.now() + DEFAULT_TIMEOUT_HOURS * 60 * 60 * 1000),
      autoResolveThreshold: 500,
      evidence: evidence ? [{
        submittedBy: new Types.ObjectId(userId),
        submitterType: 'user' as const,
        description: evidence.description,
        attachments: evidence.attachments.slice(0, 5),
        submittedAt: new Date(),
      }] : [],
      timeline: [{
        action: 'dispute_created',
        performedBy: new Types.ObjectId(userId),
        performerType: 'user' as const,
        details: `Dispute raised: ${reason}`,
        timestamp: new Date(),
      }],
    });

    await dispute.save();

    // 5. Notify admin (fire-and-forget)
    NotificationService.createNotification({
      userId: 'admin',
      title: 'New Dispute Raised',
      message: `Dispute ${dispute.disputeNumber} raised for ${targetRef} — ${amount} coins`,
      type: 'warning',
      category: 'system',
      priority: 'high',
      data: { metadata: { disputeId: (dispute._id as Types.ObjectId).toString(), disputeNumber: dispute.disputeNumber } },
    }).catch(err => logger.error('Failed to send admin notification for new dispute', err));

    // 6. Notify user confirmation (fire-and-forget)
    NotificationService.createNotification({
      userId,
      title: 'Dispute Submitted',
      message: `Your dispute ${dispute.disputeNumber} has been submitted and is under review.`,
      type: 'info',
      category: 'order',
      data: { metadata: { disputeId: (dispute._id as Types.ObjectId).toString(), disputeNumber: dispute.disputeNumber } },
    }).catch(err => logger.error('Failed to send user notification for dispute', err));

    // 7. Notify merchant (fire-and-forget)
    if (merchantId) {
      NotificationService.createNotification({
        userId: merchantId.toString(),
        title: 'Dispute Raised Against Order',
        message: `A dispute has been raised for order ${targetRef}. Please review and respond.`,
        type: 'warning',
        category: 'order',
        data: { metadata: { disputeId: (dispute._id as Types.ObjectId).toString(), disputeNumber: dispute.disputeNumber } },
      }).catch(err => logger.error('Failed to send merchant notification for dispute', err));
    }

    logger.info('Dispute created', {
      disputeId: (dispute._id as Types.ObjectId).toString(),
      disputeNumber: dispute.disputeNumber,
      userId,
      targetType,
      targetId,
      amount,
    });

    return dispute;
  }

  /**
   * Admin resolves a dispute (refund, reject, or partial refund).
   */
  async resolveDispute(params: ResolveDisputeParams): Promise<IDispute> {
    const { disputeId, adminId, decision, amount: partialAmount, reason } = params;

    // Atomic status transition
    const resolveStatus: DisputeStatus = decision === 'reject' ? 'resolved_reject' : 'resolved_refund';

    const dispute = await Dispute.findOneAndUpdate(
      {
        _id: disputeId,
        status: { $in: RESOLVABLE_STATUSES },
      },
      {
        $set: {
          status: resolveStatus,
          resolution: {
            decision,
            amount: decision === 'partial_refund' ? (partialAmount || 0) : (decision === 'refund' ? undefined : 0),
            reason,
            resolvedBy: new Types.ObjectId(adminId),
            resolvedAt: new Date(),
          },
        },
        $push: {
          timeline: {
            action: `resolved_${decision}`,
            performedBy: new Types.ObjectId(adminId),
            performerType: 'admin',
            details: reason,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!dispute) {
      throw new Error('Dispute not found or not in a resolvable state');
    }

    // Set resolution amount properly
    const refundAmount = decision === 'reject' ? 0
      : decision === 'partial_refund' ? (partialAmount || 0)
      : dispute.amount;

    if (dispute.resolution) {
      dispute.resolution.amount = refundAmount;
      await dispute.save();
    }

    // Process decision side effects
    if (decision === 'refund' || decision === 'partial_refund') {
      // Issue refund
      try {
        const result = await refundService.processRefund({
          userId: dispute.user.toString(),
          amount: refundAmount,
          reason: `Dispute ${dispute.disputeNumber}: ${reason}`,
          refundType: 'admin_manual',
          referenceId: (dispute._id as Types.ObjectId).toString(),
          referenceModel: 'Dispute',
          adminUserId: adminId,
        });

        // Store refund transaction ID
        if (result.reversalTransactionId && dispute.resolution) {
          dispute.resolution.refundTransactionId = result.reversalTransactionId;
          await dispute.save();
        }

        logger.info('Dispute refund processed', {
          disputeId, amount: refundAmount,
          transactionId: result.reversalTransactionId?.toString(),
        });
      } catch (err) {
        logger.error('Dispute refund failed', err as Error, { disputeId });
        throw new Error('Failed to process refund — please try again');
      }
    }

    // Unlock order dispute hold
    if (dispute.targetType === 'order') {
      await Order.findByIdAndUpdate(dispute.targetId, {
        $set: { disputeHold: false },
      });
    }

    // Notify user
    const userMessage = decision === 'reject'
      ? `Your dispute ${dispute.disputeNumber} has been reviewed and the decision is to maintain the original transaction.`
      : `Your dispute ${dispute.disputeNumber} has been resolved. ${refundAmount} coins have been refunded to your wallet.`;

    NotificationService.createNotification({
      userId: dispute.user.toString(),
      title: `Dispute ${decision === 'reject' ? 'Closed' : 'Resolved'}`,
      message: userMessage,
      type: decision === 'reject' ? 'info' : 'success',
      category: 'order',
      data: { metadata: { disputeId: (dispute._id as Types.ObjectId).toString(), decision, refundAmount } },
    }).catch(err => logger.error('Failed to send dispute resolution notification', err));

    // Notify merchant
    if (dispute.merchant) {
      NotificationService.createNotification({
        userId: dispute.merchant.toString(),
        title: `Dispute ${decision === 'reject' ? 'Closed' : 'Resolved'}`,
        message: `Dispute ${dispute.disputeNumber} for order ${dispute.targetRef} has been ${decision === 'reject' ? 'rejected' : 'resolved with refund'}.`,
        type: 'info',
        category: 'order',
        data: { metadata: { disputeId: (dispute._id as Types.ObjectId).toString(), decision } },
      }).catch(err => logger.error('Failed to send merchant dispute resolution notification', err));
    }

    logger.info('Dispute resolved', { disputeId, decision, refundAmount, adminId });

    return dispute;
  }

  /**
   * Admin assigns a dispute to themselves.
   */
  async assignDispute(disputeId: string, adminId: string): Promise<IDispute> {
    const dispute = await Dispute.findOneAndUpdate(
      {
        _id: disputeId,
        status: { $in: ['open', 'under_review', 'escalated'] },
      },
      {
        $set: {
          status: 'under_review',
          assignedTo: new Types.ObjectId(adminId),
        },
        $push: {
          timeline: {
            action: 'assigned',
            performedBy: new Types.ObjectId(adminId),
            performerType: 'admin',
            details: 'Dispute assigned for review',
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!dispute) {
      throw new Error('Dispute not found or not assignable');
    }

    logger.info('Dispute assigned', { disputeId, adminId });
    return dispute;
  }

  /**
   * Admin escalates a dispute.
   */
  async escalateDispute(disputeId: string, adminId: string, reason: string): Promise<IDispute> {
    const dispute = await Dispute.findOneAndUpdate(
      {
        _id: disputeId,
        status: { $in: ['open', 'under_review'] },
      },
      {
        $set: {
          status: 'escalated',
          escalatedTo: new Types.ObjectId(adminId),
          escalationReason: reason,
          // Extend timeout by 48h on escalation
          autoResolveAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
        $push: {
          timeline: {
            action: 'escalated',
            performedBy: new Types.ObjectId(adminId),
            performerType: 'admin',
            details: reason,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!dispute) {
      throw new Error('Dispute not found or not escalatable');
    }

    logger.info('Dispute escalated', { disputeId, adminId, reason });
    return dispute;
  }

  /**
   * Merchant submits a response to a dispute.
   */
  async submitMerchantResponse(params: {
    disputeId: string;
    merchantId: string;
    response: string;
    attachments?: string[];
  }): Promise<IDispute> {
    const { disputeId, merchantId, response, attachments = [] } = params;

    // Validate merchant owns the store
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) throw new Error('Dispute not found');
    if (!dispute.merchant || dispute.merchant.toString() !== merchantId) {
      throw new Error('You are not authorized to respond to this dispute');
    }
    if (!RESOLVABLE_STATUSES.includes(dispute.status)) {
      throw new Error('Dispute is no longer open for responses');
    }

    dispute.merchantResponse = {
      response,
      attachments: attachments.slice(0, 5),
      respondedAt: new Date(),
    };

    dispute.timeline.push({
      action: 'merchant_responded',
      performedBy: new Types.ObjectId(merchantId),
      performerType: 'merchant',
      details: 'Merchant submitted a response',
      timestamp: new Date(),
    });

    await dispute.save();

    logger.info('Merchant response submitted', { disputeId, merchantId });
    return dispute;
  }

  /**
   * User adds additional evidence.
   */
  async addUserEvidence(params: {
    disputeId: string;
    userId: string;
    description: string;
    attachments: string[];
  }): Promise<IDispute> {
    const { disputeId, userId, description, attachments } = params;

    const dispute = await Dispute.findOne({
      _id: disputeId,
      user: userId,
      status: { $in: RESOLVABLE_STATUSES },
    });

    if (!dispute) {
      throw new Error('Dispute not found, not yours, or no longer open');
    }

    if (dispute.evidence.length >= 5) {
      throw new Error('Maximum of 5 evidence submissions allowed');
    }

    dispute.evidence.push({
      submittedBy: new Types.ObjectId(userId),
      submitterType: 'user',
      description,
      attachments: attachments.slice(0, 5),
      submittedAt: new Date(),
    });

    dispute.timeline.push({
      action: 'evidence_added',
      performedBy: new Types.ObjectId(userId),
      performerType: 'user',
      details: 'User added additional evidence',
      timestamp: new Date(),
    });

    await dispute.save();

    logger.info('User evidence added', { disputeId, userId });
    return dispute;
  }

  /**
   * Auto-resolve timed out disputes (called by cron job).
   */
  async processTimedOutDisputes(batchSize: number = 50): Promise<{
    processed: number;
    autoRefunded: number;
    autoEscalated: number;
    errors: number;
  }> {
    const now = new Date();
    let autoRefunded = 0;
    let autoEscalated = 0;
    let errors = 0;

    // Find disputes past their timeout
    const timedOut = await Dispute.find({
      status: { $in: ['open', 'under_review'] },
      autoResolveAt: { $lte: now },
    })
      .sort({ autoResolveAt: 1 })
      .limit(batchSize)
      .lean();

    for (const d of timedOut) {
      try {
        const dispute = d as any;
        if (dispute.amount <= dispute.autoResolveThreshold) {
          // Auto-refund for small amounts
          await this.resolveDispute({
            disputeId: dispute._id.toString(),
            adminId: 'system',
            decision: 'refund',
            reason: `Auto-resolved after ${DEFAULT_TIMEOUT_HOURS}h timeout — amount within auto-resolve threshold`,
          });

          // Mark as auto_resolved (override the resolved_refund from resolveDispute)
          await Dispute.findByIdAndUpdate(dispute._id, {
            $set: { status: 'auto_resolved' },
            $push: {
              timeline: {
                action: 'auto_resolved',
                performerType: 'system',
                details: 'Automatically resolved due to timeout',
                timestamp: new Date(),
              },
            },
          });

          autoRefunded++;
        } else {
          // Escalate for large amounts
          const escalateResult = await Dispute.findOneAndUpdate(
            { _id: dispute._id, status: { $in: ['open', 'under_review'] } },
            {
              $set: {
                status: 'escalated',
                escalationReason: 'Auto-escalated: amount exceeds auto-resolve threshold',
                autoResolveAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
              },
              $push: {
                timeline: {
                  action: 'auto_escalated',
                  performerType: 'system',
                  details: `Auto-escalated: amount (${dispute.amount}) exceeds threshold (${dispute.autoResolveThreshold})`,
                  timestamp: new Date(),
                },
              },
            },
            { new: true }
          );

          if (escalateResult) {
            autoEscalated++;

            // Notify admin about escalation
            NotificationService.createNotification({
              userId: 'admin',
              title: 'Dispute Auto-Escalated',
              message: `Dispute ${dispute.disputeNumber} (${dispute.amount} coins) auto-escalated after timeout.`,
              type: 'warning',
              category: 'system',
              priority: 'urgent',
              data: { metadata: { disputeId: dispute._id.toString() } },
            }).catch(err => logger.error('Failed to send escalation notification', err));
          }
        }
      } catch (err) {
        errors++;
        logger.error('Error processing timed-out dispute', err as Error, {
          disputeId: (d as any)._id,
        });
      }
    }

    const processed = timedOut.length;
    logger.info('Dispute timeout processing complete', { processed, autoRefunded, autoEscalated, errors });

    return { processed, autoRefunded, autoEscalated, errors };
  }

  /**
   * Get dispute stats for admin dashboard.
   */
  async getDisputeStats(): Promise<{
    open: number;
    underReview: number;
    escalated: number;
    resolvedToday: number;
    avgResolutionHours: number;
    totalDisputed: number;
    refundRate: number;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [statusCounts, resolvedToday, resolutionTimes] = await Promise.all([
      Dispute.aggregate([
        { $match: { status: { $in: ['open', 'under_review', 'escalated'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Dispute.countDocuments({
        status: { $in: ['resolved_refund', 'resolved_reject', 'auto_resolved'] },
        'resolution.resolvedAt': { $gte: todayStart },
      }),
      Dispute.aggregate([
        {
          $match: {
            status: { $in: ['resolved_refund', 'resolved_reject', 'auto_resolved'] },
            'resolution.resolvedAt': { $exists: true },
          },
        },
        {
          $project: {
            resolutionMs: {
              $subtract: ['$resolution.resolvedAt', '$createdAt'],
            },
            isRefund: { $in: ['$status', ['resolved_refund', 'auto_resolved']] },
          },
        },
        {
          $group: {
            _id: null,
            avgMs: { $avg: '$resolutionMs' },
            total: { $sum: 1 },
            refunds: { $sum: { $cond: ['$isRefund', 1, 0] } },
          },
        },
      ]),
    ]);

    const statusMap = statusCounts.reduce((m: any, s: any) => {
      m[s._id] = s.count;
      return m;
    }, {});

    const stats = resolutionTimes[0] || { avgMs: 0, total: 0, refunds: 0 };

    return {
      open: statusMap['open'] || 0,
      underReview: statusMap['under_review'] || 0,
      escalated: statusMap['escalated'] || 0,
      resolvedToday,
      avgResolutionHours: stats.avgMs ? Math.round(stats.avgMs / (1000 * 60 * 60) * 10) / 10 : 0,
      totalDisputed: stats.total,
      refundRate: stats.total > 0 ? Math.round((stats.refunds / stats.total) * 100) : 0,
    };
  }

  /**
   * Get user's disputes (paginated).
   */
  async getUserDisputes(userId: string, page: number = 1, limit: number = 20): Promise<{
    disputes: IDispute[];
    pagination: PaginationMeta;
  }> {
    const skip = (page - 1) * limit;

    const [disputes, total] = await Promise.all([
      Dispute.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Dispute.countDocuments({ user: userId }),
    ]);

    return {
      disputes: disputes as unknown as IDispute[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get all disputes for admin (paginated, filtered).
   */
  async getAdminDisputes(filters: AdminDisputeFilters, page: number = 1, limit: number = 20): Promise<{
    disputes: IDispute[];
    pagination: PaginationMeta;
  }> {
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) query.assignedTo = new Types.ObjectId(filters.assignedTo);
    if (filters.search) {
      const escaped = escapeRegex(filters.search);
      query.$or = [
        { disputeNumber: { $regex: escaped, $options: 'i' } },
        { targetRef: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
    }

    const skip = (page - 1) * limit;

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .populate('user', 'fullName phoneNumber profile.firstName profile.lastName')
        .populate('assignedTo', 'name email')
        .populate('store', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Dispute.countDocuments(query),
    ]);

    return {
      disputes: disputes as unknown as IDispute[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get single dispute detail.
   */
  async getDisputeById(disputeId: string): Promise<IDispute | null> {
    return Dispute.findById(disputeId)
      .populate('user', 'fullName phoneNumber profile.firstName profile.lastName')
      .populate('assignedTo', 'name email')
      .populate('escalatedTo', 'name email')
      .populate('store', 'name logo')
      .lean() as Promise<IDispute | null>;
  }

  /**
   * Add an internal admin note to the dispute timeline.
   */
  async addAdminNote(disputeId: string, adminId: string, note: string): Promise<IDispute> {
    const dispute = await Dispute.findByIdAndUpdate(
      disputeId,
      {
        $push: {
          timeline: {
            action: 'admin_note',
            performedBy: new Types.ObjectId(adminId),
            performerType: 'admin',
            details: note,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!dispute) throw new Error('Dispute not found');
    return dispute;
  }
}

export const disputeService = new DisputeService();
export default disputeService;
