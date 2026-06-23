import { logger } from '../config/logger';
import { User } from '../models/User';
import { VerifiedInstitution } from '../models/VerifiedInstitution';
import UserZoneVerification from '../models/UserZoneVerification';
import { privilegeResolutionService } from './entitlement/privilegeResolutionService';

export class AutoVerificationService {
  /**
   * Check if a student can be auto-verified based on email domain or institution name
   */
  async checkStudentAutoVerify(params: {
    userId: string;
    email?: string;
    instituteName?: string;
  }): Promise<{ shouldAutoVerify: boolean; institution?: any }> {
    // Flagged users never auto-verify
    const user = await User.findById(params.userId)
      .select('isFlagged')
      .lean();
    if ((user as any)?.isFlagged) {
      return { shouldAutoVerify: false };
    }

    let institution = null;

    // Check email domain first (most reliable)
    if (params.email) {
      const domain = params.email.split('@')[1]?.toLowerCase();
      if (domain) {
        institution = await VerifiedInstitution.findOne({
          emailDomains: domain,
          type: 'college',
          isActive: true,
          autoVerifyEnabled: true,
        }).lean();
      }
    }

    // Fallback: name/alias text match
    if (!institution && params.instituteName) {
      const escapedName = params.instituteName.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
      institution = await VerifiedInstitution.findOne({
        $or: [
          { name: { $regex: escapedName, $options: 'i' } },
          { aliases: { $regex: escapedName, $options: 'i' } },
        ],
        type: 'college',
        isActive: true,
        autoVerifyEnabled: true,
      }).lean();
    }

    return { shouldAutoVerify: !!institution, institution };
  }

  /**
   * Check if a corporate user can be auto-verified based on work email domain
   */
  async checkCorporateAutoVerify(params: {
    userId: string;
    email?: string;
    companyName?: string;
  }): Promise<{ shouldAutoVerify: boolean; institution?: any }> {
    const user = await User.findById(params.userId)
      .select('isFlagged')
      .lean();
    if ((user as any)?.isFlagged) {
      return { shouldAutoVerify: false };
    }

    let institution = null;

    if (params.email) {
      const domain = params.email.split('@')[1]?.toLowerCase();
      // Skip personal email domains
      const personalDomains = [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'outlook.com',
        'icloud.com',
        'protonmail.com',
        'mail.com',
        'aol.com',
        'yandex.com',
        'zoho.com',
        'rediffmail.com',
      ];
      if (domain && !personalDomains.includes(domain)) {
        institution = await VerifiedInstitution.findOne({
          emailDomains: domain,
          type: 'company',
          isActive: true,
          autoVerifyEnabled: true,
        }).lean();
      }
    }

    if (!institution && params.companyName) {
      const escapedName = params.companyName.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
      institution = await VerifiedInstitution.findOne({
        $or: [
          { name: { $regex: escapedName, $options: 'i' } },
          { aliases: { $regex: escapedName, $options: 'i' } },
        ],
        type: 'company',
        isActive: true,
        autoVerifyEnabled: true,
      }).lean();
    }

    return { shouldAutoVerify: !!institution, institution };
  }

  /**
   * Execute instant verification — creates pre-approved record + updates user
   */
  async autoVerify(params: {
    userId: string;
    zoneSlug: string;
    verificationType: string;
    institution: any;
    submittedData: any;
  }): Promise<void> {
    const { userId, zoneSlug, verificationType, institution, submittedData } =
      params;

    // Create pre-approved verification record
    await UserZoneVerification.create({
      userId,
      zoneSlug,
      verificationType,
      status: 'approved',
      submittedData,
      reviewedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    // Build verification update path
    const updatePath = `verifications.${verificationType}`;
    const segmentValue =
      verificationType === 'student'
        ? 'verified_student'
        : verificationType === 'corporate'
          ? 'verified_employee'
          : `verified_${verificationType}`;

    await User.findByIdAndUpdate(userId, {
      $set: {
        [`${updatePath}.verified`]: true,
        [`${updatePath}.verifiedAt`]: new Date(),
        ...(verificationType === 'student' || verificationType === 'teacher'
          ? { [`${updatePath}.instituteName`]: submittedData.instituteName || institution.name }
          : { [`${updatePath}.companyName`]: submittedData.companyName || institution.name }),
        verificationSegment: 'verified',
        featureLevel: 2,
        segment: segmentValue,
      },
      $addToSet: { activeZones: zoneSlug },
    });

    // Invalidate privilege cache
    await privilegeResolutionService.invalidate(userId);

    logger.info(
      `[AutoVerify] User ${userId} auto-verified for zone ${zoneSlug} via institution ${institution.name}`
    );
  }
}

export const autoVerificationService = new AutoVerificationService();
