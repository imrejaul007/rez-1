import { logger } from '../config/logger';
import { TrialBooking } from '../models/TrialBooking';
import { TrialOffer } from '../models/TrialOffer';
import mongoose, { Types } from 'mongoose';

interface Geo {
  lat: number;
  lng: number;
}

class TrialFraudService {
  /**
   * Calculate distance between two geographic points (in km)
   */
  private calculateDistance(geo1: Geo, geo2: Geo): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((geo2.lat - geo1.lat) * Math.PI) / 180;
    const dLng = ((geo2.lng - geo1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((geo1.lat * Math.PI) / 180) *
        Math.cos((geo2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check booking fraud
   */
  async checkBookingFraud(
    userId: Types.ObjectId,
    trialId: Types.ObjectId,
    merchantId: Types.ObjectId,
    userGeo: Geo
  ): Promise<{ allowed: boolean; signals: string[] }> {
    const signals: string[] = [];

    try {
      // Signal 1: Velocity abuse (> 5 bookings in last 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentBookings = await TrialBooking.countDocuments({
        userId,
        createdAt: { $gte: oneHourAgo }
      });

      if (recentBookings > 5) {
        signals.push('velocity_abuse');
      }

      // Signal 2: Duplicate trial this month (same user + trial, not expired)
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const duplicateBooking = await TrialBooking.findOne({
        userId,
        trialId,
        createdAt: { $gte: monthStart },
        status: { $nin: ['expired', 'fraud_rejected'] }
      });

      if (duplicateBooking) {
        signals.push('duplicate_trial_month');
      }

      // Signal 3: Geo implausible (> 50km from merchant)
      const trial = await TrialOffer.findById(trialId).lean();

      if (trial) {
        // Get merchant location from TrialOffer or related merchant doc
        // For now, we assume merchant geo is stored or can be fetched
        // Placeholder: assuming merchantGeo is available via merchant lookup
        try {
          // This would be replaced with actual merchant lookup
          const merchantGeo = { lat: 0, lng: 0 }; // Placeholder

          const distance = this.calculateDistance(userGeo, merchantGeo);
          if (distance > 50) {
            signals.push('geo_implausible');
          }
        } catch (err) {
          logger.warn('[TrialFraudService] Could not verify merchant geo', {
            merchantId: merchantId.toString()
          });
        }
      }

      const allowed = signals.length === 0;

      logger.info('[TrialFraudService] Booking fraud check', {
        userId: userId.toString(),
        trialId: trialId.toString(),
        allowed,
        signals
      });

      return { allowed, signals };
    } catch (error) {
      logger.error('[TrialFraudService] checkBookingFraud error', {
        userId: userId.toString(),
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Check completion fraud
   */
  async checkCompletionFraud(
    bookingId: Types.ObjectId,
    merchantId: Types.ObjectId,
    scanGeo?: Geo
  ): Promise<{ allowed: boolean; signals: string[] }> {
    const signals: string[] = [];

    try {
      const booking = await TrialBooking.findById(bookingId);

      if (!booking) {
        throw new Error(`Booking not found: ${bookingId}`);
      }

      // Signal 1: Instant completion (< 2 minutes since booking)
      const timeSinceBooking = Date.now() - booking.createdAt.getTime();
      if (timeSinceBooking < 2 * 60 * 1000) {
        signals.push('instant_completion');
      }

      // Signal 2: Geo mismatch (> 500m from merchant)
      if (scanGeo) {
        const merchantGeo = booking.geoAtBooking; // Use merchant geo from booking
        const distance = this.calculateDistance(scanGeo, merchantGeo);

        if (distance > 0.5) {
          // 500m = 0.5km
          signals.push('geo_mismatch');
        }
      } else {
        signals.push('scan_geo_missing');
      }

      const allowed = signals.length === 0;

      logger.info('[TrialFraudService] Completion fraud check', {
        bookingId: bookingId.toString(),
        allowed,
        signals
      });

      return { allowed, signals };
    } catch (error) {
      logger.error('[TrialFraudService] checkCompletionFraud error', {
        bookingId: bookingId.toString(),
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Record fraud signals on booking
   */
  async recordFraudSignals(bookingId: Types.ObjectId, signals: string[]): Promise<void> {
    try {
      await TrialBooking.updateOne(
        { _id: bookingId },
        {
          fraudSignals: signals,
          status: signals.length > 0 ? 'fraud_rejected' : undefined,
          updatedAt: new Date()
        }
      );

      logger.info('[TrialFraudService] Fraud signals recorded', {
        bookingId: bookingId.toString(),
        signals,
        statusChanged: signals.length > 0
      });
    } catch (error) {
      logger.error('[TrialFraudService] recordFraudSignals error', {
        bookingId: bookingId.toString(),
        error: (error as Error).message
      });
      throw error;
    }
  }
}

export default new TrialFraudService();
