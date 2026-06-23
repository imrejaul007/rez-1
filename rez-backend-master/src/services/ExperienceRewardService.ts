import * as crypto from 'crypto';
import { Order } from '../models/Order';
import { ExperienceReward, IExperienceReward, getRewardTier } from '../models/ExperienceReward';
import { logger } from '../config/logger';

const RENDEZ_BACKEND_URL = process.env.RENDEZ_BACKEND_URL;
const RENDEZ_WEBHOOK_SECRET = process.env.RENDEZ_WEBHOOK_SECRET || '';

if (!RENDEZ_BACKEND_URL) {
  // Non-fatal at startup — reward dispatch will fail loudly at runtime if not set
  logger.warn('[ExperienceReward] RENDEZ_BACKEND_URL is not set — experience rewards cannot be dispatched to Rendez');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentMonthString(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function expiresAt14Days(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 14);
  return d;
}

function hmacSignBody(body: string): string {
  if (!RENDEZ_WEBHOOK_SECRET) {
    // Returning 'unsigned' causes crypto.timingSafeEqual to throw on the receiver side
    // because Buffer.from('unsigned', 'hex') is 0 bytes vs the expected 32 bytes.
    // Throw here so the caller gets a clear error rather than a 500 on the Rendez end.
    throw new Error(
      '[ExperienceReward] RENDEZ_WEBHOOK_SECRET is not configured — cannot sign outbound requests to Rendez',
    );
  }
  const sig = crypto.createHmac('sha256', RENDEZ_WEBHOOK_SECRET).update(body).digest('hex');
  return `sha256=${sig}`;
}

// ── sendToRendez ──────────────────────────────────────────────────────────────

async function sendToRendez(reward: IExperienceReward): Promise<void> {
  const payload = {
    rezUserId: reward.rezUserId,
    rezRewardId: (reward._id as any).toString(),
    tier: reward.tier,
    type: reward.type,
    label: reward.label,
    expiresAt: reward.expiresAt.toISOString(),
  };
  const bodyStr = JSON.stringify(payload);
  const signature = hmacSignBody(bodyStr);

  if (!RENDEZ_BACKEND_URL) {
    logger.error('[ExperienceReward] Cannot dispatch reward — RENDEZ_BACKEND_URL env var is not configured', {
      rewardId: (reward._id as any).toString(),
    });
    return;
  }

  try {
    const url = `${RENDEZ_BACKEND_URL}/api/v1/experience-credits/grant`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rez-signature': signature,
      },
      body: bodyStr,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(unreadable)');
      logger.error('[ExperienceReward] Rendez webhook returned non-2xx', {
        status: response.status,
        body: errorText,
        rewardId: (reward._id as any).toString(),
      });
      return;
    }

    let responseData: any = {};
    try {
      responseData = await response.json();
    } catch {
      // Non-JSON response is fine — just log it
    }

    await ExperienceReward.findByIdAndUpdate(reward._id, {
      status: 'SENT_TO_RENDEZ',
      rendezCreditId: responseData?.creditId || responseData?.id || undefined,
    });

    logger.info('[ExperienceReward] Reward sent to Rendez', {
      rewardId: (reward._id as any).toString(),
      rezUserId: reward.rezUserId,
      rendezCreditId: responseData?.creditId || responseData?.id,
    });
  } catch (err) {
    logger.error('[ExperienceReward] Failed to send reward to Rendez (non-blocking)', {
      error: (err as Error).message,
      rewardId: (reward._id as any).toString(),
    });
  }
}

// ── checkAndGrantMonthlyRewards ───────────────────────────────────────────────

export async function checkAndGrantMonthlyRewards(): Promise<void> {
  const month = currentMonthString();
  const [yearStr, monthStr] = month.split('-');
  const monthStart = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
  const monthEnd = new Date(Date.UTC(Number(yearStr), Number(monthStr), 1));

  logger.info(`[ExperienceReward] Running monthly reward check for ${month}`);

  // Aggregate delivered/completed order totals per user this month
  const spendAgg: Array<{ _id: string; totalSpend: number }> = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: monthStart, $lt: monthEnd },
        status: { $in: ['delivered', 'completed'] },
      },
    },
    {
      $group: {
        _id: { $toString: '$user' },
        totalSpend: { $sum: '$totals.total' },
      },
    },
    {
      $match: { totalSpend: { $gte: 10000 } },
    },
  ]);

  if (spendAgg.length === 0) {
    logger.info(`[ExperienceReward] No qualifying users for ${month}`);
    return;
  }

  let granted = 0;
  let skipped = 0;

  for (const { _id: userId, totalSpend } of spendAgg) {
    const tierInfo = getRewardTier(totalSpend);
    if (!tierInfo) continue;

    // Skip if already rewarded this month.
    // TOCTOU FIX: Use findOneAndUpdate with a tier-mismatch filter so the read and
    // conditional upgrade are a single atomic operation. The previous pattern
    // (findOne → check tier → findByIdAndUpdate) could race with another process
    // granting or upgrading the same reward between the read and the update.
    const existing = await ExperienceReward.findOneAndUpdate(
      { rezUserId: userId, month, tier: { $ne: tierInfo.tier } },
      { $set: { tier: tierInfo.tier, type: tierInfo.type, label: tierInfo.label } },
      { new: false }, // return the pre-update doc to log the old tier
    );

    // Also check for an existing doc where tier already matches (no upgrade needed)
    const existingNoUpgrade = existing ? null : await ExperienceReward.findOne({ rezUserId: userId, month }).lean();

    if (existing) {
      logger.info(`[ExperienceReward] Upgraded tier for user ${userId}: ${existing.tier} -> ${tierInfo.tier}`);
      skipped++;
      continue;
    }
    if (existingNoUpgrade) {
      skipped++;
      continue;
    }

    const now = new Date();
    try {
      const reward = await ExperienceReward.create({
        userId,
        tier: tierInfo.tier,
        type: tierInfo.type,
        label: tierInfo.label,
        merchantSubsidy: 0,
        month,
        grantedAt: now,
        status: 'GRANTED',
        expiresAt: expiresAt14Days(now),
        rezUserId: userId,
      });

      granted++;
      logger.info(`[ExperienceReward] Granted ${tierInfo.tier} reward to user ${userId} for ${month}`);

      // Fire-and-forget — non-blocking
      sendToRendez(reward).catch((err) => logger.error('[ExperienceReward] sendToRendez unhandled rejection', err));
    } catch (err: any) {
      // Duplicate key = another process already granted — not an error
      if (err?.code === 11000) {
        skipped++;
        continue;
      }
      logger.error(`[ExperienceReward] Failed to grant reward for user ${userId}`, err);
    }
  }

  logger.info(`[ExperienceReward] Monthly check complete for ${month}: granted=${granted}, skipped=${skipped}`);
}

// ── getUserRewards ────────────────────────────────────────────────────────────

export async function getUserRewards(userId: string): Promise<IExperienceReward[]> {
  return ExperienceReward.find({ rezUserId: userId }).sort({ grantedAt: -1 }).lean() as unknown as IExperienceReward[];
}

// ── markUsed ──────────────────────────────────────────────────────────────────

export async function markUsed(rendezCreditId: string): Promise<void> {
  const result = await ExperienceReward.findOneAndUpdate({ rendezCreditId }, { status: 'USED' }, { new: true });
  if (!result) {
    logger.warn(`[ExperienceReward] markUsed: no reward found for rendezCreditId ${rendezCreditId}`);
    return;
  }
  logger.info(`[ExperienceReward] Marked reward as USED`, {
    rendezCreditId,
    rewardId: (result._id as any).toString(),
  });
}

// ── getMonthlySpend (utility for /progress endpoint) ─────────────────────────

export async function getMonthlySpendForUser(userId: string): Promise<number> {
  const month = currentMonthString();
  const [yearStr, monthStr] = month.split('-');
  const monthStart = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
  const monthEnd = new Date(Date.UTC(Number(yearStr), Number(monthStr), 1));

  const result = await Order.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: monthStart, $lt: monthEnd },
        status: { $in: ['delivered', 'completed'] },
      },
    },
    {
      $group: {
        _id: null,
        totalSpend: { $sum: '$totals.total' },
      },
    },
  ]);

  return result[0]?.totalSpend ?? 0;
}

export function getCurrentMonth(): string {
  return currentMonthString();
}
