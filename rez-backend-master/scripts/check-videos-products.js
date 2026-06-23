const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import models
require(path.join(__dirname, '../dist/models/Video'));
require(path.join(__dirname, '../dist/models/Product'));
require(path.join(__dirname, '../dist/models/Article'));

async function checkVideosAndProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Video = mongoose.model('Video');
    const Product = mongoose.model('Product');
    const Article = mongoose.model('Article');

    // Check total videos
    const totalVideos = await Video.countDocuments();
    console.log('📊 DATABASE STATUS:');
    console.log('==================');
    console.log(`Total videos: ${totalVideos}`);

    // Check videos with products
    const videosWithProducts = await Video.countDocuments({
      products: { $exists: true, $ne: [] }
    });
    console.log(`Videos with products: ${videosWithProducts}`);

    // Check merchant videos
    const merchantVideos = await Video.countDocuments({ contentType: 'merchant' });
    console.log(`Merchant videos: ${merchantVideos}`);

    const merchantWithProducts = await Video.countDocuments({
      contentType: 'merchant',
      products: { $exists: true, $ne: [] }
    });
    console.log(`Merchant videos with products: ${merchantWithProducts}`);

    // Check UGC videos
    const ugcVideos = await Video.countDocuments({ contentType: 'ugc' });
    console.log(`UGC videos: ${ugcVideos}`);

    // Check products
    const totalProducts = await Product.countDocuments();
    console.log(`Total products: ${totalProducts}`);

    console.log('\n🎬 SAMPLE MERCHANT VIDEO WITH PRODUCTS:');
    console.log('========================================');

    // Get sample merchant video with products
    const sampleVideo = await Video.findOne({
      contentType: 'merchant',
      products: { $exists: true, $ne: [] }
    }).populate('products');

    if (sampleVideo) {
      console.log(`ID: ${sampleVideo._id}`);
      console.log(`Title: ${sampleVideo.title}`);
      console.log(`ContentType: ${sampleVideo.contentType}`);
      console.log(`Category: ${sampleVideo.category}`);
      console.log(`Video URL: ${sampleVideo.videoUrl}`);
      console.log(`Thumbnail: ${sampleVideo.thumbnail}`);
      console.log(`Products count: ${sampleVideo.products.length}`);
      console.log(`Products:`);
      sampleVideo.products.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (ID: ${p._id})`);
      });
    } else {
      console.log('⚠️  No merchant videos with products found!');
    }

    console.log('\n📰 SAMPLE ARTICLES:');
    console.log('==================');

    // Get sample articles
    const articles = await Article.find({}).select('title coverImage category').limit(3);

    if (articles.length > 0) {
      articles.forEach((article, i) => {
        console.log(`${i + 1}. ${article.title}`);
        console.log(`   Category: ${article.category}`);
        console.log(`   Cover Image: ${article.coverImage}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No articles found!');
    }

    console.log('\n🔍 CHECKING BACKEND API RESPONSE:');
    console.log('==================================');

    // Simulate what the API returns
    const apiVideos = await Video.find({ contentType: 'merchant' })
      .populate('products')
      .limit(2)
      .lean();

    if (apiVideos.length > 0) {
      console.log('Sample API response for merchant videos:');
      apiVideos.forEach((video, i) => {
        console.log(`\n${i + 1}. ${video.title}`);
        console.log(`   ContentType: ${video.contentType}`);
        console.log(`   Products array length: ${video.products?.length || 0}`);
        console.log(`   Products populated: ${video.products?.[0]?.name ? 'YES' : 'NO'}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkVideosAndProducts();
