const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB connection string from your environment
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB successfully');
    console.log(`📦 Database: ${DB_NAME}`);
    console.log(`🔗 URI: ${MONGODB_URI.substring(0, 30)}...`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
}

// Collection check results
const checkResults = {
  collections: {},
  summary: {
    total: 0,
    empty: 0,
    populated: 0,
    missing: []
  }
};

// Expected collections for REZ app
const EXPECTED_COLLECTIONS = [
  'users',
  'products',
  'categories',
  'stores',
  'orders',
  'carts',
  'wishlists',
  'reviews',
  'addresses',
  'vouchers',
  'loyaltypoints',
  'notifications',
  'messages',
  'groupbuyings',
  'bills',
  'socialposts',
  'referrals',
  'earnings',
  'wallets',
  'transactions'
];

// Check each collection
async function checkCollection(name) {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(name);
    const count = await collection.countDocuments();

    // Get sample document
    let sample = null;
    if (count > 0) {
      sample = await collection.findOne({});
    }

    return {
      exists: true,
      count,
      sample: sample ? Object.keys(sample).slice(0, 5) : null
    };
  } catch (error) {
    return {
      exists: false,
      count: 0,
      error: error.message
    };
  }
}

// Main check function
async function checkDatabase() {
  console.log('\n📊 Checking database collections...\n');

  // Get all existing collections
  const db = mongoose.connection.db;
  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map(c => c.name);

  console.log(`Found ${existingNames.length} existing collections\n`);

  // Check expected collections
  for (const collectionName of EXPECTED_COLLECTIONS) {
    const result = await checkCollection(collectionName);
    checkResults.collections[collectionName] = result;

    if (result.exists && result.count > 0) {
      console.log(`✅ ${collectionName}: ${result.count} documents`);
      checkResults.summary.populated++;
    } else if (result.exists && result.count === 0) {
      console.log(`⚠️  ${collectionName}: EMPTY`);
      checkResults.summary.empty++;
    } else {
      console.log(`❌ ${collectionName}: NOT FOUND`);
      checkResults.summary.missing.push(collectionName);
    }
    checkResults.summary.total++;
  }

  // Check for unexpected collections
  console.log('\n📦 Additional collections found:');
  for (const name of existingNames) {
    if (!EXPECTED_COLLECTIONS.includes(name) && !name.startsWith('system.')) {
      const result = await checkCollection(name);
      console.log(`   - ${name}: ${result.count} documents`);
    }
  }

  return checkResults;
}

// Generate seeding recommendations
function generateRecommendations(results) {
  console.log('\n' + '='.repeat(50));
  console.log('📋 DATABASE STATUS REPORT');
  console.log('='.repeat(50));

  console.log(`\n📊 Summary:`);
  console.log(`   Total Expected Collections: ${results.summary.total}`);
  console.log(`   ✅ Populated: ${results.summary.populated}`);
  console.log(`   ⚠️  Empty: ${results.summary.empty}`);
  console.log(`   ❌ Missing: ${results.summary.missing.length}`);

  const needsSeeding = results.summary.empty > 0 || results.summary.missing.length > 0;

  if (needsSeeding) {
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('   Your database needs seeding with initial data.');

    if (results.summary.missing.length > 0) {
      console.log('\n   Missing Collections:');
      results.summary.missing.forEach(name => {
        console.log(`   - ${name}`);
      });
    }

    const emptyCollections = Object.keys(results.collections).filter(
      name => results.collections[name].exists && results.collections[name].count === 0
    );

    if (emptyCollections.length > 0) {
      console.log('\n   Empty Collections:');
      emptyCollections.forEach(name => {
        console.log(`   - ${name}`);
      });
    }

    console.log('\n💡 To seed the database, run:');
    console.log('   npm run seed');
    console.log('   or');
    console.log('   node scripts/seed-database.js');
  } else {
    console.log('\n✅ DATABASE STATUS: READY');
    console.log('   All collections exist and contain data.');
    console.log('   Your backend should be fully functional!');
  }

  // Check critical collections
  const criticalCollections = ['users', 'products', 'categories', 'stores'];
  const criticalMissing = criticalCollections.filter(name =>
    !results.collections[name].exists || results.collections[name].count === 0
  );

  if (criticalMissing.length > 0) {
    console.log('\n⚠️  CRITICAL: The following essential collections need data:');
    criticalMissing.forEach(name => {
      console.log(`   - ${name} (REQUIRED for app to function)`);
    });
  }

  console.log('\n' + '='.repeat(50));

  return needsSeeding;
}

// Main execution
async function main() {
  console.log('🔍 REZ App Database Checker\n');

  // Connect to database
  const connected = await connectDB();
  if (!connected) {
    console.log('❌ Failed to connect to database. Please check your connection string.');
    process.exit(1);
  }

  try {
    // Check database
    const results = await checkDatabase();

    // Generate recommendations
    const needsSeeding = generateRecommendations(results);

    // Create seeding script if needed
    if (needsSeeding) {
      console.log('\n📝 Creating seed script...');
      const createSeedScript = require('./create-seed-script');
      await createSeedScript(results);
      console.log('✅ Seed script created: scripts/seed-database.js');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run the script
main().catch(console.error);