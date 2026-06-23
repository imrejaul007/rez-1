import { logger } from '../config/logger';
import mongoose, { Types } from 'mongoose';
import SpecialProgramConfig, {
  ISpecialProgramConfig,
  SpecialProgramSlug,
} from '../models/SpecialProgramConfig';
import ProgramMembership, {
  IProgramMembership,
  MembershipStatus,
} from '../models/ProgramMembership';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { CoinTransaction } from '../models/CoinTransaction';
import { reputationService } from './reputationService';
import redisService from './redisService';
import { NotificationService } from './notificationService';
import { escapeRegex } from '../utils/sanitize';
import { BRAND } from '../config/brand';
import type { Lean } from '../types/lean';

/**
 * Special Program Service
 *
 * Core eligibility engine for Student Zone, Corporate Perks, and Nuqta Privé.
 * All eligibility decisions are made server-side. The frontend only renders results.
 */

// Response types
export type EligibilityState =
  | 'eligible'
  | 'not_eligible'
  | 'pending_verification'
  | 'active_member'
  | 'suspended'
  | 'expired'
  | 'revoked';

export interface RequirementCheck {
  met: boolean;
  label: string;
  type: string;
}

export interface EarningActivity {
  source: string;
  label: string;
  icon: string;
  description: string;
}

export interface EligibilityResult {
  state: EligibilityState;
  program: {
    slug: string;
    name: string;
    description: string;
    badge: string;
    icon: string;
    benefits: ISpecialProgramConfig['benefits'];
    earningsDisplayText: string;
    gradientColors: string[];
  };
  requirements: RequirementCheck[];
  membership?: {
    status: MembershipStatus;
    activatedAt?: Date;
    currentMonthEarnings: number;
    monthlyCap: number;
    multiplier: number;
    totalEarnings: number;
    totalMultiplierBonus: number;
    monthsActive: number;
    linkedCampaigns?: Array<{ id: string; title: string; badge: string }>;
    earningActivities?: EarningActivity[];
  };
  message: string;
  verificationRejected?: boolean;
  rejectionReason?: string;
}

// Maps earning source codes to user-friendly labels
const SOURCE_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  order: { label: 'Place Orders', icon: '🛒', description: 'Earn coins on every purchase' },
  review: { label: 'Write Reviews', icon: '⭐', description: 'Review products & stores' },
  bill_upload: { label: 'Upload Bills', icon: '🧾', description: 'Scan & upload purchase receipts' },
  referral: { label: 'Refer Friends', icon: '👥', description: 'Invite friends to join' },
  social_share_reward: { label: 'Share on Social', icon: '📱', description: 'Share deals on social media' },
  daily_login: { label: 'Daily Check-in', icon: '📅', description: 'Log in every day' },
  creator_pick_reward: { label: 'Creator Picks', icon: '🎬', description: 'Create & share video content' },
  poll_vote: { label: 'Vote in Polls', icon: '📊', description: 'Participate in community polls' },
  photo_upload: { label: 'Upload Photos', icon: '📸', description: 'Share store/product photos' },
  offer_comment: { label: 'Comment on Offers', icon: '💬', description: 'Leave quality comments' },
  ugc_reel: { label: 'Create Reels', icon: '🎥', description: 'Make user-generated reels' },
  program_task_reward: { label: 'Program Tasks', icon: '✅', description: 'Complete special program tasks' },
  purchase_reward: { label: 'Purchase Rewards', icon: '🎁', description: 'Bonus on qualifying purchases' },
  cashback: { label: 'Cashback', icon: '💰', description: 'Automatic cashback earnings' },
};

export interface DashboardData {
  monthlyCap: number;
  currentMonthEarnings: number;
  multiplier: number;
  multiplierAppliesTo: string[];
  memberSince: string;
  totalEarnings: number;
  totalMultiplierBonus: number;
  monthsActive: number;
  linkedCampaigns: Array<{ id: string; title: string; badge: string }>;
  benefits: ISpecialProgramConfig['benefits'];
  status: MembershipStatus;
}

export interface ProgramListItem {
  slug: string;
  name: string;
  description: string;
  badge: string;
  icon: string;
  earningsDisplayText: string;
  benefits: ISpecialProgramConfig['benefits'];
  userStatus: EligibilityState | 'unknown';
  gradientColors: string[];
  priority: number;
}

export interface CapCheckResult {
  allowed: boolean;
  adjustedAmount: number;
  reason?: string;
  programSlug?: string;
}

// Cache keys
const CACHE_KEY_ALL_CONFIGS = 'special-programs:config:all';
const CACHE_TTL_CONFIGS = 3600; // 1 hour
const CACHE_TTL_MEMBERSHIP = 300; // 5 minutes

class SpecialProgramService {
  /**
   * Get all active program configs (cached)
   */
  async getAllConfigs(): Promise<ISpecialProgramConfig[]> {
    try {
      const cached = await redisService.get(CACHE_KEY_ALL_CONFIGS);
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Redis unavailable, proceed without cache
    }

    const configs = await SpecialProgramConfig.find({ isActive: true })
      .sort({ priority: -1 })
      .lean();

    try {
      await redisService.set(CACHE_KEY_ALL_CONFIGS, JSON.stringify(configs), CACHE_TTL_CONFIGS);
    } catch (e) {
      // Redis unavailable
    }

    return configs as unknown as ISpecialProgramConfig[];
  }

  /**
   * Get ALL program configs (including inactive) for admin use. Not cached.
   */
  async getAllConfigsAdmin(): Promise<Lean<ISpecialProgramConfig>[]> {
    return SpecialProgramConfig.find({})
      .sort({ priority: -1 })
      .lean() as unknown as Promise<Lean<ISpecialProgramConfig>[]>;
  }

  /**
   * Get a single active program config by slug
   */
  async getConfigBySlug(slug: SpecialProgramSlug): Promise<ISpecialProgramConfig | null> {
    const configs = await this.getAllConfigs();
    return configs.find(c => c.slug === slug) || null;
  }

  /**
   * Check if a program exists but is deactivated (for better error messages)
   */
  private async isProgramDeactivated(slug: SpecialProgramSlug): Promise<boolean> {
    const config = await SpecialProgramConfig.findOne({ slug, isActive: false }).lean();
    return !!config;
  }

  /**
   * Invalidate config cache (call after admin updates)
   */
  async invalidateConfigCache(): Promise<void> {
    try {
      await redisService.del(CACHE_KEY_ALL_CONFIGS);
    } catch (e) {
      // Redis unavailable
    }
  }

  /**
   * Get user's membership for a specific program
   */
  async getMembership(userId: string, programSlug: SpecialProgramSlug): Promise<IProgramMembership | null> {
    return ProgramMembership.findOne({ user: userId, programSlug }).lean() as unknown as IProgramMembership | null;
  }

  /**
   * Get all memberships for a user
   */
  async getUserMemberships(userId: string): Promise<IProgramMembership[]> {
    return ProgramMembership.find({ user: userId }).lean() as unknown as IProgramMembership[];
  }

  /**
   * Check user's eligibility for a specific program.
   * This is the core state machine that determines what the frontend should render.
   */
  async checkEligibility(userId: string, slug: SpecialProgramSlug): Promise<EligibilityResult> {
    const config = await this.getConfigBySlug(slug);
    if (!config) {
      const deactivated = await this.isProgramDeactivated(slug);
      throw new Error(deactivated
        ? `This program is temporarily unavailable`
        : `Program not found: ${slug}`
      );
    }

    const programInfo = {
      slug: config.slug,
      name: config.name,
      description: config.description,
      badge: config.badge,
      icon: config.icon,
      benefits: config.benefits,
      earningsDisplayText: config.earningConfig.earningsDisplayText,
      gradientColors: config.gradientColors,
    };

    // Check existing membership first
    const membership = await this.getMembership(userId, slug);

    if (membership) {
      if (membership.status === 'active') {
        // For verification-required programs, re-check that verification is still valid
        if (config.eligibility.requiresVerification && config.eligibility.verificationZone) {
          const user = await User.findById(userId).select('verifications').lean();
          const zone = config.eligibility.verificationZone;
          const verifications = user?.verifications as Record<string, any> | undefined;
          if (!verifications?.[zone]?.verified) {
            // Verification was revoked — auto-suspend membership
            await this.updateMemberStatus(userId, slug, 'suspended', 'Verification revoked by admin');
            return {
              state: 'suspended',
              program: programInfo,
              requirements: [],
              message: 'Your membership has been suspended because your verification was revoked. Please re-verify to reactivate.',
            };
          }
        }

        // Ensure month is current
        const monthEarnings = this.isCurrentMonth(membership.currentMonthStart)
          ? membership.currentMonthEarnings
          : 0;

        // Fetch linked campaigns for active members
        let linkedCampaigns: Array<{ id: string; title: string; badge: string }> = [];
        if (config.linkedCampaigns?.length > 0) {
          try {
            const Campaign = mongoose.model('Campaign');
            const campaigns = await Campaign.find({
              _id: { $in: config.linkedCampaigns },
              isActive: true,
            }).select('title badge').lean();
            linkedCampaigns = campaigns.map((c: any) => ({
              id: c._id.toString(),
              title: c.title,
              badge: c.badge || '',
            }));
          } catch (e) {
            // Non-critical, proceed without campaigns
          }
        }

        // Build earning activities from config
        const earningActivities: EarningActivity[] = (config.earningConfig.multiplierAppliesTo || []).map(source => ({
          source,
          ...(SOURCE_LABELS[source] || { label: source, icon: '🪙', description: 'Earn coins' }),
        }));

        return {
          state: 'active_member',
          program: programInfo,
          requirements: [],
          membership: {
            status: membership.status,
            activatedAt: membership.activatedAt,
            currentMonthEarnings: monthEarnings,
            monthlyCap: config.earningConfig.monthlyCap,
            multiplier: config.earningConfig.multiplier,
            totalEarnings: membership.totalEarnings,
            totalMultiplierBonus: membership.totalMultiplierBonus,
            monthsActive: membership.monthsActive,
            linkedCampaigns,
            earningActivities,
          },
          message: `You are an active ${config.name} member`,
        };
      }

      if (membership.status === 'pending_verification') {
        return {
          state: 'pending_verification',
          program: programInfo,
          requirements: [],
          message: 'Your verification is being reviewed. We\'ll notify you once approved.',
        };
      }

      if (membership.status === 'suspended' || membership.status === 'expired') {
        // Check if user has re-verified — if so, allow them to reactivate
        if (config.eligibility.requiresVerification && config.eligibility.verificationZone) {
          const user = await User.findById(userId).select('verifications').lean();
          const zone = config.eligibility.verificationZone;
          const verifications = user?.verifications as Record<string, any> | undefined;
          if (verifications?.[zone]?.verified) {
            // User has re-verified — show eligible so they can reactivate
            return {
              state: 'eligible',
              program: programInfo,
              requirements: [{ met: true, label: 'Student verification', type: 'verification' }],
              message: `You're verified again! Activate now to reactivate your ${config.name} membership.`,
            };
          }
        }

        return {
          state: membership.status === 'suspended' ? 'suspended' : 'expired',
          program: programInfo,
          requirements: [],
          message: membership.status === 'suspended'
            ? 'Your membership has been suspended. Re-verify to reactivate.'
            : 'Your membership has expired. Re-verify to reactivate.',
        };
      }

      if (membership.status === 'revoked') {
        return {
          state: 'revoked',
          program: programInfo,
          requirements: [],
          message: 'Your membership has been revoked.',
        };
      }
    }

    // No active membership — evaluate eligibility rules
    const requirements = await this.evaluateEligibilityRules(userId, config);
    const allMet = requirements.every(r => r.met);

    if (allMet) {
      return {
        state: 'eligible',
        program: programInfo,
        requirements,
        message: `You are eligible for ${config.name}! Activate now to start earning.`,
      };
    }

    // Check if the user has submitted verification but it's pending or was rejected
    if (config.eligibility.requiresVerification && config.eligibility.verificationZone) {
      const UserZoneVerification = mongoose.model('UserZoneVerification');

      // Check for pending verification
      const pendingVerification = await UserZoneVerification.findOne({
        userId,
        zoneSlug: config.eligibility.verificationZone,
        status: 'pending',
      }).lean();

      if (pendingVerification) {
        return {
          state: 'pending_verification',
          program: programInfo,
          requirements,
          message: 'Your verification is being reviewed. We\'ll notify you once approved.',
        };
      }

      // Check for most recent rejected verification
      const rejectedVerification = await UserZoneVerification.findOne({
        userId,
        zoneSlug: config.eligibility.verificationZone,
        status: 'rejected',
      }).sort({ updatedAt: -1 }).lean() as any;

      if (rejectedVerification) {
        return {
          state: 'not_eligible',
          program: programInfo,
          requirements,
          message: rejectedVerification.rejectionReason
            ? `Your verification was rejected: ${rejectedVerification.rejectionReason}. Please re-submit with valid documents.`
            : 'Your previous verification was not approved. Please re-submit with valid documents.',
          verificationRejected: true,
          rejectionReason: rejectedVerification.rejectionReason || undefined,
        };
      }
    }

    return {
      state: 'not_eligible',
      program: programInfo,
      requirements,
      message: `Complete the requirements below to join ${config.name}.`,
    };
  }

  /**
   * Evaluate eligibility rules for a user against a program config.
   * Returns a list of requirements with met/unmet status.
   */
  private async evaluateEligibilityRules(
    userId: string,
    config: ISpecialProgramConfig
  ): Promise<RequirementCheck[]> {
    const requirements: RequirementCheck[] = [];

    // 1. Zone verification check (student/corporate)
    if (config.eligibility.requiresVerification && config.eligibility.verificationZone) {
      const user = await User.findById(userId).select('verifications').lean();
      const zone = config.eligibility.verificationZone;
      const userVerifications = user?.verifications as Record<string, any> | undefined;
      const isVerified = userVerifications?.[zone]?.verified === true;

      requirements.push({
        met: isVerified,
        label: `${config.eligibility.verificationZone.charAt(0).toUpperCase() + config.eligibility.verificationZone.slice(1)} verification`,
        type: 'verification',
      });
    }

    // 2. Privé score check
    if (config.eligibility.requiresPriveScore && config.eligibility.minPriveScore) {
      try {
        const priveResult = await reputationService.checkPriveEligibility(userId);
        const meetsScore = priveResult.score >= config.eligibility.minPriveScore;

        requirements.push({
          met: meetsScore,
          label: `Privé score of ${config.eligibility.minPriveScore}+ (current: ${Math.round(priveResult.score)})`,
          type: 'prive_score',
        });
      } catch (e) {
        requirements.push({
          met: false,
          label: `Privé score of ${config.eligibility.minPriveScore}+`,
          type: 'prive_score',
        });
      }
    }

    // 3. Custom rules
    for (const rule of config.eligibility.customRules || []) {
      const met = await this.evaluateCustomRule(userId, rule.type, rule.value);
      requirements.push({
        met,
        label: rule.label,
        type: rule.type,
      });
    }

    return requirements;
  }

  /**
   * Evaluate a single custom rule
   */
  private async evaluateCustomRule(
    userId: string,
    type: string,
    value: number
  ): Promise<boolean> {
    switch (type) {
      case 'min_orders': {
        const orderCount = await Order.countDocuments({
          user: userId,
          status: 'completed',
        });
        return orderCount >= value;
      }
      case 'min_spend': {
        const result = await Order.aggregate([
          { $match: { user: new Types.ObjectId(userId), status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);
        return (result[0]?.total || 0) >= value;
      }
      case 'min_referrals': {
        const user = await User.findById(userId).select('referral.totalReferrals').lean();
        return (user?.referral?.totalReferrals || 0) >= value;
      }
      case 'account_age_days': {
        const user = await User.findById(userId).select('createdAt').lean();
        if (!user?.createdAt) return false;
        const ageMs = Date.now() - new Date(user.createdAt).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        return ageDays >= value;
      }
      case 'min_streak': {
        // Check daily login streak from DailyCheckIn model
        try {
          const DailyCheckIn = mongoose.model('DailyCheckIn');
          const checkin = await DailyCheckIn.findOne({ userId }).sort({ createdAt: -1 }).lean();
          return ((checkin as any)?.currentStreak || 0) >= value;
        } catch {
          return false;
        }
      }
      default:
        logger.warn(`[SPECIAL PROGRAMS] Unknown custom rule type: ${type}. Treating as unmet.`);
        return false;
    }
  }

  /**
   * Activate a user's membership after eligibility is confirmed.
   * Always re-verifies eligibility server-side.
   */
  async activateProgram(userId: string, slug: SpecialProgramSlug): Promise<IProgramMembership> {
    const config = await this.getConfigBySlug(slug);
    if (!config) {
      const deactivated = await this.isProgramDeactivated(slug);
      throw new Error(deactivated
        ? `This program is temporarily unavailable`
        : `Program not found: ${slug}`
      );
    }

    // Re-verify eligibility
    const eligibility = await this.checkEligibility(userId, slug);

    if (eligibility.state === 'active_member') {
      throw new Error('Already an active member of this program');
    }

    if (eligibility.state !== 'eligible') {
      throw new Error(`Cannot activate: ${eligibility.message}`);
    }

    // Defense-in-depth: explicitly verify for programs that require it
    if (config.eligibility.requiresVerification && config.eligibility.verificationZone) {
      const user = await User.findById(userId).select('verifications').lean();
      const zone = config.eligibility.verificationZone;
      const verifications = user?.verifications as Record<string, any> | undefined;
      if (!verifications?.[zone]?.verified) {
        throw new Error('Verification required before activation. Please complete verification first.');
      }
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Create or update membership
    const membership = await ProgramMembership.findOneAndUpdate(
      { user: userId, programSlug: slug },
      {
        $set: {
          status: 'active',
          activatedAt: now,
          lastEligibilityCheck: now,
          currentMonthEarnings: 0,
          currentMonthStart: monthStart,
        },
        $push: {
          statusHistory: {
            status: 'active',
            changedAt: now,
            reason: 'User activated program',
          },
        },
        $setOnInsert: {
          user: new Types.ObjectId(userId),
          programSlug: slug,
          totalEarnings: 0,
          totalMultiplierBonus: 0,
          monthsActive: 0,
        },
      },
      { upsert: true, new: true }
    ).lean();

    // Invalidate user membership cache
    this.invalidateUserMembershipCache(userId);

    return membership as unknown as IProgramMembership;
  }

  /**
   * Get dashboard data for an active member.
   */
  async getMemberDashboard(userId: string, slug: SpecialProgramSlug): Promise<DashboardData> {
    const config = await this.getConfigBySlug(slug);
    if (!config) {
      throw new Error(`Program not found: ${slug}`);
    }

    const membership = await this.getMembership(userId, slug);
    if (!membership || membership.status !== 'active') {
      throw new Error('Not an active member of this program');
    }

    // Get linked campaigns
    let linkedCampaigns: DashboardData['linkedCampaigns'] = [];
    if (config.linkedCampaigns?.length > 0) {
      const Campaign = mongoose.model('Campaign');
      const campaigns = await Campaign.find({
        _id: { $in: config.linkedCampaigns },
        isActive: true,
      }).select('title badge').lean();
      linkedCampaigns = campaigns.map((c: any) => ({
        id: c._id.toString(),
        title: c.title,
        badge: c.badge,
      }));
    }

    // Get current month earnings (reset if not current month)
    const currentMonthEarnings = this.isCurrentMonth(membership.currentMonthStart)
      ? membership.currentMonthEarnings
      : 0;

    return {
      monthlyCap: config.earningConfig.monthlyCap,
      currentMonthEarnings,
      multiplier: config.earningConfig.multiplier,
      multiplierAppliesTo: config.earningConfig.multiplierAppliesTo,
      memberSince: membership.activatedAt?.toISOString() || membership.createdAt.toISOString(),
      totalEarnings: membership.totalEarnings,
      totalMultiplierBonus: membership.totalMultiplierBonus,
      monthsActive: membership.monthsActive,
      linkedCampaigns,
      benefits: config.benefits,
      status: membership.status,
    };
  }

  /**
   * List all programs with user's current status for each.
   */
  async listProgramsForUser(userId?: string): Promise<ProgramListItem[]> {
    const configs = await this.getAllConfigs();
    const memberships = userId
      ? await this.getUserMemberships(userId)
      : [];

    // Pre-fetch user verifications once if needed (avoid N+1 queries)
    let userVerifications: Record<string, any> | undefined;
    if (userId && memberships.some(m => m.status === 'suspended' || m.status === 'expired')) {
      const user = await User.findById(userId).select('verifications').lean();
      userVerifications = user?.verifications as Record<string, any> | undefined;
    }

    return configs.map(config => {
      const membership = memberships.find(m => m.programSlug === config.slug);
      let userStatus: ProgramListItem['userStatus'] = 'unknown';

      if (membership) {
        switch (membership.status) {
          case 'active': userStatus = 'active_member'; break;
          case 'pending_verification': userStatus = 'pending_verification'; break;
          case 'suspended':
          case 'expired': {
            // Check if user has re-verified — show eligible instead of suspended/expired
            if (config.eligibility.requiresVerification && config.eligibility.verificationZone) {
              const zone = config.eligibility.verificationZone;
              if (userVerifications?.[zone]?.verified) {
                userStatus = 'eligible';
                break;
              }
            }
            userStatus = membership.status === 'suspended' ? 'suspended' : 'expired';
            break;
          }
          case 'revoked': userStatus = 'revoked'; break;
        }
      }

      return {
        slug: config.slug,
        name: config.name,
        description: config.description,
        badge: config.badge,
        icon: config.icon,
        earningsDisplayText: config.earningConfig.earningsDisplayText,
        benefits: config.benefits,
        userStatus,
        gradientColors: config.gradientColors,
        priority: config.priority,
      };
    });
  }

  /**
   * Check and enforce monthly earning cap.
   * Called by coinService before awarding coins.
   */
  async checkEarningCap(userId: string, amount: number, source: string): Promise<CapCheckResult> {
    const activeMemberships = await ProgramMembership.find({
      user: userId,
      status: 'active',
    }).lean();

    if (activeMemberships.length === 0) {
      return { allowed: true, adjustedAmount: amount };
    }

    const configs = await this.getAllConfigs();

    // Find the most restrictive cap across ALL active memberships
    let mostRestrictiveRemaining = Infinity;
    let mostRestrictiveSlug: string | undefined;
    let mostRestrictiveCap = 0;
    let hasAnyCap = false;

    for (const membership of activeMemberships) {
      const config = configs.find(c => c.slug === membership.programSlug);
      if (!config || config.earningConfig.monthlyCap === 0) continue;

      // Check if the source is in the multiplier-applies-to list (these are the ones we track)
      if (!config.earningConfig.multiplierAppliesTo.includes(source)) continue;

      hasAnyCap = true;

      const currentMonthEarnings = this.isCurrentMonth(membership.currentMonthStart)
        ? membership.currentMonthEarnings
        : 0;

      const remaining = config.earningConfig.monthlyCap - currentMonthEarnings;

      if (remaining < mostRestrictiveRemaining) {
        mostRestrictiveRemaining = remaining;
        mostRestrictiveSlug = config.slug;
        mostRestrictiveCap = config.earningConfig.monthlyCap;
      }
    }

    if (!hasAnyCap) {
      return { allowed: true, adjustedAmount: amount };
    }

    if (mostRestrictiveRemaining <= 0) {
      return {
        allowed: false,
        adjustedAmount: 0,
        reason: `Monthly earning cap of ${mostRestrictiveCap} reached for ${mostRestrictiveSlug}`,
        programSlug: mostRestrictiveSlug,
      };
    }

    if (amount > mostRestrictiveRemaining) {
      return {
        allowed: true,
        adjustedAmount: mostRestrictiveRemaining,
        reason: `Amount adjusted to fit remaining cap (${mostRestrictiveRemaining} of ${mostRestrictiveCap})`,
        programSlug: mostRestrictiveSlug,
      };
    }

    return { allowed: true, adjustedAmount: amount };
  }

  /**
   * Calculate multiplier bonus for a coin award.
   * Returns the BONUS amount (not the total). E.g., for a 1.5x multiplier on 100 coins, returns 50.
   */
  async calculateMultiplierBonus(userId: string, baseAmount: number, source: string): Promise<{ bonus: number; programSlug?: string; programBonuses: Array<{ slug: string; bonus: number }> }> {
    const activeMemberships = await ProgramMembership.find({
      user: userId,
      status: 'active',
    }).lean();

    if (activeMemberships.length === 0) {
      return { bonus: 0, programBonuses: [] };
    }

    const configs = await this.getAllConfigs();
    let totalBonus = 0;
    const programBonuses: Array<{ slug: string; bonus: number }> = [];

    for (const membership of activeMemberships) {
      const config = configs.find(c => c.slug === membership.programSlug);
      if (!config || config.earningConfig.multiplier <= 1.0) continue;

      // Check if this source type qualifies for the multiplier
      if (!config.earningConfig.multiplierAppliesTo.includes(source)) continue;

      const bonus = Math.round(baseAmount * (config.earningConfig.multiplier - 1));
      if (bonus > 0) {
        totalBonus += bonus;
        programBonuses.push({ slug: config.slug, bonus });
      }
    }

    return {
      bonus: totalBonus,
      programSlug: programBonuses.length > 0 ? programBonuses[0].slug : undefined,
      programBonuses,
    };
  }

  /**
   * Increment monthly earnings for a user's active memberships.
   * Called after coins are awarded.
   */
  async incrementMonthlyEarnings(userId: string, amount: number): Promise<void> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    await ProgramMembership.updateMany(
      { user: userId, status: 'active' },
      {
        $inc: {
          currentMonthEarnings: amount,
          totalEarnings: amount,
        },
        $set: {
          currentMonthStart: monthStart,
        },
      }
    );
  }

  /**
   * Increment multiplier bonus tracking for a user's membership.
   */
  async incrementMultiplierBonus(userId: string, programSlug: string, bonus: number): Promise<void> {
    await ProgramMembership.updateOne(
      { user: userId, programSlug, status: 'active' },
      { $inc: { totalMultiplierBonus: bonus } }
    );
  }

  /**
   * Admin: Update member status
   */
  async updateMemberStatus(
    userId: string,
    programSlug: SpecialProgramSlug,
    newStatus: MembershipStatus,
    reason?: string,
    adminId?: string,
    expiresAt?: Date
  ): Promise<IProgramMembership | null> {
    // When reactivating, verify the user is still eligible
    if (newStatus === 'active') {
      try {
        const eligibility = await this.checkEligibility(userId, programSlug);
        if (eligibility.state !== 'eligible' && eligibility.state !== 'active_member' && eligibility.state !== 'suspended') {
          throw new Error(`Cannot reactivate: user is ${eligibility.state} for ${programSlug}`);
        }
      } catch (e: any) {
        if (e.message.startsWith('Cannot reactivate')) throw e;
        // If eligibility check fails, allow admin to proceed (fail-open for admin actions)
        logger.warn(`[SPECIAL PROGRAMS] Eligibility check failed during admin reactivation for ${userId}:`, e.message);
      }
    }

    const setFields: Record<string, any> = { status: newStatus };
    if (expiresAt !== undefined) {
      setFields.expiresAt = expiresAt;
    }

    const membership = await ProgramMembership.findOneAndUpdate(
      { user: userId, programSlug },
      {
        $set: setFields,
        $push: {
          statusHistory: {
            status: newStatus,
            changedAt: new Date(),
            reason,
            changedBy: adminId ? new Types.ObjectId(adminId) : undefined,
          },
        },
      },
      { new: true }
    ).lean();

    if (membership) {
      this.invalidateUserMembershipCache(userId);
    }

    return membership as unknown as IProgramMembership | null;
  }

  /**
   * Admin: Get program stats
   */
  async getProgramStats(): Promise<Record<string, any>> {
    const pipeline = [
      {
        $group: {
          _id: { slug: '$programSlug', status: '$status' },
          count: { $sum: 1 },
          totalEarnings: { $sum: '$totalEarnings' },
          totalMultiplierBonus: { $sum: '$totalMultiplierBonus' },
          currentMonthEarnings: { $sum: '$currentMonthEarnings' },
        },
      },
    ];

    const results = await ProgramMembership.aggregate(pipeline);

    const slugs: SpecialProgramSlug[] = ['student_zone', 'corporate_perks', 'nuqta_prive'];

    // Build per-program stats
    const byProgram: Record<string, any> = {};
    let totalActiveMembers = 0;
    let totalPendingVerifications = 0;
    let totalMonthlyEarnings = 0;
    let totalMultiplierBonus = 0;

    for (const slug of slugs) {
      const slugResults = results.filter(r => r._id.slug === slug);
      const active = slugResults.find(r => r._id.status === 'active')?.count || 0;
      const pending = slugResults.find(r => r._id.status === 'pending_verification')?.count || 0;
      const monthly = slugResults.reduce((s, r) => s + (r.currentMonthEarnings || 0), 0);
      const bonus = slugResults.reduce((s, r) => s + r.totalMultiplierBonus, 0);

      totalActiveMembers += active;
      totalPendingVerifications += pending;
      totalMonthlyEarnings += monthly;
      totalMultiplierBonus += bonus;

      byProgram[slug] = {
        totalMembers: slugResults.reduce((s, r) => s + r.count, 0),
        activeMembers: active,
        pendingVerification: pending,
        pendingVerifications: pending,
        suspended: slugResults.find(r => r._id.status === 'suspended')?.count || 0,
        revoked: slugResults.find(r => r._id.status === 'revoked')?.count || 0,
        expired: slugResults.find(r => r._id.status === 'expired')?.count || 0,
        totalEarnings: slugResults.reduce((s, r) => s + r.totalEarnings, 0),
        totalMultiplierBonus: bonus,
        monthlyEarnings: monthly,
        multiplierBonus: bonus,
      };
    }

    return {
      totalActiveMembers,
      totalPendingVerifications,
      totalMonthlyEarnings,
      totalMultiplierBonus,
      byProgram,
    };
  }

  /**
   * Admin: Get paginated members for a program
   */
  async getProgramMembers(
    slug: SpecialProgramSlug,
    options: { page?: number; limit?: number; status?: MembershipStatus; search?: string }
  ): Promise<{ members: any[]; total: number }> {
    const { page = 1, limit = 20, status, search } = options;
    const query: any = { programSlug: slug };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    let memberPipeline: any[] = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
    ];

    if (search) {
      memberPipeline.push({
        $match: {
          $or: [
            { 'userInfo.fullName': { $regex: escapeRegex(search), $options: 'i' } },
            { 'userInfo.email': { $regex: escapeRegex(search), $options: 'i' } },
            { 'userInfo.phoneNumber': { $regex: escapeRegex(search), $options: 'i' } },
          ],
        },
      });
    }

    memberPipeline.push({
      $project: {
        _id: 1,
        programSlug: 1,
        status: 1,
        activatedAt: 1,
        currentMonthEarnings: 1,
        totalEarnings: 1,
        totalMultiplierBonus: 1,
        monthsActive: 1,
        createdAt: 1,
        updatedAt: 1,
        user: {
          _id: '$userInfo._id',
          fullName: '$userInfo.fullName',
          phoneNumber: '$userInfo.phoneNumber',
          email: '$userInfo.email',
          profile: '$userInfo.profile',
        },
      },
    });

    const [members, total] = await Promise.all([
      ProgramMembership.aggregate(memberPipeline),
      ProgramMembership.countDocuments(query),
    ]);

    return { members, total };
  }

  /**
   * Cron: Reset monthly earnings for all active memberships
   * Run on 1st of each month
   */
  async resetMonthlyEarnings(): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Only increment monthsActive for members who actually earned something
    const activeResult = await ProgramMembership.updateMany(
      { status: 'active', currentMonthEarnings: { $gt: 0 } },
      {
        $set: { currentMonthEarnings: 0, currentMonthStart: monthStart },
        $inc: { monthsActive: 1 },
      }
    );

    // Reset earnings for members who didn't earn (without incrementing monthsActive)
    const inactiveResult = await ProgramMembership.updateMany(
      { status: 'active', currentMonthEarnings: 0 },
      {
        $set: { currentMonthStart: monthStart },
      }
    );

    logger.info(`[SPECIAL PROGRAMS] Monthly reset: ${activeResult.modifiedCount} active earners, ${inactiveResult.modifiedCount} idle members`);
    return activeResult.modifiedCount + inactiveResult.modifiedCount;
  }

  /**
   * Cron: Re-check Privé eligibility for all active Privé members
   * Run weekly
   */
  async recheckPriveEligibility(): Promise<{ suspended: number; maintained: number }> {
    const config = await this.getConfigBySlug('nuqta_prive');
    const minScore = config?.eligibility.minPriveScore || 70;

    let suspended = 0;
    let maintained = 0;

    const PAGE_SIZE = 100;
    const BATCH_SIZE = 50;
    let page = 0;
    let hasMore = true;
    const query = { programSlug: 'nuqta_prive', status: 'active' };

    while (hasMore) {
      const priveMembers = await ProgramMembership.find(query)
        .skip(page * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean();

      if (priveMembers.length < PAGE_SIZE) hasMore = false;

      // Process members in batched parallel execution
      for (let i = 0; i < priveMembers.length; i += BATCH_SIZE) {
        const batch = priveMembers.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(member =>
            reputationService.checkPriveEligibility(member.user.toString())
              .then(result => ({ member, result, error: null as Error | null }))
              .catch(err => ({ member, result: null as any, error: err as Error }))
          )
        );

        for (const { member, result, error } of results) {
          if (error) {
            logger.error(`[SPECIAL PROGRAMS] Failed to recheck Privé for user ${member.user}:`, error);
            continue;
          }

          if (result.score < minScore) {
            await this.updateMemberStatus(
              member.user.toString(),
              'nuqta_prive',
              'suspended',
              `Privé score dropped below ${minScore} (current: ${Math.round(result.score)})`
            );

            // Update eligibility check timestamp
            await ProgramMembership.updateOne(
              { _id: member._id },
              { $set: { lastEligibilityCheck: new Date() } }
            );

            // Notify the user about suspension
            NotificationService.createNotification({
              userId: member.user.toString(),
              title: `${BRAND.PRIVE_NAME} Membership Suspended`,
              message: `Your Privé score has dropped below the required ${minScore} points. Improve your activity to regain membership.`,
              type: 'warning',
              category: 'system',
              priority: 'high',
              data: {
                deepLink: '/program/nuqta_prive',
                actionButton: {
                  text: 'View Details',
                  action: 'navigate',
                  target: '/program/nuqta_prive',
                },
              },
              source: 'automated',
            }).catch(e => logger.error(`[SPECIAL PROGRAMS] Failed to notify user ${member.user} about Privé suspension:`, e));

            suspended++;
          } else {
            await ProgramMembership.updateOne(
              { _id: member._id },
              { $set: { lastEligibilityCheck: new Date() } }
            );
            maintained++;
          }
        }
      }

      page++;
    }

    logger.info(`[SPECIAL PROGRAMS] Privé recheck: ${suspended} suspended, ${maintained} maintained`);
    return { suspended, maintained };
  }

  /**
   * Cron: Expire memberships past their expiresAt date
   * Run daily
   */
  async expireMemberships(): Promise<number> {
    const result = await ProgramMembership.updateMany(
      {
        status: 'active',
        expiresAt: { $lte: new Date() },
      },
      {
        $set: { status: 'expired' },
        $push: {
          statusHistory: {
            status: 'expired',
            changedAt: new Date(),
            reason: 'Membership expired',
          },
        },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`[SPECIAL PROGRAMS] Expired ${result.modifiedCount} memberships`);
    }

    return result.modifiedCount;
  }

  /**
   * Cron: Re-check verification-based eligibility for Student Zone and Corporate Perks
   * Run weekly — suspends active members whose verification has been revoked
   */
  async recheckVerificationEligibility(): Promise<{ suspended: number; maintained: number }> {
    let suspended = 0;
    let maintained = 0;

    const verificationPrograms: Array<{ slug: SpecialProgramSlug; zone: string }> = [
      { slug: 'student_zone', zone: 'student' },
      { slug: 'corporate_perks', zone: 'corporate' },
    ];

    for (const { slug, zone } of verificationPrograms) {
      const activeMembers = await ProgramMembership.find({
        programSlug: slug,
        status: 'active',
      }).lean();

      if (activeMembers.length === 0) continue;

      const userIds = activeMembers.map(m => m.user);
      const users = await User.find({ _id: { $in: userIds } })
        .select('verifications')
        .lean();

      const userMap = new Map(users.map(u => [u._id.toString(), u]));

      for (const member of activeMembers) {
        try {
          const user = userMap.get(member.user.toString());
          const verifications = user?.verifications as Record<string, any> | undefined;
          const isVerified = verifications?.[zone]?.verified === true;

          if (!isVerified) {
            await this.updateMemberStatus(
              member.user.toString(),
              slug,
              'suspended',
              `${zone} verification no longer valid`
            );

            await ProgramMembership.updateOne(
              { _id: member._id },
              { $set: { lastEligibilityCheck: new Date() } }
            );

            await NotificationService.createNotification({
              userId: member.user.toString(),
              title: `${slug === 'student_zone' ? 'Student Zone' : 'Corporate Perks'} Membership Suspended`,
              message: `Your ${zone} verification is no longer valid. Please re-verify to restore your membership.`,
              type: 'warning',
              category: 'system',
              priority: 'high',
              data: {
                deepLink: `/program/${slug}`,
                actionButton: {
                  text: 'View Details',
                  action: 'navigate',
                  target: `/program/${slug}`,
                },
              },
              source: 'automated',
            }).catch(e => logger.error(`[SPECIAL PROGRAMS] Failed to notify user ${member.user} about ${zone} suspension:`, e));

            suspended++;
          } else {
            await ProgramMembership.updateOne(
              { _id: member._id },
              { $set: { lastEligibilityCheck: new Date() } }
            );
            maintained++;
          }
        } catch (e) {
          logger.error(`[SPECIAL PROGRAMS] Failed to recheck ${zone} for user ${member.user}:`, e);
        }
      }
    }

    logger.info(`[SPECIAL PROGRAMS] Verification recheck: ${suspended} suspended, ${maintained} maintained`);
    return { suspended, maintained };
  }

  // Helper: check if a date is in the current month
  private isCurrentMonth(date: Date): boolean {
    const now = new Date();
    const d = new Date(date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  // Helper: invalidate user membership cache
  private async invalidateUserMembershipCache(userId: string): Promise<void> {
    try {
      await redisService.del(`special-programs:membership:${userId}`);
    } catch (e) {
      // Redis unavailable
    }
  }

  /**
   * Bulk invalidate membership caches for all members of a program with a given status.
   * Called after admin toggle-deactivate to clear stale "active" caches.
   */
  async invalidateMembershipCachesForProgram(programSlug: SpecialProgramSlug, status?: MembershipStatus): Promise<number> {
    try {
      const filter: any = { programSlug };
      if (status) filter.status = status;
      const members = await ProgramMembership.find(filter).select('user').lean();
      let cleared = 0;
      for (const member of members) {
        await this.invalidateUserMembershipCache(member.user.toString());
        cleared++;
      }
      return cleared;
    } catch (e) {
      logger.warn('[SPECIAL PROGRAMS] Bulk cache invalidation failed:', e);
      return 0;
    }
  }
}

export const specialProgramService = new SpecialProgramService();
export default specialProgramService;
