/**
 * Migrate Store Logos
 *
 * Adds logo images to stores that are missing them,
 * using category-appropriate Unsplash/placeholder images.
 *
 * Run: npm run migrate:store-logos
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Store } from '../models/Store';
import dotenv from 'dotenv';

dotenv.config();

// Logo URLs keyed by store name (exact match)
const STORE_LOGOS: Record<string, string> = {
  // Pharmacy / Health
  '1mg Store': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
  'Apollo Pharmacy': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
  'Aster Pharmacy': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
  'BinSina Pharmacy': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
  'Boots Pharmacy': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
  'Life Pharmacy': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
  'MedPlus': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
  'Netmeds Store': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
  'PharmEasy Pickup': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
  'Wellness Forever': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',

  // Grocery
  'BigBasket': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
  'Swiggy': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',

  // Electronics
  'Croma': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400',
  'Reliance Digital': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400',
  'Vijay Sales': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400',

  // Fashion / Retail
  'H&M': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
  'Myntra': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
  'Zara': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',

  // Beauty / Salon
  'Enrich Salon': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
  'Juice Salon': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
  'Looks Salon': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
  'N.Bar': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
  'Naturals Salon': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
  'Nykaa': 'https://images.unsplash.com/photo-1596462502278-27bfdd403348?w=400',
  'Sephora': 'https://images.unsplash.com/photo-1596462502278-27bfdd403348?w=400',
  'Sisters Beauty Lounge': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
  'The Grooming Company': 'https://images.unsplash.com/photo-1585747860019-8ae0ccbf9e8f?w=400',
  'Tips & Toes': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
  'Toni&Guy': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',

  // Fitness / Gym
  'Anytime Fitness': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
  'Fitness First': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
  "Gold's Gym": 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
  'GymNation': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',

  // Spa / Wellness
  'Four Fountains Spa': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
  'O2 Spa': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
  'SensAsia Urban Spa': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
  'Talise Spa': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
  'Tattva Spa': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',

  // Pets
  'Dubai Pet Food': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
  'Heads Up For Tails': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
  'Just Dogs': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
  'Paws & Claws': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
  'Pet Zone': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
  'PetKonnect': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
  'Petsville': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
  'Petsy': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
  'Supertails': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',

  // Home Services / Cleaning / AC
  'AC Master Dubai': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'BookMyBai': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Cleanflo': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Cool Tech Services': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Fantastic Services': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Helper4U': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Helpling Dubai': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Hitches & Glitches': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Housejoy AC Repair': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Housejoy Deep Clean': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Jeeves AC Care': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Justlife Cleaning': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Mr Right AC Services': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Mr Right Cleaning': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'ServiceMarket AC': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'ServiceMarket Clean': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Urban Company': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Urban Company AC Services': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'Urban Company Cleaning': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',
  'UrbanClap AC Experts': 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=400',

  // Food / Kitchen / Cloud kitchens
  'Biryani By Kilo Kitchen': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
  'Box8 Kitchen': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  'Dominos Pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
  'FreshMenu': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  'Grub Kitchen Dubai': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  'Homely Kitchen': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  'Kitopi Kitchen': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  'Punjab Grill': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
  'Rebel Foods Kitchen': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  'Social': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
  'Sweetheart Kitchen': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  'The Good Bowl': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  'The Meatless Kitchen': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',

  // Cinema
  'PVR Cinemas': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',

  // Home furniture
  'Home Centre': 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
  'Decathlon': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400',
};

const GENERIC_STORE_LOGO = 'https://images.unsplash.com/photo-1528698827591-e19cef51a699?w=400';

async function migrateStoreLogos() {
  console.log('🏪 Store Logo Migration');
  console.log('='.repeat(60));
  console.log('');

  try {
    const stores = await Store.find({ $or: [{ logo: { $exists: false } }, { logo: null }, { logo: '' }] })
      .sort({ name: 1 })
      .lean();

    console.log(`Found ${stores.length} stores without logos.\n`);

    if (stores.length === 0) {
      console.log('All stores already have logos!');
      return;
    }

    let updated = 0;
    let usedFallback = 0;

    for (const store of stores) {
      const logoUrl = STORE_LOGOS[store.name] || GENERIC_STORE_LOGO;
      if (!STORE_LOGOS[store.name]) usedFallback++;

      await Store.updateOne(
        { _id: store._id },
        { $set: { logo: logoUrl } },
      );

      const marker = STORE_LOGOS[store.name] ? '✅' : '⚠️';
      console.log(`  ${marker} ${store.name} → ${logoUrl.substring(0, 65)}...`);
      updated++;
    }

    console.log('');
    console.log('─'.repeat(60));
    console.log(`📊 Updated ${updated} stores.`);
    if (usedFallback > 0) {
      console.log(`   ${usedFallback} used generic fallback image.`);
    }
    console.log('─'.repeat(60));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  connectDatabase()
    .then(() => migrateStoreLogos())
    .then(() => {
      console.log('\n✅ Done.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Connection failed:', error);
      process.exit(1);
    });
}
