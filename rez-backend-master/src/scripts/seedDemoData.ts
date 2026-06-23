/**
 * Seed Demo Data Script
 * Run with: npx ts-node src/scripts/seedDemoData.ts
 *
 * Creates all necessary data for testing the complete demo flow:
 * 1. Admin user (for rez-admin portal)
 * 2. Merchant with store and products (for rez-merchant portal)
 * 3. Customer user (for rez-frontend app)
 * 4. Campaigns/Deals to browse
 * 5. Categories for products
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Merchant } from '../models/Merchant';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import MerchantWallet from '../models/MerchantWallet';
import Campaign from '../models/Campaign';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

// ============ TEST DATA ============

// Admin User
const ADMIN_USER = {
  phoneNumber: '+919999999999',
  email: 'admin@rez.app',
  password: 'Admin@123',
  role: 'admin' as const,
  profile: {
    firstName: 'Super',
    lastName: 'Admin',
  },
  auth: {
    isVerified: true,
    isOnboarded: true,
  },
  isActive: true,
};

// Test Customer User
const CUSTOMER_USER = {
  phoneNumber: '+919876543210',
  email: 'customer@rez.app',
  password: 'Customer@123',
  role: 'user' as const,
  profile: {
    firstName: 'Demo',
    lastName: 'Customer',
    location: {
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    }
  },
  auth: {
    isVerified: true,
    isOnboarded: true,
  },
  isActive: true,
};

// Test Merchant Owner
const MERCHANT_USER = {
  phoneNumber: '+919123456789',
  email: 'merchant@rez.app',
  password: 'Merchant@123',
  role: 'merchant' as const,
  profile: {
    firstName: 'Store',
    lastName: 'Owner',
  },
  auth: {
    isVerified: true,
    isOnboarded: true,
  },
  isActive: true,
};

async function seedDemoData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // ============ 1. CREATE ADMIN USER ============
    console.log('👤 Creating Admin User...');
    let adminUser = await User.findOne({ email: ADMIN_USER.email });

    if (adminUser) {
      console.log('   ⚠️  Admin user already exists');
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        adminUser.auth.isVerified = true;
        adminUser.password = ADMIN_USER.password;
        await adminUser.save();
        console.log('   ✅ Updated to admin role');
      }
    } else {
      adminUser = new User(ADMIN_USER);
      await adminUser.save();
      console.log('   ✅ Admin user created');
    }

    // ============ 2. CREATE CUSTOMER USER ============
    console.log('👤 Creating Customer User...');
    let customerUser = await User.findOne({ $or: [{ email: CUSTOMER_USER.email }, { email: 'customer@test.com' }] });

    if (customerUser) {
      console.log('   ⚠️  Customer user already exists');
      // Check and update wallet if needed
      let existingWallet = await Wallet.findOne({ user: customerUser._id });
      if (existingWallet) {
        // Update wallet to correct structure if coins array is empty or missing
        if (!existingWallet.coins || existingWallet.coins.length === 0) {
          existingWallet.balance = { total: 600, available: 500, pending: 0, cashback: 0 };
          existingWallet.coins = [
            { type: 'rez', amount: 500, isActive: true, color: '#00C06A', earnedDate: new Date() },
            { type: 'promo', amount: 100, isActive: true, color: '#FFC857', earnedDate: new Date(), promoDetails: { campaignName: 'Welcome Bonus', maxRedemptionPercentage: 20, expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
          ];
          existingWallet.statistics = { totalEarned: 600, totalSpent: 0, totalCashback: 0, totalRefunds: 0, totalTopups: 0, totalWithdrawals: 0 };
          await existingWallet.save();
          console.log('   ✅ Customer wallet updated with correct coin structure');
        }
      }
    } else {
      customerUser = new User(CUSTOMER_USER);
      await customerUser.save();
      console.log('   ✅ Customer user created');

      // Create wallet for customer with correct structure
      const customerWallet = new Wallet({
        user: customerUser._id,
        balance: {
          total: 600,
          available: 500,
          pending: 0,
          cashback: 0
        },
        coins: [
          {
            type: 'rez',
            amount: 500,
            isActive: true,
            color: '#00C06A',
            earnedDate: new Date(),
            lastEarned: new Date()
          },
          {
            type: 'promo',
            amount: 100,
            isActive: true,
            color: '#FFC857',
            earnedDate: new Date(),
            promoDetails: {
              campaignName: 'Welcome Bonus',
              maxRedemptionPercentage: 20,
              expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            }
          }
        ],
        brandedCoins: [],
        statistics: {
          totalEarned: 600,
          totalSpent: 0,
          totalCashback: 0,
          totalRefunds: 0,
          totalTopups: 0,
          totalWithdrawals: 0
        },
        savingsInsights: {
          totalSaved: 0,
          thisMonth: 0,
          avgPerVisit: 0,
          lastCalculated: new Date()
        },
        isActive: true,
        isFrozen: false
      });
      await customerWallet.save();
      console.log('   ✅ Customer wallet created with 500 Rez Coins + 100 Promo Coins');
    }

    // ============ 3. CREATE MERCHANT USER ============
    console.log('👤 Creating Merchant User...');
    let merchantUser = await User.findOne({ $or: [{ email: MERCHANT_USER.email }, { email: 'merchant@test.com' }] });

    if (merchantUser) {
      console.log('   ⚠️  Merchant user already exists');
    } else {
      merchantUser = new User(MERCHANT_USER);
      await merchantUser.save();
      console.log('   ✅ Merchant user created');
    }

    // ============ 4. CREATE MERCHANT & STORE ============
    console.log('🏪 Creating Merchant & Store...');

    // Check if merchant exists
    let merchant = await Merchant.findOne({ $or: [{ email: 'merchant@rez.app' }, { email: 'merchant@test.com' }] });

    if (!merchant) {
      // Hash password for merchant
      const hashedPassword = await bcrypt.hash('Merchant@123', 12);

      merchant = await Merchant.create({
        businessName: 'Demo Fashion Store',
        ownerName: 'Store Owner',
        email: 'merchant@rez.app',
        password: hashedPassword,
        phone: '+919123456789',
        verificationStatus: 'verified',
        isActive: true,
        emailVerified: true,
        businessAddress: {
          street: '123 Demo Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          country: 'India'
        },
        onboarding: {
          currentStep: 5,
          completedSteps: [1, 2, 3, 4, 5],
          isComplete: true,
          status: 'completed'
        }
      });
      console.log('   ✅ Merchant created');
    } else {
      console.log('   ⚠️  Merchant already exists');
    }

    // ============ 5. CREATE CATEGORIES FIRST ============
    console.log('📁 Creating Categories...');

    const categories = [
      { name: 'Fashion', slug: 'fashion', description: 'Clothing and accessories', icon: '👕', isActive: true },
      { name: 'Electronics', slug: 'electronics', description: 'Gadgets and devices', icon: '📱', isActive: true },
      { name: 'Food & Dining', slug: 'food-dining', description: 'Restaurants and food delivery', icon: '🍕', isActive: true },
      { name: 'Beauty', slug: 'beauty', description: 'Beauty and personal care', icon: '💄', isActive: true },
    ];

    let fashionCategory: any = null;
    for (const cat of categories) {
      let existingCat = await Category.findOne({ slug: cat.slug });
      if (!existingCat) {
        existingCat = await Category.create(cat);
        console.log(`   ✅ Category "${cat.name}" created`);
      }
      if (cat.slug === 'fashion') {
        fashionCategory = existingCat;
      }
    }

    // Create store if not exists - check by slug or merchantId
    let store = await Store.findOne({ $or: [{ merchantId: merchant._id }, { slug: 'demo-fashion-store' }] });

    if (!store) {
      store = await Store.create({
        merchantId: merchant._id,
        name: 'Demo Fashion Store',
        slug: 'demo-fashion-store',
        description: 'Your one-stop shop for trendy fashion items',
        category: fashionCategory?._id,
        logo: 'https://via.placeholder.com/200x200?text=Demo+Store',
        coverImage: 'https://via.placeholder.com/800x400?text=Demo+Fashion+Store',
        status: 'active',
        isVerified: true,
        location: {
          address: '123 Demo Street, Andheri West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          coordinates: [72.8777, 19.0760] // [longitude, latitude] Mumbai
        },
        contact: {
          phone: '+919123456789',
          email: 'store@demo.com',
          whatsapp: '+919123456789'
        },
        ratings: {
          average: 4.5,
          count: 128
        },
        offers: {
          cashbackPercentage: 10
        }
      });
      console.log('   ✅ Store created');
    } else {
      console.log('   ⚠️  Store already exists');
      // Update merchantId reference if not set
      if (!store.merchantId) {
        store.merchantId = merchant._id as any;
        await store.save();
        console.log('   ✅ Updated store merchantId reference');
      }
    }

    // ============ 6. CREATE PRODUCTS ============
    console.log('📦 Creating Products...');

    const products = [
      {
        store: store._id,
        merchantId: merchant._id,
        name: 'Premium Cotton T-Shirt',
        slug: 'premium-cotton-tshirt',
        description: 'High-quality cotton t-shirt, perfect for everyday wear',
        sku: 'TSHIRT-001',
        category: fashionCategory?._id,
        images: ['https://via.placeholder.com/400x400?text=T-Shirt'],
        pricing: {
          original: 1499,
          selling: 999,
          currency: 'INR'
        },
        inventory: {
          stock: 100,
          isAvailable: true,
          unlimited: false
        },
        isActive: true,
        specifications: [
          { key: 'Material', value: '100% Cotton' },
          { key: 'Fit', value: 'Regular Fit' },
          { key: 'Care', value: 'Machine Washable' }
        ],
        tags: ['t-shirt', 'cotton', 'casual'],
        cashback: { percentage: 5 }
      },
      {
        store: store._id,
        merchantId: merchant._id,
        name: 'Denim Jeans Classic',
        slug: 'denim-jeans-classic',
        description: 'Classic fit denim jeans with premium fabric',
        sku: 'JEANS-001',
        category: fashionCategory?._id,
        images: ['https://via.placeholder.com/400x400?text=Jeans'],
        pricing: {
          original: 2999,
          selling: 1999,
          currency: 'INR'
        },
        inventory: {
          stock: 50,
          isAvailable: true,
          unlimited: false
        },
        isActive: true,
        specifications: [
          { key: 'Material', value: 'Denim' },
          { key: 'Fit', value: 'Classic Fit' },
          { key: 'Care', value: 'Machine Washable' }
        ],
        tags: ['jeans', 'denim', 'casual'],
        cashback: { percentage: 5 }
      },
      {
        store: store._id,
        merchantId: merchant._id,
        name: 'Summer Dress Floral',
        slug: 'summer-dress-floral',
        description: 'Beautiful floral summer dress for women',
        sku: 'DRESS-001',
        category: fashionCategory?._id,
        images: ['https://via.placeholder.com/400x400?text=Dress'],
        pricing: {
          original: 2499,
          selling: 1499,
          currency: 'INR'
        },
        inventory: {
          stock: 30,
          isAvailable: true,
          unlimited: false
        },
        isActive: true,
        specifications: [
          { key: 'Material', value: 'Polyester Blend' },
          { key: 'Fit', value: 'Regular Fit' },
          { key: 'Care', value: 'Hand Wash' }
        ],
        tags: ['dress', 'summer', 'floral', 'women'],
        cashback: { percentage: 5 }
      },
      {
        store: store._id,
        merchantId: merchant._id,
        name: 'Sports Sneakers Pro',
        slug: 'sports-sneakers-pro',
        description: 'Comfortable sports sneakers for running and gym',
        sku: 'SNEAKERS-001',
        category: fashionCategory?._id,
        images: ['https://via.placeholder.com/400x400?text=Sneakers'],
        pricing: {
          original: 3999,
          selling: 2499,
          currency: 'INR'
        },
        inventory: {
          stock: 75,
          isAvailable: true,
          unlimited: false
        },
        isActive: true,
        specifications: [
          { key: 'Material', value: 'Mesh & Rubber' },
          { key: 'Sole', value: 'EVA Foam' },
          { key: 'Type', value: 'Running Shoes' }
        ],
        tags: ['sneakers', 'sports', 'running', 'shoes'],
        cashback: { percentage: 5 }
      }
    ];

    for (const prod of products) {
      const exists = await Product.findOne({ sku: prod.sku });
      if (!exists) {
        await Product.create(prod);
        console.log(`   ✅ Product "${prod.name}" created`);
      } else {
        console.log(`   ⚠️  Product "${prod.name}" already exists`);
      }
    }

    // ============ 7. CREATE CAMPAIGNS/DEALS ============
    console.log('🎯 Creating Campaigns/Deals...');

    const campaigns = [
      {
        campaignId: 'summer-sale-fashion',
        title: 'Summer Sale - Up to 50% Off',
        subtitle: 'Grab amazing deals on summer collection',
        description: 'Shop the best summer styles at unbeatable prices',
        badge: '50% OFF',
        badgeBg: '#FF6B6B',
        badgeColor: '#FFFFFF',
        gradientColors: ['#FF6B6B', '#FF8E53'],
        type: 'cashback' as const,
        deals: [
          {
            store: 'Demo Fashion Store',
            storeId: store._id,
            image: 'https://via.placeholder.com/400x200?text=Summer+Sale',
            cashback: '10%',
            discount: '50%'
          }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true,
        priority: 10
      },
      {
        campaignId: 'triple-coin-day',
        title: '3X Coin Day',
        subtitle: 'Earn triple coins on all purchases',
        description: 'Limited time - earn 3X Rez Coins on every purchase',
        badge: '3X COINS',
        badgeBg: '#FFD93D',
        badgeColor: '#000000',
        gradientColors: ['#FFD93D', '#FF6B6B'],
        type: 'coins' as const,
        deals: [
          {
            store: 'Demo Fashion Store',
            storeId: store._id,
            image: 'https://via.placeholder.com/400x200?text=Triple+Coins',
            coins: '3X'
          }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        isActive: true,
        priority: 8
      },
      {
        campaignId: 'flash-sneakers-deal',
        title: 'Flash Deal - Sneakers',
        subtitle: 'Limited time offer on sports sneakers',
        description: '60% off on premium sneakers - ends soon!',
        badge: 'FLASH',
        badgeBg: '#6C63FF',
        badgeColor: '#FFFFFF',
        gradientColors: ['#6C63FF', '#3D5AFE'],
        type: 'flash' as const,
        deals: [
          {
            store: 'Demo Fashion Store',
            storeId: store._id,
            image: 'https://via.placeholder.com/400x200?text=Flash+Deal',
            discount: '60%',
            endsIn: '2 days'
          }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        isActive: true,
        priority: 15
      }
    ];

    for (const campaign of campaigns) {
      const exists = await Campaign.findOne({ campaignId: campaign.campaignId });
      if (!exists) {
        try {
          await Campaign.create(campaign);
          console.log(`   ✅ Campaign "${campaign.title}" created`);
        } catch (err: any) {
          console.log(`   ⚠️  Campaign "${campaign.title}" skipped: ${err.message}`);
        }
      } else {
        console.log(`   ⚠️  Campaign "${campaign.title}" already exists`);
      }
    }

    // ============ 8. CREATE MERCHANT WALLET ============
    console.log('💰 Creating Merchant Wallet...');

    let merchantWallet = await MerchantWallet.findOne({ merchant: merchant._id });
    if (!merchantWallet) {
      merchantWallet = await MerchantWallet.create({
        merchant: merchant._id,
        store: store._id,
        balance: {
          total: 0,
          available: 0,
          pending: 0,
          withdrawn: 0,
          held: 0
        },
        statistics: {
          totalSales: 0,
          totalPlatformFees: 0,
          netSales: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          totalRefunds: 0,
          totalWithdrawals: 0
        },
        bankDetails: {
          accountNumber: '1234567890',
          ifscCode: 'DEMO0001234',
          accountHolderName: 'Store Owner',
          bankName: 'Demo Bank',
          isVerified: true
        },
        settlementCycle: 'instant',
        isActive: true
      });
      console.log('   ✅ Merchant wallet created');
    } else {
      console.log('   ⚠️  Merchant wallet already exists');
    }

    // ============ PRINT SUMMARY ============
    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ DEMO DATA SEEDING COMPLETE!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('─'.repeat(60));
    console.log('');
    console.log('🔴 ADMIN PORTAL (rez-admin - port 8083):');
    console.log(`   Email:    ${ADMIN_USER.email}`);
    console.log(`   Password: ${ADMIN_USER.password}`);
    console.log('');
    console.log('🟣 MERCHANT PORTAL (rez-merchant - port 8082):');
    console.log(`   Email:    merchant@rez.app`);
    console.log(`   Password: Merchant@123`);
    console.log('');
    console.log('🟢 CUSTOMER APP (rez-frontend - port 8081):');
    console.log(`   Phone:    ${CUSTOMER_USER.phoneNumber}`);
    console.log(`   Password: ${CUSTOMER_USER.password}`);
    console.log(`   Email:    ${CUSTOMER_USER.email}`);
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
    console.log('🎯 DEMO FLOW TEST:');
    console.log('1. Open Customer App → Search "Summer Sale" or "Fashion"');
    console.log('2. Add products to cart and checkout');
    console.log('3. Merchant receives order in Merchant Portal');
    console.log('4. Admin sees order in Admin Portal');
    console.log('5. Customer gets 5% coins automatically');
    console.log('6. Customer shares purchase → Gets 5% pending coins');
    console.log('7. Admin approves share coins in Coin Rewards tab');
    console.log('8. Merchant wallet shows sales with 15% fee deduction');
    console.log('');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seed
seedDemoData();
