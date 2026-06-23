const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

const NEW_PASSWORD = 'Mukulraj@123';

async function updateAllMerchantPasswords() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB');

    const Merchant = mongoose.model('Merchant', new mongoose.Schema({}, { strict: false }));

    // Get all merchants
    const merchants = await Merchant.find({});
    console.log(`\n📊 Found ${merchants.length} merchants`);

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

    let updatedCount = 0;
    let errorCount = 0;

    // Update all merchant passwords
    for (const merchant of merchants) {
      try {
        merchant.password = hashedPassword;
        await merchant.save();
        console.log(`✅ Updated password for: ${merchant.email} (${merchant.businessName})`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating password for ${merchant.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`\n🔑 New password for all merchants: ${NEW_PASSWORD}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateAllMerchantPasswords();

