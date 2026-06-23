
/**
 * Seed Singapore Events
 * Run with: npx ts-node src/scripts/seedSingaporeEvents.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const EVENT_TEMPLATES = [
  {
    title: 'Singapore Tech Summit 2025',
    subtitle: 'Innovation Conference',
    description: 'Join industry leaders for a day of tech insights and networking.',
    category: 'Technology',
    tags: ['technology', 'conference', 'networking'],
    price: { amount: 150, currency: 'SGD', isFree: false },
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    venue: 'Singapore Convention Center',
    featured: true,
    cashback: 15,
  },
  {
    title: 'Live Music Festival',
    subtitle: 'Annual Music Celebration',
    description: 'Experience amazing live performances from top artists.',
    category: 'Music',
    tags: ['music', 'concert', 'live', 'festival'],
    price: { amount: 80, currency: 'SGD', isFree: false },
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
    venue: 'Singapore Arena',
    featured: true,
    cashback: 10,
  },
  {
    title: 'Food & Wine Festival',
    subtitle: 'Culinary Experience',
    description: 'Sample dishes from 50+ restaurants and enjoy live entertainment.',
    category: 'Food',
    tags: ['food', 'wine', 'festival', 'culinary'],
    price: { amount: 45, currency: 'SGD', isFree: false },
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    venue: 'Singapore Food Park',
    featured: false,
    cashback: 18,
  },
  {
    title: 'Wellness & Yoga Retreat',
    subtitle: 'Mind & Body Experience',
    description: 'A day of yoga, meditation, and wellness activities.',
    category: 'Wellness',
    tags: ['yoga', 'wellness', 'meditation', 'health'],
    price: { amount: 60, currency: 'SGD', isFree: false },
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    venue: 'Zen Gardens Singapore',
    featured: false,
    cashback: 12,
  },
  {
    title: 'Sports Championship Finals',
    subtitle: 'Season Finale',
    description: 'Watch the exciting championship finals live.',
    category: 'Sports',
    tags: ['sports', 'championship', 'live'],
    price: { amount: 75, currency: 'SGD', isFree: false },
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800',
    venue: 'Singapore Stadium',
    featured: true,
    cashback: 8,
  },
  {
    title: 'Comedy Night Special',
    subtitle: 'Stand-up Comedy Show',
    description: 'Laugh out loud with top comedians.',
    category: 'Entertainment',
    tags: ['comedy', 'standup', 'entertainment'],
    price: { amount: 35, currency: 'SGD', isFree: false },
    image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800',
    venue: 'Comedy Club Singapore',
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

async function seedSingaporeEvents() {
  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;

  const eventsToInsert: any[] = [];

  for (const template of EVENT_TEMPLATES) {
    const slug = generateSlug(template.title);

    // Check if event already exists
    const existing = await db!.collection('events').findOne({ slug });
    if (existing) {
      console.log(`⏭️  Skipping ${template.title} (already exists)`);
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
        city: 'Singapore',
        state: 'Singapore',
        country: 'Singapore',
        isOnline: false,
      },
      date: getRandomFutureDate(),
      time: ['10:00', '14:00', '18:00', '20:00'][Math.floor(Math.random() * 4)],
      endTime: '23:00',
      category: template.category,
      tags: template.tags,
      organizer: {
        name: `${template.category} Events Singapore`,
        email: 'events@singapore.rez.com',
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
    console.log(`\n🔄 Inserting ${eventsToInsert.length} new events...`);
    await db!.collection('events').insertMany(eventsToInsert);
    console.log(`✅ Inserted ${eventsToInsert.length} events for Singapore`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

seedSingaporeEvents().catch(console.error);
