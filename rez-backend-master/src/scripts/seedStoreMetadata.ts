/**
 * Seed Store Metadata
 * Updates existing stores with is60MinDelivery, hasStorePickup, and location coordinates
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Store } from '../models/Store';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Sample coordinates for major Indian cities
const cityCoordinates: Record<string, [number, number]> = {
  mumbai: [72.8777, 19.0760],
  delhi: [77.2090, 28.6139],
  bangalore: [77.5946, 12.9716],
  hyderabad: [78.4867, 17.3850],
  chennai: [80.2707, 13.0827],
  kolkata: [88.3639, 22.5726],
  pune: [73.8567, 18.5204],
  ahmedabad: [72.5714, 23.0225],
};

function getRandomCoordinates(city?: string): [number, number] {
  if (city && cityCoordinates[city.toLowerCase()]) {
    const [lng, lat] = cityCoordinates[city.toLowerCase()];
    // Add small random offset (within ~5km)
    return [
      lng + (Math.random() - 0.5) * 0.05,
      lat + (Math.random() - 0.5) * 0.05
    ];
  }
  // Default to Mumbai if city not found
  return [72.8777 + (Math.random() - 0.5) * 0.1, 19.0760 + (Math.random() - 0.5) * 0.1];
}

async function seedStoreMetadata(): Promise<number> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
  await mongoose.connect(mongoUri);

  console.log('Updating Store Metadata...');

  const stores = await Store.find({});
  let updated = 0;

  for (const store of stores) {
    const updates: any = {};

    // Set is60MinDelivery (60% chance)
    if (store.is60MinDelivery === undefined) {
      updates.is60MinDelivery = Math.random() > 0.4;
    }

    // Set hasStorePickup (70% chance)
    if (store.hasStorePickup === undefined) {
      updates.hasStorePickup = Math.random() > 0.3;
    }

    // Set location coordinates if missing
     if (!store.location?.coordinates || store.location.coordinates.length < 2) {
      const coords = getRandomCoordinates(store.location.city);
      updates['location.coordinates'] = coords;
    }

    if (Object.keys(updates).length > 0) {
      await Store.findByIdAndUpdate(store._id, { $set: updates });
      updated++;
    }
  }

  console.log(`Updated ${updated} stores with metadata`);
  await mongoose.disconnect();
  return updated;
}

seedStoreMetadata().catch(console.error);


