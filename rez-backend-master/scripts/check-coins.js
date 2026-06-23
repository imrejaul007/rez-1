/**
 * Quick script to check coin balances
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkCoins() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB\n');

    const CoinTransaction = require('../src/models/CoinTransaction').CoinTransaction;
    const Wallet = require('../src/models/Wallet').Wallet;
    const User = require('../src/models/User').User;

    // Get your user (the one you're logged in with)
    const userId = '68ef4d41061faaf045222506'; // From the logs

    console.log('🔍 Checking balances for user:', userId);
    console.log('─'.repeat(60), '\n');

    // Check CoinTransaction
    const coinBalance = await CoinTransaction.getUserBalance(userId);
    console.log('💰 CoinTransaction Balance:', coinBalance);

    // Check all coin transactions
    const transactions = await CoinTransaction.find({ user: userId });
    console.log('📝 Total Transactions:', transactions.length);

    if (transactions.length > 0) {
      console.log('\n📊 Recent Transactions:');
      transactions.slice(-5).forEach(tx => {
        console.log(`   ${tx.type}: ${tx.amount} coins - ${tx.description}`);
      });
    }

    console.log('\n' + '─'.repeat(60), '\n');

    // Check Wallet
    const wallet = await Wallet.findOne({ user: userId });

    if (wallet) {
      console.log('💼 Wallet Found!');
      console.log('   Total Balance:', wallet.balance.total);
      console.log('   Available:', wallet.balance.available);
      console.log('   Coins:', JSON.stringify(wallet.coins, null, 2));
      console.log('   Total Earned:', wallet.statistics.totalEarned);
    } else {
      console.log('❌ NO WALLET FOUND!');
      console.log('   Creating wallet now...\n');

      // Create wallet with coins from CoinTransaction
      const newWallet = await Wallet.create({
        user: userId,
        balance: {
          total: coinBalance,
          available: coinBalance,
          pending: 0,
          paybill: 0
        },
        coins: [
          {
            type: 'wasil',
            amount: coinBalance,
            isActive: true,
            earnedDate: new Date()
          }
        ],
        statistics: {
          totalEarned: coinBalance,
          totalSpent: 0,
          totalCashback: 0,
          totalRefunds: 0,
          totalTopups: 0,
          totalWithdrawals: 0,
          totalPayBill: 0,
          totalPayBillDiscount: 0
        }
      });

      console.log('✅ Wallet created with', coinBalance, 'coins!');
    }

    console.log('\n' + '─'.repeat(60), '\n');
    console.log('✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkCoins();
