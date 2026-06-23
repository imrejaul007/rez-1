/**
 * Fix Healthy Tags
 * 
 * Adds 'healthy-food' tag to stores that have 'healthy' tag
 * to ensure they show up when searching for "healthy-food" (category slug)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'test';

async function fixHealthyTags() {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║   🥗 FIXING HEALTHY STORE TAGS                            ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
        console.log('✅ Connected to MongoDB\n');

        require('ts-node/register');
        const projectRoot = path.resolve(__dirname, '..');
        const { Store } = require(path.join(projectRoot, 'src/models/Store'));

        // Find stores with 'healthy' tag but NOT 'healthy-food' tag
        const stores = await Store.find({
            tags: 'healthy',
            tags: { $ne: 'healthy-food' }, // Don't process if already has it
            isActive: true
        });

        console.log(`🔍 Found ${stores.length} stores to update`);

        let updatedCount = 0;
        for (const store of stores) {
            if (!store.tags.includes('healthy-food')) {
                store.tags.push('healthy-food');
                await store.save();
                console.log(`   ✅ Updated: ${store.name}`);
                updatedCount++;
            }
        }

        console.log(`\n✅ Successfully updated ${updatedCount} stores with 'healthy-food' tag\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

fixHealthyTags();
