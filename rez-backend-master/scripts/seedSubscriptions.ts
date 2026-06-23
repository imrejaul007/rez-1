// Seed script for Subscriptions system
// Run with: npx ts-node scripts/seedSubscriptions.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Subscription, ISubscription, SubscriptionTier, SubscriptionStatus, BillingCycle } from '../src/models/Subscription';
import { User, IUser } from '../src/models/User';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Helper function to generate mock Razorpay IDs
const generateRazorpayId = (prefix: string): string => {
  const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `${prefix}_${randomString}`;
};

// Helper function to calculate dates
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

// Subscription configurations based on tier
const getTierBenefits = (tier: SubscriptionTier) => {
  const config = Subscription.getTierConfig(tier);
  return config.benefits;
};

const getTierPrice = (tier: SubscriptionTier, billingCycle: BillingCycle): number => {
  const config = Subscription.getTierConfig(tier);
  return billingCycle === 'monthly' ? config.pricing.monthly : config.pricing.yearly;
};

// Subscription templates
interface SubscriptionTemplate {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  daysActive?: number; // Days since subscription started
  isInTrial?: boolean;
  metadata?: {
    source?: 'web' | 'app' | 'referral' | 'support';
    campaign?: string;
    promoCode?: string;
  };
}

const subscriptionTemplates: SubscriptionTemplate[] = [
  // FREE tier subscriptions (5 users)
  {
    tier: 'free',
    status: 'active',
    billingCycle: 'monthly',
    daysActive: 90,
    metadata: { source: 'app' }
  },
  {
    tier: 'free',
    status: 'active',
    billingCycle: 'monthly',
    daysActive: 45,
    metadata: { source: 'web' }
  },
  {
    tier: 'free',
    status: 'active',
    billingCycle: 'monthly',
    daysActive: 15,
    metadata: { source: 'app' }
  },
  {
    tier: 'free',
    status: 'active',
    billingCycle: 'monthly',
    daysActive: 5,
    metadata: { source: 'referral', campaign: 'refer-a-friend' }
  },
  {
    tier: 'free',
    status: 'active',
    billingCycle: 'monthly',
    daysActive: 1,
    metadata: { source: 'app' }
  },

  // PREMIUM tier subscriptions (3 users)
  {
    tier: 'premium',
    status: 'active',
    billingCycle: 'monthly',
    daysActive: 60,
    metadata: { source: 'web', campaign: 'premium-launch' }
  },
  {
    tier: 'premium',
    status: 'trial',
    billingCycle: 'monthly',
    daysActive: 3,
    isInTrial: true,
    metadata: { source: 'app', campaign: 'free-trial-2024' }
  },
  {
    tier: 'premium',
    status: 'grace_period',
    billingCycle: 'yearly',
    daysActive: 180,
    metadata: { source: 'web', promoCode: 'SAVE20' }
  },

  // VIP tier subscriptions (2 users)
  {
    tier: 'vip',
    status: 'active',
    billingCycle: 'yearly',
    daysActive: 120,
    metadata: { source: 'web', campaign: 'vip-exclusive' }
  },
  {
    tier: 'vip',
    status: 'active',
    billingCycle: 'monthly',
    daysActive: 30,
    metadata: { source: 'app', campaign: 'upgrade-to-vip' }
  }
];

async function seedSubscriptions() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('🚀 Starting Subscription Seeding Process...\n');
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Fetch users from database
    const users: IUser[] = await User.find().limit(10) as IUser[];
    if (users.length === 0) {
      console.error('❌ No users found in database. Please seed users first.');
      console.log('💡 Tip: Create users using the auth API or run a user seed script first.\n');
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} users in database`);

    if (users.length < subscriptionTemplates.length) {
      console.log(`⚠️  Warning: Need ${subscriptionTemplates.length} users but found only ${users.length}`);
      console.log(`   Will create subscriptions for available users only\n`);
    }

    // Check existing subscriptions
    const existingCount = await Subscription.countDocuments();
    console.log(`📊 Current subscriptions in database: ${existingCount}`);

    if (existingCount > 0) {
      console.log('\n⚠️  Existing subscriptions found. Clearing all subscriptions...');
      await Subscription.deleteMany({});
      console.log('✅ Deleted existing subscriptions\n');
    }

    // Create subscriptions
    console.log('🌱 Creating subscription records...\n');
    const createdSubscriptions: ISubscription[] = [];
    const now = new Date();

    for (let i = 0; i < Math.min(users.length, subscriptionTemplates.length); i++) {
      const user = users[i];
      const template = subscriptionTemplates[i];

      // Calculate dates based on template
      const startDate = addDays(now, -(template.daysActive || 0));
      let endDate: Date;
      let trialEndDate: Date | undefined;
      let gracePeriodStartDate: Date | undefined;

      // Set end date based on billing cycle
      if (template.billingCycle === 'monthly') {
        endDate = addMonths(startDate, 1);
      } else {
        endDate = addYears(startDate, 1);
      }

      // Handle trial period
      if (template.isInTrial && template.tier !== 'free') {
        trialEndDate = addDays(startDate, 7); // 7-day trial
      }

      // Handle grace period
      if (template.status === 'grace_period') {
        gracePeriodStartDate = addDays(now, -2); // Grace period started 2 days ago
      }

      // Get tier-specific benefits and price
      const benefits = getTierBenefits(template.tier);
      const price = getTierPrice(template.tier, template.billingCycle);

      // Generate mock Razorpay data (only for paid tiers)
      const razorpayData = template.tier !== 'free' ? {
        razorpaySubscriptionId: generateRazorpayId('sub'),
        razorpayPlanId: generateRazorpayId('plan'),
        razorpayCustomerId: generateRazorpayId('cust')
      } : {};

      // Create subscription data
      const subscriptionData: Partial<ISubscription> = {
        user: user._id as any,
        tier: template.tier,
        status: template.status,
        billingCycle: template.billingCycle,
        price,
        startDate,
        endDate,
        trialEndDate,
        autoRenew: template.status === 'active' || template.status === 'trial',
        paymentMethod: template.tier !== 'free' ? 'razorpay' : undefined,

        // Razorpay integration
        ...razorpayData,

        // Benefits based on tier
        benefits,

        // Initialize usage stats (all zeros for new subscriptions)
        usage: {
          totalSavings: 0,
          ordersThisMonth: 0,
          ordersAllTime: 0,
          cashbackEarned: 0,
          deliveryFeesSaved: 0,
          exclusiveDealsUsed: 0
        },

        // Grace period tracking
        gracePeriodStartDate,
        paymentRetryCount: template.status === 'grace_period' ? 2 : 0,
        lastPaymentRetryDate: template.status === 'grace_period' ? addDays(now, -1) : undefined,

        // Grandfathering (false for new subscriptions)
        isGrandfathered: false,

        // Metadata
        metadata: template.metadata
      };

      // Create subscription
      const subscription = await Subscription.create(subscriptionData);
      createdSubscriptions.push(subscription);

      // Log progress
      const userName = user.profile?.firstName || user.phoneNumber;
      const statusEmoji = template.status === 'active' ? '✅' :
                         template.status === 'trial' ? '🎁' :
                         template.status === 'grace_period' ? '⏰' : '❓';
      console.log(`${statusEmoji} [${i + 1}/${Math.min(users.length, subscriptionTemplates.length)}] Created ${template.tier.toUpperCase()} subscription for ${userName} (${template.status})`);
    }

    // Display summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 SUBSCRIPTION SEEDING SUMMARY');
    console.log('='.repeat(80) + '\n');

    // Count by tier
    const tierCounts = {
      free: createdSubscriptions.filter(s => s.tier === 'free').length,
      premium: createdSubscriptions.filter(s => s.tier === 'premium').length,
      vip: createdSubscriptions.filter(s => s.tier === 'vip').length
    };

    // Count by status
    const statusCounts = {
      active: createdSubscriptions.filter(s => s.status === 'active').length,
      trial: createdSubscriptions.filter(s => s.status === 'trial').length,
      grace_period: createdSubscriptions.filter(s => s.status === 'grace_period').length
    };

    console.log('📊 Tier Distribution:');
    console.log(`   FREE:    ${tierCounts.free} subscriptions`);
    console.log(`   PREMIUM: ${tierCounts.premium} subscriptions`);
    console.log(`   VIP:     ${tierCounts.vip} subscriptions`);
    console.log(`   TOTAL:   ${createdSubscriptions.length} subscriptions\n`);

    console.log('🔍 Status Distribution:');
    console.log(`   Active:       ${statusCounts.active} subscriptions`);
    console.log(`   Trial:        ${statusCounts.trial} subscriptions`);
    console.log(`   Grace Period: ${statusCounts.grace_period} subscriptions\n`);

    // Detailed breakdown
    console.log('📝 Detailed Subscription List:\n');
    createdSubscriptions.forEach((subscription, index) => {
      const user = users.find(u => (u._id as any).toString() === subscription.user.toString());
      const userName = user?.profile?.firstName || user?.phoneNumber || 'Unknown';
      const daysRemaining = subscription.getRemainingDays();

      console.log(`${index + 1}. ${subscription.tier.toUpperCase()} - ${userName}`);
      console.log(`   Status: ${subscription.status}`);
      console.log(`   Billing: ${subscription.billingCycle} (₹${subscription.price})`);
      console.log(`   Period: ${subscription.startDate.toLocaleDateString()} → ${subscription.endDate.toLocaleDateString()}`);
      console.log(`   Days Remaining: ${daysRemaining}`);

      if (subscription.trialEndDate) {
        console.log(`   Trial Ends: ${subscription.trialEndDate.toLocaleDateString()}`);
      }

      if (subscription.gracePeriodStartDate) {
        console.log(`   Grace Period Started: ${subscription.gracePeriodStartDate.toLocaleDateString()}`);
        console.log(`   Payment Retry Count: ${subscription.paymentRetryCount}`);
      }

      if (subscription.razorpaySubscriptionId) {
        console.log(`   Razorpay Sub ID: ${subscription.razorpaySubscriptionId}`);
      }

      if (subscription.metadata) {
        const meta = subscription.metadata;
        if (meta.source) console.log(`   Source: ${meta.source}`);
        if (meta.campaign) console.log(`   Campaign: ${meta.campaign}`);
        if (meta.promoCode) console.log(`   Promo Code: ${meta.promoCode}`);
      }

      console.log('');
    });

    // Benefits showcase
    console.log('🎁 Sample Benefits by Tier:\n');
    console.log('FREE Tier:');
    const freeBenefits = getTierBenefits('free');
    console.log(`   - Cashback Multiplier: ${freeBenefits.cashbackMultiplier}x`);
    console.log(`   - Free Delivery: ${freeBenefits.freeDelivery ? 'Yes' : 'No'}`);
    console.log(`   - Priority Support: ${freeBenefits.prioritySupport ? 'Yes' : 'No'}\n`);

    console.log('PREMIUM Tier:');
    const premiumBenefits = getTierBenefits('premium');
    console.log(`   - Cashback Multiplier: ${premiumBenefits.cashbackMultiplier}x`);
    console.log(`   - Free Delivery: ${premiumBenefits.freeDelivery ? 'Yes' : 'No'}`);
    console.log(`   - Priority Support: ${premiumBenefits.prioritySupport ? 'Yes' : 'No'}`);
    console.log(`   - Exclusive Deals: ${premiumBenefits.exclusiveDeals ? 'Yes' : 'No'}`);
    console.log(`   - Early Flash Sale Access: ${premiumBenefits.earlyFlashSaleAccess ? 'Yes' : 'No'}\n`);

    console.log('VIP Tier:');
    const vipBenefits = getTierBenefits('vip');
    console.log(`   - Cashback Multiplier: ${vipBenefits.cashbackMultiplier}x`);
    console.log(`   - Free Delivery: ${vipBenefits.freeDelivery ? 'Yes' : 'No'}`);
    console.log(`   - Priority Support: ${vipBenefits.prioritySupport ? 'Yes' : 'No'}`);
    console.log(`   - Personal Shopper: ${vipBenefits.personalShopper ? 'Yes' : 'No'}`);
    console.log(`   - Concierge Service: ${vipBenefits.conciergeService ? 'Yes' : 'No'}`);
    console.log(`   - Premium Events: ${vipBenefits.premiumEvents ? 'Yes' : 'No'}\n`);

    console.log('='.repeat(80));
    console.log('✅ SUBSCRIPTION SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80) + '\n');

    console.log('💡 Next Steps:');
    console.log('   1. Test subscription APIs with the seeded data');
    console.log('   2. Verify subscription benefits are applied correctly');
    console.log('   3. Test upgrade/downgrade flows');
    console.log('   4. Test trial to paid conversion');
    console.log('   5. Test grace period handling\n');

  } catch (error) {
    console.error('\n❌ Error seeding subscriptions:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB\n');
  }
}

// Run the seed function
seedSubscriptions();
