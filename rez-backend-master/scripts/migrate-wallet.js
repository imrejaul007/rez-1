const mongoose = require('mongoose');

async function addCoinsToWallet() {
  await mongoose.connect(process.env.MONGODB_URI);

  const userId = '68ef4d41061faaf045222506';
  const userObjId = new mongoose.Types.ObjectId(userId);
  const coinsToAdd = 2840;

  // Get current wallet
  const wallet = await mongoose.connection.db.collection('wallets').findOne({ user: userObjId });
  console.log('=== Current Wallet ===');

  // Wallet has coins as array with types
  const rezCoins = wallet?.coins?.find(c => c.type === 'rez');
  console.log('ReZ Coins:', rezCoins?.amount || 0);
  console.log('Total earned:', wallet?.totalEarned || 0);

  // Update wallet - add to rez coins in the array
  const newRezAmount = (rezCoins?.amount || 0) + coinsToAdd;

  const result = await mongoose.connection.db.collection('wallets').findOneAndUpdate(
    { user: userObjId, 'coins.type': 'rez' },
    {
      $set: {
        'coins.$.amount': newRezAmount,
        'coins.$.earnedDate': new Date()
      },
      $inc: {
        totalEarned: coinsToAdd
      }
    },
    { returnDocument: 'after' }
  );

  const updatedRezCoins = result?.coins?.find(c => c.type === 'rez');
  console.log('\n=== Updated Wallet ===');
  console.log('ReZ Coins:', updatedRezCoins?.amount || 0);
  console.log('Total earned:', result?.totalEarned || 0);

  // Create a transaction record
  await mongoose.connection.db.collection('transactions').insertOne({
    user: userObjId,
    type: 'credit',
    amount: coinsToAdd,
    balance: updatedRezCoins?.amount || coinsToAdd,
    category: 'daily_checkin',
    description: 'Historical check-in earnings migration (41 days)',
    status: 'completed',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('\n✅ Added Rs.', coinsToAdd, 'to wallet');
  console.log('✅ Transaction record created');
  console.log('✅ New total ReZ coins:', updatedRezCoins?.amount);

  await mongoose.disconnect();
  process.exit(0);
}

addCoinsToWallet().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
