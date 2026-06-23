/**
 * Seed Referrals System
 * Creates comprehensive referral relationships with proper user updates and transactions
 *
 * Run with: npx ts-node scripts/seedReferrals.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Referral, { ReferralStatus } from '../src/models/Referral';
import { User, IUser } from '../src/models/User';
import { Transaction } from '../src/models/Transaction';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

// Tier-based reward mapping
const TIER_REWARDS = {
  STARTER: { referrerAmount: 50, refereeDiscount: 50, milestoneBonus: 20 },
  BRONZE: { referrerAmount: 75, refereeDiscount: 60, milestoneBonus: 30 },
  SILVER: { referrerAmount: 100, refereeDiscount: 75, milestoneBonus: 40 },
  GOLD: { referrerAmount: 150, refereeDiscount: 100, milestoneBonus: 50 },
  PLATINUM: { referrerAmount: 200, refereeDiscount: 125, milestoneBonus: 75 },
  DIAMOND: { referrerAmount: 250, refereeDiscount: 150, milestoneBonus: 100 }
};

// Share methods for realistic metadata
const SHARE_METHODS = ['whatsapp', 'sms', 'email', 'copy', 'qr', 'facebook', 'twitter'];
const SIGNUP_SOURCES = ['web', 'mobile'];

/**
 * Generate realistic referral data
 */
async function seedReferrals() {
  try {
    console.log('🌱 Starting Referrals Seed...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Fetch all existing users
    console.log('👥 Fetching users...');
    const users = await User.find({}).select('_id referral referralTier wallet profile.firstName profile.lastName');

    if (users.length < 2) {
      console.log('⚠️  Need at least 2 users to create referrals. Please seed users first.');
      process.exit(0);
    }

    console.log(`✅ Found ${users.length} users\n`);

    // Clear existing referrals
    console.log('🗑️  Clearing existing referrals...');
    await Referral.deleteMany({});
    console.log('✅ Cleared existing referrals\n');

    // Prepare referral data
    console.log('🔗 Creating referral relationships...');
    const referrals = [];
    const userUpdates = new Map(); // Track user updates
    const transactions = [];
    let transactionCounter = 0; // Counter for unique transaction IDs

    // Create 15 referral relationships
    const referralCount = Math.min(15, users.length - 1);

    for (let i = 0; i < referralCount; i++) {
      // Select referrer and referee (ensure they're different)
      const referrerIndex = i % users.length;
      let refereeIndex = (i + 1) % users.length;

      // Ensure no self-referrals
      if (referrerIndex === refereeIndex) {
        refereeIndex = (refereeIndex + 1) % users.length;
      }

      const referrer = users[referrerIndex];
      const referee = users[refereeIndex];

      // Prevent duplicate referrals
      if ((referrer._id as any).toString() === (referee._id as any).toString()) {
        continue;
      }

      // Determine status based on distribution
      let status: ReferralStatus;
      if (i < 10) {
        status = ReferralStatus.COMPLETED; // First 10 are successful (completed)
      } else if (i < 13) {
        status = ReferralStatus.PENDING; // Next 3 are pending
      } else {
        status = ReferralStatus.QUALIFIED; // Last 2 are qualified (redeemed)
      }

      // Get referrer's tier and corresponding rewards
      const referrerTier = referrer.referralTier || 'STARTER';
      const rewards = TIER_REWARDS[referrerTier as keyof typeof TIER_REWARDS] || TIER_REWARDS.STARTER;

      // Calculate dates based on status
      const createdDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000); // 0-60 days ago
      const registeredDate = new Date(createdDate.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000); // 0-2 days after creation

      let completedDate: Date | undefined;
      let qualifiedDate: Date | undefined;

      if (status === ReferralStatus.COMPLETED || status === ReferralStatus.QUALIFIED) {
        qualifiedDate = new Date(registeredDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000); // 0-5 days after registration
        completedDate = new Date(qualifiedDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000); // 0-3 days after qualification
      }

      // Create referral object
      const referral = {
        referrer: (referrer._id as any),
        referee: (referee._id as any),
        referralCode: referrer.referral?.referralCode || `REF${(referrer._id as any).toString().slice(-6).toUpperCase()}`,
        status,
        tier: referrerTier,
        rewards: {
          referrerAmount: rewards.referrerAmount,
          refereeDiscount: rewards.refereeDiscount,
          milestoneBonus: rewards.milestoneBonus,
          description: `${referrerTier} tier referral rewards`
        },
        referrerRewarded: status === ReferralStatus.COMPLETED || status === ReferralStatus.QUALIFIED,
        refereeRewarded: status === ReferralStatus.COMPLETED || status === ReferralStatus.QUALIFIED,
        milestoneRewarded: status === ReferralStatus.COMPLETED,
        qualificationCriteria: {
          minOrders: 1,
          minSpend: 500,
          timeframeDays: 30
        },
        registeredAt: registeredDate,
        qualifiedAt: qualifiedDate,
        completedAt: completedDate,
        expiresAt: new Date(createdDate.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days from creation
        metadata: {
          shareMethod: SHARE_METHODS[Math.floor(Math.random() * SHARE_METHODS.length)],
          sharedAt: new Date(createdDate.getTime() - Math.random() * 1 * 24 * 60 * 60 * 1000), // 0-1 day before creation
          signupSource: SIGNUP_SOURCES[Math.floor(Math.random() * SIGNUP_SOURCES.length)],
          deviceId: `device_${Math.random().toString(36).substring(7)}`,
          refereeFirstOrder: status !== ReferralStatus.PENDING ? {
            orderId: new mongoose.Types.ObjectId(),
            amount: 500 + Math.floor(Math.random() * 1500),
            completedAt: qualifiedDate || registeredDate
          } : undefined,
          milestoneOrders: status === ReferralStatus.COMPLETED ? {
            count: Math.floor(Math.random() * 5) + 3,
            totalAmount: 1500 + Math.floor(Math.random() * 3500),
            lastOrderAt: completedDate
          } : {
            count: 0,
            totalAmount: 0
          }
        },
        createdAt: createdDate,
        updatedAt: completedDate || qualifiedDate || registeredDate || createdDate
      };

      referrals.push(referral);

      // Track user updates
      const referrerKey = (referrer._id as any).toString();
      const refereeKey = (referee._id as any).toString();

      if (!userUpdates.has(referrerKey)) {
        userUpdates.set(referrerKey, {
          userId: (referrer._id as any),
          totalReferrals: 0,
          referredUsers: [],
          referralEarnings: 0,
          walletBalance: referrer.wallet?.balance || 0
        });
      }

      const referrerUpdate = userUpdates.get(referrerKey)!;
      referrerUpdate.totalReferrals = (referrerUpdate.totalReferrals || 0) + 1;
      if (!referrerUpdate.referredUsers) {
        referrerUpdate.referredUsers = [];
      }
      referrerUpdate.referredUsers.push((referee._id as any));

      // Add earnings and create transaction for successful referrals
      if (status === ReferralStatus.COMPLETED || status === ReferralStatus.QUALIFIED) {
        const earningAmount = rewards.referrerAmount;
        referrerUpdate.referralEarnings = (referrerUpdate.referralEarnings || 0) + earningAmount;
        referrerUpdate.walletBalance = (referrerUpdate.walletBalance || 0) + earningAmount;

        // Create transaction for referral reward
        const balanceBefore = referrer.wallet?.balance || 0;
        const balanceAfter = balanceBefore + earningAmount;

        transactionCounter++;
        transactions.push({
          user: (referrer._id as any),
          type: 'credit',
          category: 'earning',
          amount: earningAmount,
          currency: 'INR',
          transactionId: `REF-${Date.now()}-${transactionCounter.toString().padStart(6, '0')}`,
          description: `Referral reward from ${referee.profile?.firstName || 'user'} (${referrerTier} tier)`,
          source: {
            type: 'referral',
            reference: (referee._id as any),
            description: `${referrerTier} tier referral bonus`,
            metadata: {
              referralInfo: {
                referredUser: (referee._id as any),
                level: 1
              }
            }
          },
          status: {
            current: 'completed',
            history: [{
              status: 'completed',
              timestamp: completedDate || qualifiedDate || new Date(),
              reason: 'Referral completed successfully'
            }]
          },
          balanceBefore,
          balanceAfter,
          fees: 0,
          tax: 0,
          netAmount: earningAmount,
          isReversible: false,
          retryCount: 0,
          maxRetries: 3,
          processedAt: completedDate || qualifiedDate,
          createdAt: completedDate || qualifiedDate || new Date()
        });
      }

      // Update referee's referredBy
      if (!userUpdates.has(refereeKey)) {
        userUpdates.set(refereeKey, {
          userId: (referee._id as any),
          referredBy: referrer.referral?.referralCode
        });
      } else {
        userUpdates.get(refereeKey)!.referredBy = referrer.referral?.referralCode;
      }
    }

    // Insert referrals
    console.log(`📝 Inserting ${referrals.length} referrals...`);
    await Referral.insertMany(referrals);
    console.log(`✅ Created ${referrals.length} referrals\n`);

    // Update users
    console.log('👥 Updating user referral stats...');
    let updatedUsers = 0;
    for (const [userId, update] of Array.from(userUpdates.entries())) {
      const updateData: any = {};

      if (update.totalReferrals !== undefined && !isNaN(update.totalReferrals)) {
        updateData['referral.totalReferrals'] = update.totalReferrals;
      }

      if (update.referredUsers) {
        updateData['referral.referredUsers'] = update.referredUsers;
      }

      if (update.referralEarnings !== undefined && !isNaN(update.referralEarnings)) {
        updateData['referral.referralEarnings'] = update.referralEarnings;
      }

      if (update.walletBalance !== undefined && !isNaN(update.walletBalance)) {
        updateData['wallet.balance'] = update.walletBalance;
        updateData['walletBalance'] = update.walletBalance;
        updateData['wallet.totalEarned'] = update.referralEarnings || 0;
      }

      if (update.referredBy) {
        updateData['referral.referredBy'] = update.referredBy;
      }

      await User.findByIdAndUpdate(userId, { $set: updateData });
      updatedUsers++;
    }
    console.log(`✅ Updated ${updatedUsers} users\n`);

    // Create transactions
    if (transactions.length > 0) {
      console.log(`💰 Creating ${transactions.length} referral reward transactions...`);
      await Transaction.insertMany(transactions);
      console.log(`✅ Created ${transactions.length} transactions\n`);
    }

    // Display statistics
    console.log('📊 Referral Statistics:');
    const stats = await Referral.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRewards: { $sum: '$rewards.referrerAmount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} referrals, ₹${stat.totalRewards} total rewards`);
    });

    // Display tier distribution
    console.log('\n📊 Tier Distribution:');
    const tierStats = await Referral.aggregate([
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 },
          avgReward: { $avg: '$rewards.referrerAmount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    tierStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} referrals, avg ₹${stat.avgReward.toFixed(2)} reward`);
    });

    // Display sample referrals
    console.log('\n📋 Sample Referrals:');
    const sampleReferrals = await Referral.find()
      .populate('referrer', 'profile.firstName profile.lastName referral.referralCode')
      .populate('referee', 'profile.firstName profile.lastName')
      .limit(3);

    sampleReferrals.forEach((referral, index) => {
      const referrer = referral.referrer as any;
      const referee = referral.referee as any;

      console.log(`\n   ${index + 1}. Referral #${(referral._id as any).toString().slice(-6)}`);
      console.log(`      Referrer: ${referrer?.profile?.firstName || 'Unknown'} ${referrer?.profile?.lastName || ''} (${referrer?.referral?.referralCode})`);
      console.log(`      Referee: ${referee?.profile?.firstName || 'Unknown'} ${referee?.profile?.lastName || ''}`);
      console.log(`      Status: ${referral.status}`);
      console.log(`      Tier: ${referral.tier}`);
      console.log(`      Reward: ₹${referral.rewards.referrerAmount}`);
      console.log(`      Referrer Rewarded: ${referral.referrerRewarded ? 'Yes' : 'No'}`);
      console.log(`      Created: ${referral.createdAt.toLocaleDateString()}`);
    });

    // Verify no self-referrals
    console.log('\n🔍 Verifying no self-referrals...');
    const selfReferrals = await Referral.find({
      $expr: { $eq: ['$referrer', '$referee'] }
    });

    if (selfReferrals.length > 0) {
      console.log(`⚠️  Found ${selfReferrals.length} self-referrals! This should not happen.`);
    } else {
      console.log('✅ No self-referrals found');
    }

    // Display top referrers
    console.log('\n🏆 Top Referrers:');
    const topReferrers = await User.find({ 'referral.totalReferrals': { $gt: 0 } })
      .sort({ 'referral.totalReferrals': -1 })
      .select('profile.firstName profile.lastName referral.referralCode referral.totalReferrals referral.referralEarnings referralTier')
      .limit(5);

    topReferrers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.profile?.firstName || 'Unknown'} ${user.profile?.lastName || ''}`);
      console.log(`      Code: ${user.referral?.referralCode}`);
      console.log(`      Tier: ${user.referralTier}`);
      console.log(`      Total Referrals: ${user.referral?.totalReferrals || 0}`);
      console.log(`      Earnings: ₹${user.referral?.referralEarnings || 0}`);
    });

    console.log('\n✅ Referrals Seed Complete!\n');
    console.log('📝 Summary:');
    console.log(`   - Created ${referrals.length} referral relationships`);
    console.log(`   - Updated ${updatedUsers} users`);
    console.log(`   - Created ${transactions.length} reward transactions`);
    console.log(`   - No self-referrals detected`);
    console.log('\n💡 Tip: Users can now track their referrals and earnings through the app!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding referrals:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the seed function
if (require.main === module) {
  seedReferrals();
}

export default seedReferrals;
