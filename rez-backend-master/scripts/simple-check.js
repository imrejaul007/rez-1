/**
 * Simple check - just show what's in the wallet
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function simpleCheck() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB');

    // Dynamic import for TypeScript modules
    const { Wallet } = await import('../dist/models/Wallet.js');
    const userId = '68ef4d41061faaf045222506';

    const wallet = await Wallet.findOne({ user: userId });

    if (wallet) {
      console.log('\n✅ WALLET FOUND');
      console.log('Total Balance:', wallet.balance.total);
      console.log('Wasil Coins:', wallet.coins.find(c => c.type === 'wasil')?.amount || 0);
      console.log('\n');
    } else {
      console.log('\n❌ NO WALLET - Creating one with 200 coins...\n');

      await Wallet.create({
        user: userId,
        balance: { total: 200, available: 200, pending: 0, paybill: 0 },
        coins: [{ type: 'wasil', amount: 200, isActive: true, earnedDate: new Date() }],
        statistics: { totalEarned: 200, totalSpent: 0, totalCashback: 0, totalRefunds: 0, totalTopups: 0, totalWithdrawals: 0, totalPayBill: 0, totalPayBillDiscount: 0 }
      });

      console.log('✅ Wallet created with 200 coins!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
    process.exit(0);
  }
}

simpleCheck();
