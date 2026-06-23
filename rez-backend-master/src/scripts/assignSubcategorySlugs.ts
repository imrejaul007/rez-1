/**
 * Assign Subcategory Slugs to Existing Stores
 * This script updates existing stores with proper subcategorySlug values
 * based on their category, tags, and name - WITHOUT deleting any data
 *
 * Run with: npx ts-node src/scripts/assignSubcategorySlugs.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Subcategory slug mappings for each section
const SUBCATEGORY_MAPPINGS = {
  // Going Out section
  goingOut: {
    cafes: ['cafe', 'coffee', 'tea', 'bakery', 'dessert', 'ice-cream'],
    'family-restaurants': ['restaurant', 'food', 'dining', 'biryani', 'south-indian', 'north-indian', 'chinese', 'italian', 'continental', 'multi-cuisine'],
    'fine-dining': ['fine-dining', 'luxury-dining', 'michelin'],
    'qsr-fast-food': ['fast-food', 'qsr', 'burger', 'pizza', 'quick-bites', 'quick-service'],
  },
  // Home Delivery section
  homeDelivery: {
    'cloud-kitchens': ['cloud-kitchen', 'delivery-only', 'virtual-kitchen'],
    supermarkets: ['grocery', 'supermarket', 'hypermarket', 'essentials', 'household'],
    pharmacies: ['pharmacy', 'medical', 'medicine', 'health'],
    'pet-stores': ['pet', 'pet-store', 'pet-supplies'],
  },
  // Services section
  services: {
    'ac-repair': ['ac-repair', 'appliance-repair', 'electronics-repair'],
    salons: ['salon', 'beauty', 'haircut', 'spa', 'wellness', 'unisex'],
    cleaning: ['cleaning', 'laundry', 'dry-cleaning', 'home-services'],
    'spa-wellness': ['spa', 'wellness', 'massage', 'ayurveda', 'fitness', 'gym'],
  },
};

// Store name patterns for more accurate matching
// Order matters - more specific patterns should come first
const NAME_PATTERNS: Record<string, string> = {
  // Ice cream shops (must come before "naturals" salon pattern)
  'naturals ice cream': 'cafes',
  'baskin robbins': 'cafes',
  'häagen-dazs': 'cafes',
  'cream stone': 'cafes',

  // Fast food chains -> qsr-fast-food (including all burger/pizza chains)
  'dominos': 'qsr-fast-food',
  'domino\'s': 'qsr-fast-food',
  'kfc': 'qsr-fast-food',
  'mcdonalds': 'qsr-fast-food',
  'mcdonald\'s': 'qsr-fast-food',
  'subway': 'qsr-fast-food',
  'burger king': 'qsr-fast-food',
  'pizza hut': 'qsr-fast-food',
  'wendys': 'qsr-fast-food',
  'wendy\'s': 'qsr-fast-food',
  'carl\'s jr': 'qsr-fast-food',
  'carls jr': 'qsr-fast-food',
  'shake shack': 'qsr-fast-food',
  'five guys': 'qsr-fast-food',
  'taco bell': 'qsr-fast-food',
  'papa johns': 'qsr-fast-food',
  'oven story': 'qsr-fast-food',
  'faasos': 'qsr-fast-food',
  'box8': 'qsr-fast-food',
  'behrouz': 'qsr-fast-food',
  'wow momo': 'qsr-fast-food',
  'mojo pizza': 'qsr-fast-food',

  // Cafes
  'starbucks': 'cafes',
  'coffee bean': 'cafes',
  'third wave': 'cafes',
  'blue tokai': 'cafes',
  'chaayos': 'cafes',
  'cafe coffee day': 'cafes',
  'costa coffee': 'cafes',
  'barista': 'cafes',
  'matteo': 'cafes',
  'dyu art cafe': 'cafes',
  'prithvi cafe': 'cafes',
  'theobroma': 'cafes',
  'leopold cafe': 'cafes',
  'tim hortons': 'cafes',
  'dunkin': 'cafes',
  'krispy kreme': 'cafes',

  // Fine dining
  'indian accent': 'fine-dining',
  'bukhara': 'fine-dining',
  'wasabi': 'fine-dining',
  'le cirque': 'fine-dining',
  'zodiac grill': 'fine-dining',
  'masala library': 'fine-dining',
  'jamavar': 'fine-dining',

  // Restaurants -> family-restaurants
  'toit': 'family-restaurants',
  'ctr': 'family-restaurants',
  'vidyarthi': 'family-restaurants',
  'meghana': 'family-restaurants',
  'empire': 'family-restaurants',
  'britannia': 'family-restaurants',
  'bastian': 'family-restaurants',
  'sodabottleopenerwala': 'family-restaurants',
  'haldirams': 'family-restaurants',
  'bikanervala': 'family-restaurants',
  'paradise biryani': 'family-restaurants',
  'paradise': 'family-restaurants',
  'saravana bhavan': 'family-restaurants',
  'barbeque nation': 'family-restaurants',
  'absolute barbeque': 'family-restaurants',
  'mainland china': 'family-restaurants',
  'punjab grill': 'family-restaurants',
  'olive': 'family-restaurants',
  'the table': 'family-restaurants',

  // Supermarkets/Grocery
  'big bazaar': 'supermarkets',
  'd-mart': 'supermarkets',
  'dmart': 'supermarkets',
  'more supermarket': 'supermarkets',
  'star bazaar': 'supermarkets',
  'bigbasket': 'supermarkets',
  'natures basket': 'supermarkets',
  'reliance fresh': 'supermarkets',
  'spar': 'supermarkets',
  'spinneys': 'supermarkets',
  'carrefour': 'supermarkets',
  'lulu': 'supermarkets',
  'hypermarket': 'supermarkets',
  'organic world': 'supermarkets',

  // Salons (more specific patterns)
  'lakme salon': 'salons',
  'vlcc': 'salons',
  'naturals salon': 'salons',
  'green trends': 'salons',
  'jean-claude': 'salons',
  'jawed habib': 'salons',
  'tips & toes': 'salons',
  'enrich salon': 'salons',
  'bodycraft': 'salons',

  // Fitness/Spa -> spa-wellness
  'golds gym': 'spa-wellness',
  'gold\'s gym': 'spa-wellness',
  'cult.fit': 'spa-wellness',
  'cultfit': 'spa-wellness',
  'talwalkars': 'spa-wellness',
  'anytime fitness': 'spa-wellness',
  'fitness first': 'spa-wellness',
  'o2 spa': 'spa-wellness',
  'tattva spa': 'spa-wellness',
};

// Category to subcategory mapping (fallback)
const CATEGORY_FALLBACK: Record<string, string> = {
  'cafe': 'cafes',
  'coffee': 'cafes',
  'food': 'family-restaurants',
  'restaurant': 'family-restaurants',
  'grocery': 'supermarkets',
  'supermarket': 'supermarkets',
  'salon': 'salons',
  'beauty': 'salons',
  'fitness': 'spa-wellness',
  'gym': 'spa-wellness',
  'spa': 'spa-wellness',
  'pharmacy': 'pharmacies',
  // Electronics and fashion don't fit any section - will be skipped
};

// Region mapping based on city
const CITY_TO_REGION: Record<string, string> = {
  // India - Bangalore region
  'bangalore': 'bangalore',
  'bengaluru': 'bangalore',
  'mysore': 'bangalore',
  'mangalore': 'bangalore',
  // India - other cities (treat as bangalore for now)
  'mumbai': 'bangalore',
  'delhi': 'bangalore',
  'chennai': 'bangalore',
  'hyderabad': 'bangalore',
  'pune': 'bangalore',
  'kolkata': 'bangalore',
  // UAE - Dubai region
  'dubai': 'dubai',
  'abu dhabi': 'dubai',
  'sharjah': 'dubai',
  'ajman': 'dubai',
};

function determineRegion(city: string | undefined): string {
  if (!city) return 'bangalore'; // Default to Bangalore
  const normalizedCity = city.toLowerCase().trim();
  return CITY_TO_REGION[normalizedCity] || 'bangalore';
}

function determineSubcategorySlug(store: any): string | null {
  const name = (store.name || '').toLowerCase();
  const category = (store.category?.name || store.categoryName || '').toLowerCase();
  const tags = (store.tags || []).map((t: string) => t.toLowerCase());

  // 1. First check name patterns (most accurate)
  for (const [pattern, slug] of Object.entries(NAME_PATTERNS)) {
    if (name.includes(pattern)) {
      return slug;
    }
  }

  // 2. Check tags for specific keywords
  for (const [section, slugMappings] of Object.entries(SUBCATEGORY_MAPPINGS)) {
    for (const [slug, keywords] of Object.entries(slugMappings)) {
      for (const keyword of keywords) {
        if (tags.includes(keyword)) {
          return slug;
        }
      }
    }
  }

  // 3. Use category fallback
  if (CATEGORY_FALLBACK[category]) {
    const fallbackSlug = CATEGORY_FALLBACK[category];
    // Skip electronics as they don't fit any section
    if (fallbackSlug !== 'qsr-fast-food' || category !== 'electronics') {
      return fallbackSlug;
    }
  }

  // 4. Check category name against slug mappings
  for (const [section, slugMappings] of Object.entries(SUBCATEGORY_MAPPINGS)) {
    for (const [slug, keywords] of Object.entries(slugMappings)) {
      for (const keyword of keywords) {
        if (category.includes(keyword)) {
          return slug;
        }
      }
    }
  }

  return null;
}

async function assignSubcategorySlugs() {
  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;

  console.log('\n📊 Current subcategorySlug distribution:');
  const beforeDist = await db!.collection('stores').aggregate([
    { $group: { _id: '$subcategorySlug', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  beforeDist.forEach(item => console.log(`  ${item._id || 'null'}: ${item.count}`));

  // Get all stores
  const stores = await db!.collection('stores').find({}).toArray();
  console.log(`\n📦 Found ${stores.length} stores to process`);

  const updates: { id: any; slug: string | null; region: string; name: string; city: string }[] = [];
  const skipped: { name: string; category: string; tags: string[] }[] = [];

  for (const store of stores) {
    const slug = determineSubcategorySlug(store);
    const city = store.location?.city || '';
    const region = determineRegion(city);

    // Always update region, optionally update subcategorySlug
    updates.push({ id: store._id, slug, region, name: store.name, city });

    if (!slug) {
      skipped.push({
        name: store.name,
        category: store.category?.name || 'unknown',
        tags: store.tags || []
      });
    }
  }

  const withSlug = updates.filter(u => u.slug !== null);
  console.log(`\n✅ Will update ${updates.length} stores with region field`);
  console.log(`✅ Will update ${withSlug.length} stores with subcategorySlug`);
  console.log(`⏭️  ${skipped.length} stores have no matching subcategory (but will get region)\n`);

  // Group updates by slug for summary
  const slugGroups: Record<string, string[]> = {};
  for (const update of updates) {
    if (update.slug) {
      if (!slugGroups[update.slug]) {
        slugGroups[update.slug] = [];
      }
      slugGroups[update.slug].push(update.name);
    }
  }

  console.log('📋 Update summary by subcategory:');
  for (const [slug, names] of Object.entries(slugGroups)) {
    console.log(`  ${slug}: ${names.length} stores`);
    names.slice(0, 3).forEach(n => console.log(`    - ${n}`));
    if (names.length > 3) console.log(`    ... and ${names.length - 3} more`);
  }

  // Group by region for summary
  const regionGroups: Record<string, number> = {};
  for (const update of updates) {
    regionGroups[update.region] = (regionGroups[update.region] || 0) + 1;
  }
  console.log('\n📋 Update summary by region:');
  for (const [region, count] of Object.entries(regionGroups)) {
    console.log(`  ${region}: ${count} stores`);
  }

  // Perform updates
  console.log('\n🔄 Applying updates...');
  let updateCount = 0;

  for (const update of updates) {
    const setFields: any = { region: update.region };
    if (update.slug) {
      setFields.subcategorySlug = update.slug;
    }

    await db!.collection('stores').updateOne(
      { _id: update.id },
      { $set: setFields }
    );
    updateCount++;
  }

  console.log(`✅ Updated ${updateCount} stores with region field`);

  // Show skipped stores
  if (skipped.length > 0 && skipped.length <= 20) {
    console.log('\n⏭️  Skipped stores (no section match):');
    skipped.forEach(s => console.log(`  - ${s.name} (${s.category}) [${s.tags.join(', ')}]`));
  }

  // Verify final distribution
  console.log('\n📊 Final subcategorySlug distribution:');
  const afterDist = await db!.collection('stores').aggregate([
    { $group: { _id: '$subcategorySlug', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  afterDist.forEach(item => console.log(`  ${item._id || 'null'}: ${item.count}`));

  // Show distribution by city
  console.log('\n🌍 Distribution by city and subcategory:');
  const cityDist = await db!.collection('stores').aggregate([
    { $match: { subcategorySlug: { $ne: null } } },
    { $group: { _id: { city: '$location.city', slug: '$subcategorySlug' }, count: { $sum: 1 } } },
    { $sort: { '_id.city': 1, count: -1 } }
  ]).toArray();

  const citySummary: Record<string, Record<string, number>> = {};
  for (const item of cityDist) {
    const city = item._id.city || 'Unknown';
    const slug = item._id.slug;
    if (!citySummary[city]) citySummary[city] = {};
    citySummary[city][slug] = item.count;
  }

  for (const [city, slugs] of Object.entries(citySummary)) {
    console.log(`  ${city}:`);
    for (const [slug, count] of Object.entries(slugs)) {
      console.log(`    - ${slug}: ${count}`);
    }
  }

  // Show region distribution
  console.log('\n🌍 Final region distribution:');
  const regionDist = await db!.collection('stores').aggregate([
    { $group: { _id: '$region', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  regionDist.forEach(item => console.log(`  ${item._id || 'null'}: ${item.count}`));

  // Show region + subcategory distribution
  console.log('\n🌍 Distribution by region and subcategory:');
  const regionSlugDist = await db!.collection('stores').aggregate([
    { $match: { subcategorySlug: { $ne: null } } },
    { $group: { _id: { region: '$region', slug: '$subcategorySlug' }, count: { $sum: 1 } } },
    { $sort: { '_id.region': 1, count: -1 } }
  ]).toArray();

  const regionSummary: Record<string, Record<string, number>> = {};
  for (const item of regionSlugDist) {
    const region = item._id.region || 'Unknown';
    const slug = item._id.slug;
    if (!regionSummary[region]) regionSummary[region] = {};
    regionSummary[region][slug] = item.count;
  }

  for (const [region, slugs] of Object.entries(regionSummary)) {
    console.log(`  ${region}:`);
    for (const [slug, count] of Object.entries(slugs)) {
      console.log(`    - ${slug}: ${count}`);
    }
  }

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

assignSubcategorySlugs().catch(console.error);
