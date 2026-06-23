/**
 * Privé Access Service
 *
 * Single source of truth for ALL Privé access decisions.
 * Every Privé endpoint must call checkAccess() from this service.
 *
 * Priority order:
 * 1. isWhitelisted + active → always has access
 * 2. PriveAccess.status === 'active' → has access
 * 3. Dev auto-whitelist via PRIVE_DEV_WHITELIST_EMAILS env
 * 4. No record / inactive → no access
 * 5. Reputation is ALWAYS calculated and returned
 */

import { Types } from 'mongoose';
import PriveAccess, { IPriveAccess, PriveGrantMethod, PriveAuditAction } from '../models/PriveAccess';
import PriveInviteCode from '../models/PriveInviteCode';
import { User } from '../models/User';
import reputationService, { PriveEligibilityResponse } from './reputationService';
import { WalletConfig } from '../models/WalletConfig';
import { PriveTier } from '../models/UserReputation';

export interface PriveAccessCheckResult {
  hasAccess: boolean;
  accessSource: 'invite' | 'admin_whitelist' | 'auto_qualify' | 'none';
  accessRecord: IPriveAccess | null;
  reputation: PriveEligibilityResponse;
  effectiveTier: PriveTier;
  isWhitelisted: boolean;
}

class PriveAccessService {
  /**
   * The primary access check — called by all Privé endpoints.
   */
  async checkAccess(userId: string | Types.ObjectId): Promise<PriveAccessCheckResult> {
    const userIdStr = userId.toString();

    // Always calculate reputation (for tier display within Privé)
    let reputation: PriveEligibilityResponse;
    try {
      reputation = await reputationService.checkPriveEligibility(userIdStr);
    } catch (err) {
      // Fallback if reputation fails
      reputation = {
        isEligible: false,
        score: 0,
        tier: 'none',
        pillars: [],
        trustScore: 0,
        hasSeenGlowThisSession: false,
        nextTierThreshold: 50,
        pointsToNextTier: 50,
      };
    }

    // Check PriveAccess record
    const accessRecord = await PriveAccess.getByUserId(userIdStr);

    if (accessRecord && accessRecord.status === 'active') {
      // Determine effective tier: tierOverride > reputation tier > entry (minimum for active)
      const effectiveTier = accessRecord.tierOverride || reputation.tier || 'entry';

      return {
        hasAccess: true,
        accessSource: accessRecord.grantMethod as any,
        accessRecord,
        reputation,
        effectiveTier: effectiveTier === 'none' ? 'entry' : effectiveTier,
        isWhitelisted: accessRecord.isWhitelisted,
      };
    }

    // Dev auto-whitelist check
    if (process.env.NODE_ENV !== 'production' && process.env.PRIVE_DEV_WHITELIST_EMAILS) {
      const whitelistEmails = process.env.PRIVE_DEV_WHITELIST_EMAILS.split(',').map(e => e.trim().toLowerCase());
      const user = await User.findById(userIdStr).select('email').lean();
      if (user?.email && whitelistEmails.includes(user.email.toLowerCase())) {
        // Auto-create access record for dev
        const devAccess = await this.adminWhitelist(
          new Types.ObjectId(userIdStr),
          new Types.ObjectId(userIdStr), // self-granted in dev
          'Dev environment auto-whitelist'
        );
        return {
          hasAccess: true,
          accessSource: 'admin_whitelist',
          accessRecord: devAccess,
          reputation,
          effectiveTier: reputation.tier === 'none' ? 'entry' : reputation.tier,
          isWhitelisted: true,
        };
      }
    }

    // No access
    return {
      hasAccess: false,
      accessSource: 'none',
      accessRecord,
      reputation,
      effectiveTier: 'none' as PriveTier,
      isWhitelisted: false,
    };
  }

  /**
   * Grant access via invite code application
   */
  async grantAccessViaInvite(
    userId: Types.ObjectId,
    inviteCode: string,
    inviterId: Types.ObjectId
  ): Promise<IPriveAccess> {
    // Check if already has access
    const existing = await PriveAccess.findOne({ userId });
    if (existing && existing.status === 'active') {
      throw new Error('User already has Privé access');
    }

    // If revoked/suspended record exists, reactivate
    if (existing) {
      existing.status = 'active';
      existing.grantMethod = 'invite';
      existing.invitedBy = inviterId;
      existing.inviteCodeUsed = inviteCode;
      existing.activatedAt = new Date();
      existing.suspendedAt = undefined;
      existing.suspendReason = undefined;
      existing.auditLog.push({
        action: 'reactivated',
        by: inviterId,
        reason: `Reactivated via invite code ${inviteCode}`,
        timestamp: new Date(),
      });
      await existing.save();
      return existing;
    }

    // Create new access record
    const access = new PriveAccess({
      userId,
      status: 'active',
      grantMethod: 'invite',
      invitedBy: inviterId,
      inviteCodeUsed: inviteCode,
      activatedAt: new Date(),
      auditLog: [
        {
          action: 'granted',
          by: inviterId,
          reason: `Invited via code ${inviteCode}`,
          timestamp: new Date(),
        },
      ],
    });

    await access.save();
    return access;
  }

  /**
   * Admin whitelist — permanently grants access
   */
  async adminWhitelist(
    userId: Types.ObjectId,
    adminId: Types.ObjectId,
    reason: string,
    tierOverride?: 'entry' | 'signature' | 'elite'
  ): Promise<IPriveAccess> {
    const existing = await PriveAccess.findOne({ userId });

    if (existing) {
      existing.status = 'active';
      existing.isWhitelisted = true;
      existing.whitelistedBy = adminId;
      existing.whitelistReason = reason;
      existing.activatedAt = new Date();
      existing.suspendedAt = undefined;
      existing.suspendReason = undefined;
      if (tierOverride) {
        existing.tierOverride = tierOverride;
      }
      existing.auditLog.push({
        action: 'whitelisted',
        by: adminId,
        reason,
        timestamp: new Date(),
        metadata: tierOverride ? { tierOverride } : undefined,
      });
      await existing.save();
      return existing;
    }

    const access = new PriveAccess({
      userId,
      status: 'active',
      grantMethod: 'admin_whitelist',
      isWhitelisted: true,
      whitelistedBy: adminId,
      whitelistReason: reason,
      tierOverride: tierOverride || null,
      activatedAt: new Date(),
      auditLog: [
        {
          action: 'whitelisted',
          by: adminId,
          reason,
          timestamp: new Date(),
          metadata: tierOverride ? { tierOverride } : undefined,
        },
      ],
    });

    await access.save();
    return access;
  }

  /**
   * Admin revoke access
   */
  async adminRevokeAccess(
    userId: Types.ObjectId,
    adminId: Types.ObjectId,
    reason: string
  ): Promise<void> {
    const access = await PriveAccess.findOne({ userId });
    if (!access) {
      throw new Error('User does not have Privé access');
    }

    if (access.isWhitelisted) {
      throw new Error('Cannot revoke whitelisted user access. Remove whitelist first.');
    }

    access.status = 'revoked';
    access.revokedAt = new Date();
    access.revokeReason = reason;
    access.auditLog.push({
      action: 'revoked',
      by: adminId,
      reason,
      timestamp: new Date(),
    });

    await access.save();
  }

  /**
   * Admin suspend access
   */
  async adminSuspendAccess(
    userId: Types.ObjectId,
    adminId: Types.ObjectId,
    reason: string
  ): Promise<void> {
    const access = await PriveAccess.findOne({ userId });
    if (!access) {
      throw new Error('User does not have Privé access');
    }

    if (access.isWhitelisted) {
      throw new Error('Cannot suspend whitelisted user. Remove whitelist first.');
    }

    access.status = 'suspended';
    access.suspendedAt = new Date();
    access.suspendReason = reason;
    access.auditLog.push({
      action: 'suspended',
      by: adminId,
      reason,
      timestamp: new Date(),
    });

    await access.save();
  }

  /**
   * Remove admin whitelist (access remains but is no longer immune)
   */
  async removeWhitelist(
    userId: Types.ObjectId,
    adminId: Types.ObjectId,
    reason: string
  ): Promise<void> {
    const access = await PriveAccess.findOne({ userId });
    if (!access) {
      throw new Error('User does not have Privé access');
    }

    access.isWhitelisted = false;
    access.whitelistedBy = undefined;
    access.whitelistReason = undefined;
    access.tierOverride = null;
    access.auditLog.push({
      action: 'un_whitelisted',
      by: adminId,
      reason,
      timestamp: new Date(),
    });

    await access.save();
  }

  /**
   * Check if user can generate invite codes
   */
  async canGenerateInvites(userId: Types.ObjectId): Promise<{
    canGenerate: boolean;
    reason?: string;
    maxCodes: number;
    activeCodes: number;
    remainingCodes: number;
  }> {
    // Must have active access
    const access = await PriveAccess.findOne({ userId, status: 'active' }).lean();
    if (!access) {
      return { canGenerate: false, reason: 'No active Privé access', maxCodes: 0, activeCodes: 0, remainingCodes: 0 };
    }

    // Get config
    const config = await WalletConfig.getOrCreate();
    const inviteConfig = config.priveInviteConfig || {
      enabled: true,
      maxCodesPerUser: 5,
      minTierToInvite: 'entry',
      cooldownHours: 24,
    };

    if (!inviteConfig.enabled) {
      return { canGenerate: false, reason: 'Invite system is currently disabled', maxCodes: 0, activeCodes: 0, remainingCodes: 0 };
    }

    // Check reputation tier meets minimum
    let reputation: PriveEligibilityResponse;
    try {
      reputation = await reputationService.checkPriveEligibility(userId);
    } catch {
      reputation = { isEligible: false, score: 0, tier: 'none', pillars: [], trustScore: 0, hasSeenGlowThisSession: false, nextTierThreshold: 50, pointsToNextTier: 50 };
    }

    const effectiveTier = access.tierOverride || reputation.tier;
    const tierOrder: Record<string, number> = { none: 0, entry: 1, signature: 2, elite: 3 };
    const userTierLevel = tierOrder[effectiveTier] || 0;
    const minTierLevel = tierOrder[inviteConfig.minTierToInvite] || 1;

    if (userTierLevel < minTierLevel) {
      return {
        canGenerate: false,
        reason: `Requires ${inviteConfig.minTierToInvite} tier or higher`,
        maxCodes: inviteConfig.maxCodesPerUser,
        activeCodes: 0,
        remainingCodes: 0,
      };
    }

    // Check active code count
    const activeCodes = await PriveInviteCode.countDocuments({
      creatorId: userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    const maxCodes = inviteConfig.maxCodesPerUser;
    const remainingCodes = Math.max(0, maxCodes - activeCodes);

    if (activeCodes >= maxCodes) {
      return {
        canGenerate: false,
        reason: `Maximum ${maxCodes} active codes allowed`,
        maxCodes,
        activeCodes,
        remainingCodes: 0,
      };
    }

    // Check cooldown
    const lastCode = await PriveInviteCode.findOne({ creatorId: userId })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();

    if (lastCode) {
      const hoursSinceLastCode = (Date.now() - new Date(lastCode.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastCode < inviteConfig.cooldownHours) {
        const hoursRemaining = Math.ceil(inviteConfig.cooldownHours - hoursSinceLastCode);
        return {
          canGenerate: false,
          reason: `Please wait ${hoursRemaining} hour(s) before generating another code`,
          maxCodes,
          activeCodes,
          remainingCodes,
        };
      }
    }

    return {
      canGenerate: true,
      maxCodes,
      activeCodes,
      remainingCodes,
    };
  }

  /**
   * Get invite config from WalletConfig
   */
  async getInviteConfig() {
    const config = await WalletConfig.getOrCreate();
    return config.priveInviteConfig || {
      enabled: true,
      inviterRewardCoins: 100,
      inviteeRewardCoins: 50,
      maxCodesPerUser: 5,
      codeExpiryDays: 30,
      maxUsesPerCode: 5,
      minTierToInvite: 'entry' as const,
      cooldownHours: 24,
      fraudBlockThreshold: 80,
    };
  }
}

export default new PriveAccessService();
