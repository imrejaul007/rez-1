// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

/**
 * Fix Existing Users - Add Unique Referral Codes
 *
 * This script updates all existing users in the database that have null or missing
 * referral codes with unique referral codes to prevent duplicate key errors.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Helper function to generate unique referral code
function generateReferralCode(name, index) {
  const cleanName = name ? name.replace(/\s+/g, '').toUpperCase().substring(0, 6) : 'USER';
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const indexStr = String(index).padStart(2, '0');
  return `${cleanName}${random}${indexStr}`;
}

async function fixExistingUsers() {
  try {
    console.log('🔧 Starting Fix: Update Existing Users with Referral Codes');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get the users collection
    const usersCollection = mongoose.connection.db.collection('users');

    // Find all users with null or missing referral codes
    const usersWithNullReferral = await usersCollection.find({
      $or: [
        { 'referral.referralCode': null },
        { 'referral.referralCode': { $exists: false } },
        { referral: null },
        { referral: { $exists: false } }
      ]
    }).toArray();

    console.log(`📊 Found ${usersWithNullReferral.length} users with null/missing referral codes\n`);

    if (usersWithNullReferral.length === 0) {
      console.log('✅ No users need updating. All users already have referral codes.\n');
      await mongoose.disconnect();
      return;
    }

    // Update each user with a unique referral code
    let updatedCount = 0;
    const bulkOps = [];

    for (let i = 0; i < usersWithNullReferral.length; i++) {
      const user = usersWithNullReferral[i];
      const userName = user.profile?.name || user.email?.split('@')[0] || 'User';
      const referralCode = generateReferralCode(userName, i + 1);

      bulkOps.push({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              'referral.referralCode': referralCode,
              'referral.referredBy': user.referral?.referredBy || null,
              'referral.referralCount': user.referral?.referralCount || 0
            }
          }
        }
      });

      console.log(`  ${i + 1}. User: ${userName} -> Referral Code: ${referralCode}`);
    }

    // Execute bulk update
    const result = await usersCollection.bulkWrite(bulkOps);
    updatedCount = result.modifiedCount;

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ FIX COMPLETE!');
    console.log(`✅ Updated ${updatedCount} users with unique referral codes\n`);

    // Verify no duplicates
    const duplicateCheck = await usersCollection.aggregate([
      {
        $group: {
          _id: '$referral.referralCode',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    if (duplicateCheck.length > 0) {
      console.log('⚠️  WARNING: Duplicate referral codes found:');
      duplicateCheck.forEach(dup => {
        console.log(`  - Code: ${dup._id}, Count: ${dup.count}`);
      });
    } else {
      console.log('✅ Verification: All referral codes are unique!\n');
    }

    // Show final stats
    const totalUsers = await usersCollection.countDocuments();
    const usersWithReferral = await usersCollection.countDocuments({
      'referral.referralCode': { $exists: true, $ne: null }
    });

    console.log('📊 Final Database Stats:');
    console.log(`  Total Users: ${totalUsers}`);
    console.log(`  Users with Referral Codes: ${usersWithReferral}`);
    console.log(`  Users without Referral Codes: ${totalUsers - usersWithReferral}\n`);

    console.log('🎉 Database is now ready for merchant seeding!\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');

  } catch (error) {
    console.error('❌ ERROR fixing users:', error);
    process.exit(1);
  }
}

// Run the fix
fixExistingUsers();
