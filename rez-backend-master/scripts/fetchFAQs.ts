// Fetch FAQs Script
// Quick script to check existing FAQ data in MongoDB

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Define FAQ Schema (simplified)
const FAQSchema = new mongoose.Schema({
  category: String,
  subcategory: String,
  question: String,
  answer: String,
  shortAnswer: String,
  isActive: Boolean,
  viewCount: Number,
  helpfulCount: Number,
  notHelpfulCount: Number,
  tags: [String],
  order: Number,
  createdAt: Date,
  updatedAt: Date,
});

const FAQ = mongoose.model('FAQ', FAQSchema);

async function fetchFAQs() {
  try {
    console.log('\n🔌 Connecting to MongoDB...');
    console.log('📍 URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Hide password
    console.log('📁 Database:', DB_NAME);

    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });

    console.log('✅ Connected to MongoDB successfully!\n');

    // Fetch all FAQs
    const faqs = await FAQ.find({});

    console.log('📊 FAQ Statistics:');
    console.log('━'.repeat(60));
    console.log(`Total FAQs: ${faqs.length}`);

    if (faqs.length === 0) {
      console.log('\n❌ No FAQs found in database!');
      console.log('💡 You need to run the seed script to populate FAQs.\n');
    } else {
      console.log(`Active FAQs: ${faqs.filter(f => f.isActive).length}`);
      console.log(`Inactive FAQs: ${faqs.filter(f => !f.isActive).length}`);

      // Group by category
      const byCategory = faqs.reduce((acc: any, faq) => {
        const cat = faq.category || 'uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📂 FAQs by Category:');
      console.log('━'.repeat(60));
      Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count}`);
      });

      // Show first 3 FAQs
      console.log('\n📝 Sample FAQs:');
      console.log('━'.repeat(60));
      faqs.slice(0, 3).forEach((faq, index) => {
        console.log(`\n${index + 1}. ${faq.question}`);
        console.log(`   Category: ${faq.category}`);
        console.log(`   Views: ${faq.viewCount || 0} | Helpful: ${faq.helpfulCount || 0}`);
      });
    }

    console.log('\n' + '━'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error fetching FAQs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB\n');
  }
}

// Run the script
fetchFAQs();
