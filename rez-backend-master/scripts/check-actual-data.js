const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });
    console.log('✅ Connected to MongoDB successfully\n');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
}

async function getCollectionData(name) {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(name);
    const count = await collection.countDocuments();

    let sample = null;
    if (count > 0) {
      sample = await collection.findOne({});
    }

    const stats = await collection.stats().catch(() => null);

    return {
      name,
      count,
      sampleFields: sample ? Object.keys(sample).slice(0, 10) : [],
      size: stats ? stats.size : 0,
      avgObjSize: stats ? Math.round(stats.avgObjSize) : 0
    };
  } catch (error) {
    return {
      name,
      count: 0,
      error: error.message
    };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('📊 ACTUAL DATABASE DATA ANALYSIS');
  console.log('='.repeat(70));

  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log(`Found ${collections.length} collections in database "${DB_NAME}"\n`);

    // Categorize collections
    const categories = {
      'Core Data': [],
      'User & Auth': [],
      'E-commerce': [],
      'Social & Engagement': [],
      'Gamification': [],
      'Payments & Wallet': [],
      'Content': [],
      'Analytics': [],
      'Merchant': [],
      'System': []
    };

    // Get data for all collections
    const collectionData = [];
    for (const col of collections) {
      const data = await getCollectionData(col.name);
      collectionData.push(data);
    }

    // Sort by document count
    collectionData.sort((a, b) => b.count - a.count);

    // Categorize
    collectionData.forEach(data => {
      if (data.name.startsWith('system.')) {
        categories['System'].push(data);
      } else if (['users', 'products', 'categories', 'stores'].includes(data.name)) {
        categories['Core Data'].push(data);
      } else if (['orders', 'carts', 'wishlists', 'addresses'].includes(data.name)) {
        categories['E-commerce'].push(data);
      } else if (['wallets', 'transactions', 'payments', 'paymentmethods'].includes(data.name)) {
        categories['Payments & Wallet'].push(data);
      } else if (['activities', 'follows', 'socialmediaposts', 'activityinteractions'].includes(data.name)) {
        categories['Social & Engagement'].push(data);
      } else if (['achievements', 'userachievements', 'challenges', 'userchallengeprogresses', 'userstreaks', 'cointransactions', 'minigames', 'gamesessions', 'scratchcards'].includes(data.name)) {
        categories['Gamification'].push(data);
      } else if (['videos', 'projects', 'reviews', 'faqs'].includes(data.name)) {
        categories['Content'].push(data);
      } else if (['storeanalytics', 'productanalytics', 'stocknotifications', 'auditlogs'].includes(data.name)) {
        categories['Analytics'].push(data);
      } else if (['merchants', 'mproducts', 'morders', 'merchantproducts', 'merchantorders'].includes(data.name)) {
        categories['Merchant'].push(data);
      } else {
        categories['User & Auth'].push(data);
      }
    });

    // Display by category
    for (const [category, items] of Object.entries(categories)) {
      if (items.length === 0) continue;

      console.log('\n' + '='.repeat(70));
      console.log(`📁 ${category}`);
      console.log('='.repeat(70));

      items.forEach(data => {
        if (data.count > 0) {
          const sizeKB = (data.size / 1024).toFixed(2);
          console.log(`\n✅ ${data.name}`);
          console.log(`   Documents: ${data.count}`);
          console.log(`   Size: ${sizeKB} KB`);
          console.log(`   Avg Doc Size: ${data.avgObjSize} bytes`);
          if (data.sampleFields.length > 0) {
            console.log(`   Fields: ${data.sampleFields.join(', ')}`);
          }
        } else {
          console.log(`\n⚠️  ${data.name}: EMPTY`);
        }
      });
    }

    // Summary statistics
    console.log('\n' + '='.repeat(70));
    console.log('📊 DATABASE SUMMARY');
    console.log('='.repeat(70));

    const totalDocs = collectionData.reduce((sum, col) => sum + col.count, 0);
    const totalSize = collectionData.reduce((sum, col) => sum + col.size, 0);
    const populatedCollections = collectionData.filter(col => col.count > 0);
    const emptyCollections = collectionData.filter(col => col.count === 0);

    console.log(`\nTotal Collections: ${collections.length}`);
    console.log(`Populated Collections: ${populatedCollections.length}`);
    console.log(`Empty Collections: ${emptyCollections.length}`);
    console.log(`Total Documents: ${totalDocs.toLocaleString()}`);
    console.log(`Total Data Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    // Top collections by size
    console.log('\n📈 Top 10 Collections by Document Count:');
    const topCollections = [...collectionData]
      .filter(col => col.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    topCollections.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col.name}: ${col.count} documents`);
    });

    // Critical data check
    console.log('\n🎯 CRITICAL DATA STATUS:');
    const criticalCollections = ['users', 'products', 'categories', 'stores'];
    criticalCollections.forEach(name => {
      const col = collectionData.find(c => c.name === name);
      if (col && col.count > 0) {
        console.log(`   ✅ ${name}: ${col.count} documents`);
      } else {
        console.log(`   ❌ ${name}: NO DATA`);
      }
    });

    // Empty collections that might need data
    if (emptyCollections.length > 0) {
      console.log('\n⚠️  EMPTY COLLECTIONS (May Need Seeding):');
      emptyCollections.forEach(col => {
        if (!col.name.startsWith('system.')) {
          console.log(`   - ${col.name}`);
        }
      });
    }

    // Production readiness assessment
    console.log('\n' + '='.repeat(70));
    console.log('🚀 PRODUCTION READINESS ASSESSMENT');
    console.log('='.repeat(70));

    const criticalDataExists = criticalCollections.every(name => {
      const col = collectionData.find(c => c.name === name);
      return col && col.count > 0;
    });

    let score = 100;
    const issues = [];

    if (!criticalDataExists) {
      score -= 30;
      issues.push('Critical collections missing data');
    }

    if (totalDocs < 100) {
      score -= 10;
      issues.push('Insufficient data for realistic testing');
    }

    if (emptyCollections.length > 20) {
      score -= 5;
      issues.push('Many empty collections');
    }

    console.log(`\nProduction Readiness Score: ${score}/100`);

    if (score >= 90) {
      console.log('Status: ✅ PRODUCTION READY');
    } else if (score >= 70) {
      console.log('Status: ⚠️  STAGING READY');
    } else {
      console.log('Status: ❌ NOT PRODUCTION READY');
    }

    if (issues.length > 0) {
      console.log('\nIssues:');
      issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ANALYSIS COMPLETE');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error analyzing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed\n');
  }
}

main().catch(console.error);
