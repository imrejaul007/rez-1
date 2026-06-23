import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkChallenges() {
  try {
    console.log('🔍 Checking challenges in database...');
    console.log('📊 Database:', DB_NAME);
    console.log('🔗 URI:', MONGODB_URI.substring(0, 50) + '...');

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📂 Collections in database:', collections.map(c => c.name).join(', '));
    console.log('');

    // Check challenges collection
    const challenges = await db.collection('challenges').find({}).toArray();
    console.log(`🎯 Total challenges in database: ${challenges.length}`);

    if (challenges.length > 0) {
      console.log('\n📋 Challenges found:\n');
      challenges.forEach((c: any, i: number) => {
        console.log(`  ${i+1}. ${c.title}`);
        console.log(`     Type: ${c.type}`);
        console.log(`     Active: ${c.active}`);
        console.log(`     Difficulty: ${c.difficulty}`);
        console.log(`     Rewards: ${c.rewards?.coins || 0} coins`);
        console.log(`     Start: ${c.startDate}`);
        console.log(`     End: ${c.endDate}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No challenges found in database!');
    }

    // Check active challenges
    const activeChallenges = await db.collection('challenges').find({ active: true }).toArray();
    console.log(`✅ Active challenges: ${activeChallenges.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit(0);
}

checkChallenges();
