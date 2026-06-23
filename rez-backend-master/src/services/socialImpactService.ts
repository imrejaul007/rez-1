import { logger } from '../config/logger';
import Program, { IProgram } from '../models/Program';
import SocialImpactEnrollment, { ISocialImpactEnrollment } from '../models/SocialImpactEnrollment';
import UserImpactStats, { IUserImpactStatsModel } from '../models/UserImpactStats';
import Sponsor from '../models/Sponsor';
import { CoinTransaction } from '../models/CoinTransaction';
import { Wallet } from '../models/Wallet';
import { awardCoins } from './coinService';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { getCachedWalletConfig } from './walletCacheService';
import { CURRENCY_RULES } from '../config/currencyRules';
import type { Lean } from '../types/lean';

interface EventFilters {
  eventStatus?: 'upcoming' | 'ongoing' | 'completed';
  eventType?: string;
  sponsorId?: string;
  city?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

class SocialImpactService {
  // Get all social impact events with filters
  async getEvents(
    filters: EventFilters = {},
    pagination: PaginationOptions = {},
    userId?: string
  ): Promise<{
    events: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { eventStatus, eventType, sponsorId, city } = filters;
    const { page = 1, limit = 20 } = pagination;

    const query: any = {
      type: 'social_impact',
      status: { $in: ['active', 'upcoming'] }
    };

    if (eventStatus) {
      query.eventStatus = eventStatus;
    }

    if (eventType) {
      query.eventType = eventType;
    }

    if (sponsorId) {
      query.sponsor = sponsorId;
    }

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    const total = await Program.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const events = await Program.find(query)
      .select('-participants')
      .populate('sponsor', 'name logo brandCoinName brandCoinLogo')
      .sort({ eventDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean().exec();

    // If user is logged in, check their enrollment status
    let userEnrollments: Map<string, ISocialImpactEnrollment> = new Map();
    if (userId) {
      const enrollments = await SocialImpactEnrollment.find({
        user: userId,
        program: { $in: events.map((e: any) => e._id) }
      }).lean();
      enrollments.forEach((e: any) => {
        userEnrollments.set(e.program.toString(), e);
      });
    }

    const eventsWithStatus = events.map((event: any) => {
      const enrollment = userEnrollments.get((event._id as mongoose.Types.ObjectId).toString());
      return {
        ...event,
        isEnrolled: !!enrollment,
        enrollmentStatus: enrollment?.status || null,
        enrollmentId: enrollment?._id || null
      };
    });

    return { events: eventsWithStatus, total, page, totalPages };
  }

  // Get single event by ID
  async getEventById(eventId: string, userId?: string): Promise<any> {
    const event = await Program.findOne({
      _id: eventId,
      type: 'social_impact'
    })
      .populate('sponsor', 'name logo brandCoinName brandCoinLogo description website')
      .populate('merchant', 'businessName logo description phone businessAddress website')
      .lean().exec();

    if (!event) {
      return null;
    }

    let enrollment = null;
    if (userId) {
      enrollment = await SocialImpactEnrollment.findOne({
        user: userId,
        program: eventId
      }).lean();
    }

    // Look up the merchant's store if merchant exists
    let merchantStore = null;
    if (event.merchant) {
      const { Store } = await import('../models/Store');
      merchantStore = await Store.findOne({ merchantId: event.merchant._id })
        .select('name logo address phone rating category')
        .lean();
    }

    return {
      ...event,
      merchantStore: merchantStore || null,
      isEnrolled: !!enrollment,
      enrollmentStatus: enrollment?.status || null,
      enrollmentId: enrollment?._id || null,
      enrolledAt: enrollment?.registeredAt || null
    };
  }

  // Register user for an event
  async registerUser(userId: string, eventId: string): Promise<ISocialImpactEnrollment> {
    const event = await Program.findOne({
      _id: eventId,
      type: 'social_impact'
    }).lean();

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.eventStatus === 'completed' || event.eventStatus === 'cancelled') {
      throw new Error('Event is no longer accepting registrations');
    }

    // Check capacity
    if (event.capacity && event.capacity.goal > 0) {
      if ((event.capacity.enrolled || 0) >= event.capacity.goal) {
        throw new Error('Event is full');
      }
    }

    // Check if already registered — NOT lean because .save() is called on re-register
    const existing = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId
    });

    if (existing) {
      if (existing.status === 'cancelled') {
        // Re-register if previously cancelled
        existing.status = 'registered';
        existing.registeredAt = new Date();
        existing.cancelledAt = undefined;
        existing.cancellationReason = undefined;
        await existing.save();

        // Update capacity
        await Program.findByIdAndUpdate(eventId, {
          $inc: { 'capacity.enrolled': 1 }
        });

        // Update user stats
        await UserImpactStats.findOneAndUpdate(
          { user: userId },
          {
            $inc: { totalEventsRegistered: 1 },
            $setOnInsert: { user: userId }
          },
          { upsert: true }
        );

        return existing;
      }
      throw new Error('Already registered for this event');
    }

    // Create enrollment
    const enrollment = await SocialImpactEnrollment.create({
      user: userId,
      program: eventId,
      status: 'registered',
      registeredAt: new Date()
    });

    // Update capacity
    await Program.findByIdAndUpdate(eventId, {
      $inc: { 'capacity.enrolled': 1 }
    });

    // Update user stats
    await UserImpactStats.findOneAndUpdate(
      { user: userId },
      {
        $inc: { totalEventsRegistered: 1 },
        $setOnInsert: { user: userId }
      },
      { upsert: true }
    );

    return enrollment;
  }

  // Cancel registration
  async cancelRegistration(userId: string, eventId: string, reason?: string): Promise<void> {
    const enrollment = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId
    });

    if (!enrollment) {
      throw new Error('Not registered for this event');
    }

    if (enrollment.status === 'completed') {
      throw new Error('Cannot cancel completed participation');
    }

    if (enrollment.status === 'cancelled') {
      throw new Error('Registration already cancelled');
    }

    // Update enrollment
    enrollment.status = 'cancelled';
    enrollment.cancelledAt = new Date();
    enrollment.cancellationReason = reason;
    await enrollment.save();

    // Update capacity
    await Program.findByIdAndUpdate(eventId, {
      $inc: { 'capacity.enrolled': -1 }
    });

    // Update user stats
    await UserImpactStats.findOneAndUpdate(
      { user: userId },
      { $inc: { totalEventsCancelled: 1 } }
    );
  }

  // Check-in user at event (admin only)
  async checkInUser(
    userId: string,
    eventId: string,
    adminId: string
  ): Promise<ISocialImpactEnrollment> {
    const enrollment = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId
    });

    if (!enrollment) {
      throw new Error('User is not registered for this event');
    }

    if (enrollment.status !== 'registered') {
      throw new Error(`Cannot check in user with status: ${enrollment.status}`);
    }

    enrollment.status = 'checked_in';
    enrollment.checkedInAt = new Date();
    enrollment.checkedInBy = new mongoose.Types.ObjectId(adminId);
    await enrollment.save();

    await enrollment.populate('user', 'fullName phoneNumber email profile.firstName profile.lastName profile.avatar');
    return enrollment;
  }

  // Complete participation and award coins (admin only)
  async completeParticipation(
    userId: string,
    eventId: string,
    adminId: string,
    impactValue?: number
  ): Promise<Lean<ISocialImpactEnrollment>> {
    const event = await Program.findOne({
      _id: eventId,
      type: 'social_impact'
    }).populate('sponsor').lean();

    if (!event) {
      throw new Error('Event not found');
    }

    // Enforce check-in requirement if configured
    const requireCheckIn = event.verificationConfig?.requireCheckInBeforeComplete;
    const allowedStatuses = requireCheckIn
      ? ['checked_in']
      : ['registered', 'checked_in'];

    // Atomic status transition with idempotency guard
    const idempotencyKey = `si:${eventId}:${userId}`;
    const impactMetric = event.impact?.metric || 'hours';
    const impactVal = impactValue || 1;

    const enrollment = await SocialImpactEnrollment.findOneAndUpdate(
      {
        user: userId,
        program: eventId,
        status: { $in: allowedStatuses },
        rewardIdempotencyKey: { $exists: false }
      },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          completedBy: new mongoose.Types.ObjectId(adminId),
          rewardIdempotencyKey: idempotencyKey,
          impactContributed: (event.impact && impactValue) ? {
            metric: event.impact.metric,
            value: impactValue
          } : undefined
        }
      },
      { new: true }
    );

    if (!enrollment) {
      // Check if already completed (idempotent return)
      const existing = await SocialImpactEnrollment.findOne({
        user: userId,
        program: eventId
      }).lean();
      if (!existing) {
        throw new Error('User is not registered for this event');
      }
      if (existing.status === 'completed') {
        return existing; // Idempotent: already completed
      }
      if (existing.status === 'cancelled' || existing.status === 'no_show') {
        throw new Error(`Cannot complete participation with status: ${existing.status}`);
      }
      if (requireCheckIn && existing.status === 'registered') {
        throw new Error('User must check in before completion. This event requires attendance verification.');
      }
      throw new Error('Participation already being processed');
    }

    // Award ReZ coins via coinService (updates BOTH CoinTransaction AND Wallet)
    const rezCoins = event.rewards?.rezCoins || 0;
    const brandCoins = event.rewards?.brandCoins || 0;
    let actualBrandCoinsAwarded = 0;

    if (rezCoins > 0) {
      await awardCoins(
        userId,
        rezCoins,
        'social_impact_reward',
        `Completed social impact event: ${event.name}`,
        {
          eventId: event._id,
          eventType: event.eventType,
          sponsorId: event.sponsor?._id,
          enrollmentId: enrollment._id
        }
      );
    }

    // Award Branded coins to wallet
    if (brandCoins > 0 && event.sponsor) {
      try {
        // Check sponsor budget if SponsorAllocation model exists
        let budgetSufficient = true;
        try {
          const SponsorAllocation = mongoose.model('SponsorAllocation');
          const balance = await (SponsorAllocation as any).getSponsorBalance(event.sponsor._id.toString());
          if (balance < brandCoins) {
            logger.warn(`[SocialImpact] Sponsor ${event.sponsor._id} budget insufficient: ${balance} < ${brandCoins}`);
            budgetSufficient = false;
          }
        } catch {
          // SponsorAllocation model not yet created — skip budget check (Phase 2)
          budgetSufficient = true;
        }

        if (budgetSufficient) {
          // Credit branded coins to user's wallet
          let wallet = await Wallet.findOne({ user: userId });
          if (!wallet) {
            wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
          }
          if (wallet) {
            await wallet.addBrandedCoins(
              event.sponsor._id,
              (event.sponsor as any).brandCoinName || (event.sponsor as any).name,
              brandCoins,
              (event.sponsor as any).brandCoinLogo,
              undefined
            );
            actualBrandCoinsAwarded = brandCoins;

            // Calculate expiry for branded coins
            let brandedExpiresAt: Date | undefined;
            try {
              const walletConfig = await getCachedWalletConfig();
              const expiryDays = walletConfig?.coinExpiryConfig?.branded?.expiryDays ?? CURRENCY_RULES.branded.expiryDays;
              if (expiryDays > 0) { brandedExpiresAt = new Date(); brandedExpiresAt.setDate(brandedExpiresAt.getDate() + expiryDays); }
            } catch { /* fallback handled by backfill job */ }

            // Record branded coin transaction for audit trail (uses createTransaction to preserve running balance)
            const sponsorDoc = event.sponsor as any;
            await CoinTransaction.createTransaction(
              userId,
              'branded_award',
              brandCoins,
              'social_impact_reward',
              `${sponsorDoc.brandCoinName || sponsorDoc.name} earned from: ${event.name}`,
              {
                eventId: event._id,
                sponsorId: event.sponsor._id,
                sponsorName: sponsorDoc.name,
                enrollmentId: (enrollment as any)._id,
                isBrandedCoin: true,
                ...(brandedExpiresAt && { expiresAt: brandedExpiresAt }),
              }
            );

            // Debit sponsor budget if SponsorAllocation model exists
            try {
              const SponsorAllocation = mongoose.model('SponsorAllocation');
              await (SponsorAllocation as any).recordDisburse(
                event.sponsor._id.toString(),
                eventId,
                (enrollment as any)._id.toString(),
                userId,
                brandCoins
              );
            } catch {
              // SponsorAllocation not yet created — skip (Phase 2)
            }
          }
        }
      } catch (brandError) {
        logger.error('[SocialImpact] Failed to award branded coins:', brandError);
        // Don't fail the entire completion — rez coins already awarded
      }
    }

    // Update enrollment with actual coins awarded
    await SocialImpactEnrollment.findByIdAndUpdate(enrollment._id, {
      $set: {
        'coinsAwarded.rez': rezCoins,
        'coinsAwarded.brand': actualBrandCoinsAwarded,
        'coinsAwarded.awardedAt': new Date()
      }
    });

    // Update user impact stats
    await (UserImpactStats as unknown as unknown as IUserImpactStatsModel).updateStatsOnCompletion(
      userId,
      event.eventType || 'other',
      impactMetric,
      impactVal,
      rezCoins,
      actualBrandCoinsAwarded,
      event.sponsor?._id?.toString()
    );

    // Update event impact current value
    if (event.impact) {
      await Program.findByIdAndUpdate(eventId, {
        $inc: { 'impact.currentValue': impactVal }
      });
    }

    // Update sponsor stats if applicable
    if (event.sponsor) {
      const sponsorService = (await import('./sponsorService')).default;
      await sponsorService.updateSponsorStats(event.sponsor._id.toString());
    }

    // Return the updated enrollment
    const updatedEnrollment = await SocialImpactEnrollment.findById(enrollment._id).lean();
    return updatedEnrollment! as unknown as Lean<ISocialImpactEnrollment>;
  }

  // Mark user as no-show (admin only)
  async markNoShow(userId: string, eventId: string, adminId: string): Promise<void> {
    const enrollment = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId
    });

    if (!enrollment) {
      throw new Error('User is not registered for this event');
    }

    if (enrollment.status === 'completed') {
      throw new Error('Cannot mark completed participation as no-show');
    }

    enrollment.status = 'no_show';
    await enrollment.save();
  }

  // Get user's impact stats
  async getUserStats(userId: string): Promise<any> {
    let stats = await UserImpactStats.findOne({ user: userId }).lean();

    if (!stats) {
      // Return default stats if none exist
      return {
        totalEventsRegistered: 0,
        totalEventsCompleted: 0,
        totalEventsAttended: 0,
        livesImpacted: 0,
        treesPlanted: 0,
        hoursContributed: 0,
        mealsServed: 0,
        totalRezCoinsEarned: 0,
        totalBrandCoinsEarned: 0,
        currentStreak: 0,
        longestStreak: 0
      };
    }

    return stats;
  }

  // Get user's enrolled events
  async getUserEnrollments(
    userId: string,
    status?: string
  ): Promise<any[]> {
    const query: any = { user: userId };
    if (status) {
      query.status = status;
    }

    const enrollments = await SocialImpactEnrollment.find(query)
      .populate({
        path: 'program',
        select: 'name eventType eventDate eventTime location rewards capacity impact eventStatus image organizer',
        populate: {
          path: 'sponsor',
          select: 'name logo brandCoinName'
        }
      })
      .sort({ registeredAt: -1 })
      .lean().exec();

    return enrollments.map((e: any) => ({
      enrollmentId: e._id,
      status: e.status,
      registeredAt: e.registeredAt,
      checkedInAt: e.checkedInAt,
      completedAt: e.completedAt,
      coinsAwarded: e.coinsAwarded,
      event: e.program
    }));
  }

  // Get event participants (admin only)
  async getEventParticipants(
    eventId: string,
    status?: string
  ): Promise<any[]> {
    const query: any = { program: eventId };
    if (status) {
      query.status = status;
    }

    const enrollments = await SocialImpactEnrollment.find(query)
      .populate('user', 'fullName phoneNumber email profile.firstName profile.lastName profile.avatar')
      .sort({ registeredAt: -1 })
      .lean().exec();

    return enrollments;
  }

  // Bulk complete participants (admin only)
  async bulkComplete(
    eventId: string,
    userIds: string[],
    adminId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        await this.completeParticipation(userId, eventId, adminId);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`User ${userId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  // Create social impact event (admin only)
  async createEvent(data: any): Promise<IProgram> {
    // Validate sponsor if provided
    if (data.sponsor) {
      const sponsor = await Sponsor.findById(data.sponsor).lean();
      if (!sponsor) {
        throw new Error('Sponsor not found');
      }
      if (!sponsor.isActive) {
        throw new Error('Sponsor is not active');
      }
    }

    const event = await Program.create({
      ...data,
      type: 'social_impact',
      status: data.status || 'active',
      startDate: data.eventDate || new Date(),
      capacity: {
        goal: data.capacity?.goal || 100,
        enrolled: 0
      }
    });

    return event;
  }

  // Update social impact event (admin only)
  async updateEvent(eventId: string, data: any): Promise<IProgram | null> {
    const event = await Program.findOneAndUpdate(
      { _id: eventId, type: 'social_impact' },
      { $set: data },
      { new: true }
    );

    return event;
  }

  // ========== ATTENDANCE VERIFICATION METHODS ==========

  // Generate QR check-in token for a registered user
  async generateCheckInQR(eventId: string, userId: string): Promise<{ qrPayload: string; qrToken: string }> {
    const enrollment = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId,
      status: 'registered'
    });
    if (!enrollment) {
      throw new Error('No active registration found');
    }

    const qrToken = `SI-${eventId.slice(-6)}-${userId.slice(-6)}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    enrollment.verification = enrollment.verification || {} as any;
    enrollment.verification!.method = 'qr';
    enrollment.verification!.qrToken = qrToken;
    enrollment.markModified('verification');
    await enrollment.save();

    const qrPayload = JSON.stringify({
      type: 'REZ_SOCIAL_IMPACT_CHECKIN',
      qrToken: qrToken,
      eventId,
      userId
    });

    return { qrPayload, qrToken };
  }

  // Verify QR check-in (organizer/admin scans user QR)
  async verifyQRCheckIn(qrToken: string, adminId: string): Promise<ISocialImpactEnrollment> {
    const enrollment = await SocialImpactEnrollment.findOne({
      'verification.qrToken': qrToken,
      status: 'registered'
    });
    if (!enrollment) {
      throw new Error('Invalid or already used QR token');
    }

    enrollment.status = 'checked_in';
    enrollment.checkedInAt = new Date();
    enrollment.checkedInBy = new mongoose.Types.ObjectId(adminId);
    enrollment.verification = enrollment.verification || {} as any;
    enrollment.verification!.qrScannedAt = new Date();
    enrollment.verification!.verifiedAt = new Date();
    enrollment.markModified('verification');
    await enrollment.save();

    await enrollment.populate('user', 'fullName phoneNumber email profile.firstName profile.lastName profile.avatar');
    return enrollment;
  }

  // Generate OTP for event check-in (admin generates, displayed at event)
  async generateEventOTP(eventId: string, userId: string): Promise<{ otpCode: string }> {
    const otpCode = crypto.randomInt(100000, 999999).toString();

    const enrollment = await SocialImpactEnrollment.findOneAndUpdate(
      { user: userId, program: eventId, status: 'registered' },
      {
        $set: {
          'verification.method': 'otp',
          'verification.otpCode': otpCode,
          'verification.otpExpiresAt': new Date(Date.now() + 30 * 60 * 1000) // 30 min expiry
        }
      },
      { new: true }
    );
    if (!enrollment) {
      throw new Error('No active registration found');
    }

    return { otpCode };
  }

  // Verify OTP check-in (user enters OTP shown at event)
  async verifyOTPCheckIn(eventId: string, userId: string, otpCode: string): Promise<ISocialImpactEnrollment> {
    const enrollment = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId,
      status: 'registered'
    });
    if (!enrollment) {
      throw new Error('Not registered for this event');
    }
    if (!enrollment.verification?.otpCode || enrollment.verification.otpCode !== otpCode) {
      throw new Error('Invalid OTP');
    }
    if (enrollment.verification?.otpExpiresAt && enrollment.verification.otpExpiresAt < new Date()) {
      throw new Error('OTP expired');
    }

    enrollment.status = 'checked_in';
    enrollment.checkedInAt = new Date();
    enrollment.verification = enrollment.verification || {} as any;
    enrollment.verification!.otpVerifiedAt = new Date();
    enrollment.verification!.verifiedAt = new Date();
    enrollment.markModified('verification');
    await enrollment.save();

    return enrollment;
  }

  // Verify geo check-in (user submits location, server validates proximity)
  async verifyGeoCheckIn(eventId: string, userId: string, lat: number, lng: number): Promise<ISocialImpactEnrollment> {
    const event = await Program.findById(eventId).lean();
    if (!event?.location?.coordinates?.lat || !event?.location?.coordinates?.lng) {
      throw new Error('Event has no location coordinates configured');
    }

    const enrollment = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId,
      status: 'registered'
    });
    if (!enrollment) {
      throw new Error('Not registered for this event');
    }

    // Haversine distance calculation
    const distance = this.haversineDistance(
      lat, lng,
      event.location.coordinates.lat,
      event.location.coordinates.lng
    );

    const maxRadius = event.verificationConfig?.geoFenceRadiusMeters || 500;
    if (distance > maxRadius) {
      throw new Error(`Too far from event location (${Math.round(distance)}m away, max ${maxRadius}m)`);
    }

    enrollment.status = 'checked_in';
    enrollment.checkedInAt = new Date();
    enrollment.verification = enrollment.verification || {} as any;
    enrollment.verification!.method = 'geo';
    enrollment.verification!.geoLocation = { lat, lng };
    enrollment.verification!.geoDistanceMeters = Math.round(distance);
    enrollment.verification!.geoVerifiedAt = new Date();
    enrollment.verification!.verifiedAt = new Date();
    enrollment.markModified('verification');
    await enrollment.save();

    return enrollment;
  }

  // Haversine distance between two points in meters
  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Get leaderboard
  async getLeaderboard(
    metric: 'totalEventsCompleted' | 'livesImpacted' | 'treesPlanted' | 'totalRezCoinsEarned' = 'totalEventsCompleted',
    limit: number = 10
  ): Promise<any[]> {
    const sortField: any = {};
    sortField[metric] = -1;

    const leaderboard = await UserImpactStats.find({
      [metric]: { $gt: 0 }
    })
      .populate('user', 'fullName profile.firstName profile.lastName profile.avatar')
      .sort(sortField)
      .limit(limit)
      .lean().exec();

    return leaderboard.map((entry: any, index: number) => ({
      rank: index + 1,
      user: entry.user,
      [metric]: (entry as any)[metric],
      totalEventsCompleted: entry.totalEventsCompleted
    }));
  }
}

export default new SocialImpactService();
