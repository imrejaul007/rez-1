const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Transaction categories and types
const TRANSACTION_TYPES = {
  credit: [
    { category: 'topup', desc: 'Wallet topup via UPI' },
    { category: 'cashback', desc: 'Cashback from order' },
    { category: 'refund', desc: 'Order refund' },
    { category: 'earning', desc: 'Video creation reward' },
    { category: 'earning', desc: 'Project completion bonus' },
    { category: 'bonus', desc: 'Welcome bonus' },
  ],
  debit: [
    { category: 'spending', desc: 'Purchase from Store' },
    { category: 'spending', desc: 'Order payment' },
    { category: 'withdrawal', desc: 'Withdrawal to bank' },
  ]
};

function generateTransactionId(type) {
  const prefix = type === 'credit' ? 'CR' : 'DR';
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}${timestamp}${String(random).padStart(4, '0')}`;
}

function getRandomAmount(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPastDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
}

async function seedTransactions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get all active users
    const users = await db.collection('users').find({ isActive: true }).toArray();
    console.log(`👥 Found ${users.length} active users\n`);

    let totalTransactionsAdded = 0;

    for (const user of users) {
      console.log(`\n📝 Processing user: ${user._id}`);
      console.log(`   Phone: ${user.phoneNumber}`);
      console.log(`   Name: ${user.profile?.firstName || 'N/A'} ${user.profile?.lastName || ''}`);

      // Check if user has a wallet
      let wallet = await db.collection('wallets').findOne({ user: user._id });

      if (!wallet) {
        console.log('   💼 Creating wallet for user...');
        wallet = {
          user: user._id,
          balance: {
            total: 0,
            available: 0,
            pending: 0
          },
          coins: [],
          currency: 'RC',
          statistics: {
            totalEarned: 0,
            totalSpent: 0,
            totalCashback: 0,
            totalRefunds: 0,
            totalTopups: 0,
            totalWithdrawals: 0
          },
          limits: {
            maxBalance: 100000,
            dailySpendLimit: 10000,
            dailySpent: 0,
            minWithdrawal: 100
          },
          isActive: true,
          isFrozen: false,
          settings: {
            autoTopup: false,
            autoTopupThreshold: 100,
            autoTopupAmount: 500,
            lowBalanceAlert: true,
            lowBalanceThreshold: 50
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await db.collection('wallets').insertOne(wallet);
        console.log('   ✅ Wallet created');
      }

      // Check existing transactions
      const existingCount = await db.collection('transactions').countDocuments({ user: user._id });
      console.log(`   💰 Existing transactions: ${existingCount}`);

      if (existingCount >= 5) {
        console.log('   ⏭️  User already has enough transactions, skipping...');
        continue;
      }

      // Generate 5-10 transactions for this user
      const transactionsToAdd = 10 - existingCount;
      const transactions = [];
      let currentBalance = wallet.balance.total;

      for (let i = 0; i < transactionsToAdd; i++) {
        // Randomly choose credit or debit
        const type = Math.random() > 0.4 ? 'credit' : 'debit';
        const typeOptions = TRANSACTION_TYPES[type];
        const option = typeOptions[Math.floor(Math.random() * typeOptions.length)];

        const amount = type === 'credit'
          ? getRandomAmount(100, 2000)
          : getRandomAmount(50, Math.min(1000, currentBalance + 500)); // Allow some to go into pending

        const balanceBefore = currentBalance;
        const balanceAfter = type === 'credit' ? currentBalance + amount : currentBalance - amount;
        currentBalance = balanceAfter;

        const transaction = {
          transactionId: generateTransactionId(type),
          user: user._id,
          type,
          category: option.category,
          amount,
          currency: 'RC',
          description: option.desc,
          source: {
            type: option.category,
            reference: user._id, // Simplified for demo
            description: option.desc,
            metadata: {
              source: 'seed_script',
              timestamp: new Date()
            }
          },
          status: {
            current: Math.random() > 0.1 ? 'completed' : 'pending',
            history: [
              {
                status: 'completed',
                timestamp: getRandomPastDate(30)
              }
            ]
          },
          balanceBefore,
          balanceAfter,
          fees: type === 'withdrawal' ? Math.round(amount * 0.02) : 0,
          tax: 0,
          isReversible: type === 'debit',
          createdAt: getRandomPastDate(30),
          updatedAt: new Date()
        };

        transactions.push(transaction);
      }

      // Insert transactions
      if (transactions.length > 0) {
        await db.collection('transactions').insertMany(transactions);
        console.log(`   ✅ Added ${transactions.length} transactions`);
        totalTransactionsAdded += transactions.length;

        // Update wallet balance
        const creditTotal = transactions.filter(t => t.type === 'credit' && t.status.current === 'completed').reduce((sum, t) => sum + t.amount, 0);
        const debitTotal = transactions.filter(t => t.type === 'debit' && t.status.current === 'completed').reduce((sum, t) => sum + t.amount, 0);
        const netChange = creditTotal - debitTotal;

        await db.collection('wallets').updateOne(
          { user: user._id },
          {
            $inc: {
              'balance.total': netChange,
              'balance.available': netChange,
              'statistics.totalEarned': creditTotal,
              'statistics.totalSpent': debitTotal
            },
            $set: {
              updatedAt: new Date()
            }
          }
        );

        console.log(`   💰 Updated wallet balance: ${wallet.balance.total} → ${wallet.balance.total + netChange}`);
      }
    }

    console.log(`\n\n✅ Seeding complete!`);
    console.log(`📊 Total transactions added: ${totalTransactionsAdded}`);

    await mongoose.disconnect();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seedTransactions();
