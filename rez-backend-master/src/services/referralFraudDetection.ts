import { logger } from '../config/logger';
import Referral, { ReferralStatus } from '../models/Referral';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Types } from 'mongoose';

interface FraudCheckResult {
  isFraud: boolean;
  reasons: string[];
  riskScore: number; // 0-100, higher is more suspicious
  action: 'allow' | 'review' | 'block';
}

export class ReferralFraudDetection {
  private readonly RISK_THRESHOLDS = {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80
  };

  /**
   * Check if referral is potentially fraudulent
   */
  async checkReferral(
    referrerId: string | Types.ObjectId,
    refereeId: string | Types.ObjectId,
    metadata: any
  ): Promise<FraudCheckResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check 1: Self-referral (same user)
    if (referrerId.toString() === refereeId.toString()) {
      reasons.push('Self-referral detected');
      riskScore += 100;
    }

    // Check 2: Same device/IP address
    const sameDevice = await this.checkSameDevice(referrerId, refereeId, metadata);
    if (sameDevice) {
      reasons.push('Same device or IP address detected');
      riskScore += 40;
    }

    // Check 3: Suspicious account creation pattern
    const suspiciousPattern = await this.checkAccountPattern(refereeId);
    if (suspiciousPattern) {
      reasons.push('Suspicious account creation pattern');
      riskScore += 30;
    }

    // Check 4: Too many referrals in short time
    const rapidReferrals = await this.checkRapidReferrals(referrerId);
    if (rapidReferrals) {
      reasons.push('Too many referrals in short period');
      riskScore += 25;
    }

    // Check 5: Referee account age
    const newAccount = await this.checkAccountAge(refereeId);
    if (newAccount) {
      reasons.push('Very new account');
      riskScore += 10;
    }

    // Check 6: Check for circular referral rings
    const circularRing = await this.checkCircularReferrals(referrerId, refereeId);
    if (circularRing) {
      reasons.push('Circular referral pattern detected');
      riskScore += 50;
    }

    // Check 7: Multiple accounts from same email domain
    const emailPattern = await this.checkEmailPattern(referrerId, refereeId);
    if (emailPattern) {
      reasons.push('Multiple referrals from similar email addresses');
      riskScore += 20;
    }

    // Determine action based on risk score
    let action: 'allow' | 'review' | 'block';
    if (riskScore >= this.RISK_THRESHOLDS.HIGH) {
      action = 'block';
    } else if (riskScore >= this.RISK_THRESHOLDS.MEDIUM) {
      action = 'review';
    } else {
      action = 'allow';
    }

    return {
      isFraud: riskScore >= this.RISK_THRESHOLDS.HIGH,
      reasons,
      riskScore: Math.min(100, riskScore),
      action
    };
  }

  /**
   * Check if referee has qualified (met qualification criteria)
   */
  async checkQualification(referralId: string | Types.ObjectId): Promise<boolean> {
    const referral = await Referral.findById(referralId).populate('referee').lean();

    if (!referral || !referral.referee) {
      return false;
    }

    const refereeId = referral.referee;
    const criteria = referral.qualificationCriteria;

    // Check if referee placed required number of orders
    const orders = await Order.find({
      userId: refereeId,
      status: { $in: ['delivered', 'completed'] },
      createdAt: {
        $gte: referral.registeredAt || referral.createdAt,
        $lte: new Date(
          (referral.registeredAt || referral.createdAt).getTime() +
          criteria.timeframeDays * 24 * 60 * 60 * 1000
        )
      }
    }).lean();

    // Check minimum orders
    if (orders.length < criteria.minOrders) {
      return false;
    }

    // Check minimum spend
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    if (totalSpent < criteria.minSpend) {
      return false;
    }

    // Check for cancelled or returned orders
    const problematicOrders = orders.filter(order =>
      ['cancelled', 'returned', 'refunded'].includes(order.status)
    );

    if (problematicOrders.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Check if same device or IP
   */
  private async checkSameDevice(
    referrerId: string | Types.ObjectId,
    refereeId: string | Types.ObjectId,
    metadata: any
  ): Promise<boolean> {
    const referrerReferrals = await Referral.find({ referrer: referrerId }).lean();

    if (!metadata.deviceId && !metadata.ipAddress) {
      return false;
    }

    for (const ref of referrerReferrals) {
      if (
        (metadata.deviceId && ref.metadata.deviceId === metadata.deviceId) ||
        (metadata.ipAddress && ref.metadata.ipAddress === metadata.ipAddress)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for suspicious account patterns
   */
  private async checkAccountPattern(refereeId: string | Types.ObjectId): Promise<boolean> {
    const user = await User.findById(refereeId).lean();

    if (!user) return true;

    // Check if account has minimal information
    const hasMinimalInfo = !user.phone || !user.email;
    const hasNoActivity = !user.lastLogin;

    return hasMinimalInfo && hasNoActivity;
  }

  /**
   * Check for rapid referrals (too many in short time)
   */
  private async checkRapidReferrals(referrerId: string | Types.ObjectId): Promise<boolean> {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentReferrals = await Referral.countDocuments({
      referrer: referrerId,
      createdAt: { $gte: last24Hours }
    });

    return recentReferrals > 10; // More than 10 referrals in 24 hours is suspicious
  }

  /**
   * Check referee account age
   */
  private async checkAccountAge(refereeId: string | Types.ObjectId): Promise<boolean> {
    const user = await User.findById(refereeId).lean();

    if (!user) return true;

    const accountAge = Date.now() - user.createdAt.getTime();
    const oneHour = 60 * 60 * 1000;

    return accountAge < oneHour; // Account created less than 1 hour ago
  }

  /**
   * Check for circular referral rings (A refers B, B refers C, C refers A)
   */
  private async checkCircularReferrals(
    referrerId: string | Types.ObjectId,
    refereeId: string | Types.ObjectId
  ): Promise<boolean> {
    // Check if referee has referred the referrer
    const reverseReferral = await Referral.findOne({
      referrer: refereeId,
      referee: referrerId
    }).lean();

    if (reverseReferral) return true;

    // Check for indirect circular patterns (max depth 2)
    const refereeReferrals = await Referral.find({ referrer: refereeId }).lean();

    for (const ref of refereeReferrals) {
      if (ref.referee.toString() === referrerId.toString()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check email patterns
   */
  private async checkEmailPattern(
    referrerId: string | Types.ObjectId,
    refereeId: string | Types.ObjectId
  ): Promise<boolean> {
    const [referrer, referee] = await Promise.all([
      User.findById(referrerId).lean(),
      User.findById(refereeId).lean()
    ]);

    if (!referrer?.email || !referee?.email) return false;

    const referrerDomain = referrer.email.split('@')[1];
    const refereeDomain = referee.email.split('@')[1];

    // Same domain and not common providers
    const commonProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];

    if (referrerDomain === refereeDomain && !commonProviders.includes(referrerDomain)) {
      return true;
    }

    // Check for sequential email patterns (test1@, test2@, etc.)
    const referrerLocal = referrer.email.split('@')[0];
    const refereeLocal = referee.email.split('@')[0];

    const hasNumbers = /\d+$/;
    if (
      hasNumbers.test(referrerLocal) &&
      hasNumbers.test(refereeLocal) &&
      referrerLocal.replace(/\d+$/, '') === refereeLocal.replace(/\d+$/, '')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Mark referral as fraudulent
   */
  async markAsFraud(referralId: string | Types.ObjectId, reason: string) {
    const referral = await Referral.findById(referralId);

    if (!referral) {
      throw new Error('Referral not found');
    }

    referral.status = ReferralStatus.EXPIRED;
    referral.metadata = {
      ...referral.metadata,
      fraudFlag: true,
      fraudReason: reason,
      flaggedAt: new Date()
    } as any;

    await referral.save();

    // TODO: Send notification to admin when notification service is integrated
    logger.warn(`[FRAUD] Referral ${referralId} marked as fraud: ${reason}`);

    return referral;
  }

  /**
   * Get fraud statistics
   */
  async getFraudStats() {
    const [total, blocked, underReview] = await Promise.all([
      Referral.countDocuments(),
      Referral.countDocuments({ 'metadata.fraudFlag': true }),
      Referral.countDocuments({ status: ReferralStatus.PENDING })
    ]);

    return {
      total,
      blocked,
      underReview,
      fraudRate: total > 0 ? (blocked / total) * 100 : 0
    };
  }

  /**
   * Run fraud detection on existing referrals
   */
  async scanExistingReferrals() {
    const referrals = await Referral.find({
      status: { $in: [ReferralStatus.PENDING, ReferralStatus.REGISTERED] }
    }).limit(100).lean();

    const results = [];

    for (const referral of referrals) {
      const check = await this.checkReferral(
        referral.referrer,
        referral.referee,
        referral.metadata
      );

      if (check.action === 'block') {
        await this.markAsFraud(referral._id as Types.ObjectId, check.reasons.join(', '));
        results.push({
          referralId: referral._id,
          action: 'blocked',
          reasons: check.reasons
        });
      } else if (check.action === 'review') {
        results.push({
          referralId: referral._id,
          action: 'flagged_for_review',
          riskScore: check.riskScore,
          reasons: check.reasons
        });
      }
    }

    return results;
  }
}

export default new ReferralFraudDetection();
