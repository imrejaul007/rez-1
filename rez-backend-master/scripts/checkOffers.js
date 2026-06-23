const mongoose = require('mongoose');
require('dotenv').config();

async function checkOffers() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'test' });
  const db = mongoose.connection.db;

  // Check offers data
  const withOffers = await db.collection('stores').countDocuments({
    'offers.cashback': { $exists: true, $gt: 0 }
  });
  const withMaxCashback = await db.collection('stores').countDocuments({
    maxCashback: { $exists: true, $gt: 0 }
  });
  const withRewardRules = await db.collection('stores').countDocuments({
    'rewardRules.baseCashbackPercent': { $exists: true, $gt: 0 }
  });

  console.log('Stores with offers.cashback > 0:', withOffers);
  console.log('Stores with maxCashback > 0:', withMaxCashback);
  console.log('Stores with rewardRules.baseCashbackPercent > 0:', withRewardRules);

  // Get sample offer data
  const sample = await db.collection('stores').findOne({ isActive: true });
  console.log('\nSample store offers/rewards:');
  console.log('- offers:', JSON.stringify(sample.offers));
  console.log('- rewardRules:', JSON.stringify(sample.rewardRules));
  console.log('- maxCashback:', sample.maxCashback);

  // Check total with any cashback indicator
  const withAnyCashback = await db.collection('stores').countDocuments({
    $or: [
      { 'offers.cashback': { $gt: 0 } },
      { maxCashback: { $gt: 0 } },
      { 'rewardRules.baseCashbackPercent': { $gt: 0 } }
    ]
  });
  console.log('\nStores with ANY cashback indicator:', withAnyCashback);

  await mongoose.disconnect();
}
checkOffers();
