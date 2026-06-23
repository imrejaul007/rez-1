// Update Mumbai stores to Bangalore for region filtering
const mongoose = require('mongoose');
require('dotenv').config();

async function fixStoreCities() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('🚀 Starting store city update...');

    // Update Mumbai → Bangalore
    const result = await db.collection('stores').updateMany(
        { 'location.city': 'Mumbai' },
        { $set: { 'location.city': 'Bangalore' } }
    );

    console.log(`✅ Updated ${result.modifiedCount} stores from Mumbai to Bangalore`);

    // Verify
    const cities = await db.collection('stores').aggregate([
        { $group: { _id: '$location.city', count: { $sum: 1 } } }
    ]).toArray();

    console.log('\n📊 Final city distribution:');
    cities.forEach(c => console.log(`   ${c._id}: ${c.count}`));

    await mongoose.disconnect();
}

fixStoreCities().catch(console.error);
