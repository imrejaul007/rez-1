/**
 * Seed script to add priceForTwo to existing stores
 * Run with: node scripts/seedPriceForTwo.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-dev';

// Price ranges based on cuisine/tags
const priceRanges = {
    'premium': { min: 800, max: 1500 },
    'fine-dining': { min: 1200, max: 2500 },
    'cafe': { min: 200, max: 400 },
    'street-food': { min: 100, max: 250 },
    'fast-food': { min: 150, max: 300 },
    'pizza': { min: 400, max: 700 },
    'chinese': { min: 350, max: 600 },
    'indian': { min: 300, max: 600 },
    'biryani': { min: 350, max: 550 },
    'thali': { min: 200, max: 400 },
    'desserts': { min: 150, max: 350 },
    'ice-cream': { min: 100, max: 250 },
    'healthy': { min: 400, max: 700 },
    'continental': { min: 500, max: 900 },
    'default': { min: 300, max: 500 }
};

function getPriceForTwo(store) {
    const tags = (store.tags || []).map(t => t.toLowerCase());

    // Find matching price range
    for (const [key, range] of Object.entries(priceRanges)) {
        if (key !== 'default' && tags.some(tag => tag.includes(key))) {
            return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        }
    }

    // Default price
    const range = priceRanges.default;
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

async function seedPriceForTwo() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const Store = mongoose.connection.collection('stores');

        // Find stores without priceForTwo
        const stores = await Store.find({
            $or: [
                { priceForTwo: { $exists: false } },
                { priceForTwo: null },
                { priceForTwo: 0 }
            ]
        }).toArray();

        console.log(`Found ${stores.length} stores without priceForTwo`);

        let updated = 0;
        for (const store of stores) {
            const priceForTwo = getPriceForTwo(store);
            await Store.updateOne(
                { _id: store._id },
                { $set: { priceForTwo } }
            );
            updated++;
            if (updated % 10 === 0) {
                console.log(`Updated ${updated}/${stores.length} stores`);
            }
        }

        console.log(`\n✅ Successfully updated ${updated} stores with priceForTwo`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

seedPriceForTwo();
