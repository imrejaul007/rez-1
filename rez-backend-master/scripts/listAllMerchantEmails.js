const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function listAllMerchantEmails() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB');

    const Merchant = mongoose.model('Merchant', new mongoose.Schema({}, { strict: false }));

    // Get all merchants
    const merchants = await Merchant.find({}).select('email businessName ownerName createdAt');
    console.log(`\n📊 Found ${merchants.length} merchants\n`);

    console.log('='.repeat(80));
    console.log('ALL MERCHANT EMAILS:');
    console.log('='.repeat(80));
    console.log('');

    merchants.forEach((merchant, index) => {
      console.log(`${index + 1}. ${merchant.email}`);
      console.log(`   Business: ${merchant.businessName || 'N/A'}`);
      console.log(`   Owner: ${merchant.ownerName || 'N/A'}`);
      console.log(`   Created: ${merchant.createdAt || 'N/A'}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log(`Total: ${merchants.length} merchants`);
    console.log('='.repeat(80));

    // Also save to file
    const fs = require('fs');
    const emails = merchants.map(m => m.email).join('\n');
    fs.writeFileSync('merchant_emails.txt', emails);
    console.log('\n✅ Emails saved to merchant_emails.txt');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

listAllMerchantEmails();

