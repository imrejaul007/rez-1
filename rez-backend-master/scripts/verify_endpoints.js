// Node 18+ has built-in fetch, no need to require it

async function testEndpoints() {
    const BASE_URL = 'http://localhost:5001/api';

    console.log('🧪 Testing Browse by Cuisine Endpoints...');

    try {
        // Test 1: Cuisine Counts
        console.log('\n1. Testing GET /stores/cuisine-counts');
        const countsRes = await fetch(`${BASE_URL}/stores/cuisine-counts`);
        const countsData = await countsRes.json();

        if (countsData.success) {
            console.log('✅ Success! Found cuisines:', countsData.data.cuisines.length);
            console.log('Sample counts:', countsData.data.cuisines.slice(0, 3).map(c => `${c.name}: ${c.displayCount}`).join(', '));
        } else {
            console.error('❌ Failed:', countsData.message);
        }

        // Test 2: Stores by Tag (Pizza)
        console.log('\n2. Testing GET /stores/by-tag/pizza');
        const tagRes = await fetch(`${BASE_URL}/stores/by-tag/pizza`);
        const tagData = await tagRes.json();

        if (tagData.success) {
            console.log(`✅ Success! Found ${tagData.data.stores.length} pizza stores`);
            console.log('Sample store:', tagData.data.stores[0]?.name);
        } else {
            console.error('❌ Failed:', tagData.message);
        }

        // Test 3: Grouped Product Search (Biryani)
        const cuisines = ['biryani', 'chinese', 'desserts', 'healthy-food', 'thali', 'ice-cream'];

        for (const cuisine of cuisines) {
            console.log(`\n3. Testing GET /search/products-grouped?q=${cuisine}`);
            const searchRes = await fetch(`${BASE_URL}/search/products-grouped?q=${cuisine}&limit=20`);
            const searchData = await searchRes.json();

            console.log('Status Code:', searchRes.status);

            if (searchData.success) {
                console.log(`✅ Success! Found ${searchData.data.total} products/groups matching '${cuisine}'`);
                if (searchData.data.groupedProducts?.length > 0) {
                    console.log('Sample match:', searchData.data.groupedProducts[0].productName);
                    console.log('First seller:', searchData.data.groupedProducts[0].sellers[0].storeName);
                } else {
                    console.log(`⚠️ No products found for ${cuisine} check`);
                }
            } else {
                console.error('❌ Failed:', searchData.message);
            }
        }
    } catch (error) {
        console.error('❌ Error running tests:', error.message);
    }
}

testEndpoints();
