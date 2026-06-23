/**
 * Migration Script: Wallet Schema Update
 *
 * This script migrates existing wallet data from the old schema to the new schema:
 *
 * OLD SCHEMA:
 * - coins: wasil, promotion, cashback, reward
 * - balance: { total, available, pending, paybill }
 * - statistics: { ...totalPayBill, totalPayBillDiscount }
 *
 * NEW SCHEMA:
 * - coins: rez, promo (with color, promoDetails)
 * - brandedCoins: [] (new - merchant-specific)
 * - balance: { total, available, pending, cashback }
 * - savingsInsights: { totalSaved, thisMonth, avgPerVisit }
 * - settings: { ...smartAlertsEnabled, expiringCoinsAlertDays }
 *
 * Run with: node scripts/migrate-wallet-to-new-schema.js
 */

const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function migrateWallets() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const walletsCollection = db.collection('wallets');

    // Get all wallets
    const wallets = await walletsCollection.find({}).toArray();
    console.log(`📊 Found ${wallets.length} wallets to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const wallet of wallets) {
      try {
        console.log(`\n🔄 Migrating wallet for user: ${wallet.user}`);

        // Check if already migrated (has 'rez' coin type)
        const hasRezCoin = wallet.coins?.some(c => c.type === 'rez');
        if (hasRezCoin) {
          console.log(`⏭️  Wallet already migrated, skipping...`);
          skippedCount++;
          continue;
        }

        // Calculate amounts from old coins
        let rezAmount = 0;
        let promoAmount = 0;
        let cashbackAmount = 0;

        // Process old coins
        if (wallet.coins && Array.isArray(wallet.coins)) {
          for (const coin of wallet.coins) {
            switch (coin.type) {
              case 'wasil':
                // Wasil coins become ReZ Coins
                rezAmount += coin.amount || 0;
                console.log(`  - wasil: ${coin.amount} → rez`);
                break;
              case 'promotion':
              case 'reward':
                // Promotion and reward coins become Promo Coins
                promoAmount += coin.amount || 0;
                console.log(`  - ${coin.type}: ${coin.amount} → promo`);
                break;
              case 'cashback':
                // Cashback goes to cashback balance
                cashbackAmount += coin.amount || 0;
                console.log(`  - cashback: ${coin.amount} → cashback balance`);
                break;
            }
          }
        }

        // Convert PayBill balance to ReZ Coins (since PayBill is being removed)
        const paybillBalance = wallet.balance?.paybill || 0;
        if (paybillBalance > 0) {
          rezAmount += paybillBalance;
          console.log(`  - paybill: ${paybillBalance} → rez (converted)`);
        }

        // Calculate total saved from PayBill discount (if any)
        const totalPayBillDiscount = wallet.statistics?.totalPayBillDiscount || 0;

        // Create new coin structure
        const newCoins = [
          {
            type: 'rez',
            amount: rezAmount,
            isActive: true,
            color: '#00C06A', // ReZ Green
            earnedDate: new Date(),
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          },
          {
            type: 'promo',
            amount: promoAmount,
            isActive: true,
            color: '#FFC857', // ReZ Gold
            earnedDate: new Date(),
            promoDetails: {
              maxRedemptionPercentage: 20,
              expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
            }
          }
        ];

        // Calculate new balance
        const newBalance = {
          total: rezAmount + promoAmount + cashbackAmount + (wallet.balance?.pending || 0),
          available: rezAmount + promoAmount,
          pending: wallet.balance?.pending || 0,
          cashback: cashbackAmount
        };

        // Create new statistics (remove PayBill stats)
        const newStatistics = {
          totalEarned: wallet.statistics?.totalEarned || 0,
          totalSpent: wallet.statistics?.totalSpent || 0,
          totalCashback: wallet.statistics?.totalCashback || 0,
          totalRefunds: wallet.statistics?.totalRefunds || 0,
          totalTopups: wallet.statistics?.totalTopups || 0,
          totalWithdrawals: wallet.statistics?.totalWithdrawals || 0
          // Removed: totalPayBill, totalPayBillDiscount
        };

        // Create savings insights
        const newSavingsInsights = {
          totalSaved: totalPayBillDiscount, // Start with PayBill discount as initial savings
          thisMonth: 0,
          avgPerVisit: 0,
          lastCalculated: new Date()
        };

        // Update settings to include smart alerts
        const newSettings = {
          ...(wallet.settings || {}),
          autoTopup: wallet.settings?.autoTopup || false,
          autoTopupThreshold: wallet.settings?.autoTopupThreshold || 100,
          autoTopupAmount: wallet.settings?.autoTopupAmount || 500,
          lowBalanceAlert: wallet.settings?.lowBalanceAlert ?? true,
          lowBalanceThreshold: wallet.settings?.lowBalanceThreshold || 50,
          smartAlertsEnabled: true,
          expiringCoinsAlertDays: 7
        };

        // Update the wallet document
        // Note: We replace entire balance and statistics objects, so no need for $unset
        const updateResult = await walletsCollection.updateOne(
          { _id: wallet._id },
          {
            $set: {
              coins: newCoins,
              brandedCoins: [], // Initialize empty branded coins array
              balance: newBalance,
              statistics: newStatistics,
              savingsInsights: newSavingsInsights,
              settings: newSettings,
              updatedAt: new Date()
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          console.log(`✅ Migrated successfully!`);
          console.log(`   - ReZ Coins: ${rezAmount}`);
          console.log(`   - Promo Coins: ${promoAmount}`);
          console.log(`   - Cashback Balance: ${cashbackAmount}`);
          console.log(`   - Total Balance: ${newBalance.total}`);
          migratedCount++;
        } else {
          console.log(`⚠️  No changes made (wallet may already be up to date)`);
          skippedCount++;
        }

      } catch (error) {
        console.error(`❌ Error migrating wallet ${wallet._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully migrated: ${migratedCount}`);
    console.log(`⏭️  Skipped (already migrated): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${wallets.length}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Verify migration function
async function verifyMigration() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('\n🔍 Verifying migration...\n');

    const db = client.db(DB_NAME);
    const walletsCollection = db.collection('wallets');

    // Get sample wallets
    const wallets = await walletsCollection.find({}).limit(5).toArray();

    for (const wallet of wallets) {
      console.log(`\n📱 Wallet for user: ${wallet.user}`);
      console.log('   Balance:', JSON.stringify(wallet.balance, null, 2));
      console.log('   Coins:');
      for (const coin of wallet.coins || []) {
        console.log(`     - ${coin.type}: ${coin.amount} (color: ${coin.color})`);
      }
      console.log('   Branded Coins:', wallet.brandedCoins?.length || 0);
      console.log('   Savings Insights:', JSON.stringify(wallet.savingsInsights, null, 2));
    }

  } finally {
    await client.close();
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Wallet Schema Migration');
  console.log('='.repeat(50));
  console.log('');
  console.log('This script will:');
  console.log('  1. Convert wasil coins → ReZ Coins');
  console.log('  2. Convert promotion/reward coins → Promo Coins');
  console.log('  3. Convert cashback coins → Cashback Balance');
  console.log('  4. Convert PayBill balance → ReZ Coins');
  console.log('  5. Add new fields: brandedCoins, savingsInsights');
  console.log('  6. Remove PayBill-related fields');
  console.log('');
  console.log('='.repeat(50));
  console.log('');

  await migrateWallets();
  await verifyMigration();

  console.log('\n✨ Migration complete!');
}

main().catch(console.error);
