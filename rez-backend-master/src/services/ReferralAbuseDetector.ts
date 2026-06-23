import redisService from './redisService';
import mongoose from 'mongoose';
import { logger } from '../config/logger';

interface AbuseCheckResult {
  isAbusive: boolean;
  confidence: number; // 0-100
  reasons: string[];
  action: 'allow' | 'flag' | 'block';
}

export class ReferralAbuseDetector {
  /**
   * Check if a referral application looks fraudulent.
   * Uses device graph + social graph + velocity checks.
   */
  static async check(params: {
    referrerId: string;
    refereeId: string;
    refereePhone: string;
    refereeDevice?: string;
    refereeIp?: string;
    referrerDevice?: string;
    referrerIp?: string;
  }): Promise<AbuseCheckResult> {
    const reasons: string[] = [];
    let confidence = 0;

    // Self-referral check: a user cannot refer themselves
    if (params.referrerId === params.refereeId) {
      return {
        isAbusive: true,
        confidence: 100,
        reasons: ['self_referral'],
        action: 'block',
      };
    }

    try {
      const client = redisService.getClient();
      if (!client) {
        logger.warn('[ReferralAbuseDetector] Redis unavailable');
        return {
          isAbusive: false,
          confidence: 0,
          reasons: ['redis_unavailable'],
          action: 'allow',
        };
      }

      const [sameDeviceReferrals, sameIpReferrals, referrerTotalReferrals, recentReferrals] = await Promise.all([
        // How many referrals has referrer made from same device?
        params.refereeDevice && params.referrerDevice
          ? (client as any).scard(`referral:device:${params.referrerDevice}`)
          : Promise.resolve(0),

        // How many referrals from same IP?
        params.refereeIp && params.referrerIp
          ? (client as any).scard(`referral:ip:${params.referrerIp}`)
          : Promise.resolve(0),

        // Total referrals by this referrer ever
        (client as any).get(`referral:count:${params.referrerId}`).then((v: string | null) => parseInt(v || '0', 10)),

        // Referrals in last hour (velocity check)
        (client as any).zcount(`referral:velocity:${params.referrerId}`, Date.now() - 3600000, Date.now()),
      ]);

      // MIGUEL: abuse prevention — device fingerprint stricter matching
      // Exploit: attacker uses same device but different phone numbers to create multiple accounts
      // Counter: require BOTH device AND (phone_number OR email) to match to be legitimate
      // Same device + different phone = high abuse signal (farming ring)

      // Rule 1: Same device as referrer
      if (params.refereeDevice && params.referrerDevice && params.refereeDevice === params.referrerDevice) {
        reasons.push('same_device_as_referrer');
        confidence += 70;

        // MIGUEL: device + phone number conjunction check
        // If device matches but phone is different, this is likely a farm account on same hardware
        // Query user records to check if phone differs
        try {
          const User = mongoose.models['User'];
          if (User) {
            const [referrerUser, refereeUser] = await Promise.all([
              User.findById(params.referrerId).select('phone deviceId').lean() as Promise<any>,
              User.findById(params.refereeId).select('phone deviceId').lean() as Promise<any>,
            ]);

            if (
              referrerUser?.phone &&
              refereeUser?.phone &&
              referrerUser.deviceId === refereeUser.deviceId &&
              referrerUser.phone !== refereeUser.phone
            ) {
              // Same device, different phone numbers = clear farm account signal
              reasons.push('same_device_different_phone_farm_ring');
              confidence += 50; // Significant boost for this pattern
              logger.warn('[ReferralAbuseDetector] Farm ring detected: same device, different phones', {
                referrerId: params.referrerId,
                refereeId: params.refereeId,
                deviceId: params.referrerDevice,
              });
            }
          }
        } catch (err) {
          logger.debug('[ReferralAbuseDetector] Device+phone check failed:', err);
        }
      }

      // Rule 2: Same IP as referrer
      if (params.refereeIp && params.referrerIp && params.refereeIp === params.referrerIp) {
        reasons.push('same_ip_as_referrer');
        confidence += 40;
      }

      // Rule 3: Too many referrals from same device
      if (sameDeviceReferrals > 3) {
        reasons.push(`device_cluster_${sameDeviceReferrals}_referrals`);
        confidence += Math.min(sameDeviceReferrals * 10, 50);
      }

      // Rule 4: Velocity — more than 5 referrals in 1 hour
      if (recentReferrals > 5) {
        reasons.push(`high_velocity_${recentReferrals}_per_hour`);
        confidence += Math.min(recentReferrals * 8, 60);
      }

      // MIGUEL: abuse prevention — 24-hour referral velocity spike
      // Flag users generating >5 referrals in 24h for review (don't auto-block, but queue for manual review)
      // This catches farming rings that spread referrals over time but still complete them within 24h
      const referral24hCount = await (client as any).zcount(
        `referral:velocity:${params.referrerId}:24h`,
        Date.now() - 24 * 3600000,
        Date.now(),
      );
      if (referral24hCount > 5) {
        reasons.push(`velocity_spike_24h_${referral24hCount}_referrals`);
        confidence += 25; // Medium confidence — needs manual review
        // Queue for review but don't auto-block (may be legitimate power user)
        try {
          const ReviewQueue = mongoose.models['ReferralReviewQueue'];
          if (ReviewQueue) {
            await ReviewQueue.findOneAndUpdate(
              { userId: params.referrerId },
              {
                userId: params.referrerId,
                reason: `24h_velocity_spike_${referral24hCount}`,
                referralsInWindow: referral24hCount,
                flaggedAt: new Date(),
                status: 'pending_review',
              },
              { upsert: true },
            ).catch((err: any) => {
              logger.warn('[ReferralAbuseDetector] Failed to queue for review:', err);
            });
          }
        } catch (err) {
          logger.warn('[ReferralAbuseDetector] Review queue error:', err);
        }
      }

      // Rule 5: Too many total referrals (fraud ring)
      if (referrerTotalReferrals > 50) {
        reasons.push(`suspicious_total_${referrerTotalReferrals}_referrals`);
        confidence += 30;
      }

      // Rule 6: Check if referee was already referred by someone the referrer referred
      // (pyramid detection — expensive, only check on high suspicion)
      if (confidence > 30) {
        try {
          const User = mongoose.models['User'];
          if (User) {
            const refereeUser = (await User.findById(params.refereeId).select('referredBy').lean()) as any;
            if (refereeUser?.referredBy) {
              const referrerOfReferee = (await User.findById(refereeUser.referredBy)
                .select('referredBy')
                .lean()) as any;
              if (referrerOfReferee?.referredBy?.toString() === params.referrerId) {
                reasons.push('pyramid_pattern_detected');
                confidence += 80;
              }
            }
          }
        } catch (err) {
          logger.warn('[ReferralAbuseDetector] Pyramid check error:', err);
        }
      }

      // Update velocity tracking (regardless of decision)
      try {
        const velocityKey = `referral:velocity:${params.referrerId}`;
        await (client as any).zadd(velocityKey, Date.now(), `${params.refereeId}:${Date.now()}`);
        await (client as any).expire(velocityKey, 7200); // keep 2 hours
      } catch (err) {
        logger.warn('[ReferralAbuseDetector] Velocity tracking error:', err);
      }

      // Update device graph
      try {
        if (params.referrerDevice) {
          await (client as any).sadd(`referral:device:${params.referrerDevice}`, params.refereeId);
          await (client as any).expire(`referral:device:${params.referrerDevice}`, 30 * 24 * 3600);
        }
      } catch (err) {
        logger.warn('[ReferralAbuseDetector] Device graph update error:', err);
      }

      // Increment total referral count
      try {
        await (client as any).incr(`referral:count:${params.referrerId}`);
      } catch (err) {
        logger.warn('[ReferralAbuseDetector] Referral count increment error:', err);
      }

      confidence = Math.min(confidence, 100);

      let action: 'allow' | 'flag' | 'block';
      if (confidence >= 80) action = 'block';
      else if (confidence >= 40) action = 'flag';
      else action = 'allow';

      return {
        isAbusive: action !== 'allow',
        confidence,
        reasons,
        action,
      };
    } catch (err) {
      logger.error('[ReferralAbuseDetector] Unexpected error:', err);
      return {
        isAbusive: false,
        confidence: 0,
        reasons: ['check_error'],
        action: 'allow',
      };
    }
  }

  /** Store a fraud flag for admin review */
  static async storeFraudFlag(referrerId: string, refereeId: string, result: AbuseCheckResult) {
    try {
      const FraudFlag = mongoose.models['FraudFlag'];
      if (!FraudFlag) {
        logger.warn('[ReferralAbuseDetector] FraudFlag model not found');
        return;
      }
      await FraudFlag.create({
        type: 'referral_abuse',
        severity: result.action === 'block' ? 'high' : 'medium',
        userId: referrerId,
        metadata: {
          refereeId,
          confidence: result.confidence,
          reasons: result.reasons,
        },
        status: 'open',
        createdAt: new Date(),
      }).catch((err: any) => {
        logger.warn('[ReferralAbuseDetector] Failed to store fraud flag:', err);
      });
    } catch (err) {
      logger.error('[ReferralAbuseDetector] Error storing fraud flag:', err);
    }
  }
}
