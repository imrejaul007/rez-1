/**
 * Migration Script: Fix Store Coordinates
 *
 * This script ensures all stores have proper location.coordinates for geospatial queries
 * Adds coordinates based on region or assigns default coordinates
 *
 * Run: node scripts/fixStoreCoordinates.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

// Region default coordinates
const REGION_COORDINATES = {
  bangalore: { lat: 12.9716, lng: 77.5946 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  china: { lat: 31.2304, lng: 121.4737 }, // Shanghai
};

// Area coordinates within each region (for variety)
const REGION_AREAS = {
  bangalore: [
    { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
    { name: 'Indiranagar', lat: 12.9783, lng: 77.6408 },
    { name: 'Whitefield', lat: 12.9698, lng: 77.7500 },
    { name: 'Jayanagar', lat: 12.9308, lng: 77.5838 },
    { name: 'HSR Layout', lat: 12.9116, lng: 77.6389 },
    { name: 'MG Road', lat: 12.9754, lng: 77.6062 },
    { name: 'Electronic City', lat: 12.8458, lng: 77.6612 },
    { name: 'Marathahalli', lat: 12.9591, lng: 77.7010 },
  ],
  dubai: [
    { name: 'Dubai Mall', lat: 25.1972, lng: 55.2796 },
    { name: 'Mall of Emirates', lat: 25.1181, lng: 55.2006 },
    { name: 'Dubai Marina', lat: 25.0805, lng: 55.1410 },
    { name: 'Deira', lat: 25.2700, lng: 55.3333 },
    { name: 'JLT', lat: 25.0657, lng: 55.1423 },
    { name: 'Downtown Dubai', lat: 25.1880, lng: 55.2797 },
    { name: 'Business Bay', lat: 25.1850, lng: 55.2625 },
    { name: 'Al Barsha', lat: 25.1063, lng: 55.1930 },
  ],
  china: [
    { name: 'Lujiazui', lat: 31.2397, lng: 121.4998 },
    { name: 'The Bund', lat: 31.2410, lng: 121.4906 },
    { name: 'Jing An', lat: 31.2238, lng: 121.4517 },
    { name: 'Pudong', lat: 31.2210, lng: 121.5440 },
    { name: 'Hongqiao', lat: 31.1959, lng: 121.3355 },
    { name: 'Xujiahui', lat: 31.1925, lng: 121.4393 },
  ],
};

// Determine region from store data
function determineRegion(store) {
  const storeName = (store.name || '').toLowerCase();
  const storeCity = (store.location?.city || store.address?.city || '').toLowerCase();
  const storeCountry = (store.location?.country || store.address?.country || '').toLowerCase();
  const tags = (store.tags || []).map(t => t.toLowerCase());

  // Check Dubai indicators
  if (storeCity.includes('dubai') ||
      storeCountry.includes('uae') ||
      storeCountry.includes('emirates') ||
      tags.includes('dubai') ||
      tags.includes('uae')) {
    return 'dubai';
  }

  // Check China indicators
  if (storeCity.includes('shanghai') ||
      storeCity.includes('beijing') ||
      storeCountry.includes('china') ||
      tags.includes('china')) {
    return 'china';
  }

  // Default to Bangalore
  return 'bangalore';
}

// Add slight randomness to coordinates to prevent overlapping
function addRandomOffset(lat, lng) {
  const latOffset = (Math.random() - 0.5) * 0.02; // ~1km range
  const lngOffset = (Math.random() - 0.5) * 0.02;
  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
  };
}

// Get coordinates for a store
function getCoordinatesForStore(store, region) {
  const areas = REGION_AREAS[region] || REGION_AREAS.bangalore;
  const randomArea = areas[Math.floor(Math.random() * areas.length)];
  const { lat, lng } = addRandomOffset(randomArea.lat, randomArea.lng);
  return [lng, lat]; // MongoDB format: [longitude, latitude]
}

async function fixStoreCoordinates() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Store = mongoose.connection.collection('stores');

    // Get all stores
    const stores = await Store.find({}).toArray();
    console.log(`Found ${stores.length} stores to check`);

    let updated = 0;
    let alreadyValid = 0;
    let errors = 0;

    for (const store of stores) {
      try {
        // Check if store already has valid coordinates
        const hasValidCoords = store.location?.coordinates &&
          Array.isArray(store.location.coordinates) &&
          store.location.coordinates.length === 2 &&
          typeof store.location.coordinates[0] === 'number' &&
          typeof store.location.coordinates[1] === 'number' &&
          store.location.coordinates[0] !== 0 &&
          store.location.coordinates[1] !== 0;

        if (hasValidCoords) {
          alreadyValid++;
          continue;
        }

        // Determine region and get coordinates
        const region = determineRegion(store);
        const coordinates = getCoordinatesForStore(store, region);

        // Build update object
        const updateData = {
          $set: {
            'location.type': 'Point',
            'location.coordinates': coordinates,
          }
        };

        // If location doesn't exist at all, set default address fields too
        if (!store.location) {
          const defaultCoords = REGION_COORDINATES[region];
          updateData.$set['location.address'] = `${store.name} Store`;
          updateData.$set['location.city'] = region === 'dubai' ? 'Dubai' :
            (region === 'china' ? 'Shanghai' : 'Bangalore');
          updateData.$set['location.state'] = region === 'dubai' ? 'Dubai' :
            (region === 'china' ? 'Shanghai' : 'Karnataka');
          updateData.$set['location.country'] = region === 'dubai' ? 'UAE' :
            (region === 'china' ? 'China' : 'India');
          updateData.$set['location.pincode'] = region === 'dubai' ? '00000' :
            (region === 'china' ? '200000' : '560001');
        }

        await Store.updateOne({ _id: store._id }, updateData);
        updated++;

        if (updated % 10 === 0) {
          console.log(`Updated ${updated}/${stores.length - alreadyValid} stores...`);
        }
      } catch (err) {
        console.error(`Error updating store ${store.name}:`, err.message);
        errors++;
      }
    }

    console.log('\n========================================');
    console.log('Coordinate Fix Complete!');
    console.log(`Total stores: ${stores.length}`);
    console.log(`Already valid: ${alreadyValid}`);
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log('========================================\n');

    // Create 2dsphere index if it doesn't exist
    console.log('Ensuring 2dsphere index on location.coordinates...');
    try {
      await Store.createIndex({ 'location.coordinates': '2dsphere' });
      console.log('Index created/verified successfully');
    } catch (indexErr) {
      if (indexErr.code === 85) {
        console.log('Index already exists');
      } else {
        console.error('Error creating index:', indexErr.message);
      }
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
fixStoreCoordinates();
