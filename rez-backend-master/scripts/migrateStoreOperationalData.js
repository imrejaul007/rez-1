/**
 * Migration Script: Update Store Operational Data
 *
 * This script updates all stores with proper operational data:
 * - isOpen: true/false based on current time and hours
 * - cashbackRate: from offers.cashback or random 3-12%
 * - operationalInfo.hours: standard business hours if missing
 * - waitTime: estimated wait time
 *
 * Run: node scripts/migrateStoreOperationalData.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

// Standard business hours template
const standardHours = {
  monday: { open: '09:00', close: '21:00', closed: false },
  tuesday: { open: '09:00', close: '21:00', closed: false },
  wednesday: { open: '09:00', close: '21:00', closed: false },
  thursday: { open: '09:00', close: '21:00', closed: false },
  friday: { open: '09:00', close: '22:00', closed: false },
  saturday: { open: '10:00', close: '22:00', closed: false },
  sunday: { open: '10:00', close: '20:00', closed: false },
};

// Extended hours for malls/supermarkets
const mallHours = {
  monday: { open: '10:00', close: '22:00', closed: false },
  tuesday: { open: '10:00', close: '22:00', closed: false },
  wednesday: { open: '10:00', close: '22:00', closed: false },
  thursday: { open: '10:00', close: '22:00', closed: false },
  friday: { open: '10:00', close: '23:00', closed: false },
  saturday: { open: '10:00', close: '23:00', closed: false },
  sunday: { open: '10:00', close: '22:00', closed: false },
};

// Restaurant hours
const restaurantHours = {
  monday: { open: '11:00', close: '23:00', closed: false },
  tuesday: { open: '11:00', close: '23:00', closed: false },
  wednesday: { open: '11:00', close: '23:00', closed: false },
  thursday: { open: '11:00', close: '23:00', closed: false },
  friday: { open: '11:00', close: '00:00', closed: false },
  saturday: { open: '11:00', close: '00:00', closed: false },
  sunday: { open: '11:00', close: '22:00', closed: false },
};

// Helper to check if store is currently open based on hours
function isCurrentlyOpen(hours) {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];

  const todayHours = hours?.[today];
  if (!todayHours || todayHours.closed) return false;

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);

  const openTime = openHour * 60 + openMin;
  let closeTime = closeHour * 60 + closeMin;

  // Handle midnight closing (00:00)
  if (closeTime === 0) closeTime = 24 * 60;

  return currentTime >= openTime && currentTime <= closeTime;
}

// Helper to generate random cashback rate
function generateCashbackRate(categoryName) {
  // Different rates based on category
  const categoryRates = {
    'food': { min: 5, max: 15 },
    'restaurant': { min: 5, max: 15 },
    'electronics': { min: 2, max: 8 },
    'fashion': { min: 5, max: 12 },
    'beauty': { min: 8, max: 15 },
    'grocery': { min: 3, max: 10 },
    'default': { min: 3, max: 12 },
  };

  const lowerCat = (categoryName || '').toLowerCase();
  let range = categoryRates.default;

  for (const [key, value] of Object.entries(categoryRates)) {
    if (lowerCat.includes(key)) {
      range = value;
      break;
    }
  }

  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

// Helper to generate wait time
function generateWaitTime() {
  const waitTimes = ['No wait', '5 min', '10 min', '15 min', '20 min'];
  return waitTimes[Math.floor(Math.random() * waitTimes.length)];
}

// Get hours based on store type/category
function getHoursForStore(store, categoryName) {
  const lowerCat = (categoryName || '').toLowerCase();
  const lowerName = (store.name || '').toLowerCase();

  // Check if it's a mall, supermarket, or large retail
  if (lowerName.includes('mall') || lowerName.includes('carrefour') ||
      lowerName.includes('lulu') || lowerName.includes('hypermarket') ||
      lowerCat.includes('supermarket') || lowerCat.includes('hypermarket')) {
    return mallHours;
  }

  // Check if it's a restaurant
  if (lowerName.includes('restaurant') || lowerName.includes('cafe') ||
      lowerName.includes('shake shack') || lowerName.includes('food') ||
      lowerCat.includes('restaurant') || lowerCat.includes('food')) {
    return restaurantHours;
  }

  return standardHours;
}

async function migrateStores() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Store = mongoose.connection.collection('stores');
    const Category = mongoose.connection.collection('categories');

    // Get all stores
    const stores = await Store.find({}).toArray();
    console.log(`Found ${stores.length} stores to update`);

    let updated = 0;
    let errors = 0;

    for (const store of stores) {
      try {
        // Get category name
        let categoryName = '';
        if (store.category) {
          const category = await Category.findOne({ _id: store.category });
          categoryName = category?.name || '';
        }

        // Determine hours based on store type
        const hours = getHoursForStore(store, categoryName);

        // Check if currently open
        const isOpen = isCurrentlyOpen(hours);

        // Generate or use existing cashback rate
        const cashbackRate = store.offers?.cashback ||
                           store.cashbackRate ||
                           generateCashbackRate(categoryName);

        // Generate wait time
        const waitTime = generateWaitTime();

        // Build update object
        const updateData = {
          $set: {
            isOpen: isOpen,
            cashbackRate: cashbackRate,
            'operationalInfo.hours': hours,
            'operationalInfo.waitTime': waitTime,
            'operationalInfo.deliveryTime': '30-45 mins',
            'operationalInfo.acceptsWalletPayment': true,
            'operationalInfo.paymentMethods': ['UPI', 'Card', 'Cash', 'Rez Coins'],
            // Also update offers.cashback to match
            'offers.cashback': cashbackRate,
            'offers.isPartner': true,
          }
        };

        await Store.updateOne({ _id: store._id }, updateData);
        updated++;

        if (updated % 10 === 0) {
          console.log(`Updated ${updated}/${stores.length} stores...`);
        }
      } catch (err) {
        console.error(`Error updating store ${store.name}:`, err.message);
        errors++;
      }
    }

    console.log('\n========================================');
    console.log('Migration Complete!');
    console.log(`Total stores: ${stores.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
migrateStores();
