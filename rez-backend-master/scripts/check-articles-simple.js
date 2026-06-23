const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Define Article schema inline
const ArticleSchema = new mongoose.Schema({
  title: String,
  isPublished: Boolean,
  coverImage: String
}, { timestamps: true });

async function checkArticles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Article = mongoose.models.Article || mongoose.model('Article', ArticleSchema);

    const total = await Article.countDocuments();
    const published = await Article.countDocuments({ isPublished: true });

    console.log('ARTICLE STATUS:');
    console.log('===============');
    console.log(`Total articles: ${total}`);
    console.log(`Published articles: ${published}`);

    const samples = await Article.find({}).select('_id title isPublished coverImage').limit(5);
    console.log('\nSample articles:');
    samples.forEach((a, i) => {
      console.log(`${i + 1}. ${a.title}`);
      console.log(`   Published: ${a.isPublished}`);
      console.log(`   Image: ${a.coverImage.substring(0, 60)}...`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkArticles();
