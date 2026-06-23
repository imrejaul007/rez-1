/**
 * Migration Script: Add coins array to existing wallets
 * Run this once to update all existing wallets with the new coins structure
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-uri';

async function migrateWallets() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Wallet = mongoose.model('Wallet', new mongoose.Schema({}, { strict: false }));

    // Find all wallets without coins or with empty coins array
    const walletsToUpdate = await Wallet.find({
      $or: [
        { coins: { $exists: false } },
        { coins: { $size: 0 } }
      ]
    });

    console.log(`\n📊 Found ${walletsToUpdate.length} wallets to migrate`);

    if (walletsToUpdate.length === 0) {
      console.log('✅ All wallets already have coins!');
      process.exit(0);
    }

    let updated = 0;
    let failed = 0;

    for (const wallet of walletsToUpdate) {
      try {
        // Calculate how to split the balance between wasil and promotion
        // Strategy: All current balance goes to wasil, promotion starts at 0
        const wasilAmount = wallet.balance?.available || 0;

        const updatedWallet = await Wallet.findByIdAndUpdate(
          wallet._id,
          {
            $set: {
              coins: [
                {
                  type: 'wasil',
                  amount: wasilAmount,
                  isActive: true,
                  earnedDate: wallet.createdAt || new Date()
                },
                {
                  type: 'promotion',
                  amount: 0,
                  isActive: true,
                  earnedDate: wallet.createdAt || new Date()
                }
              ]
            }
          },
          { new: true }
        );

        console.log(`✅ Updated wallet ${wallet._id}: wasil=${wasilAmount} RC, promotion=0 RC`);
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update wallet ${wallet._id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Updated: ${updated} wallets`);
    console.log(`   ❌ Failed: ${failed} wallets`);
    console.log(`   📊 Total: ${walletsToUpdate.length} wallets`);

    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateWallets();