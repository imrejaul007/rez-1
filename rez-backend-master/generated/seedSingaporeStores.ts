
/**
 * Seed Singapore Stores
 * Run with: npx ts-node src/scripts/seedSingaporeStores.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const STORE_TEMPLATES = {
  'cafes': [
    { name: 'Starbucks Singapore', description: 'Starbucks in Singapore', tags: ['cafes'], cashback: 10 },
    { name: 'Costa Coffee Singapore', description: 'Costa Coffee in Singapore', tags: ['cafes'], cashback: 12 },
    { name: 'Local Cafe Singapore', description: 'Local Cafe in Singapore', tags: ['cafes'], cashback: 14 },
    { name: 'Artisan Roasters Singapore', description: 'Artisan Roasters in Singapore', tags: ['cafes'], cashback: 16 },
  ],
  'family-restaurants': [
    { name: 'Local Kitchen Singapore', description: 'Local Kitchen in Singapore', tags: ['family-restaurants'], cashback: 10 },
    { name: 'Family Diner Singapore', description: 'Family Diner in Singapore', tags: ['family-restaurants'], cashback: 12 },
    { name: 'Tasty Bites Singapore', description: 'Tasty Bites in Singapore', tags: ['family-restaurants'], cashback: 14 },
    { name: 'Home Cook Singapore', description: 'Home Cook in Singapore', tags: ['family-restaurants'], cashback: 16 },
  ],
  'qsr-fast-food': [
    { name: 'McDonald's Singapore', description: 'McDonald's in Singapore', tags: ['qsr-fast-food'], cashback: 10 },
    { name: 'KFC Singapore', description: 'KFC in Singapore', tags: ['qsr-fast-food'], cashback: 12 },
    { name: 'Burger King Singapore', description: 'Burger King in Singapore', tags: ['qsr-fast-food'], cashback: 14 },
    { name: 'Subway Singapore', description: 'Subway in Singapore', tags: ['qsr-fast-food'], cashback: 16 },
  ],
  'supermarkets': [
    { name: 'FreshMart Singapore', description: 'FreshMart in Singapore', tags: ['supermarkets'], cashback: 10 },
    { name: 'Daily Grocery Singapore', description: 'Daily Grocery in Singapore', tags: ['supermarkets'], cashback: 12 },
    { name: 'Super Save Singapore', description: 'Super Save in Singapore', tags: ['supermarkets'], cashback: 14 },
    { name: 'Organic Store Singapore', description: 'Organic Store in Singapore', tags: ['supermarkets'], cashback: 16 },
  ],
  'pharmacies': [
    { name: 'HealthCare Pharmacy Singapore', description: 'HealthCare Pharmacy in Singapore', tags: ['pharmacies'], cashback: 10 },
    { name: 'MediPlus Singapore', description: 'MediPlus in Singapore', tags: ['pharmacies'], cashback: 12 },
    { name: 'Wellness Store Singapore', description: 'Wellness Store in Singapore', tags: ['pharmacies'], cashback: 14 },
    { name: 'Quick Meds Singapore', description: 'Quick Meds in Singapore', tags: ['pharmacies'], cashback: 16 },
  ],
  'salons': [
    { name: 'Style Studio Singapore', description: 'Style Studio in Singapore', tags: ['salons'], cashback: 10 },
    { name: 'Glamour Salon Singapore', description: 'Glamour Salon in Singapore', tags: ['salons'], cashback: 12 },
    { name: 'Cut & Color Singapore', description: 'Cut & Color in Singapore', tags: ['salons'], cashback: 14 },
    { name: 'Beauty Hub Singapore', description: 'Beauty Hub in Singapore', tags: ['salons'], cashback: 16 },
  ],
  'spa-wellness': [
    { name: 'Zen Spa Singapore', description: 'Zen Spa in Singapore', tags: ['spa-wellness'], cashback: 10 },
    { name: 'Fitness Center Singapore', description: 'Fitness Center in Singapore', tags: ['spa-wellness'], cashback: 12 },
    { name: 'Wellness Club Singapore', description: 'Wellness Club in Singapore', tags: ['spa-wellness'], cashback: 14 },
    { name: 'Yoga Studio Singapore', description: 'Yoga Studio in Singapore', tags: ['spa-wellness'], cashback: 16 },
  ],
  'cleaning': [
    { name: 'CleanPro Services Singapore', description: 'CleanPro Services in Singapore', tags: ['cleaning'], cashback: 10 },
    { name: 'Home Sparkle Singapore', description: 'Home Sparkle in Singapore', tags: ['cleaning'], cashback: 12 },
    { name: 'Quick Clean Singapore', description: 'Quick Clean in Singapore', tags: ['cleaning'], cashback: 14 },
    { name: 'Tidy Home Singapore', description: 'Tidy Home in Singapore', tags: ['cleaning'], cashback: 16 },
  ],
};

const LOCATIONS = {
  city: 'Singapore',
  state: 'Singapore',
  country: 'Singapore',
  areas: [
    { name: 'Singapore', coords: [103.8198, 1.3521], pincode: '100000' },
    { name: 'Jurong East', coords: [103.8298, 1.3621], pincode: '100001' },
    { name: 'Woodlands', coords: [103.8398, 1.3721], pincode: '100002' },
    { name: 'Tampines', coords: [103.8498, 1.3821], pincode: '100003' },
    { name: 'Bedok', coords: [103.8598, 1.3921000000000001], pincode: '100004' },
  ],
};

async function seedSingaporeStores() {
  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;

  const storesToInsert: any[] = [];

  for (const [subcategorySlug, stores] of Object.entries(STORE_TEMPLATES)) {
    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      const area = LOCATIONS.areas[i % LOCATIONS.areas.length];
      const slug = store.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Check if store already exists
      const existing = await db!.collection('stores').findOne({ slug });
      if (existing) continue;

      storesToInsert.push({
        name: store.name,
        slug,
        description: store.description,
        tags: store.tags,
        subcategorySlug,
        region: 'singapore',
        isActive: true,
        isFeatured: i < 2,
        cashbackPercentage: store.cashback,
        partnerLevel: store.cashback >= 15 ? 'gold' : 'silver',
        location: {
          address: `${Math.floor(Math.random() * 500) + 1}, ${area.name}`,
          area: area.name,
          city: LOCATIONS.city,
          state: LOCATIONS.state,
          country: LOCATIONS.country,
          pincode: area.pincode,
          coordinates: {
            type: 'Point',
            coordinates: [area.coords[0] + (Math.random() - 0.5) * 0.01, area.coords[1] + (Math.random() - 0.5) * 0.01],
          },
        },
        images: {
          logo: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400',
          cover: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800',
        },
        ratings: { average: 3.8 + Math.random() * 1.2, count: Math.floor(Math.random() * 500) + 50 },
        operatingHours: {
          monday: { open: '09:00', close: '21:00', isOpen: true },
          tuesday: { open: '09:00', close: '21:00', isOpen: true },
          wednesday: { open: '09:00', close: '21:00', isOpen: true },
          thursday: { open: '09:00', close: '21:00', isOpen: true },
          friday: { open: '09:00', close: '21:00', isOpen: true },
          saturday: { open: '10:00', close: '20:00', isOpen: true },
          sunday: { open: '10:00', close: '18:00', isOpen: true },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  if (storesToInsert.length > 0) {
    console.log(`\n🔄 Inserting ${storesToInsert.length} new stores...`);
    await db!.collection('stores').insertMany(storesToInsert);
    console.log(`✅ Inserted ${storesToInsert.length} stores for Singapore`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

seedSingaporeStores().catch(console.error);
