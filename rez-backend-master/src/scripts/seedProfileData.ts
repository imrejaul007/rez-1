// Seed script for Profile Page Data
// Seeds: Orders (Products), Projects (Services), Vouchers, Transactions (Earnings)

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Order } from '../models/Order';
import { Project } from '../models/Project';
import { UserVoucher, VoucherBrand } from '../models/Voucher';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Store } from '../models/Store';

async function seedProfileData() {
  try {
    console.log('🚀 Starting Profile Data seeding...');

    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');

    // Get test user (or create one)
    let user = await User.findOne({ phoneNumber: '+919876543210' });

    if (!user) {
      console.log('Creating test user...');
      user = await User.create({
        phoneNumber: '+919876543210',
        email: 'mukul@rezapp.com',
        profile: {
          firstName: 'Mukul',
          lastName: 'Raj',
          dateOfBirth: new Date('1995-05-15'),
          gender: 'male',
          location: {
            coordinates: [77.2090, 28.6139],
            city: 'Delhi',
            state: 'Delhi'
          }
        },
        wallet: {
          balance: 5000,
          totalEarned: 8500,
          totalSpent: 3500,
          pendingAmount: 0
        },
        auth: {
          isVerified: true,
          provider: 'phone',
          emailVerified: false,
          phoneVerified: true,
          twoFactorEnabled: false
        }
      });
      console.log('✅ Test user created');
    }

    const userId = user._id;
    console.log(`Using user: ${user.profile.firstName} (${userId})`);

    // Get products and stores for orders
    const products = await Product.find({}).limit(10);
    const stores = await Store.find({}).limit(5);

    if (products.length === 0 || stores.length === 0) {
      console.log('⚠️  No products/stores found. Run seed products/stores first.');
    }

    // ===== 1. SEED ORDERS (MY PRODUCTS) =====
    console.log('\n📦 Seeding Orders (My Products)...');

    await Order.deleteMany({ user: userId });

    const orderStatuses = ['delivered', 'in_transit', 'cancelled', 'pending'];
    const orders = [];

    for (let i = 0; i < 6; i++) {
      const product = products[i % products.length];
      const store = stores[i % stores.length];
      const status = orderStatuses[i % orderStatuses.length];
      const daysAgo = 5 + i * 3;
      const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const order = {
        orderNumber: `ORD${Date.now()}${i.toString().padStart(4, '0')}`,
        user: userId,
        items: [{
          product: product._id,
          store: store._id,
          name: product.name || `Product ${i + 1}`,
          image: product.images?.[0] || 'https://via.placeholder.com/200',
          quantity: 1,
          variant: i % 2 === 0 ? { type: 'color', value: ['Black', 'Blue', 'Red'][i % 3] } : undefined,
          price: 999 + (i * 200),
          originalPrice: 1299 + (i * 200),
          discount: 300,
          subtotal: 999 + (i * 200)
        }],
        totals: {
          subtotal: 999 + (i * 200),
          tax: Math.round((999 + (i * 200)) * 0.18),
          delivery: i % 2 === 0 ? 0 : 50,
          discount: 300,
          cashback: Math.round((999 + (i * 200)) * 0.05),
          total: 999 + (i * 200),
          paidAmount: 999 + (i * 200)
        },
        payment: {
          method: ['wallet', 'card', 'upi'][i % 3] as any,
          status: status === 'cancelled' ? 'refunded' : 'paid',
          transactionId: `TXN${Date.now()}${i}`,
          paidAt: orderDate
        },
        delivery: {
          method: 'standard',
          status: status === 'delivered' ? 'delivered' :
                  status === 'in_transit' ? 'out_for_delivery' :
                  status === 'cancelled' ? 'failed' : 'pending',
          address: {
            name: user.profile.firstName + ' ' + user.profile.lastName,
            phone: '+919876543210',
            addressLine1: '123 Main Street',
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001',
            country: 'India'
          },
          deliveryFee: i % 2 === 0 ? 0 : 50,
          deliveredAt: status === 'delivered' ? new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000) : undefined
        },
        status: status === 'in_transit' ? 'dispatched' :
                status === 'delivered' ? 'delivered' :
                status === 'cancelled' ? 'cancelled' : 'placed',
        timeline: [{
          status: 'placed',
          message: 'Order placed successfully',
          timestamp: orderDate
        }],
        createdAt: orderDate
      };

      orders.push(order);
    }

    const createdOrders = await Order.insertMany(orders);
    console.log(`✅ Created ${orders.length} orders`);

    // ===== 2. SEED PROJECTS (MY SERVICES) =====
    console.log('\n🎬 Seeding Projects (My Services)...');

    await Project.deleteMany({ 'submissions.user': userId });

    const projectTypes = ['video', 'photo', 'text', 'rating'];
    const projectCategories = ['review', 'social_share', 'ugc_content', 'store_visit'];
    const projects = [];

    for (let i = 0; i < 5; i++) {
      const daysAgo = 3 + i * 2;
      const createdDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const submissionStatus = ['approved', 'pending', 'completed'][i % 3];
      const rewardAmount = 100 + (i * 50);

      const project = {
        title: [
          'Create Product Review Video',
          'Share Store Photo on Social Media',
          'Write Product Description',
          'Rate Your Shopping Experience',
          'Create Unboxing Video'
        ][i % 5],
        description: `Complete this ${projectTypes[i % 4]} task to earn rewards`,
        category: projectCategories[i % 4],
        type: projectTypes[i % 4],
        status: 'active',
        difficulty: ['easy', 'medium', 'hard'][i % 3] as any,
        estimatedTime: 15 + (i * 5),
        requirements: {
          minWords: projectTypes[i % 4] === 'text' ? 100 : undefined,
          minDuration: projectTypes[i % 4] === 'video' ? 30 : undefined,
          minPhotos: projectTypes[i % 4] === 'photo' ? 3 : undefined
        },
        reward: {
          amount: rewardAmount,
          currency: 'INR',
          type: 'fixed',
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        limits: {
          maxCompletionsPerUser: 1,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        instructions: [
          'Complete the task as described',
          'Submit your work before deadline',
          'Follow quality guidelines'
        ],
        tags: ['shopping', 'review', 'reward'],
        submissions: [{
          user: userId,
          submittedAt: createdDate,
          content: {
            type: projectTypes[i % 4] === 'photo' ? 'image' : projectTypes[i % 4] as any,
            data: 'https://example.com/submission.jpg',
            metadata: {
              rating: 4 + (i % 2)
            }
          },
          status: submissionStatus === 'completed' ? 'approved' : submissionStatus as any,
          qualityScore: 7 + (i % 3),
          paidAmount: submissionStatus === 'approved' || submissionStatus === 'completed' ? rewardAmount : 0,
          paidAt: submissionStatus === 'approved' || submissionStatus === 'completed' ? createdDate : undefined
        }],
        analytics: {
          totalViews: 100 + (i * 20),
          totalApplications: 50 + (i * 10),
          totalSubmissions: 1,
          approvedSubmissions: submissionStatus === 'approved' || submissionStatus === 'completed' ? 1 : 0,
          rejectedSubmissions: 0,
          avgCompletionTime: 20,
          avgQualityScore: 8,
          totalPayout: submissionStatus === 'approved' || submissionStatus === 'completed' ? rewardAmount : 0,
          conversionRate: 80,
          approvalRate: 90
        },
        createdBy: userId,
        createdAt: createdDate
      };

      projects.push(project);
    }

    const createdProjects = await Project.insertMany(projects);
    console.log(`✅ Created ${projects.length} projects with submissions`);

    // ===== 3. SEED VOUCHERS (MY VOUCHERS) =====
    console.log('\n🎫 Seeding Vouchers...');

    // First, ensure voucher brands exist
    await VoucherBrand.deleteMany({});

    const brands = [
      {
        name: 'Amazon',
        logo: '🛒',
        backgroundColor: '#FF9900',
        logoColor: '#FFFFFF',
        description: 'Shop everything online',
        cashbackRate: 5,
        rating: 4.8,
        ratingCount: 12500,
        category: 'shopping',
        isNewlyAdded: false,
        isFeatured: true,
        isActive: true,
        denominations: [100, 500, 1000, 2000],
        termsAndConditions: [
          'Valid for 1 year from date of purchase',
          'Can be used for all products',
          'Not transferable'
        ],
        purchaseCount: 5000,
        viewCount: 25000
      },
      {
        name: 'Flipkart',
        logo: '🛍️',
        backgroundColor: '#2874F0',
        logoColor: '#FFFFFF',
        description: 'India\'s shopping destination',
        cashbackRate: 4,
        rating: 4.6,
        ratingCount: 10000,
        category: 'shopping',
        isNewlyAdded: false,
        isFeatured: true,
        isActive: true,
        denominations: [200, 500, 1000],
        termsAndConditions: [
          'Valid for 6 months',
          'Applicable on select products',
          'One-time use only'
        ],
        purchaseCount: 4000,
        viewCount: 20000
      },
      {
        name: 'Swiggy',
        logo: '🍔',
        backgroundColor: '#FC8019',
        logoColor: '#FFFFFF',
        description: 'Food delivery vouchers',
        cashbackRate: 10,
        rating: 4.5,
        ratingCount: 8000,
        category: 'food',
        isNewlyAdded: true,
        isFeatured: true,
        isActive: true,
        denominations: [100, 200, 500],
        termsAndConditions: [
          'Valid for 3 months',
          'Minimum order ₹299',
          'Cannot be combined with other offers'
        ],
        purchaseCount: 3000,
        viewCount: 15000
      }
    ];

    const createdBrands = await VoucherBrand.insertMany(brands);
    console.log(`✅ Created ${createdBrands.length} voucher brands`);

    // Now create user vouchers
    await UserVoucher.deleteMany({ user: userId });

    const userVouchers = [];
    const voucherStatuses = ['active', 'used', 'expired'];

    for (let i = 0; i < 5; i++) {
      const brand = createdBrands[i % createdBrands.length];
      const status = voucherStatuses[i % 3];
      const daysAgo = 10 + i * 5;
      const purchaseDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const voucher = {
        user: userId,
        brand: brand._id,
        voucherCode: `${brand.name.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        denomination: brand.denominations[i % brand.denominations.length],
        purchasePrice: brand.denominations[i % brand.denominations.length],
        purchaseDate: purchaseDate,
        expiryDate: new Date(purchaseDate.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
        validityDays: 365,
        status: status,
        usedDate: status === 'used' ? new Date(purchaseDate.getTime() + 15 * 24 * 60 * 60 * 1000) : undefined,
        usedAt: status === 'used' ? 'Online Shopping' : undefined,
        deliveryMethod: 'app',
        deliveryStatus: 'delivered',
        deliveredAt: purchaseDate,
        paymentMethod: 'wallet',
        transactionId: `VCH${Date.now()}${i}`
      };

      userVouchers.push(voucher);
    }

    await UserVoucher.insertMany(userVouchers);
    console.log(`✅ Created ${userVouchers.length} user vouchers`);

    // ===== 4. SEED TRANSACTIONS (MY EARNINGS) =====
    console.log('\n💰 Seeding Transactions (Earnings)...');

    await Transaction.deleteMany({ user: userId });

    const transactions = [];

    // Create earning transactions
    const earningTypes = [
      { type: 'project', desc: 'Video creation reward', amount: 500 },
      { type: 'project', desc: 'Project completion bonus', amount: 750 },
      { type: 'referral', desc: 'Referral bonus', amount: 200 },
      { type: 'cashback', desc: 'Order cashback', amount: 150 },
      { type: 'project', desc: 'Content creation reward', amount: 600 },
      { type: 'cashback', desc: 'Shopping cashback', amount: 300 }
    ];

    for (let i = 0; i < earningTypes.length; i++) {
      const daysAgo = 2 + i * 3;
      const txnDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const earning = earningTypes[i];

      const balanceBefore = 1000 + (i * 200);
      const balanceAfter = balanceBefore + earning.amount;

      const transaction = {
        transactionId: `CR${Date.now()}${i.toString().padStart(4, '0')}`,
        user: userId,
        type: 'credit',
        category: earning.type === 'project' ? 'earning' : earning.type === 'referral' ? 'bonus' : 'cashback',
        amount: earning.amount,
        currency: 'INR',
        description: earning.desc,
        source: {
          type: earning.type as any,
          reference: createdProjects[0]?._id || userId, // Use project or user as reference
          description: earning.desc
        },
        status: {
          current: i % 5 === 0 ? 'pending' : 'completed',
          history: [{
            status: 'completed',
            timestamp: txnDate
          }]
        },
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        netAmount: earning.amount,
        isReversible: true,
        processedAt: i % 5 === 0 ? undefined : txnDate,
        createdAt: txnDate
      };

      transactions.push(transaction);
    }

    // Add some debit transactions (spending)
    for (let i = 0; i < 3; i++) {
      const daysAgo = 1 + i * 4;
      const txnDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const amount = 500 + (i * 300);

      const balanceBefore = 5000 - (i * 500);
      const balanceAfter = balanceBefore - amount;

      const transaction = {
        transactionId: `DR${Date.now()}${(i + 100).toString().padStart(4, '0')}`,
        user: userId,
        type: 'debit',
        category: 'spending',
        amount: amount,
        currency: 'INR',
        description: `Order payment - ORD${Date.now()}${i}`,
        source: {
          type: 'order',
          reference: createdOrders[i]?._id || userId,
          description: 'Product purchase'
        },
        status: {
          current: 'completed',
          history: [{
            status: 'completed',
            timestamp: txnDate
          }]
        },
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        netAmount: amount,
        isReversible: false,
        processedAt: txnDate,
        createdAt: txnDate
      };

      transactions.push(transaction);
    }

    await Transaction.insertMany(transactions);
    console.log(`✅ Created ${transactions.length} transactions`);

    // Update user wallet with correct totals
    const totalEarned = transactions
      .filter(t => t.type === 'credit' && t.status.current === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSpent = transactions
      .filter(t => t.type === 'debit' && t.status.current === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    await User.findByIdAndUpdate(userId, {
      'wallet.balance': totalEarned - totalSpent,
      'wallet.totalEarned': totalEarned,
      'wallet.totalSpent': totalSpent
    });
    console.log('✅ Updated user wallet balance');

    // ===== SUMMARY =====
    console.log('\n📊 Profile Data Seeding Summary:');
    console.log(`   Orders: ${orders.length}`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   Voucher Brands: ${createdBrands.length}`);
    console.log(`   User Vouchers: ${userVouchers.length}`);
    console.log(`   Transactions: ${transactions.length}`);
    console.log(`   Total Earned: ₹${totalEarned}`);
    console.log(`   Total Spent: ₹${totalSpent}`);
    console.log(`   Wallet Balance: ₹${totalEarned - totalSpent}`);

    console.log('\n✅ Profile data seeding completed successfully!');
    console.log('\nYou can now test the profile sections:');
    console.log('  - My Products: GET /api/orders');
    console.log('  - My Services: GET /api/projects (filter by user submissions)');
    console.log('  - My Vouchers: GET /api/vouchers/my-vouchers');
    console.log('  - My Earnings: GET /api/wallet/transactions');

  } catch (error) {
    console.error('❌ Error seeding profile data:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
  }
}

// Run seeding
seedProfileData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
