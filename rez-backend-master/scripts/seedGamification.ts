/**
 * Comprehensive Gamification Seed Script
 * Seeds all gamification-related collections:
 * - Challenges (15)
 * - UserChallengeProgress (30)
 * - ScratchCards (20)
 * - CoinTransactions (50)
 * - MiniGames (3 definitions)
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Challenge from '../src/models/Challenge';
import UserChallengeProgress from '../src/models/UserChallengeProgress';
import ScratchCard from '../src/models/ScratchCard';
import { CoinTransaction } from '../src/models/CoinTransaction';
import { MiniGame } from '../src/models/MiniGame';
import { User } from '../src/models/User';
import { Wallet } from '../src/models/Wallet';
import { Store } from '../src/models/Store';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

// Helper function to generate random date within range
function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to get random items from array
function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

async function seedChallenges() {
  console.log('\n📋 Seeding Challenges...');

  const stores = await Store.find({}).limit(5);
  const storeIds = stores.map(s => s._id);

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const next3Months = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const challenges = [
    // DAILY CHALLENGES (5)
    {
      type: 'daily',
      title: 'Daily Check-In',
      description: 'Login to the app today and claim your reward',
      icon: '🎯',
      requirements: {
        action: 'login_streak',
        target: 1,
      },
      rewards: {
        coins: 10,
        badges: ['daily-warrior'],
      },
      difficulty: 'easy',
      startDate: yesterday,
      endDate: now,
      participantCount: 120,
      completionCount: 95,
      active: true,
      featured: true,
    },
    {
      type: 'daily',
      title: 'Store Explorer',
      description: 'Visit 3 different stores today',
      icon: '🏪',
      requirements: {
        action: 'visit_stores',
        target: 3,
      },
      rewards: {
        coins: 15,
        multiplier: 1.2,
      },
      difficulty: 'easy',
      startDate: yesterday,
      endDate: now,
      participantCount: 85,
      completionCount: 42,
      active: true,
      featured: false,
    },
    {
      type: 'daily',
      title: 'Social Sharer',
      description: 'Share 2 amazing deals with your friends',
      icon: '📱',
      requirements: {
        action: 'share_deals',
        target: 2,
      },
      rewards: {
        coins: 20,
        badges: ['social-butterfly'],
      },
      difficulty: 'medium',
      startDate: yesterday,
      endDate: now,
      participantCount: 60,
      completionCount: 35,
      active: true,
      featured: false,
    },
    {
      type: 'daily',
      title: 'Category Curious',
      description: 'Explore 5 different product categories',
      icon: '🔍',
      requirements: {
        action: 'explore_categories',
        target: 5,
        categories: ['Electronics', 'Fashion', 'Food', 'Home', 'Beauty'],
      },
      rewards: {
        coins: 25,
      },
      difficulty: 'medium',
      startDate: yesterday,
      endDate: now,
      participantCount: 45,
      completionCount: 18,
      active: true,
      featured: false,
    },
    {
      type: 'daily',
      title: 'Favorites Collector',
      description: 'Add 3 items to your favorites list',
      icon: '⭐',
      requirements: {
        action: 'add_favorites',
        target: 3,
      },
      rewards: {
        coins: 15,
      },
      difficulty: 'easy',
      startDate: yesterday,
      endDate: now,
      participantCount: 70,
      completionCount: 55,
      active: true,
      featured: false,
    },

    // WEEKLY CHALLENGES (5)
    {
      type: 'weekly',
      title: 'Weekly Shopper',
      description: 'Complete 3 orders this week',
      icon: '🛒',
      requirements: {
        action: 'order_count',
        target: 3,
      },
      rewards: {
        coins: 100,
        multiplier: 1.5,
        badges: ['weekly-shopper'],
      },
      difficulty: 'medium',
      startDate: lastWeek,
      endDate: now,
      participantCount: 150,
      completionCount: 68,
      active: true,
      featured: true,
    },
    {
      type: 'weekly',
      title: 'Big Spender',
      description: 'Spend ₹2000 or more this week',
      icon: '💰',
      requirements: {
        action: 'spend_amount',
        target: 2000,
        minAmount: 2000,
      },
      rewards: {
        coins: 200,
        multiplier: 2.0,
      },
      difficulty: 'hard',
      startDate: lastWeek,
      endDate: now,
      participantCount: 95,
      completionCount: 28,
      active: true,
      featured: true,
    },
    {
      type: 'weekly',
      title: 'Review Master',
      description: 'Write 5 product reviews this week',
      icon: '✍️',
      requirements: {
        action: 'review_count',
        target: 5,
      },
      rewards: {
        coins: 75,
        badges: ['review-master'],
      },
      difficulty: 'medium',
      startDate: lastWeek,
      endDate: now,
      participantCount: 80,
      completionCount: 42,
      active: true,
      featured: false,
    },
    {
      type: 'weekly',
      title: 'Receipt Hunter',
      description: 'Upload 10 bills this week',
      icon: '📄',
      requirements: {
        action: 'upload_bills',
        target: 10,
      },
      rewards: {
        coins: 150,
        multiplier: 1.3,
      },
      difficulty: 'hard',
      startDate: lastWeek,
      endDate: now,
      participantCount: 55,
      completionCount: 15,
      active: true,
      featured: false,
    },
    {
      type: 'weekly',
      title: 'Local Hero',
      description: 'Order from 5 different local stores',
      icon: '🏘️',
      requirements: {
        action: 'visit_stores',
        target: 5,
        stores: storeIds.length > 0 ? getRandomItems(storeIds, 5) : [],
      },
      rewards: {
        coins: 120,
        badges: ['local-hero'],
      },
      difficulty: 'medium',
      startDate: lastWeek,
      endDate: now,
      participantCount: 65,
      completionCount: 30,
      active: true,
      featured: false,
    },

    // MONTHLY CHALLENGES (5)
    {
      type: 'monthly',
      title: 'Monthly Mega Shopper',
      description: 'Complete 15 orders this month',
      icon: '🎖️',
      requirements: {
        action: 'order_count',
        target: 15,
      },
      rewards: {
        coins: 500,
        multiplier: 2.5,
        badges: ['mega-shopper', 'vip-member'],
      },
      difficulty: 'hard',
      startDate: lastMonth,
      endDate: nextMonth,
      participantCount: 200,
      completionCount: 45,
      active: true,
      featured: true,
    },
    {
      type: 'monthly',
      title: 'Influencer Challenge',
      description: 'Refer 5 friends this month',
      icon: '👥',
      requirements: {
        action: 'refer_friends',
        target: 5,
      },
      rewards: {
        coins: 1000,
        badges: ['influencer'],
        multiplier: 3.0,
      },
      difficulty: 'hard',
      startDate: lastMonth,
      endDate: nextMonth,
      participantCount: 120,
      completionCount: 18,
      active: true,
      featured: true,
    },
    {
      type: 'monthly',
      title: 'Loyalty Champion',
      description: 'Maintain a 7-day login streak',
      icon: '🔥',
      requirements: {
        action: 'login_streak',
        target: 7,
      },
      rewards: {
        coins: 300,
        badges: ['loyalty-champion', 'streak-master'],
        multiplier: 1.8,
      },
      difficulty: 'medium',
      startDate: lastMonth,
      endDate: nextMonth,
      participantCount: 180,
      completionCount: 92,
      active: true,
      featured: true,
    },
    {
      type: 'monthly',
      title: 'Premium Spender',
      description: 'Spend ₹10,000 this month',
      icon: '💎',
      requirements: {
        action: 'spend_amount',
        target: 10000,
        minAmount: 10000,
      },
      rewards: {
        coins: 800,
        multiplier: 3.0,
        badges: ['premium-member'],
      },
      difficulty: 'hard',
      startDate: lastMonth,
      endDate: nextMonth,
      participantCount: 75,
      completionCount: 12,
      active: true,
      featured: false,
    },
    {
      type: 'monthly',
      title: 'Community Contributor',
      description: 'Write 20 reviews this month',
      icon: '🌟',
      requirements: {
        action: 'review_count',
        target: 20,
      },
      rewards: {
        coins: 400,
        badges: ['community-star', 'trusted-reviewer'],
      },
      difficulty: 'hard',
      startDate: lastMonth,
      endDate: nextMonth,
      participantCount: 90,
      completionCount: 25,
      active: true,
      featured: false,
    },
  ];

  const insertedChallenges = await Challenge.insertMany(challenges);
  console.log(`✅ Created ${insertedChallenges.length} challenges`);

  return insertedChallenges;
}

async function seedUserChallengeProgress(challenges: any[], users: any[]) {
  console.log('\n🎯 Seeding User Challenge Progress...');

  const progressRecords = [];
  const now = new Date();

  // Create 30 progress records with different statuses
  let completedCount = 0;
  let inProgressCount = 0;
  let pendingCount = 0;

  for (let i = 0; i < 30; i++) {
    const user = users[i % users.length];
    const challenge = challenges[i % challenges.length];
    const target = challenge.requirements.target;

    let status: 'completed' | 'in_progress' | 'pending';
    let progress: number;
    let completed: boolean;
    let completedAt: Date | undefined;
    let rewardsClaimed: boolean;
    let claimedAt: Date | undefined;
    const progressHistory: any[] = [];

    // Distribute statuses: 10 completed, 15 in_progress, 5 pending
    if (completedCount < 10) {
      status = 'completed';
      progress = target;
      completed = true;
      completedAt = getRandomDate(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), now);
      rewardsClaimed = true;
      claimedAt = completedAt;

      // Add progress history showing completion
      for (let j = 0; j < Math.min(target, 5); j++) {
        progressHistory.push({
          amount: Math.ceil(target / Math.min(target, 5)),
          timestamp: getRandomDate(new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), completedAt),
          source: `action_${j + 1}`,
        });
      }

      completedCount++;
    } else if (inProgressCount < 15) {
      status = 'in_progress';
      progress = Math.floor(target * (0.3 + Math.random() * 0.6)); // 30-90% complete
      completed = false;
      rewardsClaimed = false;

      // Add partial progress history
      const steps = Math.ceil(progress / (target * 0.2));
      for (let j = 0; j < steps; j++) {
        progressHistory.push({
          amount: Math.floor(progress / steps),
          timestamp: getRandomDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now),
          source: `action_${j + 1}`,
        });
      }

      inProgressCount++;
    } else {
      status = 'pending';
      progress = 0;
      completed = false;
      rewardsClaimed = false;
      pendingCount++;
    }

    progressRecords.push({
      user: (user._id as any),
      challenge: challenge._id,
      progress,
      target,
      completed,
      completedAt,
      rewardsClaimed,
      claimedAt,
      startedAt: getRandomDate(new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), now),
      lastUpdatedAt: completed ? completedAt : now,
      progressHistory,
    });
  }

  const insertedProgress = await UserChallengeProgress.insertMany(progressRecords);
  console.log(`✅ Created ${insertedProgress.length} user challenge progress records`);
  console.log(`   - Completed: ${completedCount}`);
  console.log(`   - In Progress: ${inProgressCount}`);
  console.log(`   - Pending: ${pendingCount}`);

  return insertedProgress;
}

async function seedScratchCards(users: any[]) {
  console.log('\n🎫 Seeding Scratch Cards...');

  const prizes = [
    {
      id: '1',
      type: 'discount' as const,
      value: 10,
      title: '10% Discount',
      description: 'Get 10% off your next purchase',
      icon: 'pricetag',
      color: '#10B981',
      isActive: true,
    },
    {
      id: '2',
      type: 'cashback' as const,
      value: 50,
      title: '₹50 Cashback',
      description: 'Earn ₹50 cashback on your next order',
      icon: 'cash',
      color: '#F59E0B',
      isActive: true,
    },
    {
      id: '3',
      type: 'coin' as const,
      value: 100,
      title: '100 REZ Coins',
      description: 'Earn 100 REZ coins to your wallet',
      icon: 'diamond',
      color: '#8B5CF6',
      isActive: true,
    },
    {
      id: '4',
      type: 'voucher' as const,
      value: 200,
      title: '₹200 Voucher',
      description: 'Free ₹200 voucher for your next purchase',
      icon: 'gift',
      color: '#EF4444',
      isActive: true,
    },
    {
      id: '5',
      type: 'discount' as const,
      value: 25,
      title: '25% Discount',
      description: 'Get 25% off your next purchase',
      icon: 'pricetag',
      color: '#3B82F6',
      isActive: true,
    },
  ];

  const scratchCards = [];
  const now = new Date();

  // Create 20 scratch cards
  for (let i = 0; i < 20; i++) {
    const user = users[i % users.length];
    const prize = prizes[Math.floor(Math.random() * prizes.length)];
    const isScratched = i < 10; // 10 revealed, 10 unrevealed
    const isClaimed = isScratched && Math.random() > 0.3; // 70% of scratched cards are claimed

    const createdAt = getRandomDate(new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), now);
    const expiryHours = i < 2 ? 2 : 24; // 2 cards expiring soon, rest have 24 hours
    const expiresAt = new Date(createdAt.getTime() + expiryHours * 60 * 60 * 1000);

    scratchCards.push({
      userId: (user._id as any),
      prize,
      isScratched,
      isClaimed,
      claimedAt: isClaimed ? getRandomDate(createdAt, now) : undefined,
      expiresAt,
      createdAt,
      updatedAt: isScratched ? getRandomDate(createdAt, now) : createdAt,
    });
  }

  const insertedScratchCards = await ScratchCard.insertMany(scratchCards);
  console.log(`✅ Created ${insertedScratchCards.length} scratch cards`);
  console.log(`   - Unrevealed: ${insertedScratchCards.filter(s => !s.isScratched).length}`);
  console.log(`   - Revealed: ${insertedScratchCards.filter(s => s.isScratched).length}`);
  console.log(`   - Claimed: ${insertedScratchCards.filter(s => s.isClaimed).length}`);

  return insertedScratchCards;
}

async function seedCoinTransactions(users: any[], challenges: any[]) {
  console.log('\n💰 Seeding Coin Transactions...');

  const transactions = [];
  const now = new Date();

  // Track balance per user
  const userBalances = new Map<string, number>();
  users.forEach(user => userBalances.set((user._id as any).toString(), 0));

  const sources = [
    { source: 'challenge', type: 'earned', description: 'Challenge completion reward', amount: [50, 100, 150, 200] },
    { source: 'referral', type: 'earned', description: 'Referral bonus', amount: [100, 200, 300] },
    { source: 'order', type: 'earned', description: 'Purchase reward', amount: [25, 50, 75] },
    { source: 'review', type: 'earned', description: 'Review reward', amount: [10, 20, 30] },
    { source: 'bill_upload', type: 'earned', description: 'Bill upload reward', amount: [15, 25, 40] },
    { source: 'daily_login', type: 'earned', description: 'Daily login bonus', amount: [5, 10, 15] },
    { source: 'spin_wheel', type: 'earned', description: 'Spin wheel prize', amount: [50, 100, 250] },
    { source: 'scratch_card', type: 'earned', description: 'Scratch card prize', amount: [100, 200, 300] },
    { source: 'purchase', type: 'spent', description: 'Mini-game entry', amount: [20, 50, 100] },
    { source: 'redemption', type: 'spent', description: 'Reward redemption', amount: [100, 200, 500] },
  ];

  // Create 50 coin transactions
  for (let i = 0; i < 50; i++) {
    const user = users[i % users.length];
    const userId = (user._id as any).toString();
    const currentBalance = userBalances.get(userId) || 0;

    // 25 earning, 25 spending - but ensure we don't go negative
    const isEarning = i < 25 || currentBalance < 50;
    const sourceData = isEarning
      ? sources.filter(s => s.type === 'earned')[Math.floor(Math.random() * sources.filter(s => s.type === 'earned').length)]
      : sources.filter(s => s.type === 'spent')[Math.floor(Math.random() * sources.filter(s => s.type === 'spent').length)];

    const amount = sourceData.amount[Math.floor(Math.random() * sourceData.amount.length)];

    // Update balance
    let newBalance: number;
    let type: string;
    if (sourceData.type === 'earned') {
      newBalance = currentBalance + amount;
      type = 'earned';
    } else {
      // Only spend if we have enough balance
      if (currentBalance >= amount) {
        newBalance = currentBalance - amount;
        type = 'spent';
      } else {
        // Convert to earning transaction instead
        newBalance = currentBalance + amount;
        type = 'earned';
      }
    }

    userBalances.set(userId, newBalance);

    const metadata: any = {};
    if (sourceData.source === 'challenge' && challenges.length > 0) {
      metadata.challengeId = challenges[Math.floor(Math.random() * challenges.length)]._id;
    }

    transactions.push({
      user: (user._id as any),
      type,
      amount,
      balance: newBalance,
      source: sourceData.source,
      description: sourceData.description,
      metadata,
      createdAt: getRandomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now),
    });
  }

  // Sort by createdAt to maintain chronological order
  transactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Recalculate balances in chronological order
  const finalBalances = new Map<string, number>();
  users.forEach(user => finalBalances.set((user._id as any).toString(), 0));

  transactions.forEach(tx => {
    const userId = tx.user.toString();
    const currentBalance = finalBalances.get(userId) || 0;

    if (tx.type === 'earned' || tx.type === 'bonus' || tx.type === 'refunded') {
      tx.balance = currentBalance + tx.amount;
    } else {
      tx.balance = Math.max(0, currentBalance - tx.amount);
    }

    finalBalances.set(userId, tx.balance);
  });

  const insertedTransactions = await CoinTransaction.insertMany(transactions);
  console.log(`✅ Created ${insertedTransactions.length} coin transactions`);
  console.log(`   - Earned: ${insertedTransactions.filter(t => t.type === 'earned').length}`);
  console.log(`   - Spent: ${insertedTransactions.filter(t => t.type === 'spent').length}`);

  // Update user wallet balances
  console.log('\n💳 Updating user wallet balances...');
  for (const userId of Array.from(finalBalances.keys())) {
    const balance = finalBalances.get(userId) || 0;
    const wallet = await Wallet.findOne({ user: userId });
    if (wallet) {
      wallet.balance.available += balance;
      wallet.balance.total += balance;
      wallet.statistics.totalEarned += balance;
      await wallet.save();
    }
  }
  console.log('✅ Updated wallet balances');

  return insertedTransactions;
}

async function seedMiniGames(users: any[]) {
  console.log('\n🎮 Seeding Mini Games...');

  const now = new Date();
  const miniGames = [];

  // Create 15 mini-game instances (5 of each type)
  const gameTypes = ['spin_wheel', 'scratch_card', 'quiz'] as const;
  const difficulties = ['easy', 'medium', 'hard'] as const;

  for (let i = 0; i < 15; i++) {
    const user = users[i % users.length];
    const gameType = gameTypes[i % 3];
    const difficulty = difficulties[Math.floor(Math.random() * 3)];
    const isCompleted = Math.random() > 0.4; // 60% completed
    const isExpired = !isCompleted && Math.random() > 0.8; // 20% of incomplete are expired

    const startedAt = getRandomDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now);
    const expiresAt = new Date(startedAt.getTime() + 24 * 60 * 60 * 1000);

    let status: 'active' | 'completed' | 'expired';
    let completedAt: Date | undefined;
    let reward: any = undefined;
    let metadata: any = {};

    if (isCompleted) {
      status = 'completed';
      completedAt = getRandomDate(startedAt, new Date(Math.min(expiresAt.getTime(), now.getTime())));
      reward = {
        coins: [50, 100, 200, 500][Math.floor(Math.random() * 4)],
      };

      if (gameType === 'spin_wheel') {
        metadata = {
          segment: Math.floor(Math.random() * 8),
          prize: 'coins',
        };
      } else if (gameType === 'scratch_card') {
        metadata = {
          revealed: true,
          revealedPrize: true,
          winningPrize: {
            type: 'coins',
            value: reward.coins,
            label: `${reward.coins} Coins`,
            color: '#8B5CF6',
          },
        };
      } else if (gameType === 'quiz') {
        const totalQuestions = 5;
        const correctAnswers = Math.floor(totalQuestions * (0.5 + Math.random() * 0.5));
        metadata = {
          totalQuestions,
          correctAnswers,
          score: (correctAnswers / totalQuestions) * 100,
        };
      }
    } else if (isExpired) {
      status = 'expired';
    } else {
      status = 'active';
    }

    miniGames.push({
      user: (user._id as any),
      gameType,
      status,
      difficulty,
      startedAt,
      completedAt,
      expiresAt,
      reward,
      metadata,
    });
  }

  const insertedMiniGames = await MiniGame.insertMany(miniGames);
  console.log(`✅ Created ${insertedMiniGames.length} mini-game instances`);
  console.log(`   - Spin Wheel: ${insertedMiniGames.filter(g => g.gameType === 'spin_wheel').length}`);
  console.log(`   - Scratch Card: ${insertedMiniGames.filter(g => g.gameType === 'scratch_card').length}`);
  console.log(`   - Quiz: ${insertedMiniGames.filter(g => g.gameType === 'quiz').length}`);
  console.log(`   - Completed: ${insertedMiniGames.filter(g => g.status === 'completed').length}`);
  console.log(`   - Active: ${insertedMiniGames.filter(g => g.status === 'active').length}`);
  console.log(`   - Expired: ${insertedMiniGames.filter(g => g.status === 'expired').length}`);

  return insertedMiniGames;
}

async function seedGamification() {
  try {
    console.log('🎮 Starting Gamification Seed...\n');
    console.log('═══════════════════════════════════════════════════════');

    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get users (need users to create gamification data)
    console.log('\n👥 Fetching users...');
    const users = await User.find({}).limit(10);
    console.log(`✅ Found ${users.length} users`);

    if (users.length === 0) {
      console.log('\n⚠️  No users found. Please seed users first.');
      console.log('   Run: npm run seed:simple or npm run seed:all');
      process.exit(0);
    }

    // Clear existing gamification data
    console.log('\n🗑️  Clearing existing gamification data...');
    await Promise.all([
      Challenge.deleteMany({}),
      UserChallengeProgress.deleteMany({}),
      ScratchCard.deleteMany({}),
      CoinTransaction.deleteMany({}),
      MiniGame.deleteMany({}),
    ]);
    console.log('✅ Cleared existing data');

    // Seed all gamification collections
    const challenges = await seedChallenges();
    const progressRecords = await seedUserChallengeProgress(challenges, users);
    const scratchCards = await seedScratchCards(users);
    const transactions = await seedCoinTransactions(users, challenges);
    const miniGames = await seedMiniGames(users);

    // Display summary statistics
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 GAMIFICATION SEED SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('✅ Challenges:', challenges.length);
    console.log('   - Daily:', challenges.filter(c => c.type === 'daily').length);
    console.log('   - Weekly:', challenges.filter(c => c.type === 'weekly').length);
    console.log('   - Monthly:', challenges.filter(c => c.type === 'monthly').length);

    console.log('\n✅ User Challenge Progress:', progressRecords.length);
    console.log('   - Completed:', progressRecords.filter(p => p.completed).length);
    console.log('   - In Progress:', progressRecords.filter(p => !p.completed && p.progress > 0).length);
    console.log('   - Pending:', progressRecords.filter(p => p.progress === 0).length);

    console.log('\n✅ Scratch Cards:', scratchCards.length);
    console.log('   - Unrevealed:', scratchCards.filter(s => !s.isScratched).length);
    console.log('   - Revealed:', scratchCards.filter(s => s.isScratched).length);

    console.log('\n✅ Coin Transactions:', transactions.length);
    console.log('   - Earned:', transactions.filter(t => t.type === 'earned').length);
    console.log('   - Spent:', transactions.filter(t => t.type === 'spent').length);

    console.log('\n✅ Mini Games:', miniGames.length);
    console.log('   - Completed:', miniGames.filter(g => g.status === 'completed').length);
    console.log('   - Active:', miniGames.filter(g => g.status === 'active').length);

    // Show sample data
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📋 SAMPLE DATA');
    console.log('═══════════════════════════════════════════════════════\n');

    const sampleChallenge = await Challenge.findOne({ featured: true });
    if (sampleChallenge) {
      console.log('🏆 Featured Challenge:');
      console.log(`   Title: ${sampleChallenge.title}`);
      console.log(`   Type: ${sampleChallenge.type}`);
      console.log(`   Reward: ${sampleChallenge.rewards.coins} coins`);
      console.log(`   Completion Rate: ${Math.round((sampleChallenge.completionCount / sampleChallenge.participantCount) * 100)}%`);
    }

    const sampleProgress = await UserChallengeProgress.findOne({ completed: true })
      .populate('user', 'profile.firstName email')
      .populate('challenge', 'title type');
    if (sampleProgress) {
      console.log('\n🎯 Completed Challenge:');
      console.log(`   User: ${(sampleProgress.user as any)?.email || 'Unknown'}`);
      console.log(`   Challenge: ${(sampleProgress.challenge as any)?.title || 'Unknown'}`);
      console.log(`   Progress: ${sampleProgress.progress}/${sampleProgress.target}`);
      console.log(`   Completed: ${sampleProgress.completedAt?.toLocaleDateString() || 'N/A'}`);
    }

    const userCoinBalance = await CoinTransaction.findOne()
      .sort({ createdAt: -1 })
      .populate('user', 'profile.firstName email');
    if (userCoinBalance) {
      console.log('\n💰 Latest Transaction:');
      console.log(`   User: ${(userCoinBalance.user as any)?.email || 'Unknown'}`);
      console.log(`   Type: ${userCoinBalance.type}`);
      console.log(`   Amount: ${userCoinBalance.amount} coins`);
      console.log(`   Balance: ${userCoinBalance.balance} coins`);
      console.log(`   Source: ${userCoinBalance.source}`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Gamification Seed Complete!');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding gamification:', error);
    process.exit(1);
  }
}

// Run the seed function
if (require.main === module) {
  seedGamification();
}

export default seedGamification;
