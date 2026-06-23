/**
 * Privé Invite Fraud Detection Service
 *
 * Mirrors the referralFraudDetection.ts patterns for invite-specific fraud detection.
 */

import { Types } from 'mongoose';
import PriveAccess from '../models/PriveAccess';
import PriveInviteCode from '../models/PriveInviteCode';
import { User } from '../models/User';

interface FraudCheckResult {
  isFraud: boolean;
  reasons: string[];
  riskScore: number; // 0-100
  action: 'allow' | 'review' | 'block';
}

class PriveInviteFraudService {
  private readonly RISK_THRESHOLDS = {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80,
  };

  /**
   * Check if an invite application is potentially fraudulent
   */
  async checkInviteApplication(
    inviterId: string | Types.ObjectId,
    applicantId: string | Types.ObjectId,
    metadata: { ip?: string; device?: string; userAgent?: string }
  ): Promise<FraudCheckResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check 1: Self-use prevention
    if (inviterId.toString() === applicantId.toString()) {
      reasons.push('Self-use of invite code detected');
      riskScore += 100;
    }

    // Check 2: Already has Privé access
    const existingAccess = await PriveAccess.findOne({
      userId: applicantId,
      status: 'active',
    }).lean();
    if (existingAccess) {
      reasons.push('User already has active Privé access');
      riskScore += 100;
    }

    // Check 3: Same device/IP detection
    if (metadata.ip || metadata.device) {
      const sameDevice = await this.checkSameDeviceOrIP(inviterId, metadata);
      if (sameDevice) {
        reasons.push('Same device or IP address as inviter');
        riskScore += 40;
      }
    }

    // Check 4: Rapid application spam
    const rapidSpam = await this.checkRapidApplications(applicantId);
    if (rapidSpam) {
      reasons.push('Too many invite applications in short period');
      riskScore += 25;
    }

    // Check 5: Account age check
    const newAccount = await this.checkAccountAge(applicantId);
    if (newAccount) {
      reasons.push('Very new account');
      riskScore += 10;
    }

    // Check 6: Circular invite rings
    const circularRing = await this.checkCircularInvites(inviterId, applicantId);
    if (circularRing) {
      reasons.push('Circular invite pattern detected');
      riskScore += 50;
    }

    // Check 7: Email pattern abuse
    const emailAbuse = await this.checkEmailPattern(inviterId, applicantId);
    if (emailAbuse) {
      reasons.push('Similar email pattern detected');
      riskScore += 20;
    }

    // Determine action
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
      action,
    };
  }

  /**
   * Check if applicant has used same device/IP as inviter's other invitees
   */
  private async checkSameDeviceOrIP(
    inviterId: string | Types.ObjectId,
    metadata: { ip?: string; device?: string }
  ): Promise<boolean> {
    if (!metadata.ip && !metadata.device) return false;

    // Check invite codes created by this inviter
    const codes = await PriveInviteCode.find({ creatorId: inviterId }).lean();

    for (const code of codes) {
      if (
        (metadata.ip && code.metadata?.createdFromIP === metadata.ip) ||
        (metadata.device && code.metadata?.createdFromDevice === metadata.device)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for rapid application attempts (max 3 per hour)
   */
  private async checkRapidApplications(applicantId: string | Types.ObjectId): Promise<boolean> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Check how many access records were attempted recently (even revoked ones)
    const recentAttempts = await PriveAccess.countDocuments({
      userId: applicantId,
      createdAt: { $gte: oneHourAgo },
    });

    return recentAttempts >= 3;
  }

  /**
   * Check account age (< 1 hour is suspicious)
   */
  private async checkAccountAge(applicantId: string | Types.ObjectId): Promise<boolean> {
    const user = await User.findById(applicantId).select('createdAt').lean();
    if (!user) return true;

    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const oneHour = 60 * 60 * 1000;

    return accountAge < oneHour;
  }

  /**
   * Check for circular invite rings (A invited B, B trying to invite A)
   */
  private async checkCircularInvites(
    inviterId: string | Types.ObjectId,
    applicantId: string | Types.ObjectId
  ): Promise<boolean> {
    // Check if applicant has already invited the inviter
    const reverseInvite = await PriveAccess.findOne({
      userId: inviterId,
      invitedBy: applicantId,
    }).lean();

    return !!reverseInvite;
  }

  /**
   * Check for email pattern abuse
   */
  private async checkEmailPattern(
    inviterId: string | Types.ObjectId,
    applicantId: string | Types.ObjectId
  ): Promise<boolean> {
    const [inviter, applicant] = await Promise.all([
      User.findById(inviterId).select('email').lean(),
      User.findById(applicantId).select('email').lean(),
    ]);

    if (!inviter?.email || !applicant?.email) return false;

    const inviterDomain = inviter.email.split('@')[1];
    const applicantDomain = applicant.email.split('@')[1];

    // Same domain and not a common provider
    const commonProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    if (inviterDomain === applicantDomain && !commonProviders.includes(inviterDomain)) {
      return true;
    }

    // Sequential email patterns (test1@, test2@)
    const inviterLocal = inviter.email.split('@')[0];
    const applicantLocal = applicant.email.split('@')[0];
    const hasNumbers = /\d+$/;

    if (
      hasNumbers.test(inviterLocal) &&
      hasNumbers.test(applicantLocal) &&
      inviterLocal.replace(/\d+$/, '') === applicantLocal.replace(/\d+$/, '')
    ) {
      return true;
    }

    return false;
  }
}

export default new PriveInviteFraudService();
