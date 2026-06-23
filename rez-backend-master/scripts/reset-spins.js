/**
 * Reset user's daily spins for testing
 * This deletes today's spin records so you get 3 fresh spins
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function resetSpins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const { MiniGame } = await import('../dist/models/MiniGame.js');
    const userId = '68ef4d41061faaf045222506';

    // Get today's date at midnight UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    console.log('🔍 Looking for spins since:', today.toISOString());

    // Find all spins today
    const spinsToday = await MiniGame.find({
      user: userId,
      gameType: 'spin_wheel',
      status: 'completed',
      completedAt: { $gte: today }
    });

    console.log(`📊 Found ${spinsToday.length} spins today\n`);

    if (spinsToday.length > 0) {
      console.log('🗑️  Deleting today\'s spins:');
      spinsToday.forEach(spin => {
        console.log(`   - Spin at ${spin.completedAt.toLocaleString()}: ${spin.reward?.description || 'No reward'}`);
      });

      // Delete today's spins
      const result = await MiniGame.deleteMany({
        user: userId,
        gameType: 'spin_wheel',
        status: 'completed',
        completedAt: { $gte: today }
      });

      console.log(`\n✅ Deleted ${result.deletedCount} spin records`);
      console.log('🎉 You now have 3 fresh spins!\n');
    } else {
      console.log('✓  No spins to delete (you already have 3 spins)\n');
    }

    // Verify
    const remainingSpins = await MiniGame.countDocuments({
      user: userId,
      gameType: 'spin_wheel',
      status: 'completed',
      completedAt: { $gte: today }
    });

    console.log('📊 Current Status:');
    console.log(`   Spins Used Today: ${remainingSpins}`);
    console.log(`   Spins Remaining: ${3 - remainingSpins}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

resetSpins();
