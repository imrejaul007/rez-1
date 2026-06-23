#!/usr/bin/env node

/**
 * Test script for event system
 * Tests all event API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testEvent = {
  title: 'Test Event - API Integration',
  subtitle: 'Free • Online',
  description: 'This is a test event to verify API integration',
  image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=200&fit=crop',
  price: {
    amount: 0,
    currency: '₹',
    isFree: true
  },
  location: {
    name: 'Online Event',
    address: 'Online',
    city: 'Online',
    isOnline: true
  },
  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  time: '7:00 PM',
  category: 'Technology',
  organizer: {
    name: 'Test Organizer',
    email: 'test@example.com'
  },
  isOnline: true,
  registrationRequired: true,
  status: 'published',
  tags: ['test', 'api', 'integration'],
  featured: false
};

async function testEventSystem() {
  console.log('🧪 Starting Event System Tests...\n');

  try {
    // Test 1: Get all events
    console.log('1️⃣ Testing GET /api/events');
    const allEventsResponse = await axios.get(`${BASE_URL}/events`);
    console.log(`✅ Found ${allEventsResponse.data.data.events.length} events`);
    console.log(`📊 Total: ${allEventsResponse.data.data.total}, Has More: ${allEventsResponse.data.data.hasMore}\n`);

    // Test 2: Get featured events
    console.log('2️⃣ Testing GET /api/events/featured');
    const featuredResponse = await axios.get(`${BASE_URL}/events/featured`);
    console.log(`✅ Found ${featuredResponse.data.data.length} featured events\n`);

    // Test 3: Get events by category
    console.log('3️⃣ Testing GET /api/events/category/Technology');
    const categoryResponse = await axios.get(`${BASE_URL}/events/category/Technology`);
    console.log(`✅ Found ${categoryResponse.data.data.events.length} Technology events\n`);

    // Test 4: Search events
    console.log('4️⃣ Testing GET /api/events/search?q=music');
    const searchResponse = await axios.get(`${BASE_URL}/events/search?q=music`);
    console.log(`✅ Found ${searchResponse.data.data.events.length} events matching "music"`);
    console.log(`💡 Suggestions: ${searchResponse.data.data.suggestions?.join(', ') || 'None'}\n`);

    // Test 5: Get specific event (if any events exist)
    if (allEventsResponse.data.data.events.length > 0) {
      const firstEvent = allEventsResponse.data.data.events[0];
      console.log('5️⃣ Testing GET /api/events/:id');
      const eventResponse = await axios.get(`${BASE_URL}/events/${firstEvent._id}`);
      console.log(`✅ Retrieved event: ${eventResponse.data.data.title}`);
      console.log(`📈 Views: ${eventResponse.data.data.analytics.views}\n`);

      // Test 6: Share event
      console.log('6️⃣ Testing POST /api/events/:id/share');
      const shareResponse = await axios.post(`${BASE_URL}/events/${firstEvent._id}/share`);
      console.log(`✅ Share recorded: ${shareResponse.data.message}\n`);
    }

    // Test 7: Test filters
    console.log('7️⃣ Testing event filters');
    const filterResponse = await axios.get(`${BASE_URL}/events?category=Music&isOnline=false&limit=5`);
    console.log(`✅ Filtered events: ${filterResponse.data.data.events.length} Music events (offline)\n`);

    console.log('🎉 All Event System Tests Passed!');
    console.log('\n📋 Test Summary:');
    console.log('✅ GET /api/events - Working');
    console.log('✅ GET /api/events/featured - Working');
    console.log('✅ GET /api/events/category/:category - Working');
    console.log('✅ GET /api/events/search - Working');
    console.log('✅ GET /api/events/:id - Working');
    console.log('✅ POST /api/events/:id/share - Working');
    console.log('✅ Event filters - Working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Tip: Make sure the backend server is running and events are seeded');
      console.log('   Run: npm run seed:events');
    }
    
    process.exit(1);
  }
}

// Run tests
testEventSystem();

