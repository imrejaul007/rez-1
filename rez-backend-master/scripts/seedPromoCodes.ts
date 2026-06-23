/**
 * Seed Promo Codes Script
 * Creates test promo codes for subscription plans
 *
 * Run with: npx ts-node scripts/seedPromoCodes.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { PromoCode } from '../src/models/PromoCode';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Test promo codes to create
const testPromoCodes = [
  {
    code: 'WELCOME10',
    description: 'Welcome offer - 10% off on any subscription',
    discountType: 'percentage' as const,
    discountValue: 10,
    applicableTiers: ['premium' as const, 'vip' as const],
    applicableBillingCycles: ['monthly' as const, 'yearly' as const],
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    maxUses: 0, // Unlimited uses
    maxUsesPerUser: 1,
    isActive: true,
    metadata: {
      campaign: 'Welcome Campaign 2025',
      source: 'Marketing',
      notes: 'General welcome offer for new subscribers'
    }
  },
  {
    code: 'SAVE20',
    description: '20% off on yearly plans',
    discountType: 'percentage' as const,
    discountValue: 20,
    applicableTiers: ['premium' as const, 'vip' as const],
    applicableBillingCycles: ['yearly' as const],
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    maxUses: 100,
    maxUsesPerUser: 1,
    isActive: true,
    metadata: {
      campaign: 'Annual Subscription Push',
      source: 'Marketing',
      notes: 'Encourage yearly subscriptions with better discount'
    }
  },
  {
    code: 'FLAT50',
    description: 'Flat ₹50 off on Premium monthly',
    discountType: 'fixed' as const,
    discountValue: 50,
    applicableTiers: ['premium' as const],
    applicableBillingCycles: ['monthly' as const],
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-03-31'),
    maxUses: 50,
    maxUsesPerUser: 1,
    isActive: true,
    metadata: {
      campaign: 'Q1 Premium Promotion',
      source: 'Marketing',
      notes: 'Limited time offer for Q1'
    }
  },
  {
    code: 'VIP100',
    description: 'Flat ₹100 off on VIP plans',
    discountType: 'fixed' as const,
    discountValue: 100,
    applicableTiers: ['vip' as const],
    applicableBillingCycles: ['monthly' as const, 'yearly' as const],
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-06-30'),
    maxUses: 30,
    maxUsesPerUser: 1,
    isActive: true,
    metadata: {
      campaign: 'VIP Acquisition',
      source: 'Marketing',
      notes: 'Premium discount for VIP tier'
    }
  },
  {
    code: 'NEWYEAR2025',
    description: 'New Year Special - 25% off',
    discountType: 'percentage' as const,
    discountValue: 25,
    applicableTiers: ['premium' as const, 'vip' as const],
    applicableBillingCycles: ['yearly' as const],
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-01-31'),
    maxUses: 200,
    maxUsesPerUser: 1,
    isActive: true,
    metadata: {
      campaign: 'New Year Sale 2025',
      source: 'Seasonal Campaign',
      notes: 'Limited time New Year offer'
    }
  },
  {
    code: 'FIRSTMONTH',
    description: 'First month at 50% off',
    discountType: 'percentage' as const,
    discountValue: 50,
    applicableTiers: ['premium' as const],
    applicableBillingCycles: ['monthly' as const],
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    maxUses: 500,
    maxUsesPerUser: 1,
    isActive: true,
    metadata: {
      campaign: 'First Month Promotion',
      source: 'Acquisition',
      notes: 'Get users to try premium with minimal risk'
    }
  },
  {
    code: 'UPGRADE30',
    description: '30% off for existing users upgrading to VIP',
    discountType: 'percentage' as const,
    discountValue: 30,
    applicableTiers: ['vip' as const],
    applicableBillingCycles: ['monthly' as const, 'yearly' as const],
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    maxUses: 0, // Unlimited
    maxUsesPerUser: 1,
    isActive: true,
    metadata: {
      campaign: 'Upgrade Incentive',
      source: 'Retention',
      notes: 'Encourage premium users to upgrade to VIP'
    }
  },
  {
    code: 'EXPIRED',
    description: 'Expired promo code (for testing)',
    discountType: 'percentage' as const,
    discountValue: 50,
    applicableTiers: ['premium' as const, 'vip' as const],
    applicableBillingCycles: ['monthly' as const, 'yearly' as const],
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-12-31'),
    maxUses: 100,
    maxUsesPerUser: 1,
    isActive: true,
    metadata: {
      campaign: 'Test Campaign',
      source: 'Testing',
      notes: 'For testing expired promo code validation'
    }
  },
  {
    code: 'INACTIVE',
    description: 'Inactive promo code (for testing)',
    discountType: 'percentage' as const,
    discountValue: 20,
    applicableTiers: ['premium' as const, 'vip' as const],
    applicableBillingCycles: ['monthly' as const, 'yearly' as const],
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    maxUses: 100,
    maxUsesPerUser: 1,
    isActive: false,
    metadata: {
      campaign: 'Test Campaign',
      source: 'Testing',
      notes: 'For testing inactive promo code validation'
    }
  }
];

async function seedPromoCodes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully');

    // Clear existing promo codes (optional - comment out if you want to keep existing)
    console.log('\nClearing existing promo codes...');
    const deleteResult = await PromoCode.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing promo codes`);

    // Create promo codes
    console.log('\nCreating test promo codes...');
    const createdPromoCodes = [];

    for (const promoData of testPromoCodes) {
      try {
        const promoCode = new PromoCode(promoData);
        await promoCode.save();
        createdPromoCodes.push(promoCode);
        console.log(`✓ Created: ${promoCode.code} - ${promoCode.description}`);
      } catch (error: any) {
        console.error(`✗ Failed to create ${promoData.code}:`, error.message);
      }
    }

    // Display summary
    console.log('\n' + '='.repeat(80));
    console.log('PROMO CODE SEEDING SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total promo codes created: ${createdPromoCodes.length}`);
    console.log('\nActive Promo Codes:');
    console.log('-'.repeat(80));

    const activePromoCodes = createdPromoCodes.filter(pc => pc.isActive);
    activePromoCodes.forEach(pc => {
      const discountText = pc.discountType === 'percentage'
        ? `${pc.discountValue}%`
        : `₹${pc.discountValue}`;
      const usageText = pc.maxUses === 0
        ? 'Unlimited'
        : `${pc.maxUses} uses`;
      const tiersText = pc.applicableTiers.join(', ');
      const cyclesText = pc.applicableBillingCycles?.join(', ') || 'All';

      console.log(`\nCode: ${pc.code}`);
      console.log(`  Discount: ${discountText} off`);
      console.log(`  Valid For: ${tiersText} (${cyclesText})`);
      console.log(`  Max Uses: ${usageText}`);
      console.log(`  Valid: ${pc.validFrom.toLocaleDateString()} - ${pc.validUntil.toLocaleDateString()}`);
      console.log(`  Campaign: ${pc.metadata?.campaign || 'N/A'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('TEST INSTRUCTIONS');
    console.log('='.repeat(80));
    console.log('\nTest these promo codes in the app:');
    console.log('\n1. Valid Codes:');
    console.log('   - WELCOME10: 10% off any plan');
    console.log('   - SAVE20: 20% off yearly plans only');
    console.log('   - FLAT50: ₹50 off Premium monthly only');
    console.log('   - VIP100: ₹100 off VIP plans');
    console.log('   - NEWYEAR2025: 25% off yearly plans (expires Jan 31)');
    console.log('   - FIRSTMONTH: 50% off Premium monthly');
    console.log('   - UPGRADE30: 30% off VIP plans');
    console.log('\n2. Invalid Codes (for testing):');
    console.log('   - EXPIRED: Should show "expired" error');
    console.log('   - INACTIVE: Should show "inactive" error');
    console.log('   - RANDOM123: Should show "not found" error');
    console.log('\n3. Test Scenarios:');
    console.log('   - Apply SAVE20 to monthly plan (should fail)');
    console.log('   - Apply SAVE20 to yearly plan (should work)');
    console.log('   - Apply FLAT50 to VIP plan (should fail)');
    console.log('   - Apply same code twice (should fail on 2nd attempt)');
    console.log('   - Use expired/inactive codes');

    console.log('\n' + '='.repeat(80));
    console.log('Seeding completed successfully!');
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('Error seeding promo codes:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding
seedPromoCodes();
