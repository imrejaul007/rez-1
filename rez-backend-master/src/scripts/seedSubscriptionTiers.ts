import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { SubscriptionTier } from '../models/SubscriptionTier';

dotenv.config();

const subscriptionTiers = [
  {
    tier: 'free',
    name: 'Free',
    pricing: {
      monthly: 0,
      yearly: 0,
      yearlyDiscount: 0
    },
    benefits: {
      cashbackMultiplier: 1,
      freeDeliveries: 0,
      maxWishlists: 5,
      prioritySupport: false,
      exclusiveDeals: false,
      earlyAccess: false,
      freeDelivery: false,
      unlimitedWishlists: false,
      earlyFlashSaleAccess: false,
      personalShopper: false,
      premiumEvents: false,
      conciergeService: false,
      birthdayOffer: false,
      anniversaryOffer: false,
    },
    description: 'Basic features with standard cashback',
    features: [
      '2-5% cashback on orders',
      'Basic features',
      'Standard support',
      '5 wishlists maximum',
      'Regular delivery'
    ],
    isActive: true,
    sortOrder: 1,
    trialDays: 0,
  },
  {
    tier: 'premium',
    name: 'Premium',
    pricing: {
      monthly: 99,
      yearly: 999,
      yearlyDiscount: 16
    },
    benefits: {
      cashbackMultiplier: 2,
      freeDeliveries: 10,
      maxWishlists: -1, // unlimited
      prioritySupport: true,
      exclusiveDeals: true,
      earlyAccess: true,
      freeDelivery: true,
      unlimitedWishlists: true,
      earlyFlashSaleAccess: true,
      personalShopper: false,
      premiumEvents: false,
      conciergeService: false,
      birthdayOffer: true,
      anniversaryOffer: false,
    },
    description: 'Enhanced benefits with 2x cashback',
    features: [
      '5-10% cashback on orders (2x rate)',
      'Exclusive deals and offers',
      'Priority customer support',
      'Unlimited wishlists',
      'Free delivery on select stores',
      'Early access to flash sales',
      'Birthday special offers',
      'Save up to ₹3000/month'
    ],
    isActive: true,
    sortOrder: 2,
    trialDays: 7,
  },
  {
    tier: 'vip',
    name: 'VIP',
    pricing: {
      monthly: 299,
      yearly: 2999,
      yearlyDiscount: 16
    },
    benefits: {
      cashbackMultiplier: 3,
      freeDeliveries: -1, // unlimited
      maxWishlists: -1, // unlimited
      prioritySupport: true,
      exclusiveDeals: true,
      earlyAccess: true,
      freeDelivery: true,
      unlimitedWishlists: true,
      earlyFlashSaleAccess: true,
      personalShopper: true,
      premiumEvents: true,
      conciergeService: true,
      birthdayOffer: true,
      anniversaryOffer: true,
    },
    description: 'Ultimate experience with 3x cashback',
    features: [
      '10-15% cashback on orders (3x rate)',
      'All Premium benefits included',
      'Personal shopping assistant',
      'Premium-only exclusive events',
      'Anniversary special offers',
      'Dedicated concierge service',
      'First access to new features',
      'VIP customer support',
      'Save up to ₹10000/month'
    ],
    isActive: true,
    sortOrder: 3,
    trialDays: 7,
  }
];

async function seedSubscriptionTiers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing tiers (optional - remove if you want to keep existing data)
    await SubscriptionTier.deleteMany({});
    console.log('🗑️  Cleared existing subscription tiers');

    // Insert new tiers
    const inserted = await SubscriptionTier.insertMany(subscriptionTiers);
    console.log(`✅ Successfully seeded ${inserted.length} subscription tiers:`);
    inserted.forEach(tier => {
      console.log(`   - ${tier.name} (${tier.tier}): ₹${tier.pricing.monthly}/month, ₹${tier.pricing.yearly}/year`);
    });

    // Disconnect
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    console.log('\n🎉 Subscription tiers seeded successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding subscription tiers:', error);
    process.exit(1);
  }
}

// Run the seed function
seedSubscriptionTiers();
