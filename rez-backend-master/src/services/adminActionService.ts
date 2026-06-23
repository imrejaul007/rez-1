import { AdminAction, AdminActionType, AdminActionStatus, IAdminAction } from '../models/AdminAction';
import { Wallet } from '../models/Wallet';
import { WalletConfig } from '../models/WalletConfig';
import { walletService } from './walletService';
import { logTransaction } from '../models/TransactionAuditLog';
import { createServiceLogger } from '../config/logger';
import { Types } from 'mongoose';

const logger = createServiceLogger('admin-action-service');

/**
 * Admin Action Service — Maker-Checker pattern for sensitive operations
 *
 * High-value wallet operations (above the configured threshold) are queued
 * as pending AdminAction records instead of executing immediately.
 * A different admin must approve before the operation runs.
 */
class AdminActionService {
  /**
   * Create a pending admin action requiring approval
   */
  async createAction(
    initiatorId: string,
    actionType: AdminActionType,
    payload: Record<string, any>,
    reason: string,
    threshold: number = 0,
  ) {
    const action = await AdminAction.create({
      actionType,
      initiatorId: new Types.ObjectId(initiatorId),
      status: 'pending_approval',
      payload,
      reason,
      threshold,
    });
    logger.info(`Admin action created: ${actionType} by ${initiatorId}, actionId=${action._id}`);
    return action;
  }

  /**
   * Approve and execute a pending action.
   * Approver must be different from initiator.
   * Uses atomic findOneAndUpdate to prevent race conditions.
   */
  async approveAction(approverId: string, actionId: string) {
    // Pre-check: self-approval guard (before atomic transition)
    const existing = await AdminAction.findById(actionId).lean();
    if (!existing) throw new Error('Action not found');
    if (existing.status !== 'pending_approval') {
      throw new Error(`Action is not pending approval (current status: ${existing.status})`);
    }
    if (existing.initiatorId.toString() === approverId) {
      throw new Error('Approver cannot be the same as initiator');
    }

    // Atomic status transition: pending_approval → approved
    const action = await AdminAction.findOneAndUpdate(
      { _id: actionId, status: 'pending_approval' },
      {
        approverId: new Types.ObjectId(approverId),
        status: 'approved',
      },
      { new: true },
    );

    if (!action) {
      throw new Error('Action was already processed by another admin');
    }

    // Execute the action
    try {
      await this.executeAction(action);
      action.status = 'executed';
      action.executedAt = new Date();
      await action.save();
      logger.info(`Admin action executed: ${action.actionType}, actionId=${actionId}, approvedBy=${approverId}`);
    } catch (execErr: any) {
      // Mark as failed so it doesn't stay in limbo
      action.failureReason = execErr.message || 'Execution failed';
      action.status = 'rejected';
      action.rejectionReason = `Execution failed: ${execErr.message}`;
      await action.save();
      logger.error(`Admin action execution failed: actionId=${actionId}`, execErr);
      throw new Error(`Action approved but execution failed: ${execErr.message}`);
    }

    return action;
  }

  /**
   * Reject a pending action
   */
  async rejectAction(approverId: string, actionId: string, rejectionReason: string) {
    const action = await AdminAction.findOneAndUpdate(
      { _id: actionId, status: 'pending_approval' },
      {
        approverId: new Types.ObjectId(approverId),
        status: 'rejected',
        rejectionReason,
      },
      { new: true },
    );

    if (!action) {
      const existing = await AdminAction.findById(actionId).lean();
      if (!existing) throw new Error('Action not found');
      throw new Error(`Action is not pending approval (current status: ${existing.status})`);
    }

    logger.info(`Admin action rejected: actionId=${actionId}, by=${approverId}`);
    return action;
  }

  /**
   * Get pending actions (paginated)
   */
  async getPendingActions(
    page: number = 1,
    limit: number = 20,
    actionType?: AdminActionType,
  ) {
    const query: any = { status: 'pending_approval' };
    if (actionType) query.actionType = actionType;

    const [actions, total] = await Promise.all([
      AdminAction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('initiatorId', 'fullName email phoneNumber')
        .lean(),
      AdminAction.countDocuments(query),
    ]);

    return {
      actions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get action history (paginated, filterable)
   */
  async getActionHistory(
    page: number = 1,
    limit: number = 20,
    filters?: { actionType?: AdminActionType; status?: AdminActionStatus },
  ) {
    const query: any = {};
    if (filters?.actionType) query.actionType = filters.actionType;
    if (filters?.status) query.status = filters.status;

    const [actions, total] = await Promise.all([
      AdminAction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('initiatorId', 'fullName email phoneNumber')
        .populate('approverId', 'fullName email phoneNumber')
        .lean(),
      AdminAction.countDocuments(query),
    ]);

    return {
      actions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get the approval threshold from WalletConfig
   */
  async getApprovalThreshold(): Promise<number> {
    try {
      const config = await (WalletConfig as any).getOrCreate();
      return config.fraudThresholds?.suspiciousAmountThreshold ?? 50000;
    } catch {
      return 50000; // Fallback default
    }
  }

  /**
   * Check if an operation requires maker-checker based on threshold
   */
  requiresApproval(amount: number, threshold: number): boolean {
    return threshold > 0 && amount >= threshold;
  }

  /**
   * Execute the wallet operation described by an approved AdminAction.
   * Called internally by approveAction after status transitions to 'approved'.
   */
  private async executeAction(action: IAdminAction): Promise<void> {
    const { actionType, payload, reason, initiatorId } = action;
    const adminId = initiatorId.toString();
    const actionIdStr = String(action._id);

    switch (actionType) {
      case 'manual_adjustment': {
        const { userId, amount, type } = payload;
        if (!userId || !amount || !type) throw new Error('Invalid payload: userId, amount, type required');

        if (type === 'credit') {
          await walletService.credit({
            userId,
            amount,
            source: 'admin',
            description: `Admin adjustment (approved): ${reason}`,
            operationType: 'admin_adjustment',
            referenceId: `admin-action:${actionIdStr}`,
            referenceModel: 'AdminAction',
            metadata: { adminUserId: adminId, reason, idempotencyKey: `admin-action:${actionIdStr}` },
          });
        } else {
          await walletService.debit({
            userId,
            amount,
            source: 'admin',
            description: `Admin adjustment (approved): ${reason}`,
            operationType: 'admin_adjustment',
            referenceId: `admin-action:${actionIdStr}`,
            referenceModel: 'AdminAction',
            metadata: { adminUserId: adminId, reason, idempotencyKey: `admin-action:${actionIdStr}` },
          });
        }

        // Audit log
        const wallet = await Wallet.findOne({ user: userId }).lean();
        logTransaction({
          userId: new Types.ObjectId(userId),
          walletId: wallet?._id as Types.ObjectId,
          walletType: 'user',
          operation: type === 'credit' ? 'credit' : 'debit',
          amount,
          balanceBefore: { total: 0, available: 0, pending: 0, cashback: 0 },
          balanceAfter: { total: wallet?.balance.total || 0, available: wallet?.balance.available || 0, pending: 0, cashback: 0 },
          reference: { type: 'adjustment', description: `Admin adjustment (approved): ${reason}` },
          metadata: { source: 'admin_action', adminUserId: adminId },
        });
        break;
      }

      case 'cashback_reversal': {
        const { userId, amount, originalTransactionId } = payload;
        if (!userId || !amount) throw new Error('Invalid payload: userId, amount required');

        if (originalTransactionId) {
          const { rewardEngine } = await import('../core/rewardEngine');
          await rewardEngine.reverseReward(originalTransactionId, reason, {
            partialAmount: amount,
          });
        } else {
          await walletService.debit({
            userId,
            amount,
            source: 'admin',
            description: `Cashback reversal (approved): ${reason}`,
            operationType: 'cashback_reversal',
            referenceId: `admin-action:${actionIdStr}`,
            referenceModel: 'AdminAction',
            metadata: { adminUserId: adminId, reason, idempotencyKey: `admin-action:${actionIdStr}` },
          });
        }

        const wallet = await Wallet.findOne({ user: userId }).lean();
        logTransaction({
          userId: new Types.ObjectId(userId),
          walletId: wallet?._id as Types.ObjectId,
          walletType: 'user',
          operation: 'debit',
          amount,
          balanceBefore: { total: 0, available: 0, pending: 0, cashback: 0 },
          balanceAfter: { total: wallet?.balance.total || 0, available: wallet?.balance.available || 0, pending: 0, cashback: 0 },
          reference: { type: 'adjustment', description: `Cashback reversal (approved): ${reason}` },
          metadata: { source: 'admin_action', adminUserId: adminId },
        });
        break;
      }

      case 'freeze_override': {
        const { userId, operation: freezeOp, freezeReason } = payload;
        if (!userId || !freezeOp) throw new Error('Invalid payload: userId, operation required');

        if (freezeOp === 'freeze') {
          const wallet = await Wallet.findOneAndUpdate(
            { user: userId },
            { isFrozen: true, frozenReason: freezeReason || reason, frozenAt: new Date() },
            { new: true },
          );
          if (!wallet) throw new Error('Wallet not found');

          logTransaction({
            userId: new Types.ObjectId(userId),
            walletId: wallet._id as Types.ObjectId,
            walletType: 'user',
            operation: 'adjustment',
            amount: 0,
            balanceBefore: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
            balanceAfter: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
            reference: { type: 'other', description: `Wallet FROZEN (approved): ${reason}` },
            metadata: { source: 'admin_action', adminUserId: adminId },
          });
        } else if (freezeOp === 'unfreeze') {
          const wallet = await Wallet.findOneAndUpdate(
            { user: userId },
            { isFrozen: false, frozenReason: null, frozenAt: null },
            { new: true },
          );
          if (!wallet) throw new Error('Wallet not found');

          logTransaction({
            userId: new Types.ObjectId(userId),
            walletId: wallet._id as Types.ObjectId,
            walletType: 'user',
            operation: 'adjustment',
            amount: 0,
            balanceBefore: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
            balanceAfter: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
            reference: { type: 'other', description: `Wallet UNFROZEN (approved): ${reason}` },
            metadata: { source: 'admin_action', adminUserId: adminId },
          });
        }
        break;
      }

      default:
        throw new Error(`Unsupported action type for execution: ${actionType}`);
    }
  }
}

export default new AdminActionService();
