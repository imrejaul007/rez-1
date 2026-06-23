// Seed data for the currently logged-in user (Mukul Raj)
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function seedCurrentUser() {
  try {
    console.log('🚀 Starting seeding for current user...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Current logged-in user
    const userId = new mongoose.Types.ObjectId('68c145d5f016515d8eb31c0c');

    const user = await db.collection('users').findOne({ _id: userId });
    console.log('User:', user.profile.firstName, user.profile.lastName);

    // Get existing products and stores
    const products = await db.collection('products').find({}).limit(10).toArray();
    const stores = await db.collection('stores').find({}).limit(5).toArray();

    // 1. SEED PROJECTS
    console.log('\n🎬 Seeding Projects...');

    const projects = [];
    for (let i = 0; i < 5; i++) {
      const createdDate = new Date(Date.now() - (3 + i * 2) * 24 * 60 * 60 * 1000);
      const status = ['approved', 'pending', 'approved'][i % 3];
      const reward = 100 + (i * 50);

      projects.push({
        title: [
          'Create Product Review Video',
          'Share Store Photo on Social Media',
          'Write Product Description',
          'Rate Your Shopping Experience',
          'Create Unboxing Video'
        ][i],
        description: `Complete this task to earn ₹${reward}`,
        category: 'review',
        type: ['video', 'photo', 'text', 'rating'][i % 4],
        status: 'active',
        difficulty: 'medium',
        estimatedTime: 20,
        requirements: {},
        reward: {
          amount: reward,
          currency: 'INR',
          type: 'fixed',
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        limits: {
          maxCompletionsPerUser: 1,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        instructions: ['Complete the task', 'Submit before deadline'],
        tags: ['shopping', 'review'],
        submissions: [{
          user: userId,
          submittedAt: createdDate,
          content: {
            type: ['video', 'image', 'text', 'rating'][i % 4],
            data: 'https://example.com/submission.jpg',
            metadata: { rating: 4 }
          },
          status: status,
          qualityScore: 8,
          paidAmount: status === 'approved' ? reward : 0,
          paidAt: status === 'approved' ? createdDate : undefined
        }],
        analytics: {
          totalViews: 100,
          totalApplications: 50,
          totalSubmissions: 1,
          approvedSubmissions: status === 'approved' ? 1 : 0,
          rejectedSubmissions: 0,
          avgCompletionTime: 20,
          avgQualityScore: 8,
          totalPayout: status === 'approved' ? reward : 0,
          conversionRate: 80,
          approvalRate: 90
        },
        createdBy: userId,
        createdAt: createdDate,
        updatedAt: createdDate
      });
    }

    await db.collection('projects').insertMany(projects);
    console.log('✅ Created 5 projects with submissions');

    // 2. SEED VOUCHERS
    console.log('\n🎫 Seeding Vouchers...');

    // Get voucher brands
    const brands = await db.collection('voucherbrands').find({}).limit(3).toArray();

    const vouchers = [];
    for (let i = 0; i < 5; i++) {
      const brand = brands[i % brands.length];
      const status = ['active', 'used', 'active', 'expired', 'active'][i];
      const purchaseDate = new Date(Date.now() - (10 + i * 5) * 24 * 60 * 60 * 1000);

      vouchers.push({
        user: userId,
        brand: brand._id,
        voucherCode: `${brand.name.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        denomination: [100, 200, 500, 100, 200][i],
        purchasePrice: [100, 200, 500, 100, 200][i],
        purchaseDate: purchaseDate,
        expiryDate: new Date(purchaseDate.getTime() + 365 * 24 * 60 * 60 * 1000),
        validityDays: 365,
        status: status,
        usedDate: status === 'used' ? new Date(purchaseDate.getTime() + 15 * 24 * 60 * 60 * 1000) : undefined,
        usedAt: status === 'used' ? 'Online Shopping' : undefined,
        deliveryMethod: 'app',
        deliveryStatus: 'delivered',
        deliveredAt: purchaseDate,
        paymentMethod: 'wallet',
        transactionId: `VCH${Date.now()}${i}`,
        createdAt: purchaseDate,
        updatedAt: purchaseDate
      });
    }

    await db.collection('uservouchers').insertMany(vouchers);
    console.log('✅ Created 5 user vouchers');

    // 3. SEED TRANSACTIONS (EARNINGS)
    console.log('\n💰 Seeding Transactions...');

    const transactions = [];
    let totalEarned = 0;

    // Earning transactions
    const earnings = [
      { type: 'project', desc: 'Video creation reward', amount: 150 },
      { type: 'project', desc: 'Project completion bonus', amount: 200 },
      { type: 'referral', desc: 'Referral bonus', amount: 100 },
      { type: 'cashback', desc: 'Order cashback', amount: 50 },
      { type: 'project', desc: 'Content creation reward', amount: 150 }
    ];

    for (let i = 0; i < earnings.length; i++) {
      const earning = earnings[i];
      const txnDate = new Date(Date.now() - (2 + i * 3) * 24 * 60 * 60 * 1000);

      totalEarned += earning.amount;

      transactions.push({
        transactionId: `CR${Date.now()}${i.toString().padStart(4, '0')}`,
        user: userId,
        type: 'credit',
        category: earning.type === 'project' ? 'earning' : earning.type,
        amount: earning.amount,
        currency: 'INR',
        description: earning.desc,
        source: {
          type: earning.type,
          reference: userId,
          description: earning.desc
        },
        status: {
          current: 'completed',
          history: [{
            status: 'completed',
            timestamp: txnDate
          }]
        },
        balanceBefore: 3500 + (i * 100),
        balanceAfter: 3500 + (i * 100) + earning.amount,
        netAmount: earning.amount,
        isReversible: true,
        processedAt: txnDate,
        createdAt: txnDate,
        updatedAt: txnDate
      });
    }

    await db.collection('transactions').insertMany(transactions);
    console.log('✅ Created', transactions.length, 'transactions');

    // 4. UPDATE USER WALLET
    console.log('\n💳 Updating User Wallet...');

    await db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          'wallet.totalEarned': totalEarned
        }
      }
    );

    console.log('✅ Updated wallet - Total Earned:', totalEarned);

    console.log('\n📊 Seeding Summary:');
    console.log('   Projects: 5 (with user submissions)');
    console.log('   Vouchers: 5');
    console.log('   Transactions: 5 earnings');
    console.log('   Total Earned: ₹', totalEarned);

    console.log('\n📱 Expected Profile Icon Grid:');
    console.log('   Product: 3 (existing orders)');
    console.log('   Service: 5');
    console.log('   Voucher: 3 (active)');
    console.log('   Earns: ₹', totalEarned);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

seedCurrentUser();
