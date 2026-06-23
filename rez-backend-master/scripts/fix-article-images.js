const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Define Article Schema (inline)
const ArticleSchema = new mongoose.Schema({
  title: String,
  coverImage: String,
  // ... other fields not needed for this script
}, { timestamps: true });

// Placeholder image URLs from Unsplash (category-specific, production-ready)
const PLACEHOLDER_IMAGES = {
  // Fashion category
  'fashion-summer-trends.jpg': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=600&fit=crop',
  'denim-styling-guide.jpg': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=600&fit=crop',
  'capsule-wardrobe.jpg': 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=600&fit=crop',
  'sustainable-fashion.jpg': 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&h=600&fit=crop',

  // Beauty category
  'morning-skincare.jpg': 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=600&fit=crop',
  'beginner-makeup.jpg': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=600&fit=crop',
  'hair-care-guide.jpg': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop',

  // Lifestyle category
  'minimalist-home.jpg': 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&h=600&fit=crop',
  'work-life-balance.jpg': 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=600&fit=crop',

  // Tech category
  'budget-smartphones.jpg': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop',
  'smart-home-gadgets.jpg': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&h=600&fit=crop'
};

async function fixArticleImages() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Register the model
    const Article = mongoose.models.Article || mongoose.model('Article', ArticleSchema);

    console.log('📰 Fetching all articles...');
    const articles = await Article.find({});
    console.log(`Found ${articles.length} articles\n`);

    let updatedCount = 0;

    for (const article of articles) {
      const oldImage = article.coverImage;

      // Extract the image filename from the URL
      const filename = oldImage.split('/').pop();

      // Check if we have a placeholder for this image
      if (PLACEHOLDER_IMAGES[filename]) {
        article.coverImage = PLACEHOLDER_IMAGES[filename];
        await article.save();
        updatedCount++;

        console.log(`✅ Updated: ${article.title}`);
        console.log(`   Old: ${oldImage}`);
        console.log(`   New: ${article.coverImage}\n`);
      } else {
        console.log(`⚠️  No placeholder found for: ${filename}`);
        console.log(`   Article: ${article.title}\n`);
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`Total articles: ${articles.length}`);
    console.log(`Updated articles: ${updatedCount}`);
    console.log(`Skipped articles: ${articles.length - updatedCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Done! Article images have been updated with working URLs.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixArticleImages();
