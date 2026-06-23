/**
 * Quick script to update store logos to working URLs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import { Store } from '../models/Store';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rez-app';

const logoUpdates: Record<string, string> = {
  'bigbasket': 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=100',
  'blinkit': 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=100',
  'zepto': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100',
  'dmart-ready': 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100',
  'reliance-fresh': 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=100',
  'jiomart': 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=100',
  'more-supermarket': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100',
};

async function updateLogos() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.\n');

    for (const [slug, logo] of Object.entries(logoUpdates)) {
      const result = await Store.updateOne(
        { slug },
        { $set: { logo } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Updated logo for: ${slug}`);
      }
    }

    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateLogos();
