/**
 * Seed Exclusive Offers
 * Creates exclusive offers from categoryDummyData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import ExclusiveOffer from '../models/ExclusiveOffer';
import { Category } from '../models/Category';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const exclusiveOffersData = [
  {
    id: 'student',
    title: 'Student Special',
    icon: '🎓',
    discount: '25% Extra Off',
    description: 'Valid student ID required',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#1D4ED8'],
    targetAudience: 'student' as const,
  },
  {
    id: 'women',
    title: 'Women Exclusive',
    icon: '👩',
    discount: 'Up to 40% Off',
    description: 'Celebrate every day',
    color: '#EC4899',
    gradient: ['#EC4899', '#BE185D'],
    targetAudience: 'women' as const,
  },
  {
    id: 'birthday',
    title: 'Birthday Month',
    icon: '🎂',
    discount: '30% Off + Gift',
    description: 'Celebrate with extra savings',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
    targetAudience: 'birthday' as const,
  },
  {
    id: 'corporate',
    title: 'Corporate Perks',
    icon: '🏢',
    discount: '20% Off',
    description: 'For verified employees',
    color: '#64748B',
    gradient: ['#64748B', '#475569'],
    targetAudience: 'corporate' as const,
  },
  {
    id: 'first',
    title: 'First Order',
    icon: '🎁',
    discount: 'Flat 50% Off',
    description: 'Welcome to Rez!',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
    targetAudience: 'first' as const,
  },
  {
    id: 'senior',
    title: 'Senior Citizens',
    icon: '👴',
    discount: '15% Extra Off',
    description: 'Age 60+ special discount',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#6D28D9'],
    targetAudience: 'senior' as const,
  },
];

async function seedExclusiveOffers(): Promise<number> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
  await mongoose.connect(mongoUri);

  console.log('Seeding Exclusive Offers...');

  // Clear existing
  await ExclusiveOffer.deleteMany({});

  // Get all categories for linking
  const categories = await Category.find({ isActive: true }).limit(11);

  const offersToInsert = exclusiveOffersData.map(offer => ({
    title: offer.title,
    icon: offer.icon,
    discount: offer.discount,
    description: offer.description,
    color: offer.color,
    gradient: offer.gradient,
    targetAudience: offer.targetAudience,
    categories: categories.map(c => c._id),
    validFrom: new Date(),
    validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    isActive: true,
    sortOrder: 0,
  }));

  const result = await ExclusiveOffer.insertMany(offersToInsert);
  console.log(`Seeded ${result.length} Exclusive Offers`);

  await mongoose.disconnect();
  return result.length;
}

seedExclusiveOffers().catch(console.error);





