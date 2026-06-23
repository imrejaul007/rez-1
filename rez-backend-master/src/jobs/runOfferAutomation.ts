/**
 * runOfferAutomation.ts
 * Daily cron job that evaluates all enabled OfferRule records and queues
 * personalized offers for qualifying customers.
 *
 * Runs daily at 10:30 AM IST (05:00 UTC).
 * Uses a distributed Redis lock to ensure single execution in multi-pod deployments.
 *
 * Rules evaluated:
 *   - dormant_customer  → customers inactive for N days
 *   - birthday          → customers with birthday within [daysBefore, daysAfter] of today
 *   - milestone_visit  → customers hitting 5th/10th/15th visit
 *   - first_visit      → customers on their 1st visit
 *
 * Phase 2 (not yet implemented):
 *   - happy_hour       → activate happy hour offer if within time window
 *   - low_footfall     → trigger campaign if today's revenue < threshold
 *   - weather_trigger  → trigger contextual offer based on weather
 */

import mongoose from 'mongoose';
import OfferRule, { IOfferRule } from '../models/OfferRule';
import OfferAudit from '../models/OfferAudit';
import { notificationQueue } from '../config/bullmq-queues';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import { CoinTransaction } from '../models/CoinTransaction';
import { User } from '../models/User';
import { scheduleCronJob } from '../config/cronJobs';

const logger = createServiceLogger('offer-automation');

const LOCK_KEY = 'job:offer-automation';
const LOCK_TTL = 3600; // 1 hour max

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function todayEnd(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

/**
 * Deduplication guard: return true if this (ruleId, customerId) combo
 * was already sent today. Prevents double-sending on worker restart.
 */
async function wasSentToday(ruleId: string, customerId: string): Promise<boolean> {
  const key = `offer-audit:dedup:${ruleId}:${customerId}:${todayStart().toISOString().slice(0, 10)}`;
  const exists = await redisService.get(key);
  return !!exists;
}

async function markSent(ruleId: string, customerId: string): Promise<void> {
  const key = `offer-audit:dedup:${ruleId}:${customerId}:${todayStart().toISOString().slice(0, 10)}`;
  await redisService.set(key, '1', 86400); // expire after 24h
}

// ── Rule Evaluators ───────────────────────────────────────────────────────────

async function evaluateDormantCustomer(rule: IOfferRule): Promise<void> {
  const config = rule.triggerConfig.config as { daysSinceLastVisit: number };
  const cutoffDate = daysAgo(config.daysSinceLastVisit ?? 14);

  // Find users who placed an order at this store but not after cutoffDate
  const dormantUsers = await CoinTransaction.aggregate([
    {
      $match: {
        'metadata.storeId': new mongoose.Types.ObjectId(rule.storeId.toString()),
        type: { $in: ['earned', 'credit', 'payment'] },
        createdAt: { $lt: cutoffDate },
      },
    },
    {
      $group: {
        _id: '$userId',
        lastOrderAt: { $max: '$createdAt' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        phone: '$user.phoneNumber',
        name: { $concat: ['$user.profile.firstName', ' ', { $ifNull: ['$user.profile.lastName', ''] }] },
      },
    },
  ]);

  logger.info(`[Dormant] Rule ${rule._id}: found ${dormantUsers.length} dormant customers`);

  for (const user of dormantUsers) {
    if (!user.phone) continue;
    if (await wasSentToday(rule._id.toString(), user.userId.toString())) continue;

    const offerConfig = rule.offerConfig as any;
    const message = offerConfig.message.replace('{{name}}', user.name || 'there');

    await notificationQueue.add(
      `offer-automation:${rule._id}:${user.userId}`,
      {
        userId: user.userId.toString(),
        phone: user.phone,
        channel: rule.notificationChannel,
        title: offerConfig.title,
        message,
        type: 'offer_automation',
        metadata: {
          ruleId: rule._id.toString(),
          offerType: offerConfig.type,
          offerValue: offerConfig.value,
          validityDays: offerConfig.validityDays,
        },
      },
      { priority: 5, attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    await OfferAudit.create({
      ruleId: rule._id,
      storeId: rule.storeId,
      customerId: new mongoose.Types.ObjectId(user.userId.toString()),
      triggerType: 'dormant_customer',
      offerTitle: offerConfig.title,
      offerMessage: offerConfig.message,
      offerSent: true,
      notificationChannel: rule.notificationChannel,
      sentAt: new Date(),
    });

    await markSent(rule._id.toString(), user.userId.toString());
  }
}

async function evaluateBirthday(rule: IOfferRule): Promise<void> {
  const config = rule.triggerConfig.config as { daysBefore: number; daysAfter: number };
  const daysBefore = config.daysBefore ?? 0;
  const daysAfter = config.daysAfter ?? 0;

  const today = new Date();
  const targetMonth = today.getMonth();
  const targetDay = today.getDate();

  const startMonth = today.getMonth();
  const startDay = today.getDate() - daysBefore;
  let endMonth = today.getMonth();
  let endDay = today.getDate() + daysAfter;

  // Normalize if start/end day crosses month boundary
  if (startDay < 1) {
    const prev = new Date(today.getFullYear(), today.getMonth(), 0);
    endDay += startDay - 1;
  }
  if (endDay > 31) {
    endMonth = (endMonth + 1) % 12;
  }

  const users = await User.find({
    'profile.dateOfBirth': {
      $regex: `-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}$`,
    },
    'profile.phoneNumber': { $exists: true, $ne: '' },
  })
    .select('_id phoneNumber profile.firstName profile.lastName')
    .lean();

  logger.info(`[Birthday] Rule ${rule._id}: found ${users.length} customers with birthday today`);

  const offerConfig = rule.offerConfig as any;
  for (const user of users) {
    const phone = user.phoneNumber as string;
    if (!phone) continue;
    if (await wasSentToday(rule._id.toString(), user._id.toString())) continue;

    const name = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();

    await notificationQueue.add(
      `offer-automation:${rule._id}:${user._id}`,
      {
        userId: user._id.toString(),
        phone,
        channel: rule.notificationChannel,
        title: offerConfig.title,
        message: offerConfig.message.replace('{{name}}', name || 'there'),
        type: 'offer_automation',
        metadata: { ruleId: rule._id.toString(), offerType: offerConfig.type, offerValue: offerConfig.value },
      },
      { priority: 8, attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    await OfferAudit.create({
      ruleId: rule._id,
      storeId: rule.storeId,
      customerId: new mongoose.Types.ObjectId(user._id.toString()),
      triggerType: 'birthday',
      offerTitle: offerConfig.title,
      offerMessage: offerConfig.message,
      offerSent: true,
      notificationChannel: rule.notificationChannel,
      sentAt: new Date(),
    });

    await markSent(rule._id.toString(), user._id.toString());
  }
}

async function evaluateMilestoneVisit(rule: IOfferRule): Promise<void> {
  const config = rule.triggerConfig.config as { visitCounts: number[] };
  const milestones = config.visitCounts ?? [5, 10, 15];

  const users = await CoinTransaction.aggregate([
    {
      $match: {
        'metadata.storeId': new mongoose.Types.ObjectId(rule.storeId.toString()),
        type: { $in: ['earned', 'credit', 'payment'] },
      },
    },
    { $group: { _id: '$userId', visitCount: { $sum: 1 } } },
    { $match: { visitCount: { $in: milestones } } },
    {
      $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' },
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        visitCount: 1,
        phone: '$user.phoneNumber',
        name: { $concat: ['$user.profile.firstName', ' ', { $ifNull: ['$user.profile.lastName', ''] }] },
      },
    },
  ]);

  logger.info(`[Milestone] Rule ${rule._id}: found ${users.length} customers at visit milestones`);

  const offerConfig = rule.offerConfig as any;
  for (const user of users) {
    if (!user.phone) continue;
    if (await wasSentToday(rule._id.toString(), user.userId.toString())) continue;

    const milestoneKey = `milestone:${user.visitCount}`;
    const message = offerConfig.message
      .replace('{{name}}', user.name || 'there')
      .replace('{{count}}', String(user.visitCount));

    await notificationQueue.add(
      `offer-automation:${rule._id}:${user.userId}`,
      {
        userId: user.userId.toString(),
        phone: user.phone,
        channel: rule.notificationChannel,
        title: offerConfig.title,
        message,
        type: 'offer_automation',
        metadata: { ruleId: rule._id.toString(), visitCount: user.visitCount, offerType: offerConfig.type },
      },
      { priority: 7, attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    await OfferAudit.create({
      ruleId: rule._id,
      storeId: rule.storeId,
      customerId: new mongoose.Types.ObjectId(user.userId.toString()),
      triggerType: 'milestone_visit',
      offerTitle: offerConfig.title,
      offerMessage: offerConfig.message,
      offerSent: true,
      notificationChannel: rule.notificationChannel,
      sentAt: new Date(),
    });

    await markSent(rule._id.toString(), user.userId.toString());
  }
}

async function evaluateFirstVisit(rule: IOfferRule): Promise<void> {
  const users = await CoinTransaction.aggregate([
    {
      $match: {
        'metadata.storeId': new mongoose.Types.ObjectId(rule.storeId.toString()),
        type: { $in: ['earned', 'credit', 'payment'] },
      },
    },
    { $group: { _id: '$userId', visitCount: { $sum: 1 } } },
    { $match: { visitCount: 1 } },
    {
      $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' },
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        phone: '$user.phoneNumber',
        name: { $concat: ['$user.profile.firstName', ' ', { $ifNull: ['$user.profile.lastName', ''] }] },
      },
    },
  ]);

  logger.info(`[FirstVisit] Rule ${rule._id}: found ${users.length} first-time customers`);

  const offerConfig = rule.offerConfig as any;
  for (const user of users) {
    if (!user.phone) continue;
    if (await wasSentToday(rule._id.toString(), user.userId.toString())) continue;

    const name = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
    const message = offerConfig.message.replace('{{name}}', name || 'there');

    await notificationQueue.add(
      `offer-automation:${rule._id}:${user.userId}`,
      {
        userId: user.userId.toString(),
        phone: user.phone,
        channel: rule.notificationChannel,
        title: offerConfig.title,
        message,
        type: 'offer_automation',
        metadata: { ruleId: rule._id.toString(), offerType: offerConfig.type },
      },
      { priority: 9, attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    await OfferAudit.create({
      ruleId: rule._id,
      storeId: rule.storeId,
      customerId: new mongoose.Types.ObjectId(user.userId.toString()),
      triggerType: 'first_visit',
      offerTitle: offerConfig.title,
      offerMessage: offerConfig.message,
      offerSent: true,
      notificationChannel: rule.notificationChannel,
      sentAt: new Date(),
    });

    await markSent(rule._id.toString(), user.userId.toString());
  }
}

// ── Main Runner ────────────────────────────────────────────────────────────────

async function runOfferAutomation(): Promise<void> {
  const lock = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
  if (!lock) {
    logger.info('[OfferAutomation] Lock not acquired — another pod is running. Skipping.');
    return;
  }

  try {
    logger.info('[OfferAutomation] Starting daily offer automation run');

    const rules = await OfferRule.find({ enabled: true }).lean();
    logger.info(`[OfferAutomation] Found ${rules.length} enabled rules`);

    for (const rule of rules as unknown as IOfferRule[]) {
      try {
        switch (rule.type) {
          case 'dormant_customer':
            await evaluateDormantCustomer(rule);
            break;
          case 'birthday':
            await evaluateBirthday(rule);
            break;
          case 'milestone_visit':
            await evaluateMilestoneVisit(rule);
            break;
          case 'first_visit':
            await evaluateFirstVisit(rule);
            break;
          case 'happy_hour':
          case 'low_footfall':
          case 'weather_trigger':
            logger.debug(`[OfferAutomation] Rule ${rule._id}: ${rule.type} not yet implemented, skipping`);
            break;
        }
      } catch (err) {
        logger.error(`[OfferAutomation] Error evaluating rule ${rule._id} (${rule.type}):`, err);
      }
    }

    logger.info('[OfferAutomation] Daily run completed');
  } finally {
    await redisService.releaseLock(LOCK_KEY, lock);
  }
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export function initializeOfferAutomationJob(): void {
  // Runs daily at 10:30 AM IST (05:00 UTC)
  scheduleCronJob('0 5 * * *', runOfferAutomation, 'Offer automation (daily 10:30 AM IST)');
  logger.info('[OfferAutomation] Job scheduled: daily at 10:30 AM IST');
}
