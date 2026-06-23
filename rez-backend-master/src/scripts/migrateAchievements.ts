import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import Achievement, {
  UserAchievement,
  ACHIEVEMENT_DEFINITIONS,
  IAchievementConditions,
  AchievementTier,
} from '../models/Achievement';
import QuickAction from '../models/QuickAction';
import ValueCard from '../models/ValueCard';
import LeaderboardConfig from '../models/LeaderboardConfig';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

// ============================================================================
// Helpers
// ============================================================================

function determineTier(coins: number): AchievementTier {
  if (coins <= 50) return 'bronze';
  if (coins <= 100) return 'silver';
  if (coins <= 200) return 'gold';
  return 'platinum';
}

function buildConditions(metric: string, target: number): IAchievementConditions {
  return {
    type: 'simple',
    rules: [
      {
        metric,
        operator: 'gte',
        target,
        weight: 1,
      },
    ],
    combinator: 'AND',
  };
}

// ============================================================================
// Step 1: Migrate Achievement Definitions
// ============================================================================
async function migrateAchievementDefinitions(): Promise<number> {
  let migrated = 0;

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const metric = def.requirement.metric;
    const target = def.requirement.target;
    const coinReward = def.reward?.coins ?? 0;
    const cashbackReward = def.reward?.cashback ?? 0;
    // Use whichever reward value is present for tier calculation
    const rewardAmount = coinReward > 0 ? coinReward : cashbackReward;
    const tier = determineTier(rewardAmount);
    const conditions = buildConditions(metric, target);
    const trackedMetrics = [metric];

    const updateData = {
      title: def.title,
      description: def.description,
      icon: def.icon,
      color: def.color,
      category: def.category,
      target: def.requirement.target,
      coinReward: coinReward > 0 ? coinReward : cashbackReward,
      conditions,
      trackedMetrics,
      reward: {
        coins: coinReward,
        cashback: cashbackReward,
        badge: def.reward?.badge,
      },
      tier,
      visibility: 'visible',
      repeatability: 'one_time',
      isActive: def.isActive,
      sortOrder: def.order,
    };

    const result = await Achievement.updateOne(
      { type: def.type },
      { $set: updateData },
      { upsert: true }
    );

    if (result.upsertedCount > 0 || result.modifiedCount > 0) {
      migrated++;
    }

    console.log(
      `  [${result.upsertedCount > 0 ? 'CREATED' : result.modifiedCount > 0 ? 'UPDATED' : 'UNCHANGED'}] ${def.type} -> metric=${metric}, target=${target}, tier=${tier}`
    );
  }

  return migrated;
}

// ============================================================================
// Step 2: Link UserAchievement records
// ============================================================================
async function linkUserAchievements(): Promise<number> {
  let linked = 0;

  // Find all UserAchievement records that don't have the achievement ref set
  const unlinked = await UserAchievement.find({
    $or: [
      { achievement: { $exists: false } },
      { achievement: null },
    ],
  });

  console.log(`  Found ${unlinked.length} unlinked UserAchievement records`);

  for (const ua of unlinked) {
    // Find the parent Achievement by matching type
    const achievement = await Achievement.findOne({ type: ua.type });

    if (!achievement) {
      console.log(`  [SKIP] No Achievement found for type="${ua.type}" (user=${ua.user})`);
      continue;
    }

    // Link to parent achievement
    ua.achievement = achievement._id as mongoose.Types.ObjectId;

    // Convert existing progress to ruleProgress[] format
    if (!ua.ruleProgress || ua.ruleProgress.length === 0) {
      const metric = achievement.conditions?.rules?.[0]?.metric;
      const targetValue = achievement.conditions?.rules?.[0]?.target ?? ua.targetValue;

      if (metric) {
        ua.ruleProgress = [
          {
            metric,
            currentValue: ua.currentValue ?? 0,
            targetValue: targetValue,
            met: ua.unlocked === true,
          },
        ];
      }
    }

    // Set timesCompleted if unlocked
    if (ua.unlocked && ua.timesCompleted === 0) {
      ua.timesCompleted = 1;
      if (ua.unlockedDate && !ua.lastCompletedAt) {
        ua.lastCompletedAt = ua.unlockedDate;
      }
    }

    await ua.save();
    linked++;
  }

  return linked;
}

// ============================================================================
// Step 3: Seed QuickAction data
// ============================================================================
async function seedQuickActions(): Promise<number> {
  const quickActions = [
    {
      slug: 'scan-pay',
      title: 'Scan & Pay',
      subtitle: 'Pay with QR',
      icon: 'qr-code-outline',
      iconColor: '#F59E0B',
      deepLinkPath: '/scan',
      targetAchievementTypes: ['ORDERS_5', 'SPENDING_1000'],
      priority: 1,
      isActive: true,
    },
    {
      slug: 'upload-bill',
      title: 'Upload Bill',
      subtitle: 'Earn cashback',
      icon: 'receipt-outline',
      iconColor: '#10B981',
      deepLinkPath: '/bill-upload',
      targetAchievementTypes: [] as string[],
      priority: 2,
      isActive: true,
    },
    {
      slug: 'share-offer',
      title: 'Share Offer',
      subtitle: 'Earn coins',
      icon: 'share-social-outline',
      iconColor: '#3B82F6',
      deepLinkPath: '/social-share',
      targetAchievementTypes: [] as string[],
      priority: 3,
      isActive: true,
    },
    {
      slug: 'write-review',
      title: 'Write Review',
      subtitle: 'Help others',
      icon: 'star-outline',
      iconColor: '#8B5CF6',
      deepLinkPath: '/reviews/write',
      targetAchievementTypes: ['REVIEWS_3', 'REVIEWS_10'],
      priority: 4,
      isActive: true,
    },
    {
      slug: 'refer-friend',
      title: 'Refer Friend',
      subtitle: 'Both earn',
      icon: 'people-outline',
      iconColor: '#EC4899',
      deepLinkPath: '/referral',
      targetAchievementTypes: ['REFERRALS_3', 'REFERRALS_10'],
      priority: 5,
      isActive: true,
    },
    {
      slug: 'daily-checkin',
      title: 'Daily Check-in',
      subtitle: 'Streak bonus',
      icon: 'calendar-outline',
      iconColor: '#F97316',
      deepLinkPath: '/daily-checkin',
      targetAchievementTypes: ['LOGIN_STREAK_7'],
      priority: 6,
      isActive: true,
    },
  ];

  let seeded = 0;

  for (const qa of quickActions) {
    const result = await QuickAction.updateOne(
      { slug: qa.slug },
      { $set: qa },
      { upsert: true }
    );

    if (result.upsertedCount > 0 || result.modifiedCount > 0) {
      seeded++;
    }

    console.log(
      `  [${result.upsertedCount > 0 ? 'CREATED' : result.modifiedCount > 0 ? 'UPDATED' : 'UNCHANGED'}] QuickAction: ${qa.slug}`
    );
  }

  return seeded;
}

// ============================================================================
// Step 4: Seed ValueCard data
// ============================================================================
async function seedValueCards(): Promise<number> {
  const valueCards = [
    {
      title: 'Real Cashback',
      subtitle: 'No minimum purchase needed',
      emoji: '\uD83D\uDCB0',
      deepLinkPath: '/cashback-info',
      sortOrder: 1,
      isActive: true,
    },
    {
      title: 'Daily Rewards',
      subtitle: 'New rewards every day',
      emoji: '\uD83C\uDF81',
      deepLinkPath: '/daily-rewards',
      sortOrder: 2,
      isActive: true,
    },
    {
      title: 'Earn While Shopping',
      subtitle: 'Get coins on every order',
      emoji: '\uD83D\uDED2',
      deepLinkPath: '/how-it-works',
      sortOrder: 3,
      isActive: true,
    },
    {
      title: 'Refer & Earn',
      subtitle: 'Both you and friend earn',
      emoji: '\uD83E\uDD1D',
      deepLinkPath: '/referral',
      sortOrder: 4,
      isActive: true,
    },
  ];

  let seeded = 0;

  for (const vc of valueCards) {
    const result = await ValueCard.updateOne(
      { title: vc.title },
      { $set: vc },
      { upsert: true }
    );

    if (result.upsertedCount > 0 || result.modifiedCount > 0) {
      seeded++;
    }

    console.log(
      `  [${result.upsertedCount > 0 ? 'CREATED' : result.modifiedCount > 0 ? 'UPDATED' : 'UNCHANGED'}] ValueCard: ${vc.title}`
    );
  }

  return seeded;
}

// ============================================================================
// Step 5: Seed LeaderboardConfig data
// ============================================================================
async function seedLeaderboardConfigs(): Promise<number> {
  const configs = [
    {
      slug: 'weekly-coins',
      title: 'Weekly Coin Leaders',
      subtitle: 'Top coin earners this week',
      leaderboardType: 'coins' as const,
      period: 'weekly' as const,
      coinTransactionSources: [
        'order',
        'review',
        'referral',
        'daily_login',
        'social_share_reward',
        'achievement',
        'challenge',
      ],
      prizePool: [
        { rankStart: 1, rankEnd: 1, prizeAmount: 500, prizeLabel: '1st Place' },
        { rankStart: 2, rankEnd: 2, prizeAmount: 300, prizeLabel: '2nd Place' },
        { rankStart: 3, rankEnd: 3, prizeAmount: 200, prizeLabel: '3rd Place' },
        { rankStart: 4, rankEnd: 10, prizeAmount: 50, prizeLabel: 'Top 10' },
      ],
      topN: 100,
      display: {
        icon: 'trophy',
        backgroundColor: '#6B46C1',
        featured: true,
        priority: 1,
      },
      isActive: true,
      status: 'active' as const,
    },
    {
      slug: 'daily-spending',
      title: 'Daily Spenders',
      subtitle: 'Top spenders today',
      leaderboardType: 'spending' as const,
      period: 'daily' as const,
      coinTransactionSources: ['order', 'cashback', 'purchase_reward'],
      prizePool: [
        { rankStart: 1, rankEnd: 1, prizeAmount: 100, prizeLabel: '1st Place' },
        { rankStart: 2, rankEnd: 2, prizeAmount: 50, prizeLabel: '2nd Place' },
        { rankStart: 3, rankEnd: 3, prizeAmount: 25, prizeLabel: '3rd Place' },
      ],
      topN: 50,
      display: {
        icon: 'flash',
        backgroundColor: '#EF4444',
        featured: false,
        priority: 4,
      },
      isActive: true,
      status: 'active' as const,
    },
    {
      slug: 'weekly-spending',
      title: 'Weekly Big Spenders',
      subtitle: 'Highest spenders this week',
      leaderboardType: 'spending' as const,
      period: 'weekly' as const,
      coinTransactionSources: ['order', 'cashback', 'purchase_reward'],
      prizePool: [
        { rankStart: 1, rankEnd: 1, prizeAmount: 500, prizeLabel: '1st Place' },
        { rankStart: 2, rankEnd: 2, prizeAmount: 250, prizeLabel: '2nd Place' },
        { rankStart: 3, rankEnd: 3, prizeAmount: 150, prizeLabel: '3rd Place' },
        { rankStart: 4, rankEnd: 10, prizeAmount: 25, prizeLabel: 'Top 10' },
      ],
      topN: 100,
      display: {
        icon: 'star',
        backgroundColor: '#8B5CF6',
        featured: true,
        priority: 1,
      },
      isActive: true,
      status: 'active' as const,
    },
    {
      slug: 'monthly-spending',
      title: 'Monthly Big Spenders',
      subtitle: 'Highest spenders this month',
      leaderboardType: 'spending' as const,
      period: 'monthly' as const,
      coinTransactionSources: ['order', 'cashback', 'purchase_reward'],
      prizePool: [
        { rankStart: 1, rankEnd: 1, prizeAmount: 1000, prizeLabel: '1st Place' },
        { rankStart: 2, rankEnd: 2, prizeAmount: 500, prizeLabel: '2nd Place' },
        { rankStart: 3, rankEnd: 3, prizeAmount: 300, prizeLabel: '3rd Place' },
        { rankStart: 4, rankEnd: 10, prizeAmount: 50, prizeLabel: 'Top 10' },
      ],
      topN: 100,
      display: {
        icon: 'diamond',
        backgroundColor: '#D97706',
        featured: true,
        priority: 2,
      },
      isActive: true,
      status: 'active' as const,
    },
    {
      slug: 'all-time-spending',
      title: 'All-Time Top Spenders',
      subtitle: 'Biggest spenders of all time',
      leaderboardType: 'spending' as const,
      period: 'all-time' as const,
      coinTransactionSources: ['order', 'cashback', 'purchase_reward'],
      prizePool: [],
      topN: 100,
      display: {
        icon: 'ribbon',
        backgroundColor: '#1E40AF',
        featured: false,
        priority: 5,
      },
      isActive: true,
      status: 'active' as const,
    },
    {
      slug: 'all-time-referrals',
      title: 'Referral Champions',
      subtitle: 'Most successful referrers',
      leaderboardType: 'referrals' as const,
      period: 'all-time' as const,
      coinTransactionSources: ['referral'],
      prizePool: [] as any[],
      topN: 50,
      display: {
        icon: 'people',
        backgroundColor: '#059669',
        featured: false,
        priority: 3,
      },
      isActive: true,
      status: 'active' as const,
    },
  ];

  let seeded = 0;

  for (const config of configs) {
    const result = await LeaderboardConfig.updateOne(
      { slug: config.slug },
      { $set: config },
      { upsert: true }
    );

    if (result.upsertedCount > 0 || result.modifiedCount > 0) {
      seeded++;
    }

    console.log(
      `  [${result.upsertedCount > 0 ? 'CREATED' : result.modifiedCount > 0 ? 'UPDATED' : 'UNCHANGED'}] LeaderboardConfig: ${config.slug}`
    );
  }

  return seeded;
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log('==========================================================');
  console.log('  Achievement System Migration');
  console.log('==========================================================');
  console.log(`Connecting to MongoDB: ${MONGODB_URI}`);
  console.log('');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully.\n');

    // Step 1: Migrate Achievement definitions
    console.log('--- Step 1: Migrate Achievement Definitions ---');
    const achievementsMigrated = await migrateAchievementDefinitions();
    console.log(`Achievements migrated/updated: ${achievementsMigrated}\n`);

    // Step 2: Link UserAchievement records
    console.log('--- Step 2: Link UserAchievement Records ---');
    const userAchievementsLinked = await linkUserAchievements();
    console.log(`UserAchievements linked: ${userAchievementsLinked}\n`);

    // Step 3: Seed QuickAction data
    console.log('--- Step 3: Seed QuickAction Data ---');
    const quickActionsSeeded = await seedQuickActions();
    console.log(`QuickActions seeded: ${quickActionsSeeded}\n`);

    // Step 4: Seed ValueCard data
    console.log('--- Step 4: Seed ValueCard Data ---');
    const valueCardsSeeded = await seedValueCards();
    console.log(`ValueCards seeded: ${valueCardsSeeded}\n`);

    // Step 5: Seed LeaderboardConfig data
    console.log('--- Step 5: Seed LeaderboardConfig Data ---');
    const leaderboardConfigsSeeded = await seedLeaderboardConfigs();
    console.log(`LeaderboardConfigs seeded: ${leaderboardConfigsSeeded}\n`);

    // Summary
    console.log('==========================================================');
    console.log('  Migration Summary');
    console.log('==========================================================');
    console.log(`  Achievements migrated/updated : ${achievementsMigrated} / ${ACHIEVEMENT_DEFINITIONS.length}`);
    console.log(`  UserAchievements linked       : ${userAchievementsLinked}`);
    console.log(`  QuickActions seeded           : ${quickActionsSeeded} / 6`);
    console.log(`  ValueCards seeded             : ${valueCardsSeeded} / 4`);
    console.log(`  LeaderboardConfigs seeded     : ${leaderboardConfigsSeeded} / 6`);
    console.log('==========================================================');
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

main();
