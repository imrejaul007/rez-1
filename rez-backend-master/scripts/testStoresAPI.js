/**
 * Test Stores API to see what data is being returned
 */

const fetch = require('node-fetch');

async function testStoresAPI() {
  try {
    console.log('\n🧪 Testing Stores API...\n');

    // Test get trending stores
    const response = await fetch('http://localhost:5001/api/stores?isTrending=true&limit=5');
    const data = await response.json();

    console.log('📊 API Response:');
    console.log('Status:', response.status);
    console.log('Success:', data.success);
    console.log('Message:', data.message);
    console.log('\n🏪 Stores returned:', data.data?.stores?.length || 0);

    if (data.data?.stores?.length > 0) {
      console.log('\n📋 First 3 stores:');
      data.data.stores.slice(0, 3).forEach((store, idx) => {
        console.log(`\n${idx + 1}. ${store.name}`);
        console.log(`   ID: ${store._id}`);
        console.log(`   ID Type: ${typeof store._id}`);
        console.log(`   ID Length: ${store._id?.length}`);
        console.log(`   Is ObjectId format: ${/^[0-9a-fA-F]{24}$/.test(store._id)}`);
        console.log(`   Rating: ${store.ratings?.average || 'N/A'}`);
        console.log(`   Category: ${store.category}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStoresAPI();
