/**
 * rezCapitalScoringJob — REZ Capital credit scoring engine.
 *
 * Runs weekly (Sunday 3 AM) to compute a pre-approval score for every merchant.
 * Score is built from four signals all already in the DB:
 *
 *   1. GMV (0-40)        — monthly revenue through REZ orders
 *   2. Repayment (0-30)  — khata credit extended vs payments received
 *   3. Consistency (0-20)— active trading days in last 30d
 *   4. Cashback (0-10)   — runs at least one active cashback offer
 *
 * Score >= 60 → eligible
 * Pre-approved amount = 20% of 30d GMV, capped at ₹5,00,000
 * Interest rate = 1.5% (score 80+), 2.0% (score 65-79), 3.0% (score 60-64)
 *
 * Safe to re-run: upserts by merchantId so no duplicates.
 */

import cron from 'node-cron';
import mongoose from 'mongoose';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import { MerchantCapitalScore } from '../models/MerchantCapitalScore';
import { CustomerCredit } from '../models/CustomerCredit';

const logger = createServiceLogger('rez-capital-scoring');

const LOCK_KEY = 'rez_capital_scoring';
const LOCK_TTL = 3600; // 60 min max runtime
const SCORE_THRESHOLD = 60;
const CAP_PAISE = 500_000 * 100; // ₹5L in paise

// ── Helpers ────────────────────────────────────────────────────────────────────

function gmvToScore(gmv30dPaise: number): number {
  const rupees = gmv30dPaise / 100;
  if (rupees >= 1_000_000) return 40; // >₹10L
  if (rupees >= 500_000) return 30; // ₹5L-10L
  if (rupees >= 100_000) return 20; // ₹1L-5L
  if (rupees >= 50_000) return 10; // ₹50K-1L
  return 0;
}

function repaymentToScore(rate: number): number {
  // rate is 0-1 (payments / credits)
  return Math.round(Math.min(rate, 1) * 30);
}

function consistencyToScore(activeDays: number): number {
  return Math.round(Math.min(activeDays / 30, 1) * 20);
}

function scoreToInterestRate(score: number): number {
  if (score >= 80) return 1.5;
  if (score >= 65) return 2.0;
  return 3.0;
}

function preApprovedAmount(gmv30dPaise: number): number {
  return Math.min(Math.round(gmv30dPaise * 0.2), CAP_PAISE);
}

// ── Scoring logic ──────────────────────────────────────────────────────────────

async function scoreMerchant(merchantId: string): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const merchantOid = new mongoose.Types.ObjectId(merchantId);

  // ── Signal 1: GMV — sum revenue from merchant_daily_stats ───────────────────
  const MerchantDailyStat = mongoose.models['MerchantDailyStat'];
  let gmv30dPaise = 0;
  let activeDays30d = 0;

  if (MerchantDailyStat) {
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const statsAgg = await MerchantDailyStat.aggregate([
      {
        $match: {
          merchantId: merchantOid,
          date: { $gte: thirtyDaysAgoStr },
          totalOrders: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalRevenuePaise' },
          activeDays: { $sum: 1 },
        },
      },
    ]);
    if (statsAgg.length) {
      gmv30dPaise = statsAgg[0].totalRevenue ?? 0;
      activeDays30d = statsAgg[0].activeDays ?? 0;
    }
  }

  // ── Signal 2: Khata repayment rate ──────────────────────────────────────────
  const khataAgg = await CustomerCredit.aggregate([
    { $match: { merchantId: merchantOid } },
    { $unwind: '$transactions' },
    {
      $group: {
        _id: '$transactions.type',
        total: { $sum: '$transactions.amount' },
      },
    },
  ]);

  let totalCredits = 0;
  let totalPayments = 0;
  for (const row of khataAgg) {
    if (row._id === 'credit') totalCredits += row.total;
    if (row._id === 'payment') totalPayments += row.total;
  }
  const repaymentRate = totalCredits > 0 ? Math.min(totalPayments / totalCredits, 1) : 0;

  // ── Signal 3: Consistency — already computed above (activeDays30d) ──────────

  // ── Signal 4: Active cashback offer ─────────────────────────────────────────
  let cashbackScore = 0;
  try {
    const Offer = mongoose.models['Offer'] || mongoose.models['MerchantOffer'];
    if (Offer) {
      const hasActiveCashback = await Offer.exists({
        merchantId: merchantOid,
        type: 'cashback',
        isActive: true,
        endDate: { $gte: new Date() },
      });
      cashbackScore = hasActiveCashback ? 10 : 0;
    }
  } catch {
    // model may not exist in all deployments
  }

  // ── Compute totals ───────────────────────────────────────────────────────────
  const gScore = gmvToScore(gmv30dPaise);
  const rScore = repaymentToScore(repaymentRate);
  const cScore = consistencyToScore(activeDays30d);
  const total = gScore + rScore + cScore + cashbackScore;
  const eligible = total >= SCORE_THRESHOLD;

  await MerchantCapitalScore.findOneAndUpdate(
    { merchantId: merchantOid },
    {
      $set: {
        merchantId: merchantOid,
        gmvScore: gScore,
        repaymentScore: rScore,
        consistencyScore: cScore,
        cashbackScore,
        totalScore: total,
        eligible,
        preApprovedAmountPaise: eligible ? preApprovedAmount(gmv30dPaise) : 0,
        monthlyInterestRate: eligible ? scoreToInterestRate(total) : 3.0,
        gmv30dPaise,
        khataRepaymentRate: repaymentRate,
        activeDays30d,
        computedAt: new Date(),
      },
      // Don't reset application state on rescore
      $setOnInsert: { applicationStatus: 'none' },
    },
    { upsert: true, new: true },
  );
}

async function runCapitalScoring(): Promise<void> {
  const Merchant = mongoose.models['Merchant'];
  if (!Merchant) {
    logger.warn('[REZCapital] Merchant model not found');
    return;
  }

  const merchants = await Merchant.find({ isActive: { $ne: false } }, '_id').lean();
  logger.info(`[REZCapital] Scoring ${merchants.length} merchants`);

  let scored = 0;
  let eligible = 0;

  for (const m of merchants as any[]) {
    try {
      await scoreMerchant(m._id.toString());
      scored++;
    } catch (err: any) {
      logger.warn(`[REZCapital] Score failed for merchant ${m._id}`, { error: err.message });
    }
  }

  // Quick tally of newly eligible merchants
  eligible = await MerchantCapitalScore.countDocuments({ eligible: true });
  logger.info(`[REZCapital] Scoring complete — scored=${scored}, eligible=${eligible}`);
}

// ── Init ───────────────────────────────────────────────────────────────────────

export function initializeRezCapitalScoringJob(): void {
  // Every Sunday at 3:00 AM
  cron.schedule('0 3 * * 0', async () => {
    const lock = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lock) return;
    try {
      await runCapitalScoring();
    } catch (err: any) {
      logger.error('[REZCapital] Scoring job failed', { error: err.message });
    } finally {
      await redisService.releaseLock(LOCK_KEY, lock);
    }
  });

  logger.info('[REZCapital] Scoring job initialized (runs Sundays 3 AM)');
}

export { runCapitalScoring };
