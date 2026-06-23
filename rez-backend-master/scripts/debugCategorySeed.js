/**
 * Debug script to test category seed operation
 * Run: node scripts/debugCategorySeed.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function debugCategorySeed() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);

    // Find fashion category
    const category = await db.collection('categories').findOne({ slug: 'fashion' });

    if (!category) {
      console.log('Fashion category not found!');
      return;
    }

    console.log('\n=== Current state of fashion category ===');
    console.log('ID:', category._id);
    console.log('Name:', category.name);
    console.log('Has vibes:', !!category.vibes, '- length:', category.vibes?.length);
    console.log('Has occasions:', !!category.occasions, '- length:', category.occasions?.length);
    console.log('Has trendingHashtags:', !!category.trendingHashtags, '- length:', category.trendingHashtags?.length);

    // Test data to add
    const testVibes = [
      { id: 'test1', name: 'Test Vibe', icon: '🧪', color: '#FF0000', description: 'Test description' }
    ];
    const testOccasions = [
      { id: 'test1', name: 'Test Occasion', icon: '🎉', color: '#00FF00', tag: null, discount: 15 }
    ];
    const testHashtags = [
      { id: 'test1', tag: '#TestHashtag', count: 100, color: '#0000FF', trending: true }
    ];

    console.log('\n=== Attempting to update with test data ===');

    // Try updating directly with MongoDB driver
    const updateResult = await db.collection('categories').updateOne(
      { _id: category._id },
      {
        $set: {
          vibes: testVibes,
          occasions: testOccasions,
          trendingHashtags: testHashtags
        }
      }
    );

    console.log('Update result:', JSON.stringify(updateResult, null, 2));

    // Verify the update
    const updatedCategory = await db.collection('categories').findOne({ slug: 'fashion' });
    console.log('\n=== After update ===');
    console.log('Has vibes:', !!updatedCategory.vibes, '- length:', updatedCategory.vibes?.length);
    console.log('Has occasions:', !!updatedCategory.occasions, '- length:', updatedCategory.occasions?.length);
    console.log('Has trendingHashtags:', !!updatedCategory.trendingHashtags, '- length:', updatedCategory.trendingHashtags?.length);

    if (updatedCategory.vibes && updatedCategory.vibes.length > 0) {
      console.log('\n✓ SUCCESS! Data persisted correctly.');
      console.log('Vibes:', JSON.stringify(updatedCategory.vibes, null, 2));
    } else {
      console.log('\n✗ FAILED! Data did not persist.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

debugCategorySeed();
