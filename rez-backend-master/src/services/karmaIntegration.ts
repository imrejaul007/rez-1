/**
 * Karma Integration Service
 *
 * Connects backend services to karma service for:
 * - qr_in/qr_out signal recording
 * - Karma score tracking
 * - Level progression
 */

import { logger } from '../config/logger';

const KARMA_API_URL = process.env.KARMA_API_URL || 'http://localhost:4001';

export interface KarmaCheckInPayload {
  userId: string;
  eventId: string;
  mode: 'qr' | 'gps';
  qrCode?: string;
  gpsCoords?: {
    lat: number;
    lng: number;
  };
}

export interface KarmaCheckInResult {
  success: boolean;
  bookingId?: string;
  confidenceScore?: number;
  status?: 'verified' | 'partial' | 'rejected';
  signals?: {
    qr_in?: boolean;
    qr_out?: boolean;
    gps_match?: boolean;
    ngo_approved?: boolean;
    photo_proof?: boolean;
  };
  karmaEarned?: number;
  error?: string;
}

/**
 * Record QR check-in to karma service
 * Used by Social Impact and other event check-in flows
 */
export async function recordKarmaCheckIn(
  userId: string,
  eventId: string,
  mode: 'qr' | 'gps',
  qrCode?: string,
  gpsCoords?: { lat: number; lng: number },
): Promise<KarmaCheckInResult> {
  try {
    const response = await fetch(`${KARMA_API_URL}/api/karma/verify/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': process.env.INTERNAL_SERVICE_KEY || '',
      },
      body: JSON.stringify({
        userId,
        eventId,
        mode,
        qrCode,
        gpsCoords,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { message?: string };
      return {
        success: false,
        error: error?.message || 'Karma check-in failed',
      };
    }

    const result = (await response.json()) as {
      booking?: { _id?: string };
      confidenceScore?: number;
      status?: 'verified' | 'partial' | 'rejected' | string;
      signals?: { qr_in?: boolean; qr_out?: boolean };
      karmaEarned?: number;
    };
    return {
      success: true,
      bookingId: result.booking?._id,
      confidenceScore: result.confidenceScore,
      status: result.status as 'verified' | 'partial' | 'rejected' | undefined,
      signals: result.signals,
      karmaEarned: result.karmaEarned,
    };
  } catch (error) {
    logger.error('Karma check-in error:', error);
    return {
      success: false,
      error: 'Karma service unavailable',
    };
  }
}

/**
 * Record QR check-out to karma service
 * Used to complete event attendance and trigger karma calculation
 */
export async function recordKarmaCheckOut(
  userId: string,
  eventId: string,
  mode: 'qr' | 'gps',
  qrCode?: string,
  gpsCoords?: { lat: number; lng: number },
): Promise<{
  success: boolean;
  status?: 'verified' | 'partial' | 'rejected';
  karmaEarned?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${KARMA_API_URL}/api/karma/verify/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': process.env.INTERNAL_SERVICE_KEY || '',
      },
      body: JSON.stringify({
        userId,
        eventId,
        mode,
        qrCode,
        gpsCoords,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { message?: string };
      return {
        success: false,
        error: error?.message || 'Karma check-out failed',
      };
    }

    const result = await response.json() as { status?: string; karmaEarned?: number };
    return {
      success: true,
      status: result.status as 'verified' | 'partial' | 'rejected' | undefined,
      karmaEarned: result.karmaEarned,
    };
  } catch (error) {
    logger.error('Karma check-out error:', error);
    return {
      success: false,
      error: 'Karma service unavailable',
    };
  }
}

/**
 * Get user's karma profile
 */
export async function getKarmaProfile(userId: string): Promise<{
  success: boolean;
  profile?: {
    totalKarma: number;
    activeKarma: number;
    level: string;
    rank?: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch(`${KARMA_API_URL}/api/karma/user/${userId}`, {
      headers: {
        'x-service-key': process.env.INTERNAL_SERVICE_KEY || '',
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch karma profile' };
    }

    const data = await response.json() as { totalKarma?: number; activeKarma?: number; level?: string; rank?: string };
    return {
      success: true,
      profile: {
        totalKarma: data.totalKarma || data.activeKarma || 0,
        activeKarma: data.activeKarma || 0,
        level: data.level || 'bronze',
        rank: data.rank,
      },
    };
  } catch (error) {
    logger.error('Karma profile error:', error);
    return { success: false, error: 'Karma service unavailable' };
  }
}

/**
 * Get karma level multiplier for rewards
 */
export async function getKarmaMultiplier(userId: string): Promise<{
  multiplier: number;
  tier: string;
}> {
  try {
    const profile = await getKarmaProfile(userId);
    if (!profile.success || !profile.profile) {
      return { multiplier: 1.0, tier: 'default' };
    }

    // Multiplier based on karma level
    const tierMultipliers: Record<string, number> = {
      bronze: 1.0,
      silver: 1.25,
      gold: 1.5,
      platinum: 2.0,
    };

    return {
      multiplier: tierMultipliers[profile.profile.level] || 1.0,
      tier: profile.profile.level,
    };
  } catch {
    return { multiplier: 1.0, tier: 'default' };
  }
}

/**
 * NGO approves partial verification
 */
export async function approveKarmaVerification(
  bookingId: string,
  approved: boolean,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${KARMA_API_URL}/api/karma/booking/${bookingId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': process.env.INTERNAL_SERVICE_KEY || '',
      },
      body: JSON.stringify({ approved, notes }),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to update karma approval' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Karma approval error:', error);
    return { success: false, error: 'Karma service unavailable' };
  }
}
