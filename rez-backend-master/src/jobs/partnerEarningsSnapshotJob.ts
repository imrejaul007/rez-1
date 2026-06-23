import { CoinTransaction } from '../models/CoinTransaction';
import { PartnerEarningsSnapshot } from '../models/PartnerEarningsSnapshot';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';

const logger = createServiceLogger('partner-earnings-snapshot');

/**
 * Partner Earnings Snapshot Job
 * Runs daily at 1 AM.
 * Aggregates the previous day's partner-tagged CoinTransactions into PartnerEarningsSnapshot documents.
 * Also rolls up monthly snapshots on the 1st of each month.
 */
export async function runPartnerEarningsSnapshot(): Promise<void> {
  const lockKey = 'job:partner-earnings-snapshot';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 600); // 10min lock
    if (!lockToken) {
      logger.info('Partner earnings snapshot job skipped — lock held');
      return;
    }

    // Compute yesterday's date range
    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    logger.info('Running daily partner earnings snapshot', {
      dateRange: { start: yesterdayStart.toISOString(), end: yesterdayEnd.toISOString() },
    });

    // Aggregate partner earnings by user and type for yesterday
    const pipeline = [
      {
        $match: {
          'metadata.partnerEarning': true,
          createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
        },
      },
      {
        $group: {
          _id: {
            user: '$user',
            type: '$metadata.partnerEarningType',
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await CoinTransaction.aggregate(pipeline);

    if (results.length === 0) {
      logger.info('No partner earnings found for yesterday');
      await redisService.releaseLock(lockKey, lockToken);
      return;
    }

    // Group results by user
    const userMap = new Map<string, Record<string, { amount: number; count: number }>>();
    for (const row of results) {
      const userId = String(row._id.user);
      const type = row._id.type || 'cashback';
      if (!userMap.has(userId)) {
        userMap.set(userId, {});
      }
      userMap.get(userId)![type] = { amount: row.amount, count: row.count };
    }

    let created = 0;
    let errors = 0;

    for (const [userId, types] of userMap) {
      try {
        const cashback = types['cashback'] || { amount: 0, count: 0 };
        const milestone = types['milestone'] || { amount: 0, count: 0 };
        const referral = types['referral'] || { amount: 0, count: 0 };
        const task = types['task'] || { amount: 0, count: 0 };

        const totalAmount = cashback.amount + milestone.amount + referral.amount + task.amount;
        const totalCount = cashback.count + milestone.count + referral.count + task.count;

        // Upsert (idempotent)
        await PartnerEarningsSnapshot.findOneAndUpdate(
          { userId, period: 'daily', date: yesterdayStart },
          {
            $set: {
              partnerCashback: cashback,
              milestoneRewards: milestone,
              referralBonus: referral,
              taskRewards: task,
              totalAmount,
              totalCount,
            },
          },
          { upsert: true }
        );
        created++;
      } catch (err) {
        errors++;
        logger.error('Failed to create snapshot for user', err, { userId });
      }
    }

    logger.info('Daily snapshot complete', { created, errors, totalUsers: userMap.size });

    // Monthly rollup: on the 1st of each month, aggregate the previous month's daily snapshots
    if (now.getDate() === 1) {
      await runMonthlyRollup(now);
    }

    await redisService.releaseLock(lockKey, lockToken);
  } catch (error) {
    logger.error('Partner earnings snapshot job failed', error);
  }
}

/**
 * Roll up daily snapshots into a monthly snapshot for the previous month.
 */
async function runMonthlyRollup(now: Date): Promise<void> {
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  logger.info('Running monthly rollup', {
    month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
  });

  const pipeline = [
    {
      $match: {
        period: 'daily',
        date: { $gte: monthStart, $lte: monthEnd },
      },
    },
    {
      $group: {
        _id: '$userId',
        partnerCashbackAmount: { $sum: '$partnerCashback.amount' },
        partnerCashbackCount: { $sum: '$partnerCashback.count' },
        milestoneAmount: { $sum: '$milestoneRewards.amount' },
        milestoneCount: { $sum: '$milestoneRewards.count' },
        referralAmount: { $sum: '$referralBonus.amount' },
        referralCount: { $sum: '$referralBonus.count' },
        taskAmount: { $sum: '$taskRewards.amount' },
        taskCount: { $sum: '$taskRewards.count' },
        totalAmount: { $sum: '$totalAmount' },
        totalCount: { $sum: '$totalCount' },
      },
    },
  ];

  const results = await PartnerEarningsSnapshot.aggregate(pipeline);

  let created = 0;
  for (const row of results) {
    try {
      await PartnerEarningsSnapshot.findOneAndUpdate(
        { userId: row._id, period: 'monthly', date: monthStart },
        {
          $set: {
            partnerCashback: { amount: row.partnerCashbackAmount, count: row.partnerCashbackCount },
            milestoneRewards: { amount: row.milestoneAmount, count: row.milestoneCount },
            referralBonus: { amount: row.referralAmount, count: row.referralCount },
            taskRewards: { amount: row.taskAmount, count: row.taskCount },
            totalAmount: row.totalAmount,
            totalCount: row.totalCount,
          },
        },
        { upsert: true }
      );
      created++;
    } catch (err) {
      logger.error('Failed to create monthly snapshot', err, { userId: String(row._id) });
    }
  }

  logger.info('Monthly rollup complete', { created, totalUsers: results.length });
}
