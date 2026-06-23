/**
 * Verify Database Data Script
 * Checks all seeded data in the MongoDB 'test' database
 *
 * Run with: npx ts-node scripts/verifyDatabaseData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User';
import Referral from '../src/models/Referral';
import Offer from '../src/models/Offer';
import { VoucherBrand } from '../src/models/Voucher';
import { Transaction } from '../src/models/Transaction';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'test';

async function verifyDatabaseData() {
  try {
    console.log('🔍 Database Verification Script');
    console.log('================================\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI}`);
    console.log(`   Database: ${DB_NAME}\n`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    // Verify we're connected to the right database
    const dbName = mongoose.connection.name;
    console.log(`📊 Connected Database: ${dbName}`);

    if (dbName !== DB_NAME) {
      console.log(`⚠️  WARNING: Expected database '${DB_NAME}' but connected to '${dbName}'`);
    } else {
      console.log(`✅ Confirmed: Using correct database '${DB_NAME}'\n`);
    }

    // Count all documents
    console.log('📈 Document Counts:');
    console.log('===================\n');

    // Users
    const usersCount = await User.countDocuments();
    console.log(`👥 Users: ${usersCount}`);

    // Referrals
    const referralsCount = await Referral.countDocuments();
    console.log(`🔗 Referrals: ${referralsCount}`);

    // Offers
    const offersCount = await Offer.countDocuments();
    console.log(`🎁 Offers: ${offersCount}`);

    // Voucher Brands
    const voucherBrandsCount = await VoucherBrand.countDocuments();
    console.log(`🎟️  Voucher Brands: ${voucherBrandsCount}`);

    // Transactions
    const transactionsCount = await Transaction.countDocuments();
    console.log(`💰 Transactions: ${transactionsCount}\n`);

    // Detailed Referrals Analysis
    if (referralsCount > 0) {
      console.log('🔍 Referrals Details:');
      console.log('=====================\n');

      const referralsByStatus = await Referral.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalRewards: { $sum: '$rewards.referrerAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      console.log('   By Status:');
      referralsByStatus.forEach(stat => {
        console.log(`   - ${stat._id}: ${stat.count} (₹${stat.totalRewards} total rewards)`);
      });
      console.log('');
    }

    // Detailed Offers Analysis
    if (offersCount > 0) {
      console.log('🎁 Offers Details:');
      console.log('==================\n');

      const offers = await Offer.find()
        .select('title type category cashbackPercentage validity metadata')
        .limit(20);

      console.log(`   Found ${offers.length} offers:`);
      offers.forEach((offer, i) => {
        console.log(`   ${i + 1}. ${offer.title}`);
        console.log(`      Type: ${offer.type} | Category: ${offer.category}`);
        console.log(`      Cashback: ${offer.cashbackPercentage}% | Active: ${offer.validity?.isActive} | Featured: ${offer.metadata?.featured}`);
      });
      console.log('');
    } else {
      console.log('⚠️  No offers found in database!');
      console.log('   Run: npx ts-node scripts/seedMoreOffers.ts\n');
    }

    // Detailed Vouchers Analysis
    if (voucherBrandsCount > 0) {
      console.log('🎟️  Voucher Brands Details:');
      console.log('===========================\n');

      const vouchers = await VoucherBrand.find()
        .select('name category cashbackRate isActive isFeatured')
        .limit(20);

      console.log(`   Found ${vouchers.length} voucher brands:`);
      vouchers.forEach((voucher, i) => {
        const voucherData = voucher as any;
        console.log(`   ${i + 1}. ${voucherData.name} (${voucherData.category})`);
        console.log(`      Cashback: ${voucherData.cashbackRate}% | Active: ${voucherData.isActive} | Featured: ${voucherData.isFeatured}`);
      });
      console.log('');
    }

    // Check Users with Referral Data
    if (usersCount > 0) {
      console.log('👥 Users with Referral Data:');
      console.log('============================\n');

      const usersWithReferrals = await User.find({ 'referral.totalReferrals': { $gt: 0 } })
        .select('profile.firstName profile.lastName email referral.referralCode referral.totalReferrals referral.referralEarnings referralTier')
        .limit(10);

      console.log(`   Found ${usersWithReferrals.length} users with referrals:`);
      usersWithReferrals.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.profile?.firstName || 'N/A'} ${user.profile?.lastName || ''}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Code: ${user.referral?.referralCode || 'N/A'}`);
        console.log(`      Tier: ${user.referralTier}`);
        console.log(`      Total Referrals: ${user.referral?.totalReferrals || 0}`);
        console.log(`      Earnings: ₹${user.referral?.referralEarnings || 0}`);
      });
      console.log('');
    }

    // Summary
    console.log('📊 Summary:');
    console.log('===========\n');
    console.log(`   ✅ Database: ${dbName}`);
    console.log(`   ${usersCount >= 15 ? '✅' : '❌'} Users: ${usersCount} ${usersCount >= 15 ? '(Expected 15+)' : '(Need 15+)'}`);
    console.log(`   ${referralsCount >= 14 ? '✅' : '❌'} Referrals: ${referralsCount} ${referralsCount >= 14 ? '(Expected 14+)' : '(Need 14+)'}`);
    console.log(`   ${offersCount >= 12 ? '✅' : '❌'} Offers: ${offersCount} ${offersCount >= 12 ? '(Expected 12+)' : '(Need 12+)'}`);
    console.log(`   ${voucherBrandsCount >= 12 ? '✅' : '❌'} Voucher Brands: ${voucherBrandsCount} ${voucherBrandsCount >= 12 ? '(Expected 12)' : '(Need 12)'}`);
    console.log(`   💰 Transactions: ${transactionsCount}\n`);

    // Recommendations
    if (offersCount < 12) {
      console.log('💡 Recommendations:');
      console.log('   Run: npx ts-node scripts/seedMoreOffers.ts');
    }

    if (referralsCount < 14) {
      console.log('💡 Recommendations:');
      console.log('   Run: npx ts-node scripts/seedReferrals.ts');
    }

    console.log('\n✅ Verification Complete!\n');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error verifying database:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

// Run the verification
if (require.main === module) {
  verifyDatabaseData();
}

export default verifyDatabaseData;
