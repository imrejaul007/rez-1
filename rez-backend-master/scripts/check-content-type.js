const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import Video model
require(path.join(__dirname, '../dist/models/Video'));

async function checkContentType() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Video = mongoose.model('Video');

    const total = await Video.countDocuments();
    const withContentType = await Video.countDocuments({ contentType: { $exists: true, $ne: null } });
    const merchant = await Video.countDocuments({ contentType: 'merchant' });
    const ugc = await Video.countDocuments({ contentType: 'ugc' });
    const article = await Video.countDocuments({ contentType: 'article_video' });

    console.log('VIDEO CONTENTT TYPE STATUS:');
    console.log('===========================');
    console.log(`Total videos: ${total}`);
    console.log(`Videos with contentType: ${withContentType}`);
    console.log(`Merchant videos: ${merchant}`);
    console.log(`UGC videos: ${ugc}`);
    console.log(`Article videos: ${article}`);
    console.log('');

    // Get a sample merchant and ugc video
    const sampleMerchant = await Video.findOne({ contentType: 'merchant' }).select('title contentType category subcategory products').populate('products', 'name');
    const sampleUGC = await Video.findOne({ contentType: 'ugc' }).select('title contentType category subcategory products').populate('products', 'name');

    if (sampleMerchant) {
      console.log('SAMPLE MERCHANT VIDEO:');
      console.log('====================');
      console.log(`Title: ${sampleMerchant.title}`);
      console.log(`ContentType: ${sampleMerchant.contentType}`);
      console.log(`Category: ${sampleMerchant.category}`);
      console.log(`Subcategory: ${sampleMerchant.subcategory || 'N/A'}`);
      console.log(`Products: ${sampleMerchant.products.length} products`);
      if (sampleMerchant.products.length > 0) {
        sampleMerchant.products.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name}`);
        });
      }
      console.log('');
    } else {
      console.log('⚠️  No merchant videos found!\n');
    }

    if (sampleUGC) {
      console.log('SAMPLE UGC VIDEO:');
      console.log('================');
      console.log(`Title: ${sampleUGC.title}`);
      console.log(`ContentType: ${sampleUGC.contentType}`);
      console.log(`Category: ${sampleUGC.category}`);
      console.log(`Subcategory: ${sampleUGC.subcategory || 'N/A'}`);
      console.log(`Products: ${sampleUGC.products.length} products`);
      if (sampleUGC.products.length > 0) {
        sampleUGC.products.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name}`);
        });
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkContentType();
