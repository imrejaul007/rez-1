/**
 * Seed Sample Discounts Script
 *
 * This script creates sample discounts for testing the discount features.
 *
 * Usage:
 *   npx ts-node scripts/seedDiscounts.ts
 *
 * Example:
 *   npx ts-node scripts/seedDiscounts.ts
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Prevent running in production
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Seed scripts cannot run in production!');
  process.exit(1);
}

// Import Discount model
import Discount from '../src/models/Discount';
import { User } from '../src/models/User';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

// Sample discount data
const discountTemplates = [
  {
    code: 'SAVE20',
    name: 'Get Instant Discount',
    description: 'Get 20% off on bill payment',
    type: 'percentage',
    value: 20,
    minOrderValue: 5000,
    maxDiscountAmount: 1000,
    applicableOn: 'bill_payment',
    usageLimitPerUser: 5,
    usageLimit: 1000,
    priority: 1,
    isActive: true,
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    restrictions: {
      isOfflineOnly: true,
      notValidAboveStoreDiscount: true,
      singleVoucherPerBill: true
    },
    metadata: {
      displayText: 'Get Instant Discount',
      termsAndConditions: [
        'Valid only for offline purchases',
        'Not valid above store discount',
        'Single voucher per bill',
        'Maximum discount amount: ₹1000'
      ]
    }
  },
  {
    code: 'CARD15',
    name: 'Card Payment Offer',
    description: 'Get 15% off on card payments',
    type: 'percentage',
    value: 15,
    minOrderValue: 3000,
    maxDiscountAmount: 500,
    applicableOn: 'bill_payment',
    usageLimitPerUser: 10,
    usageLimit: 5000,
    priority: 2,
    isActive: true,
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    restrictions: {
      isOfflineOnly: false,
      notValidAboveStoreDiscount: false,
      singleVoucherPerBill: true
    },
    metadata: {
      displayText: 'Card Payment Offer',
      termsAndConditions: [
        'Valid on all card payments',
        'Maximum discount amount: ₹500'
      ]
    }
  },
  {
    code: 'FIRST100',
    name: 'First Order Discount',
    description: 'Get ₹100 off on your first order',
    type: 'fixed',
    value: 100,
    minOrderValue: 500,
    maxDiscountAmount: 100,
    applicableOn: 'all',
    usageLimitPerUser: 1,
    usageLimit: 10000,
    priority: 1,
    isActive: true,
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    restrictions: {
      isOfflineOnly: false,
      notValidAboveStoreDiscount: false,
      singleVoucherPerBill: true
    },
    metadata: {
      displayText: 'First Order Discount',
      termsAndConditions: [
        'Valid only on first order',
        'Minimum order value: ₹500'
      ]
    }
  },
  {
    code: 'MEGA25',
    name: 'Mega Sale Offer',
    description: 'Get 25% off during mega sale',
    type: 'percentage',
    value: 25,
    minOrderValue: 10000,
    maxDiscountAmount: 2500,
    applicableOn: 'bill_payment',
    usageLimitPerUser: 3,
    usageLimit: 500,
    priority: 3,
    isActive: true,
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    restrictions: {
      isOfflineOnly: true,
      notValidAboveStoreDiscount: true,
      singleVoucherPerBill: true
    },
    metadata: {
      displayText: 'Mega Sale Offer',
      termsAndConditions: [
        'Valid during mega sale period only',
        'Offline purchases only',
        'Maximum discount: ₹2500'
      ]
    }
  },
  {
    code: 'UPI10',
    name: 'UPI Payment Discount',
    description: 'Get 10% off on UPI payments',
    type: 'percentage',
    value: 10,
    minOrderValue: 1000,
    maxDiscountAmount: 200,
    applicableOn: 'bill_payment',
    usageLimitPerUser: 20,
    usageLimit: 10000,
    priority: 2,
    isActive: true,
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    restrictions: {
      isOfflineOnly: false,
      notValidAboveStoreDiscount: false,
      singleVoucherPerBill: true
    },
    metadata: {
      displayText: 'UPI Payment Discount',
      termsAndConditions: [
        'Valid on UPI payments only',
        'Maximum discount: ₹200'
      ]
    }
  }
];

async function seedDiscounts() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find or create an admin user for seeding
    let adminUser = await User.findOne({ email: 'admin@rez-app.com' });

    if (!adminUser) {
      console.log('📝 Creating admin user for seeding...');
      adminUser = await User.create({
        name: 'Admin',
        email: 'admin@rez-app.com',
        phoneNumber: '9999999999',
        password: crypto.randomBytes(16).toString('hex'), // Randomly generated
        role: 'admin'
      });
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Using existing admin user');
    }

    // Check if discounts already exist
    const existingCount = await Discount.countDocuments({});

    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing discounts.`);
      console.log('   Do you want to delete them and create new ones? (Ctrl+C to cancel)');

      // Wait 3 seconds for user to cancel
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('🗑️  Deleting existing discounts...');
      await Discount.deleteMany({});
      console.log('✅ Deleted existing discounts');
    }

    console.log(`\n💸 Creating ${discountTemplates.length} sample discounts...`);

    // Add createdBy field to all discount templates
    const discountsWithCreator = discountTemplates.map(template => ({
      ...template,
      createdBy: adminUser._id
    }));

    const createdDiscounts = await Discount.insertMany(discountsWithCreator);

    console.log(`✅ Successfully created ${createdDiscounts.length} discounts:`);
    createdDiscounts.forEach((discount: any, index: number) => {
      console.log(`   ${index + 1}. ${discount.name} (${discount.code})`);
      console.log(`      💰 ${discount.type === 'percentage' ? discount.value + '%' : '₹' + discount.value} off`);
      console.log(`      📊 Min Order: ₹${discount.minOrderValue}`);
      console.log(`      🎯 Applicable On: ${discount.applicableOn}`);
    });

    console.log('\n🎉 Seeding completed successfully!');
    console.log(`\n🔗 Test the discount features now in the app!`);

  } catch (error) {
    console.error('❌ Error seeding discounts:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seeding function
seedDiscounts();
