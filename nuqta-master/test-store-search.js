// Simple test script to verify store search functionality
const testStoreSearch = async () => {
  try {
    console.log('🧪 Testing Store Search API...');
    
    // Test 1: Get store categories
    console.log('\n1️⃣ Testing store categories...');
    const categoriesResponse = await fetch('http://localhost:5001/api/stores/categories/list');
    const categoriesData = await categoriesResponse.json();
    
    if (categoriesData.success) {
      console.log('✅ Categories loaded:', categoriesData.data.categories.length);
      categoriesData.data.categories.forEach(cat => {
        console.log(`   - ${cat.icon} ${cat.name}: ${cat.count} stores`);
      });
    } else {
      console.log('❌ Failed to load categories:', categoriesData.message);
    }
    
    // Test 2: Search fast delivery stores
    console.log('\n2️⃣ Testing fast delivery stores...');
    const fastDeliveryResponse = await fetch('http://localhost:5001/api/stores/search-by-category/fastDelivery?page=1&limit=5');
    const fastDeliveryData = await fastDeliveryResponse.json();
    
    if (fastDeliveryData.success) {
      console.log('✅ Fast delivery stores loaded:', fastDeliveryData.data.stores.length);
      fastDeliveryData.data.stores.forEach(store => {
        console.log(`   - ${store.name}: ${store.operationalInfo.deliveryTime}`);
      });
    } else {
      console.log('❌ Failed to load fast delivery stores:', fastDeliveryData.message);
    }
    
    // Test 3: Search budget friendly stores
    console.log('\n3️⃣ Testing budget friendly stores...');
    const budgetResponse = await fetch('http://localhost:5001/api/stores/search-by-category/budgetFriendly?page=1&limit=5');
    const budgetData = await budgetResponse.json();
    
    if (budgetData.success) {
      console.log('✅ Budget friendly stores loaded:', budgetData.data.stores.length);
      budgetData.data.stores.forEach(store => {
        console.log(`   - ${store.name}: Min order ₹${store.operationalInfo.minimumOrder}`);
      });
    } else {
      console.log('❌ Failed to load budget stores:', budgetData.message);
    }
    
    console.log('\n🎉 Store Search API tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testStoreSearch();
