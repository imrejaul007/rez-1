/**
 * Add New Region Template Script
 *
 * This script helps you add a new region to the Rez platform.
 * It generates all the necessary code changes and seed data.
 *
 * Usage: npx ts-node src/scripts/addNewRegion.ts
 *
 * After running, you'll need to manually:
 * 1. Copy the generated code snippets to the respective files
 * 2. Run the seed script for the new region's data
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ============================================
// REGION TEMPLATE - EDIT THIS FOR NEW REGION
// ============================================

interface NewRegionConfig {
  id: string;                    // e.g., 'singapore'
  name: string;                  // e.g., 'Singapore'
  displayName: string;           // e.g., 'Singapore'
  currency: string;              // e.g., 'SGD'
  currencySymbol: string;        // e.g., 'S$'
  locale: string;                // e.g., 'en-SG'
  timezone: string;              // e.g., 'Asia/Singapore'
  countryCode: string;           // e.g., 'SG'
  countries: string[];           // e.g., ['Singapore', 'SG', 'SGP']
  defaultCoordinates: {
    longitude: number;
    latitude: number;
  };
  coordinateBounds: {            // For auto-detection from GPS
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  };
  cities: string[];              // Cities that belong to this region
  deliveryRadius: number;        // Default delivery radius in km
}

// ============================================
// SAMPLE REGION CONFIGS (uncomment one to use)
// ============================================

const SAMPLE_REGIONS: Record<string, NewRegionConfig> = {
  singapore: {
    id: 'singapore',
    name: 'Singapore',
    displayName: 'Singapore',
    currency: 'SGD',
    currencySymbol: 'S$',
    locale: 'en-SG',
    timezone: 'Asia/Singapore',
    countryCode: 'SG',
    countries: ['Singapore', 'SG', 'SGP'],
    defaultCoordinates: { longitude: 103.8198, latitude: 1.3521 },
    coordinateBounds: { minLng: 103.6, maxLng: 104.1, minLat: 1.1, maxLat: 1.5 },
    cities: ['Singapore', 'Jurong East', 'Woodlands', 'Tampines', 'Bedok', 'Ang Mo Kio', 'Orchard', 'Marina Bay'],
    deliveryRadius: 15,
  },

  london: {
    id: 'london',
    name: 'London',
    displayName: 'London, UK',
    currency: 'GBP',
    currencySymbol: '£',
    locale: 'en-GB',
    timezone: 'Europe/London',
    countryCode: 'GB',
    countries: ['United Kingdom', 'UK', 'GB', 'GBR', 'England'],
    defaultCoordinates: { longitude: -0.1276, latitude: 51.5074 },
    coordinateBounds: { minLng: -0.6, maxLng: 0.4, minLat: 51.2, maxLat: 51.8 },
    cities: ['London', 'Westminster', 'Camden', 'Greenwich', 'Hackney', 'Islington', 'Kensington', 'Southwark'],
    deliveryRadius: 10,
  },

  newyork: {
    id: 'newyork',
    name: 'New York',
    displayName: 'New York, USA',
    currency: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    timezone: 'America/New_York',
    countryCode: 'US',
    countries: ['United States', 'USA', 'US', 'America'],
    defaultCoordinates: { longitude: -74.006, latitude: 40.7128 },
    coordinateBounds: { minLng: -74.3, maxLng: -73.7, minLat: 40.4, maxLat: 41.0 },
    cities: ['New York', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Jersey City', 'Newark'],
    deliveryRadius: 15,
  },

  sydney: {
    id: 'sydney',
    name: 'Sydney',
    displayName: 'Sydney, Australia',
    currency: 'AUD',
    currencySymbol: 'A$',
    locale: 'en-AU',
    timezone: 'Australia/Sydney',
    countryCode: 'AU',
    countries: ['Australia', 'AU', 'AUS'],
    defaultCoordinates: { longitude: 151.2093, latitude: -33.8688 },
    coordinateBounds: { minLng: 150.5, maxLng: 151.5, minLat: -34.2, maxLat: -33.5 },
    cities: ['Sydney', 'Parramatta', 'Bondi', 'Manly', 'Chatswood', 'Penrith', 'Liverpool', 'Bankstown'],
    deliveryRadius: 20,
  },

  tokyo: {
    id: 'tokyo',
    name: 'Tokyo',
    displayName: 'Tokyo, Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    locale: 'ja-JP',
    timezone: 'Asia/Tokyo',
    countryCode: 'JP',
    countries: ['Japan', 'JP', 'JPN'],
    defaultCoordinates: { longitude: 139.6917, latitude: 35.6895 },
    coordinateBounds: { minLng: 138.9, maxLng: 140.2, minLat: 35.4, maxLat: 36.0 },
    cities: ['Tokyo', 'Shibuya', 'Shinjuku', 'Ginza', 'Akihabara', 'Roppongi', 'Ikebukuro', 'Ueno'],
    deliveryRadius: 10,
  },
};

// ============================================
// CODE GENERATORS
// ============================================

function generateBackendRegionConfig(config: NewRegionConfig): string {
  return `
  ${config.id}: {
    id: '${config.id}',
    name: '${config.name}',
    displayName: '${config.displayName}',
    currency: '${config.currency}',
    currencySymbol: '${config.currencySymbol}',
    locale: '${config.locale}',
    timezone: '${config.timezone}',
    defaultCoordinates: [${config.defaultCoordinates.longitude}, ${config.defaultCoordinates.latitude}], // [lng, lat]
    cities: [
      ${config.cities.map(c => `'${c}'`).join(',\n      ')}
    ],
    countries: [${config.countries.map(c => `'${c}'`).join(', ')}],
    countryCode: '${config.countryCode}',
    deliveryRadius: ${config.deliveryRadius},
    isActive: true
  },`;
}

function generateFrontendRegionConfig(config: NewRegionConfig): string {
  return `
  ${config.id}: {
    id: '${config.id}',
    name: '${config.name}',
    displayName: '${config.displayName}',
    currency: '${config.currency}',
    currencySymbol: '${config.currencySymbol}',
    locale: '${config.locale}',
    timezone: '${config.timezone}',
    countryCode: '${config.countryCode}',
    defaultCoordinates: { latitude: ${config.defaultCoordinates.latitude}, longitude: ${config.defaultCoordinates.longitude} }
  },`;
}

function generateCoordinateDetection(config: NewRegionConfig): string {
  return `
  // ${config.name} region (${config.coordinateBounds.minLng}-${config.coordinateBounds.maxLng} longitude, ${config.coordinateBounds.minLat}-${config.coordinateBounds.maxLat} latitude)
  if (lng >= ${config.coordinateBounds.minLng} && lng <= ${config.coordinateBounds.maxLng} && lat >= ${config.coordinateBounds.minLat} && lat <= ${config.coordinateBounds.maxLat}) {
    return '${config.id}';
  }`;
}

function generateCityMapping(config: NewRegionConfig): string {
  return config.cities.map(city =>
    `  '${city.toLowerCase()}': '${config.id}',`
  ).join('\n');
}

function generateSeedStores(config: NewRegionConfig): string {
  const storeTypes = [
    { subcategory: 'cafes', stores: ['Starbucks', 'Costa Coffee', 'Local Cafe', 'Artisan Roasters'] },
    { subcategory: 'family-restaurants', stores: ['Local Kitchen', 'Family Diner', 'Tasty Bites', 'Home Cook'] },
    { subcategory: 'qsr-fast-food', stores: ['McDonald\'s', 'KFC', 'Burger King', 'Subway'] },
    { subcategory: 'supermarkets', stores: ['FreshMart', 'Daily Grocery', 'Super Save', 'Organic Store'] },
    { subcategory: 'pharmacies', stores: ['HealthCare Pharmacy', 'MediPlus', 'Wellness Store', 'Quick Meds'] },
    { subcategory: 'salons', stores: ['Style Studio', 'Glamour Salon', 'Cut & Color', 'Beauty Hub'] },
    { subcategory: 'spa-wellness', stores: ['Zen Spa', 'Fitness Center', 'Wellness Club', 'Yoga Studio'] },
    { subcategory: 'cleaning', stores: ['CleanPro Services', 'Home Sparkle', 'Quick Clean', 'Tidy Home'] },
  ];

  return `
/**
 * Seed ${config.name} Stores
 * Run with: npx ts-node src/scripts/seed${config.name}Stores.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const STORE_TEMPLATES = {
${storeTypes.map(type => `  '${type.subcategory}': [
${type.stores.map((store, i) => `    { name: '${store} ${config.name}', description: '${store} in ${config.name}', tags: ['${type.subcategory}'], cashback: ${10 + i * 2} },`).join('\n')}
  ],`).join('\n')}
};

const LOCATIONS = {
  city: '${config.cities[0]}',
  state: '${config.name}',
  country: '${config.countries[0]}',
  areas: [
${config.cities.slice(0, 5).map((city, i) => `    { name: '${city}', coords: [${config.defaultCoordinates.longitude + (i * 0.01)}, ${config.defaultCoordinates.latitude + (i * 0.01)}], pincode: '${100000 + i}' },`).join('\n')}
  ],
};

async function seed${config.name}Stores() {
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
        region: '${config.id}',
        isActive: true,
        isFeatured: i < 2,
        cashbackPercentage: store.cashback,
        partnerLevel: store.cashback >= 15 ? 'gold' : 'silver',
        location: {
          address: \`\${Math.floor(Math.random() * 500) + 1}, \${area.name}\`,
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
    console.log(\`\\n🔄 Inserting \${storesToInsert.length} new stores...\`);
    await db!.collection('stores').insertMany(storesToInsert);
    console.log(\`✅ Inserted \${storesToInsert.length} stores for ${config.name}\`);
  }

  await mongoose.disconnect();
  console.log('\\n✅ Done!');
}

seed${config.name}Stores().catch(console.error);
`;
}

function generateSeedEvents(config: NewRegionConfig): string {
  return `
/**
 * Seed ${config.name} Events
 * Run with: npx ts-node src/scripts/seed${config.name}Events.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const EVENT_TEMPLATES = [
  {
    title: '${config.name} Tech Summit 2025',
    subtitle: 'Innovation Conference',
    description: 'Join industry leaders for a day of tech insights and networking.',
    category: 'Technology',
    tags: ['technology', 'conference', 'networking'],
    price: { amount: 150, currency: '${config.currency}', isFree: false },
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    venue: '${config.cities[0]} Convention Center',
    featured: true,
    cashback: 15,
  },
  {
    title: 'Live Music Festival',
    subtitle: 'Annual Music Celebration',
    description: 'Experience amazing live performances from top artists.',
    category: 'Music',
    tags: ['music', 'concert', 'live', 'festival'],
    price: { amount: 80, currency: '${config.currency}', isFree: false },
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
    venue: '${config.cities[0]} Arena',
    featured: true,
    cashback: 10,
  },
  {
    title: 'Food & Wine Festival',
    subtitle: 'Culinary Experience',
    description: 'Sample dishes from 50+ restaurants and enjoy live entertainment.',
    category: 'Food',
    tags: ['food', 'wine', 'festival', 'culinary'],
    price: { amount: 45, currency: '${config.currency}', isFree: false },
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    venue: '${config.cities[0]} Food Park',
    featured: false,
    cashback: 18,
  },
  {
    title: 'Wellness & Yoga Retreat',
    subtitle: 'Mind & Body Experience',
    description: 'A day of yoga, meditation, and wellness activities.',
    category: 'Wellness',
    tags: ['yoga', 'wellness', 'meditation', 'health'],
    price: { amount: 60, currency: '${config.currency}', isFree: false },
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    venue: 'Zen Gardens ${config.cities[0]}',
    featured: false,
    cashback: 12,
  },
  {
    title: 'Sports Championship Finals',
    subtitle: 'Season Finale',
    description: 'Watch the exciting championship finals live.',
    category: 'Sports',
    tags: ['sports', 'championship', 'live'],
    price: { amount: 75, currency: '${config.currency}', isFree: false },
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800',
    venue: '${config.cities[0]} Stadium',
    featured: true,
    cashback: 8,
  },
  {
    title: 'Comedy Night Special',
    subtitle: 'Stand-up Comedy Show',
    description: 'Laugh out loud with top comedians.',
    category: 'Entertainment',
    tags: ['comedy', 'standup', 'entertainment'],
    price: { amount: 35, currency: '${config.currency}', isFree: false },
    image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800',
    venue: 'Comedy Club ${config.cities[0]}',
    featured: false,
    cashback: 15,
  },
];

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getRandomFutureDate(daysAhead: number = 90): Date {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead) + 7);
  return date;
}

async function seed${config.name}Events() {
  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;

  const eventsToInsert: any[] = [];

  for (const template of EVENT_TEMPLATES) {
    const slug = generateSlug(template.title);

    // Check if event already exists
    const existing = await db!.collection('events').findOne({ slug });
    if (existing) {
      console.log(\`⏭️  Skipping \${template.title} (already exists)\`);
      continue;
    }

    eventsToInsert.push({
      title: template.title,
      subtitle: template.subtitle,
      slug,
      description: template.description,
      image: template.image,
      images: [template.image],
      price: template.price,
      location: {
        name: template.venue,
        address: template.venue,
        city: '${config.cities[0]}',
        state: '${config.name}',
        country: '${config.countries[0]}',
        isOnline: false,
      },
      date: getRandomFutureDate(),
      time: ['10:00', '14:00', '18:00', '20:00'][Math.floor(Math.random() * 4)],
      endTime: '23:00',
      category: template.category,
      tags: template.tags,
      organizer: {
        name: \`\${template.category} Events ${config.name}\`,
        email: 'events@${config.id}.rez.com',
      },
      featured: template.featured,
      priority: template.featured ? 10 : 5,
      status: 'published',
      isOnline: false,
      cashback: template.cashback,
      analytics: {
        views: Math.floor(Math.random() * 5000) + 500,
        bookings: Math.floor(Math.random() * 200) + 50,
        shares: Math.floor(Math.random() * 100),
        favorites: Math.floor(Math.random() * 300),
      },
      rating: {
        average: 3.5 + Math.random() * 1.5,
        count: Math.floor(Math.random() * 200) + 20,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  if (eventsToInsert.length > 0) {
    console.log(\`\\n🔄 Inserting \${eventsToInsert.length} new events...\`);
    await db!.collection('events').insertMany(eventsToInsert);
    console.log(\`✅ Inserted \${eventsToInsert.length} events for ${config.name}\`);
  }

  await mongoose.disconnect();
  console.log('\\n✅ Done!');
}

seed${config.name}Events().catch(console.error);
`;
}

// ============================================
// MAIN SCRIPT
// ============================================

async function generateRegionFiles(config: NewRegionConfig) {
  const outputDir = path.join(__dirname, '../../generated');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🌍 Generating files for region: ${config.name} (${config.id})`);
  console.log(`${'='.repeat(60)}\n`);

  // 1. Backend region config
  console.log('📁 1. BACKEND CONFIG (rez-backend/src/config/regions.ts)');
  console.log('   Add to RegionId type:');
  console.log(`   export type RegionId = 'bangalore' | 'dubai' | '${config.id}';`);
  console.log('\n   Add to REGIONS object:');
  console.log(generateBackendRegionConfig(config));
  console.log('\n   Add to getRegionFromCoordinates():');
  console.log(generateCoordinateDetection(config));

  // 2. Frontend region config
  console.log('\n📁 2. FRONTEND CONFIG (rez-frontend/contexts/RegionContext.tsx)');
  console.log('   Add to RegionId type:');
  console.log(`   export type RegionId = 'bangalore' | 'dubai' | '${config.id}';`);
  console.log('\n   Add to DEFAULT_CONFIGS:');
  console.log(generateFrontendRegionConfig(config));
  console.log('\n   Update isValidRegion():');
  console.log(`   return ['bangalore', 'dubai', '${config.id}'].includes(region);`);

  // 3. City mapping
  console.log('\n📁 3. CITY MAPPING (rez-backend/src/scripts/assignSubcategorySlugs.ts)');
  console.log('   Add to CITY_TO_REGION:');
  console.log(generateCityMapping(config));

  // 4. Generate seed scripts
  const storesSeedFile = path.join(outputDir, `seed${config.name}Stores.ts`);
  const eventsSeedFile = path.join(outputDir, `seed${config.name}Events.ts`);

  fs.writeFileSync(storesSeedFile, generateSeedStores(config));
  fs.writeFileSync(eventsSeedFile, generateSeedEvents(config));

  console.log(`\n📁 4. SEED SCRIPTS GENERATED`);
  console.log(`   ✅ ${storesSeedFile}`);
  console.log(`   ✅ ${eventsSeedFile}`);

  // 5. Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 NEXT STEPS:');
  console.log(`${'='.repeat(60)}`);
  console.log(`
1. Update rez-backend/src/config/regions.ts:
   - Add '${config.id}' to RegionId type
   - Add ${config.id} config to REGIONS object
   - Add coordinate detection for ${config.name}

2. Update rez-frontend/contexts/RegionContext.tsx:
   - Add '${config.id}' to RegionId type
   - Add ${config.id} config to DEFAULT_CONFIGS
   - Update isValidRegion() function

3. Update rez-backend/src/scripts/assignSubcategorySlugs.ts:
   - Add city-to-region mappings

4. Run seed scripts:
   npx ts-node ${storesSeedFile}
   npx ts-node ${eventsSeedFile}

5. Restart your servers and test!
`);
}

// ============================================
// INTERACTIVE MODE
// ============================================

async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log('\n🌍 ADD NEW REGION - Interactive Mode\n');
  console.log('Available sample regions:');
  Object.keys(SAMPLE_REGIONS).forEach((key, i) => {
    const region = SAMPLE_REGIONS[key];
    console.log(`  ${i + 1}. ${key} - ${region.displayName} (${region.currency})`);
  });
  console.log(`  ${Object.keys(SAMPLE_REGIONS).length + 1}. Custom - Enter your own region details\n`);

  const choice = await question('Select an option (number): ');
  const choiceNum = parseInt(choice);
  const regionKeys = Object.keys(SAMPLE_REGIONS);

  if (choiceNum > 0 && choiceNum <= regionKeys.length) {
    const selectedRegion = SAMPLE_REGIONS[regionKeys[choiceNum - 1]];
    await generateRegionFiles(selectedRegion);
  } else {
    console.log('\n📝 Enter custom region details:\n');

    const customRegion: NewRegionConfig = {
      id: await question('Region ID (lowercase, e.g., "singapore"): '),
      name: await question('Region Name (e.g., "Singapore"): '),
      displayName: await question('Display Name (e.g., "Singapore"): '),
      currency: await question('Currency Code (e.g., "SGD"): '),
      currencySymbol: await question('Currency Symbol (e.g., "S$"): '),
      locale: await question('Locale (e.g., "en-SG"): '),
      timezone: await question('Timezone (e.g., "Asia/Singapore"): '),
      countryCode: await question('Country Code (e.g., "SG"): '),
      countries: (await question('Countries (comma-separated, e.g., "Singapore,SG,SGP"): ')).split(',').map(s => s.trim()),
      defaultCoordinates: {
        longitude: parseFloat(await question('Default Longitude: ')),
        latitude: parseFloat(await question('Default Latitude: ')),
      },
      coordinateBounds: {
        minLng: parseFloat(await question('Min Longitude: ')),
        maxLng: parseFloat(await question('Max Longitude: ')),
        minLat: parseFloat(await question('Min Latitude: ')),
        maxLat: parseFloat(await question('Max Latitude: ')),
      },
      cities: (await question('Cities (comma-separated): ')).split(',').map(s => s.trim()),
      deliveryRadius: parseInt(await question('Delivery Radius (km): ')) || 15,
    };

    await generateRegionFiles(customRegion);
  }

  rl.close();
}

// Run the script
// To use a specific sample region, uncomment one of these:
// generateRegionFiles(SAMPLE_REGIONS.singapore);
// generateRegionFiles(SAMPLE_REGIONS.london);
// generateRegionFiles(SAMPLE_REGIONS.newyork);

// Or run in interactive mode:
interactiveMode().catch(console.error);
