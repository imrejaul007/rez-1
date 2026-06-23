/**
 * Seed Script for Service Categories
 *
 * Run with: npx ts-node src/scripts/seedServiceCategories.ts
 * Or: npm run seed:service-categories
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ServiceCategory } from '../models/ServiceCategory';

// Load environment variables
dotenv.config();

// Service categories data based on the screenshots
const serviceCategoriesData = [
  {
    name: 'Home Service',
    slug: 'home-service',
    description: 'Professional home services including cleaning, repairs, and maintenance',
    icon: 'https://cdn-icons-png.flaticon.com/512/619/619034.png', // House icon
    iconType: 'url' as const,
    cashbackPercentage: 10,
    sortOrder: 1,
    metadata: {
      color: '#7C3AED',
      tags: ['home', 'cleaning', 'maintenance'],
      seoTitle: 'Home Services - Up to 10% Cashback',
      seoDescription: 'Book professional home services with up to 10% cashback'
    }
  },
  {
    name: 'Repair',
    slug: 'repair',
    description: 'Expert repair services for appliances, electronics, and more',
    icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png', // Repair tools icon
    iconType: 'url' as const,
    cashbackPercentage: 8,
    sortOrder: 2,
    metadata: {
      color: '#7C3AED',
      tags: ['repair', 'fix', 'appliances', 'electronics'],
      seoTitle: 'Repair Services - Up to 8% Cashback',
      seoDescription: 'Get expert repair services with up to 8% cashback'
    }
  },
  {
    name: 'Perfume',
    slug: 'perfume',
    description: 'Premium perfume and fragrance services',
    icon: 'https://cdn-icons-png.flaticon.com/512/3163/3163478.png', // Perfume icon
    iconType: 'url' as const,
    cashbackPercentage: 12,
    sortOrder: 3,
    metadata: {
      color: '#7C3AED',
      tags: ['perfume', 'fragrance', 'beauty'],
      seoTitle: 'Perfume Services - Up to 12% Cashback',
      seoDescription: 'Discover premium perfume services with up to 12% cashback'
    }
  },
  {
    name: 'Lifestyle',
    slug: 'lifestyle',
    description: 'Lifestyle services including fitness, wellness, and personal care',
    icon: 'https://cdn-icons-png.flaticon.com/512/3163/3163485.png', // Lifestyle icon
    iconType: 'url' as const,
    cashbackPercentage: 15,
    sortOrder: 4,
    metadata: {
      color: '#7C3AED',
      tags: ['lifestyle', 'wellness', 'fitness', 'personal care'],
      seoTitle: 'Lifestyle Services - Up to 15% Cashback',
      seoDescription: 'Enhance your lifestyle with up to 15% cashback on services'
    }
  },
  {
    name: 'Clinic',
    slug: 'clinic',
    description: 'Medical clinic services and consultations',
    icon: 'https://cdn-icons-png.flaticon.com/512/2382/2382443.png', // Clinic/Medical icon
    iconType: 'url' as const,
    cashbackPercentage: 5,
    sortOrder: 5,
    metadata: {
      color: '#7C3AED',
      tags: ['clinic', 'medical', 'healthcare', 'consultation'],
      seoTitle: 'Clinic Services - Up to 5% Cashback',
      seoDescription: 'Book clinic services and consultations with up to 5% cashback'
    }
  },
  {
    name: 'Health',
    slug: 'health',
    description: 'Health and wellness services including checkups and treatments',
    icon: 'https://cdn-icons-png.flaticon.com/512/2382/2382461.png', // Health/Heart icon
    iconType: 'url' as const,
    cashbackPercentage: 2,
    sortOrder: 6,
    metadata: {
      color: '#7C3AED',
      tags: ['health', 'wellness', 'checkup', 'treatment'],
      seoTitle: 'Health Services - Up to 2% Cashback',
      seoDescription: 'Take care of your health with up to 2% cashback on services'
    }
  },
  {
    name: 'Hospital',
    slug: 'hospital',
    description: 'Hospital services and medical procedures',
    icon: 'https://cdn-icons-png.flaticon.com/512/4320/4320350.png', // Hospital icon
    iconType: 'url' as const,
    cashbackPercentage: 5,
    sortOrder: 7,
    metadata: {
      color: '#7C3AED',
      tags: ['hospital', 'medical', 'healthcare', 'surgery'],
      seoTitle: 'Hospital Services - Up to 5% Cashback',
      seoDescription: 'Book hospital services with up to 5% cashback'
    }
  },
  {
    name: 'Cleaning',
    slug: 'cleaning',
    description: 'Professional cleaning services for homes and offices',
    icon: 'https://cdn-icons-png.flaticon.com/512/2954/2954893.png', // Cleaning icon
    iconType: 'url' as const,
    cashbackPercentage: 2,
    sortOrder: 8,
    metadata: {
      color: '#7C3AED',
      tags: ['cleaning', 'home', 'office', 'sanitation'],
      seoTitle: 'Cleaning Services - Up to 2% Cashback',
      seoDescription: 'Get professional cleaning services with up to 2% cashback'
    }
  }
];

async function seedServiceCategories() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if categories already exist
    const existingCount = await ServiceCategory.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing service categories.`);

      // Ask to continue or skip
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question('Do you want to (r)eplace all, (a)dd missing only, or (s)kip? [r/a/s]: ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() === 's') {
        console.log('Skipping seed. No changes made.');
        await mongoose.disconnect();
        return;
      }

      if (answer.toLowerCase() === 'r') {
        console.log('Deleting existing categories...');
        await ServiceCategory.deleteMany({});
        console.log('Existing categories deleted.');
      }
    }

    // Insert categories
    console.log('Seeding service categories...');

    for (const categoryData of serviceCategoriesData) {
      // Check if category already exists (by slug)
      const existing = await ServiceCategory.findOne({ slug: categoryData.slug });

      if (existing) {
        console.log(`  - Category "${categoryData.name}" already exists, skipping...`);
        continue;
      }

      const category = new ServiceCategory({
        ...categoryData,
        isActive: true,
        serviceCount: 0
      });

      await category.save();
      console.log(`  + Created category: ${categoryData.name} (${categoryData.cashbackPercentage}% cashback)`);
    }

    // Verify insertion
    const finalCount = await ServiceCategory.countDocuments();
    console.log(`\nService categories seeded successfully!`);
    console.log(`Total categories in database: ${finalCount}`);

    // List all categories
    const allCategories = await ServiceCategory.find().sort({ sortOrder: 1 });
    console.log('\nCategories:');
    allCategories.forEach((cat, index) => {
      console.log(`  ${index + 1}. ${cat.name} - Up to ${cat.cashbackPercentage}% cashback`);
    });

  } catch (error) {
    console.error('Error seeding service categories:', error);
    throw error;
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the seed function
seedServiceCategories()
  .then(() => {
    console.log('Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
