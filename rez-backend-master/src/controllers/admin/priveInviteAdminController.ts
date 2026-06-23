/**
 * Admin Privé Invite Controller
 *
 * Admin endpoints for managing Privé access, invite codes, and configuration.
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';
import PriveAccess from '../../models/PriveAccess';
import PriveInviteCode from '../../models/PriveInviteCode';
import { User } from '../../models/User';
import { WalletConfig } from '../../models/WalletConfig';
import { CoinTransaction } from '../../models/CoinTransaction';
import priveAccessService from '../../services/priveAccessService';
import { sendSuccess, sendError, sendBadRequest, sendNotFound, sendPaginated } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { privilegeResolutionService } from '../../services/entitlement/privilegeResolutionService';

/**
 * GET /api/admin/prive/access
 * List all Privé access records (paginated, filterable)
 */
export const getAccessList = asyncHandler(async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const grantMethod = req.query.grantMethod as string;
    const search = req.query.search as string;

    const query: any = {};
    if (status) query.status = status;
    if (grantMethod) query.grantMethod = grantMethod;

    // Search by user phone/email
    if (search) {
      const escaped = escapeRegex(String(search).substring(0, 200));
      const users = await User.find({
        $or: [
          { phoneNumber: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } },
          { 'profile.firstName': { $regex: escaped, $options: 'i' } },
          { 'profile.lastName': { $regex: escaped, $options: 'i' } },
        ],
      }).select('_id').limit(50).lean();
      query.userId = { $in: users.map(u => u._id) };
    }

    const [records, total] = await Promise.all([
      PriveAccess.find(query)
        .populate('userId', 'profile.firstName profile.lastName email phoneNumber')
        .populate('invitedBy', 'profile.firstName profile.lastName')
        .populate('whitelistedBy', 'profile.firstName profile.lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PriveAccess.countDocuments(query),
    ]);

    return sendPaginated(res, records, page, limit, total);
  } catch (error: any) {
    logger.error('[AdminPriveInvite] Error getting access list:', error);
    return sendError(res, 'Failed to load access list');
  }
});

/**
 * POST /api/admin/prive/access/grant
 * Grant Privé access to a user (whitelist)
 */
export const grantAccess = asyncHandler(async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return sendError(res, 'Authentication required', 401);

    const { userId, phoneNumber, email, reason, isWhitelisted, tierOverride } = req.body;

    // Find user by ID, phone, or email
    let targetUser;
    if (userId) {
      targetUser = await User.findById(userId).lean();
    } else if (phoneNumber) {
      targetUser = await User.findOne({ phoneNumber }).lean();
    } else if (email) {
      targetUser = await User.findOne({ email }).lean();
    }

    if (!targetUser) {
      return sendNotFound(res, 'User not found');
    }

    if (!reason) {
      return sendBadRequest(res, 'Reason is required for audit trail');
    }

    const access = await priveAccessService.adminWhitelist(
      targetUser._id as Types.ObjectId,
      new Types.ObjectId(adminId),
      reason,
      tierOverride
    );

    // If not explicitly whitelisted, just grant access without permanent immunity
    if (isWhitelisted === false && access.isWhitelisted) {
      access.isWhitelisted = false;
      access.grantMethod = 'auto_qualify';
      await access.save();
    }

    privilegeResolutionService.invalidate(targetUser._id.toString()).catch((err) => logger.error('[AdminPriveInvite] Privilege cache invalidation failed after granting access', { error: err.message, userId: targetUser._id }));
    return sendSuccess(res, { access }, 'Privé access granted successfully');
  } catch (error: any) {
    logger.error('[AdminPriveInvite] Error granting access:', error);
    return sendBadRequest(res, error.message || 'Failed to grant access');
  }
});

/**
 * POST /api/admin/prive/access/revoke
 * Revoke a user's Privé access
 */
export const revokeAccess = asyncHandler(async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return sendError(res, 'Authentication required', 401);

    const { userId, reason, action } = req.body;

    if (!userId || !reason) {
      return sendBadRequest(res, 'userId and reason are required');
    }

    const targetUserId = new Types.ObjectId(userId);
    const adminObjId = new Types.ObjectId(adminId);

    if (action === 'suspend') {
      await priveAccessService.adminSuspendAccess(targetUserId, adminObjId, reason);
      privilegeResolutionService.invalidate(userId).catch((err) => logger.error('[AdminPriveInvite] Privilege cache invalidation failed after suspending access', { error: err.message, userId }));
      return sendSuccess(res, null, 'Privé access suspended');
    } else if (action === 'remove_whitelist') {
      await priveAccessService.removeWhitelist(targetUserId, adminObjId, reason);
      privilegeResolutionService.invalidate(userId).catch((err) => logger.error('[AdminPriveInvite] Privilege cache invalidation failed after whitelist removal', { error: err.message, userId }));
      return sendSuccess(res, null, 'Whitelist removed');
    } else {
      await priveAccessService.adminRevokeAccess(targetUserId, adminObjId, reason);
      privilegeResolutionService.invalidate(userId).catch((err) => logger.error('[AdminPriveInvite] Privilege cache invalidation failed after revoking access', { error: err.message, userId }));
      return sendSuccess(res, null, 'Privé access revoked');
    }
  } catch (error: any) {
    logger.error('[AdminPriveInvite] Error revoking access:', error);
    return sendBadRequest(res, error.message || 'Failed to revoke access');
  }
});

/**
 * GET /api/admin/prive/invite-codes
 * List all invite codes (filterable)
 */
export const getInviteCodes = asyncHandler(async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const isActive = req.query.isActive;

    const query: any = {};
    if (isActive === 'true') query.isActive = true;
    else if (isActive === 'false') query.isActive = false;

    const [codes, total] = await Promise.all([
      PriveInviteCode.find(query)
        .populate('creatorId', 'profile.firstName profile.lastName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PriveInviteCode.countDocuments(query),
    ]);

    return sendPaginated(res, codes, page, limit, total);
  } catch (error: any) {
    logger.error('[AdminPriveInvite] Error getting codes:', error);
    return sendError(res, 'Failed to load invite codes');
  }
});

/**
 * PATCH /api/admin/prive/invite-codes/:id/deactivate
 * Deactivate an invite code
 */
export const deactivateCode = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const code = await PriveInviteCode.findById(id);
    if (!code) {
      return sendNotFound(res, 'Invite code not found');
    }

    code.isActive = false;
    code.deactivatedAt = new Date();
    code.deactivationReason = reason || 'Admin deactivated';
    await code.save();

    return sendSuccess(res, { code }, 'Invite code deactivated');
  } catch (error: any) {
    logger.error('[AdminPriveInvite] Error deactivating code:', error);
    return sendError(res, 'Failed to deactivate code');
  }
});

/**
 * GET /api/admin/prive/invite-analytics
 * Get invite system analytics
 */
export const getInviteAnalytics = asyncHandler(async (req: Request, res: Response) => {
  try {
    const [
      totalAccess,
      activeAccess,
      suspendedAccess,
      revokedAccess,
      whitelistedCount,
      inviteGranted,
      adminGranted,
      totalCodes,
      activeCodes,
      totalRewards,
    ] = await Promise.all([
      PriveAccess.countDocuments(),
      PriveAccess.countDocuments({ status: 'active' }),
      PriveAccess.countDocuments({ status: 'suspended' }),
      PriveAccess.countDocuments({ status: 'revoked' }),
      PriveAccess.countDocuments({ isWhitelisted: true }),
      PriveAccess.countDocuments({ grantMethod: 'invite' }),
      PriveAccess.countDocuments({ grantMethod: 'admin_whitelist' }),
      PriveInviteCode.countDocuments(),
      PriveInviteCode.countDocuments({ isActive: true, expiresAt: { $gt: new Date() } }),
      CoinTransaction.aggregate([
        { $match: { source: 'prive_invite_reward' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    // Code utilization
    const codeUsage = await PriveInviteCode.aggregate([
      { $group: { _id: null, totalUsage: { $sum: '$usageCount' }, totalMax: { $sum: '$maxUses' } } },
    ]);

    return sendSuccess(res, {
      access: {
        total: totalAccess,
        active: activeAccess,
        suspended: suspendedAccess,
        revoked: revokedAccess,
        whitelisted: whitelistedCount,
      },
      grantMethods: {
        invite: inviteGranted,
        admin: adminGranted,
        autoQualify: totalAccess - inviteGranted - adminGranted,
      },
      codes: {
        total: totalCodes,
        active: activeCodes,
        totalUsage: codeUsage[0]?.totalUsage || 0,
        totalCapacity: codeUsage[0]?.totalMax || 0,
        utilizationRate: codeUsage[0]?.totalMax
          ? Math.round(((codeUsage[0]?.totalUsage || 0) / codeUsage[0].totalMax) * 100)
          : 0,
      },
      rewards: {
        totalCoinsDistributed: totalRewards[0]?.total || 0,
      },
    });
  } catch (error: any) {
    logger.error('[AdminPriveInvite] Error getting analytics:', error);
    return sendError(res, 'Failed to load analytics');
  }
});

/**
 * GET /api/admin/prive/invite-config
 * Get invite system configuration
 */
export const getInviteConfig = asyncHandler(async (req: Request, res: Response) => {
  try {
    const config = await priveAccessService.getInviteConfig();
    return sendSuccess(res, config);
  } catch (error: any) {
    logger.error('[AdminPriveInvite] Error getting config:', error);
    return sendError(res, 'Failed to load configuration');
  }
});

/**
 * PUT /api/admin/prive/invite-config
 * Update invite system configuration
 */
export const updateInviteConfig = asyncHandler(async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    const walletConfig = await WalletConfig.getOrCreate();

    // Merge updates into existing config
    const currentConfig = walletConfig.priveInviteConfig || {};
    const validFields = [
      'enabled', 'inviterRewardCoins', 'inviteeRewardCoins',
      'maxCodesPerUser', 'codeExpiryDays', 'maxUsesPerCode',
      'minTierToInvite', 'cooldownHours', 'fraudBlockThreshold',
    ];

    for (const field of validFields) {
      if (updates[field] !== undefined) {
        (currentConfig as any)[field] = updates[field];
      }
    }

    walletConfig.priveInviteConfig = currentConfig as any;
    walletConfig.markModified('priveInviteConfig');
    await walletConfig.save();

    return sendSuccess(res, walletConfig.priveInviteConfig, 'Configuration updated');
  } catch (error: any) {
    logger.error('[AdminPriveInvite] Error updating config:', error);
    return sendError(res, 'Failed to update configuration');
  }
});
