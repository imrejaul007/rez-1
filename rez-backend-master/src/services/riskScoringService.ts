/**
 * riskScoringService.ts — Composite fraud/risk scoring engine
 *
 * Produces a 0-100 risk score from multiple signals and emits a decision
 * ('approve' | 'hold' | 'block'). Thresholds are read from the active
 * CashbackConfig so admins can tune them without code changes.
 */

import { logger } from '../config/logger';
import { User } from '../models/User';
import { CoinTransaction } from '../models/CoinTransaction';
import CashbackConfig from '../models/CashbackConfig';

export interface RiskScoreResult {
  score: number;
  flags: string[];
  decision: 'approve' | 'hold' | 'block';
}

/**
 * Calculate a composite risk score for a user + action.
 *
 * Scoring signals
 * ───────────────
 *  1. Device risk       — multiple accounts on the same device
 *  2. Velocity risk     — too many coin transactions in the last hour
 *  3. Account age risk  — newly created accounts
 *  4. Referral risk     — account flagged by referral fraud detection
 *
 * The block / hold thresholds are read from CashbackConfig so they can be
 * updated by admins from the fraud-config screen without a deployment.
 *
 * @param userId   MongoDB user ObjectId string
 * @param action   Human-readable action label (for log context only)
 * @param metadata Optional extra metadata for future signal extensions
 */
export async function calculateUserRiskScore(
  userId: string,
  action: string,
  metadata: Record<string, any> = {},
): Promise<RiskScoreResult> {
  let score = 0;
  const flags: string[] = [];

  try {
    const [user, config] = await Promise.all([
      User.findById(userId).select('flags devices referral createdAt').lean(),
      CashbackConfig.getActiveConfig(),
    ]);

    // ── 1. Device risk ────────────────────────────────────────────────────
    // flags.multiDeviceWarning and flags.linkedDeviceCount are set by the
    // devicePatternAnalysisJob when it detects multiple accounts sharing a
    // device fingerprint. Cast via `any` because these fields live on a
    // flexible flags sub-document and are not part of the typed interface.
    const userFlags = (user as any)?.flags;
    if (userFlags?.multiDeviceWarning) {
      score += 25;
      flags.push('multi_device');
    }
    if (userFlags?.linkedDeviceCount > 5) {
      score += 15;
      flags.push('device_farm');
    }

    // ── 2. Velocity risk ─────────────────────────────────────────────────
    // Count coin transactions created in the last 60 minutes for this user.
    const recentTxCount = await CoinTransaction.countDocuments({
      user: userId,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });
    if (recentTxCount > 20) {
      score += 30;
      flags.push('high_velocity');
    } else if (recentTxCount > 10) {
      score += 15;
      flags.push('elevated_velocity');
    }

    // ── 3. Account age risk ───────────────────────────────────────────────
    const accountAge = Date.now() - new Date((user as any)?.createdAt || Date.now()).getTime();
    if (accountAge < 24 * 60 * 60 * 1000) {
      score += 15;
      flags.push('new_account');
    }

    // ── 4. Referral fraud risk ────────────────────────────────────────────
    const referral = (user as any)?.referral;
    if (referral?.fraudBlocked) {
      score += 20;
      flags.push('referral_fraud');
    }

    // ── Decision ──────────────────────────────────────────────────────────
    const blockThreshold = config.riskScoreBlockThreshold ?? 70;
    const holdThreshold = config.riskScoreHoldThreshold ?? 30;

    let decision: 'approve' | 'hold' | 'block' = 'approve';
    if (score >= blockThreshold) {
      decision = 'block';
    } else if (score >= holdThreshold) {
      decision = 'hold';
    }

    logger.info('[RISK SCORE] Calculated', { userId, action, score, flags, decision });

    return { score, flags, decision };
  } catch (error) {
    // Non-fatal: if risk scoring fails, default to approve so legitimate
    // users are not blocked by infra errors. Log prominently.
    logger.error('[RISK SCORE] Scoring failed — defaulting to approve', { userId, action, error });
    return { score: 0, flags: ['scoring_error'], decision: 'approve' };
  }
}
