/**
 * Test Featured Stores API
 * Check if the endpoint is returning real stores from database
 */

const fetch = require('node-fetch');

async function testFeaturedStores() {
  try {
    console.log('\n🧪 Testing /api/stores/featured endpoint...\n');

    const url = 'http://localhost:5001/api/stores/featured?limit=5';
    console.log('📡 Calling:', url);

    const response = await fetch(url);
    const data = await response.json();

    console.log('\n📊 API Response:');
    console.log('  Status:', response.status, response.ok ? '✅' : '❌');
    console.log('  Success:', data.success ? '✅' : '❌');
    console.log('  Message:', data.message || 'N/A');

    if (!response.ok) {
      console.log('\n❌ API call failed!');
      console.log('Response:', JSON.stringify(data, null, 2));
      return;
    }

    const stores = data.data || [];
    console.log('\n🏪 Stores Returned:', stores.length);

    if (stores.length === 0) {
      console.log('\n❌ NO STORES RETURNED!');
      console.log('⚠️  This is why homepage is using mock data!');
      console.log('\n💡 Solution:');
      console.log('   1. Check getFeaturedStores controller');
      console.log('   2. Ensure stores in DB have isFeatured=true or proper flags');
      console.log('   3. Check query filters aren\'t too strict');
      return;
    }

    console.log('\n✅ Stores found! Details:\n');

    stores.forEach((store, idx) => {
      console.log(`${idx + 1}. ${store.name || 'Unnamed Store'}`);
      console.log(`   ID: ${store._id}`);
      console.log(`   ID Type: ${typeof store._id}`);
      console.log(`   ID Length: ${store._id?.length}`);
      console.log(`   Valid ObjectId: ${/^[0-9a-fA-F]{24}$/.test(store._id) ? '✅' : '❌'}`);
      console.log(`   Rating: ${store.ratings?.average || 'N/A'}`);
      console.log(`   Category: ${store.category || 'N/A'}`);
      console.log(`   Location: ${store.location?.city || 'N/A'}`);
      console.log('');
    });

    console.log('✅ API endpoint is working correctly!');
    console.log('💡 If homepage still shows mock data, try:');
    console.log('   1. Clear app cache/storage');
    console.log('   2. Restart frontend dev server');
    console.log('   3. Check console for backend connection errors');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Backend server not running!');
      console.log('💡 Start it with: npm run dev');
    }
  }
}

testFeaturedStores();
