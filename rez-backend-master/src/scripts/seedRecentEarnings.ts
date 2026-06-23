// Seed script for "People are earning here" section
// Run: npx ts-node src/scripts/seedRecentEarnings.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Sample user names for seeding
const SAMPLE_USERS = [
  { firstName: 'Amit', lastName: 'Kumar' },
  { firstName: 'Priya', lastName: 'Sharma' },
  { firstName: 'Rahul', lastName: 'Verma' },
  { firstName: 'Sneha', lastName: 'Gupta' },
  { firstName: 'Vikram', lastName: 'Singh' },
  { firstName: 'Anjali', lastName: 'Patel' },
  { firstName: 'Arjun', lastName: 'Reddy' },
  { firstName: 'Kavya', lastName: 'Nair' },
];

async function seedRecentEarnings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Get all stores
    const stores = await db.collection('stores').find({ isActive: true }).limit(10).toArray();
    console.log(`📦 Found ${stores.length} stores`);

    if (stores.length === 0) {
      console.log('❌ No stores found. Please seed stores first.');
      process.exit(1);
    }

    // Get or create sample users
    const usersCollection = db.collection('users');
    const transactionsCollection = db.collection('transactions');

    let createdUsers: any[] = [];

    // First, try to get existing users from the database
    const existingUsers = await usersCollection.find({}).limit(10).toArray();

    if (existingUsers.length > 0) {
      console.log(`👤 Using ${existingUsers.length} existing users from database`);
      createdUsers = existingUsers;
    } else {
      // Only create users if none exist
      for (const userData of SAMPLE_USERS) {
        try {
          const phoneNumber = `+91${Math.floor(9000000000 + Math.random() * 999999999)}`;
          const result = await usersCollection.insertOne({
            firstName: userData.firstName,
            lastName: userData.lastName,
            name: `${userData.firstName} ${userData.lastName}`,
            email: `${userData.firstName.toLowerCase()}${Date.now()}@example.com`,
            phoneNumber: phoneNumber,
            phone: phoneNumber,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          const user = { _id: result.insertedId, ...userData };
          createdUsers.push(user);
          console.log(`👤 Created user: ${userData.firstName}`);
        } catch (err: any) {
          // Skip if user creation fails (e.g., duplicate)
          console.log(`⚠️ Skipped creating user: ${userData.firstName} (${err.message})`);
        }
      }
    }

    // Create sample transactions for each store
    const transactionsToInsert: any[] = [];
    const now = new Date();

    for (const store of stores) {
      // Create 3-5 random transactions per store
      const numTransactions = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < numTransactions; i++) {
        const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        const amount = 50 + Math.floor(Math.random() * 450); // ₹50 - ₹500
        const coinsEarned = Math.round(amount * 0.05);

        // Random time in last 7 days
        const hoursAgo = Math.floor(Math.random() * 168); // 0-168 hours (7 days)
        const transactionDate = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

        // Generate unique transaction ID
        const transactionId = `TXN_SEED_${store._id.toString().slice(-6)}_${randomUser._id.toString().slice(-6)}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        transactionsToInsert.push({
          transactionId: transactionId,
          user: randomUser._id,
          amount: amount,
          type: 'credit',
          category: 'earning',
          description: `Earned at ${store.name}`,
          source: {
            type: 'order', // Valid enum value
            reference: store._id, // Required field - using store as reference
            description: `Purchase at ${store.name}`,
            metadata: {
              storeInfo: {
                id: store._id, // Store as ObjectId, not string
                name: store.name,
              },
              orderValue: amount,
              coinsEarned: coinsEarned,
            }
          },
          balanceBefore: 0,
          balanceAfter: coinsEarned,
          isReversible: false,
          status: {
            current: 'completed',
            history: [{
              status: 'completed',
              timestamp: transactionDate,
            }]
          },
          createdAt: transactionDate,
          updatedAt: transactionDate,
        });
      }
    }

    // Insert transactions
    if (transactionsToInsert.length > 0) {
      const result = await transactionsCollection.insertMany(transactionsToInsert);
      console.log(`💰 Created ${result.insertedCount} transactions`);
    }

    console.log('✅ Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: ${createdUsers.length}`);
    console.log(`   - Transactions: ${transactionsToInsert.length}`);
    console.log(`   - Stores: ${stores.length}`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seedRecentEarnings();
