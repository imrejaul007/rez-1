/**
 * Seed Region-specific Events
 * Adds events for both Bangalore and Dubai with proper currency codes
 * Also fixes existing events with ₹ symbol to use 'INR' code
 *
 * Run with: npx ts-node src/scripts/seedRegionEvents.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Event templates for each region
const EVENT_TEMPLATES = {
  bangalore: [
    {
      title: 'Bangalore Tech Summit 2025',
      subtitle: 'India\'s Largest Tech Conference',
      description: 'Join industry leaders, innovators, and tech enthusiasts for a day of insights, networking, and learning. Featuring keynotes from top tech CEOs and hands-on workshops.',
      category: 'Technology',
      tags: ['technology', 'conference', 'networking', 'innovation'],
      price: { amount: 2999, currency: 'INR', isFree: false },
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
      venue: { name: 'Bangalore International Exhibition Centre', area: 'Tumkur Road' },
      featured: true,
      cashback: 15,
    },
    {
      title: 'Diljit Dosanjh Live Concert',
      subtitle: 'Dil-Luminati India Tour',
      description: 'Experience the magic of Diljit Dosanjh live in Bangalore. An unforgettable night of music, energy, and entertainment.',
      category: 'Music',
      tags: ['music', 'concert', 'live', 'punjabi'],
      price: { amount: 4999, currency: 'INR', isFree: false },
      image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
      venue: { name: 'Jawaharlal Nehru Stadium', area: 'Koramangala' },
      featured: true,
      cashback: 10,
    },
    {
      title: 'Startup Pitch Day',
      subtitle: 'Pitch to Top VCs',
      description: 'Present your startup to India\'s leading venture capitalists. Network with fellow founders and get funding for your idea.',
      category: 'Business',
      tags: ['startup', 'pitch', 'venture-capital', 'networking'],
      price: { amount: 999, currency: 'INR', isFree: false },
      image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
      venue: { name: '91springboard', area: 'Koramangala' },
      featured: false,
      cashback: 20,
    },
    {
      title: 'Yoga & Wellness Retreat',
      subtitle: 'Weekend Rejuvenation',
      description: 'Escape the city hustle with a 2-day yoga retreat. Includes meditation sessions, organic meals, and nature walks.',
      category: 'Wellness',
      tags: ['yoga', 'wellness', 'meditation', 'health'],
      price: { amount: 3499, currency: 'INR', isFree: false },
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
      venue: { name: 'Art of Living Ashram', area: 'Kanakapura Road' },
      featured: false,
      cashback: 12,
    },
    {
      title: 'IPL Match: RCB vs CSK',
      subtitle: 'Season Opener',
      description: 'Watch the epic rivalry unfold live at M. Chinnaswamy Stadium. Royal Challengers Bangalore takes on Chennai Super Kings.',
      category: 'Sports',
      tags: ['cricket', 'ipl', 'sports', 'rcb'],
      price: { amount: 1999, currency: 'INR', isFree: false },
      image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800',
      venue: { name: 'M. Chinnaswamy Stadium', area: 'MG Road' },
      featured: true,
      cashback: 8,
    },
    {
      title: 'Food & Wine Festival',
      subtitle: 'Culinary Delights',
      description: 'Sample dishes from 50+ restaurants, attend cooking demos, and enjoy live music. A foodie\'s paradise!',
      category: 'Food',
      tags: ['food', 'wine', 'festival', 'culinary'],
      price: { amount: 799, currency: 'INR', isFree: false },
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
      venue: { name: 'UB City', area: 'Vittal Mallya Road' },
      featured: false,
      cashback: 15,
    },
    {
      title: 'Comedy Night with Zakir Khan',
      subtitle: 'Haq Se Single Tour',
      description: 'Get ready to laugh till your stomach hurts with India\'s favorite comedian Zakir Khan.',
      category: 'Entertainment',
      tags: ['comedy', 'standup', 'entertainment', 'live'],
      price: { amount: 1499, currency: 'INR', isFree: false },
      image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800',
      venue: { name: 'Good Shepherd Auditorium', area: 'Museum Road' },
      featured: true,
      cashback: 10,
    },
    {
      title: 'Kids Art Workshop',
      subtitle: 'Creative Fun for Ages 5-12',
      description: 'A fun-filled art workshop where kids can explore painting, crafts, and creative expression.',
      category: 'Arts',
      tags: ['kids', 'art', 'workshop', 'creative'],
      price: { amount: 599, currency: 'INR', isFree: false },
      image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800',
      venue: { name: 'Rangoli Metro Art Center', area: 'MG Road' },
      featured: false,
      cashback: 18,
    },
  ],
  dubai: [
    {
      title: 'Dubai Expo 2025',
      subtitle: 'Global Innovation Summit',
      description: 'Experience the future at Dubai Expo 2025. Discover innovations from 190+ countries, attend exclusive pavilions, and witness spectacular performances.',
      category: 'Technology',
      tags: ['expo', 'technology', 'innovation', 'global'],
      price: { amount: 195, currency: 'AED', isFree: false },
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800',
      venue: { name: 'Expo City Dubai', area: 'Dubai South' },
      featured: true,
      cashback: 12,
    },
    {
      title: 'Ed Sheeran Live in Dubai',
      subtitle: 'Mathematics World Tour',
      description: 'The global superstar Ed Sheeran performs his greatest hits live at Dubai\'s iconic Coca-Cola Arena.',
      category: 'Music',
      tags: ['music', 'concert', 'live', 'international'],
      price: { amount: 750, currency: 'AED', isFree: false },
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
      venue: { name: 'Coca-Cola Arena', area: 'City Walk' },
      featured: true,
      cashback: 8,
    },
    {
      title: 'Desert Safari Premium',
      subtitle: 'Sunset Adventure Experience',
      description: 'Experience the magic of Arabian desert with dune bashing, camel rides, BBQ dinner, and traditional entertainment under the stars.',
      category: 'Entertainment',
      tags: ['desert', 'safari', 'adventure', 'experience'],
      price: { amount: 299, currency: 'AED', isFree: false },
      image: 'https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=800',
      venue: { name: 'Dubai Desert Conservation Reserve', area: 'Dubai Desert' },
      featured: true,
      cashback: 15,
    },
    {
      title: 'Dubai Food Festival',
      subtitle: 'Taste the World',
      description: 'Explore culinary delights from around the world at Dubai\'s biggest food festival. Live cooking demos, celebrity chefs, and unlimited tastings.',
      category: 'Food',
      tags: ['food', 'festival', 'culinary', 'international'],
      price: { amount: 150, currency: 'AED', isFree: false },
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
      venue: { name: 'Dubai Festival City', area: 'Festival City' },
      featured: false,
      cashback: 18,
    },
    {
      title: 'Burj Khalifa At The Top',
      subtitle: 'Observation Deck Experience',
      description: 'Visit the world\'s tallest building observation deck at 555m. Includes sunset views and premium lounge access.',
      category: 'Entertainment',
      tags: ['landmark', 'observation', 'views', 'luxury'],
      price: { amount: 399, currency: 'AED', isFree: false },
      image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800',
      venue: { name: 'Burj Khalifa', area: 'Downtown Dubai' },
      featured: true,
      cashback: 10,
    },
    {
      title: 'Formula 1 Abu Dhabi GP',
      subtitle: 'Season Finale Race Weekend',
      description: 'Experience the thrill of F1 racing at the spectacular Yas Marina Circuit. Includes paddock access and post-race concert.',
      category: 'Sports',
      tags: ['f1', 'racing', 'sports', 'motorsport'],
      price: { amount: 1500, currency: 'AED', isFree: false },
      image: 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=800',
      venue: { name: 'Yas Marina Circuit', area: 'Abu Dhabi' },
      featured: true,
      cashback: 5,
    },
    {
      title: 'Dubai Fitness Challenge',
      subtitle: '30 Days of Fitness',
      description: 'Join Dubai\'s biggest fitness movement. Free fitness classes, community runs, and wellness activities across the city.',
      category: 'Wellness',
      tags: ['fitness', 'wellness', 'community', 'health'],
      price: { amount: 0, currency: 'AED', isFree: true },
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
      venue: { name: 'Various Locations', area: 'Dubai Marina' },
      featured: false,
      cashback: 0,
    },
    {
      title: 'Global Village Dubai',
      subtitle: 'World\'s Largest Cultural Carnival',
      description: 'Explore pavilions from 90+ countries, enjoy international cuisine, watch live entertainment, and shop unique handicrafts.',
      category: 'Entertainment',
      tags: ['cultural', 'festival', 'entertainment', 'shopping'],
      price: { amount: 25, currency: 'AED', isFree: false },
      image: 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800',
      venue: { name: 'Global Village', area: 'Dubailand' },
      featured: false,
      cashback: 20,
    },
  ],
};

// Location details for each region
const LOCATIONS = {
  bangalore: {
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
  },
  dubai: {
    city: 'Dubai',
    state: 'Dubai',
    country: 'UAE',
  },
};

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getRandomFutureDate(daysAhead: number = 90): Date {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead) + 7);
  return date;
}

async function seedRegionEvents() {
  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;

  // First, fix existing events with ₹ symbol
  console.log('\n🔧 Fixing existing events with ₹ currency symbol...');
  const fixResult = await db!.collection('events').updateMany(
    { 'price.currency': '₹' },
    { $set: { 'price.currency': 'INR' } }
  );
  console.log(`  Fixed ${fixResult.modifiedCount} events (₹ → INR)`);

  // Also fix Mumbai events to be in Bangalore region
  const fixMumbai = await db!.collection('events').updateMany(
    { 'location.city': 'Mumbai' },
    { $set: { 'location.city': 'Bangalore' } }
  );
  console.log(`  Moved ${fixMumbai.modifiedCount} Mumbai events to Bangalore`);

  console.log('\n📊 Current event distribution:');
  const beforeDist = await db!.collection('events').aggregate([
    { $group: { _id: { city: '$location.city', currency: '$price.currency' }, count: { $sum: 1 } } },
    { $sort: { '_id.city': 1 } }
  ]).toArray();
  beforeDist.forEach(item => console.log(`  ${item._id.city} (${item._id.currency}): ${item.count}`));

  const eventsToInsert: any[] = [];

  // Process each region
  for (const [region, templates] of Object.entries(EVENT_TEMPLATES)) {
    const locationData = LOCATIONS[region as keyof typeof LOCATIONS];
    console.log(`\n📦 Processing ${region} events...`);

    for (const template of templates) {
      const slug = generateSlug(template.title);

      // Check if event already exists
      const existing = await db!.collection('events').findOne({ slug });
      if (existing) {
        console.log(`  ⏭️  Skipping ${template.title} (already exists)`);
        continue;
      }

      const eventDoc = {
        title: template.title,
        subtitle: template.subtitle,
        slug,
        description: template.description,
        image: template.image,
        images: [template.image],
        price: template.price,
        location: {
          name: template.venue.name,
          address: `${template.venue.name}, ${template.venue.area}`,
          city: locationData.city,
          state: locationData.state,
          country: locationData.country,
          isOnline: false,
        },
        date: getRandomFutureDate(),
        time: ['10:00', '14:00', '18:00', '20:00'][Math.floor(Math.random() * 4)],
        endTime: '23:00',
        category: template.category,
        tags: template.tags,
        organizer: {
          name: `${template.category} Events ${region === 'dubai' ? 'UAE' : 'India'}`,
          email: `events@${region}.rez.com`,
        },
        featured: template.featured,
        priority: template.featured ? 10 : 5,
        status: 'published',
        isOnline: false,
        cashback: template.cashback,
        availableSlots: [
          { time: '10:00', available: true, maxCapacity: 100, bookedCount: Math.floor(Math.random() * 30) },
          { time: '14:00', available: true, maxCapacity: 100, bookedCount: Math.floor(Math.random() * 30) },
          { time: '18:00', available: true, maxCapacity: 150, bookedCount: Math.floor(Math.random() * 50) },
        ],
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
      };

      eventsToInsert.push(eventDoc);
    }
  }

  if (eventsToInsert.length > 0) {
    console.log(`\n🔄 Inserting ${eventsToInsert.length} new events...`);
    await db!.collection('events').insertMany(eventsToInsert);
    console.log(`✅ Inserted ${eventsToInsert.length} events`);
  } else {
    console.log('\n✅ No new events to insert');
  }

  // Show final distribution
  console.log('\n📊 Final event distribution:');
  const afterDist = await db!.collection('events').aggregate([
    { $group: { _id: { city: '$location.city', currency: '$price.currency' }, count: { $sum: 1 } } },
    { $sort: { '_id.city': 1 } }
  ]).toArray();
  afterDist.forEach(item => console.log(`  ${item._id.city} (${item._id.currency}): ${item.count}`));

  // Show by category
  console.log('\n📊 Events by category:');
  const catDist = await db!.collection('events').aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  catDist.forEach(item => console.log(`  ${item._id}: ${item.count}`));

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

seedRegionEvents().catch(console.error);
