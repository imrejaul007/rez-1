/**
 * Seed Missing Subcategory Stores
 * Adds stores for subcategories that are empty or have limited data:
 * - Home Delivery: cloud-kitchens, pharmacies, pet-stores
 * - Services: ac-repair, cleaning, more salons/spa
 *
 * Run with: npx ts-node src/scripts/seedMissingSubcategories.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Location data for each region
const LOCATIONS = {
  bangalore: {
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    areas: [
      { name: 'Koramangala', coords: [77.6101, 12.9352], pincode: '560034' },
      { name: 'Indiranagar', coords: [77.6411, 12.9719], pincode: '560038' },
      { name: 'HSR Layout', coords: [77.6245, 12.9116], pincode: '560102' },
      { name: 'Whitefield', coords: [77.7499, 12.9698], pincode: '560066' },
      { name: 'Jayanagar', coords: [77.5826, 12.9307], pincode: '560041' },
      { name: 'Malleshwaram', coords: [77.5726, 13.0035], pincode: '560003' },
      { name: 'JP Nagar', coords: [77.5826, 12.8912], pincode: '560078' },
      { name: 'BTM Layout', coords: [77.6152, 12.9166], pincode: '560076' },
      { name: 'Electronic City', coords: [77.6700, 12.8395], pincode: '560100' },
      { name: 'MG Road', coords: [77.6070, 12.9758], pincode: '560001' },
    ],
  },
  dubai: {
    city: 'Dubai',
    state: 'Dubai',
    country: 'UAE',
    areas: [
      { name: 'Downtown Dubai', coords: [55.2744, 25.1972], pincode: '00000' },
      { name: 'Dubai Marina', coords: [55.1337, 25.0805], pincode: '00000' },
      { name: 'Jumeirah', coords: [55.2328, 25.2048], pincode: '00000' },
      { name: 'Deira', coords: [55.3273, 25.2697], pincode: '00000' },
      { name: 'Business Bay', coords: [55.2614, 25.1850], pincode: '00000' },
      { name: 'Al Barsha', coords: [55.2006, 25.1124], pincode: '00000' },
      { name: 'JBR', coords: [55.1350, 25.0772], pincode: '00000' },
      { name: 'DIFC', coords: [55.2819, 25.2100], pincode: '00000' },
    ],
  },
};

// Store templates for missing subcategories
const STORE_TEMPLATES = {
  // Cloud Kitchens - Home Delivery
  'cloud-kitchens': {
    bangalore: [
      { name: 'Rebel Foods Kitchen', description: 'Multi-brand cloud kitchen - Faasos, Behrouz, Oven Story', tags: ['cloud-kitchen', 'multi-brand', 'delivery-only'], cashback: 20 },
      { name: 'Box8 Kitchen', description: 'Fresh meals delivered hot', tags: ['cloud-kitchen', 'meals', 'indian'], cashback: 18 },
      { name: 'FreshMenu', description: 'Chef-prepared fresh meals', tags: ['cloud-kitchen', 'fresh', 'healthy'], cashback: 15 },
      { name: 'Biryani By Kilo Kitchen', description: 'Authentic dum biryani delivery', tags: ['cloud-kitchen', 'biryani', 'delivery-only'], cashback: 12 },
      { name: 'The Good Bowl', description: 'Healthy bowl meals', tags: ['cloud-kitchen', 'healthy', 'bowls'], cashback: 15 },
      { name: 'Homely Kitchen', description: 'Home-style comfort food', tags: ['cloud-kitchen', 'homestyle', 'comfort-food'], cashback: 18 },
    ],
    dubai: [
      { name: 'Kitopi Kitchen', description: 'Multi-brand cloud kitchen hub', tags: ['cloud-kitchen', 'multi-brand', 'delivery-only'], cashback: 15 },
      { name: 'Sweetheart Kitchen', description: 'Desserts and sweets delivery', tags: ['cloud-kitchen', 'desserts', 'sweets'], cashback: 12 },
      { name: 'The Meatless Kitchen', description: 'Plant-based meal delivery', tags: ['cloud-kitchen', 'vegan', 'healthy'], cashback: 18 },
      { name: 'Grub Kitchen Dubai', description: 'International cuisine delivery', tags: ['cloud-kitchen', 'international', 'delivery-only'], cashback: 15 },
    ],
  },

  // Pharmacies - Home Delivery
  pharmacies: {
    bangalore: [
      { name: 'Apollo Pharmacy', description: 'Trusted pharmacy chain with home delivery', tags: ['pharmacy', 'medicine', 'healthcare'], cashback: 10 },
      { name: 'MedPlus', description: 'Affordable medicines and healthcare products', tags: ['pharmacy', 'medicine', 'affordable'], cashback: 8 },
      { name: 'Netmeds Store', description: 'Online pharmacy with express delivery', tags: ['pharmacy', 'online', 'delivery'], cashback: 15 },
      { name: 'PharmEasy Pickup', description: 'Medicines at discounted prices', tags: ['pharmacy', 'discount', 'healthcare'], cashback: 20 },
      { name: '1mg Store', description: 'Healthcare products and medicines', tags: ['pharmacy', 'healthcare', 'wellness'], cashback: 18 },
      { name: 'Wellness Forever', description: 'Health and wellness store', tags: ['pharmacy', 'wellness', 'health'], cashback: 12 },
    ],
    dubai: [
      { name: 'Aster Pharmacy', description: 'Leading pharmacy chain in UAE', tags: ['pharmacy', 'medicine', 'healthcare'], cashback: 8 },
      { name: 'Boots Pharmacy', description: 'Health and beauty pharmacy', tags: ['pharmacy', 'beauty', 'health'], cashback: 10 },
      { name: 'Life Pharmacy', description: 'Comprehensive healthcare solutions', tags: ['pharmacy', 'healthcare', 'wellness'], cashback: 12 },
      { name: 'BinSina Pharmacy', description: 'Trusted UAE pharmacy chain', tags: ['pharmacy', 'medicine', 'trusted'], cashback: 10 },
    ],
  },

  // Pet Stores - Home Delivery
  'pet-stores': {
    bangalore: [
      { name: 'Heads Up For Tails', description: 'Premium pet products and accessories', tags: ['pet-store', 'premium', 'accessories'], cashback: 15 },
      { name: 'Petsy', description: 'Online pet supplies store', tags: ['pet-store', 'online', 'supplies'], cashback: 18 },
      { name: 'Supertails', description: 'Pet food and healthcare', tags: ['pet-store', 'food', 'healthcare'], cashback: 20 },
      { name: 'PetKonnect', description: 'Pet accessories and grooming products', tags: ['pet-store', 'grooming', 'accessories'], cashback: 12 },
      { name: 'Just Dogs', description: 'Everything for your furry friend', tags: ['pet-store', 'dogs', 'supplies'], cashback: 15 },
    ],
    dubai: [
      { name: 'Pet Zone', description: 'Complete pet care solutions', tags: ['pet-store', 'pet-care', 'supplies'], cashback: 12 },
      { name: 'Petsville', description: 'Pet supplies and accessories', tags: ['pet-store', 'accessories', 'food'], cashback: 15 },
      { name: 'Dubai Pet Food', description: 'Premium pet nutrition', tags: ['pet-store', 'food', 'premium'], cashback: 10 },
      { name: 'Paws & Claws', description: 'Pet boutique and supplies', tags: ['pet-store', 'boutique', 'premium'], cashback: 18 },
    ],
  },

  // AC Repair - Services
  'ac-repair': {
    bangalore: [
      { name: 'Urban Company AC Services', description: 'Professional AC repair and maintenance', tags: ['ac-repair', 'maintenance', 'professional'], cashback: 25 },
      { name: 'Housejoy AC Repair', description: 'Quick AC servicing at your doorstep', tags: ['ac-repair', 'servicing', 'doorstep'], cashback: 20 },
      { name: 'Mr Right AC Services', description: 'Expert AC installation and repair', tags: ['ac-repair', 'installation', 'expert'], cashback: 18 },
      { name: 'UrbanClap AC Experts', description: 'Verified AC technicians', tags: ['ac-repair', 'verified', 'technicians'], cashback: 22 },
      { name: 'Jeeves AC Care', description: 'Premium AC maintenance services', tags: ['ac-repair', 'premium', 'maintenance'], cashback: 15 },
    ],
    dubai: [
      { name: 'AC Master Dubai', description: 'Expert AC repair services', tags: ['ac-repair', 'expert', 'repair'], cashback: 15 },
      { name: 'Cool Tech Services', description: 'AC installation and maintenance', tags: ['ac-repair', 'installation', 'maintenance'], cashback: 12 },
      { name: 'ServiceMarket AC', description: 'On-demand AC services', tags: ['ac-repair', 'on-demand', 'professional'], cashback: 18 },
      { name: 'Hitches & Glitches', description: 'Home maintenance including AC', tags: ['ac-repair', 'home-maintenance', 'reliable'], cashback: 20 },
    ],
  },

  // Cleaning Services - Services
  cleaning: {
    bangalore: [
      { name: 'Urban Company Cleaning', description: 'Professional home cleaning services', tags: ['cleaning', 'home-cleaning', 'professional'], cashback: 25 },
      { name: 'Housejoy Deep Clean', description: 'Deep cleaning and sanitization', tags: ['cleaning', 'deep-clean', 'sanitization'], cashback: 20 },
      { name: 'Helper4U', description: 'Affordable cleaning services', tags: ['cleaning', 'affordable', 'domestic'], cashback: 15 },
      { name: 'Cleanflo', description: 'Eco-friendly cleaning solutions', tags: ['cleaning', 'eco-friendly', 'green'], cashback: 18 },
      { name: 'BookMyBai', description: 'Domestic help and cleaning', tags: ['cleaning', 'domestic-help', 'maid-service'], cashback: 12 },
      { name: 'Mr Right Cleaning', description: 'Home and office cleaning', tags: ['cleaning', 'office', 'home'], cashback: 15 },
    ],
    dubai: [
      { name: 'Justlife Cleaning', description: 'Professional cleaning services', tags: ['cleaning', 'professional', 'home-cleaning'], cashback: 20 },
      { name: 'ServiceMarket Clean', description: 'Trusted cleaning professionals', tags: ['cleaning', 'trusted', 'verified'], cashback: 18 },
      { name: 'Helpling Dubai', description: 'On-demand home cleaning', tags: ['cleaning', 'on-demand', 'flexible'], cashback: 15 },
      { name: 'Fantastic Services', description: 'Complete home cleaning solutions', tags: ['cleaning', 'complete', 'professional'], cashback: 22 },
    ],
  },

  // Additional Salons - Services
  salons: {
    bangalore: [
      { name: 'Looks Salon', description: 'Unisex hair and beauty salon', tags: ['salon', 'unisex', 'beauty'], cashback: 20 },
      { name: 'Juice Salon', description: 'Trendy hair styling salon', tags: ['salon', 'hair', 'trendy'], cashback: 18 },
      { name: 'Toni&Guy', description: 'International hairdressing brand', tags: ['salon', 'premium', 'international'], cashback: 15 },
      { name: 'Naturals Salon', description: 'Beauty and wellness services', tags: ['salon', 'beauty', 'wellness'], cashback: 18 },
    ],
    dubai: [
      { name: 'Tips & Toes', description: 'Premium beauty salon', tags: ['salon', 'premium', 'beauty'], cashback: 15 },
      { name: 'Sisters Beauty Lounge', description: 'Ladies salon and spa', tags: ['salon', 'ladies', 'spa'], cashback: 18 },
      { name: 'N.Bar', description: 'Nail art and beauty lounge', tags: ['salon', 'nails', 'beauty'], cashback: 20 },
      { name: 'The Grooming Company', description: 'Men\'s grooming salon', tags: ['salon', 'mens', 'grooming'], cashback: 15 },
    ],
  },

  // Additional Spa & Wellness - Services
  'spa-wellness': {
    bangalore: [
      { name: 'O2 Spa', description: 'Relaxing spa treatments', tags: ['spa', 'wellness', 'relaxation'], cashback: 25 },
      { name: 'Four Fountains Spa', description: 'Ayurvedic spa treatments', tags: ['spa', 'ayurvedic', 'wellness'], cashback: 20 },
      { name: 'Tattva Spa', description: 'Holistic wellness spa', tags: ['spa', 'holistic', 'wellness'], cashback: 18 },
      { name: 'Anytime Fitness', description: '24/7 fitness center', tags: ['gym', 'fitness', '24x7'], cashback: 15 },
    ],
    dubai: [
      { name: 'Talise Spa', description: 'Luxury spa experience', tags: ['spa', 'luxury', 'wellness'], cashback: 15 },
      { name: 'SensAsia Urban Spa', description: 'Asian-inspired spa treatments', tags: ['spa', 'asian', 'wellness'], cashback: 18 },
      { name: 'Fitness First', description: 'Premium fitness club', tags: ['gym', 'fitness', 'premium'], cashback: 12 },
      { name: 'GymNation', description: 'Affordable 24/7 gym', tags: ['gym', 'fitness', 'affordable'], cashback: 20 },
    ],
  },
};

// Image URLs for different subcategories
const IMAGES = {
  'cloud-kitchens': [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
    'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800',
    'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=800',
  ],
  pharmacies: [
    'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800',
    'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800',
    'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800',
  ],
  'pet-stores': [
    'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800',
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800',
  ],
  'ac-repair': [
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
    'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800',
    'https://images.unsplash.com/photo-1631545806609-35dcea594948?w=800',
  ],
  cleaning: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
    'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800',
    'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800',
  ],
  salons: [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
    'https://images.unsplash.com/photo-1633681122704-a6e4e6298b4b?w=800',
  ],
  'spa-wellness': [
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
  ],
};

function generateSlug(name: string, area: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${area.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

async function seedMissingSubcategories() {
  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;

  console.log('\n📊 Current subcategorySlug distribution:');
  const beforeDist = await db!.collection('stores').aggregate([
    { $group: { _id: '$subcategorySlug', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  beforeDist.forEach(item => console.log(`  ${item._id || 'null'}: ${item.count}`));

  const storesToInsert: any[] = [];
  let storeIndex = 0;

  // Process each subcategory
  for (const [subcategorySlug, regionStores] of Object.entries(STORE_TEMPLATES)) {
    console.log(`\n📦 Processing ${subcategorySlug}...`);

    for (const [region, stores] of Object.entries(regionStores)) {
      const locationData = LOCATIONS[region as keyof typeof LOCATIONS];
      const images = IMAGES[subcategorySlug as keyof typeof IMAGES] || [];

      for (let i = 0; i < stores.length; i++) {
        const store = stores[i];
        const area = locationData.areas[i % locationData.areas.length];
        const slug = generateSlug(store.name, area.name);

        // Check if store already exists
        const existing = await db!.collection('stores').findOne({ slug });
        if (existing) {
          console.log(`  ⏭️  Skipping ${store.name} (already exists)`);
          continue;
        }

        const storeDoc = {
          name: store.name,
          slug,
          description: store.description,
          tags: store.tags,
          subcategorySlug,
          region,
          isActive: true,
          isFeatured: i < 2, // First 2 stores are featured
          cashbackPercentage: store.cashback,
          partnerLevel: store.cashback >= 20 ? 'platinum' : store.cashback >= 15 ? 'gold' : 'silver',
          location: {
            address: `${Math.floor(Math.random() * 500) + 1}, ${area.name}`,
            area: area.name,
            city: locationData.city,
            state: locationData.state,
            country: locationData.country,
            pincode: area.pincode,
            coordinates: {
              type: 'Point',
              coordinates: [
                area.coords[0] + (Math.random() - 0.5) * 0.01,
                area.coords[1] + (Math.random() - 0.5) * 0.01,
              ],
            },
          },
          images: {
            logo: images[i % images.length] || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400',
            cover: images[(i + 1) % images.length] || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800',
            gallery: images,
          },
          ratings: {
            average: 3.8 + Math.random() * 1.2,
            count: Math.floor(Math.random() * 500) + 50,
          },
          operatingHours: {
            monday: { open: '09:00', close: '21:00', isOpen: true },
            tuesday: { open: '09:00', close: '21:00', isOpen: true },
            wednesday: { open: '09:00', close: '21:00', isOpen: true },
            thursday: { open: '09:00', close: '21:00', isOpen: true },
            friday: { open: '09:00', close: '21:00', isOpen: true },
            saturday: { open: '10:00', close: '20:00', isOpen: true },
            sunday: { open: '10:00', close: '18:00', isOpen: true },
          },
          contact: {
            phone: region === 'dubai' ? '+971-4-XXX-XXXX' : '+91-80-XXXX-XXXX',
            email: `contact@${slug.split('-')[0]}.com`,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        storesToInsert.push(storeDoc);
        storeIndex++;
      }
    }
  }

  if (storesToInsert.length > 0) {
    console.log(`\n🔄 Inserting ${storesToInsert.length} new stores...`);
    await db!.collection('stores').insertMany(storesToInsert);
    console.log(`✅ Inserted ${storesToInsert.length} stores`);
  } else {
    console.log('\n✅ No new stores to insert (all already exist)');
  }

  // Show final distribution
  console.log('\n📊 Final subcategorySlug distribution:');
  const afterDist = await db!.collection('stores').aggregate([
    { $group: { _id: '$subcategorySlug', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  afterDist.forEach(item => console.log(`  ${item._id || 'null'}: ${item.count}`));

  // Show by region
  console.log('\n🌍 Distribution by region and subcategory:');
  const regionDist = await db!.collection('stores').aggregate([
    { $match: { subcategorySlug: { $ne: null } } },
    { $group: { _id: { region: '$region', slug: '$subcategorySlug' }, count: { $sum: 1 } } },
    { $sort: { '_id.region': 1, count: -1 } }
  ]).toArray();

  const regionSummary: Record<string, Record<string, number>> = {};
  for (const item of regionDist) {
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

seedMissingSubcategories().catch(console.error);
