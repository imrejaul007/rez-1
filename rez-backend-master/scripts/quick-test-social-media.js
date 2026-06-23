// Quick Test for Social Media API
// Tests social media endpoints with provided JWT token

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001';
const API_PREFIX = '/api';
const TEST_TOKEN = '<JWT_TOKEN_REDACTED>';

async function checkHealth() {
  console.log('🏥 Checking server health...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Server is running');
    console.log('   Status:', response.data.status);
    console.log('   Database:', response.data.database);
    return true;
  } catch (error) {
    console.error('❌ Server is not responding');
    console.error('   Please start the backend server first');
    return false;
  }
}

async function testGetEarnings() {
  console.log('\n💰 Testing: Get User Earnings');
  try {
    const response = await axios.get(
      `${API_BASE_URL}${API_PREFIX}/social-media/earnings`,
      { headers: { Authorization: `Bearer ${TEST_TOKEN}` } }
    );

    console.log('✅ Success!');
    console.log('   Earnings:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Failed');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetPosts() {
  console.log('\n📋 Testing: Get User Posts');
  try {
    const response = await axios.get(
      `${API_BASE_URL}${API_PREFIX}/social-media/posts`,
      {
        params: { page: 1, limit: 20 },
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      }
    );

    console.log('✅ Success!');
    console.log('   Posts found:', response.data.posts?.length || 0);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Failed');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testSubmitPost() {
  console.log('\n📝 Testing: Submit Social Media Post');
  try {
    const testUrl = `https://instagram.com/p/test${Date.now()}`;
    const response = await axios.post(
      `${API_BASE_URL}${API_PREFIX}/social-media/submit`,
      {
        platform: 'instagram',
        postUrl: testUrl
      },
      { headers: { Authorization: `Bearer ${TEST_TOKEN}` } }
    );

    console.log('✅ Success!');
    console.log('   Post ID:', response.data.post?.id);
    console.log('   Status:', response.data.post?.status);
    console.log('   Cashback:', response.data.post?.cashbackAmount);
    return response.data.post?.id;
  } catch (error) {
    console.error('❌ Failed');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testGetStats() {
  console.log('\n📊 Testing: Get Platform Stats');
  try {
    const response = await axios.get(
      `${API_BASE_URL}${API_PREFIX}/social-media/stats`,
      { headers: { Authorization: `Bearer ${TEST_TOKEN}` } }
    );

    console.log('✅ Success!');
    console.log('   Stats:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Failed');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Social Media API Quick Test\n');
  console.log(`API URL: ${API_BASE_URL}${API_PREFIX}/social-media`);
  console.log('='.repeat(80));

  // Check if server is running
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.log('\n⚠️  Please start the backend server and try again');
    process.exit(1);
  }

  // Run tests
  const tests = [];

  tests.push(await testGetEarnings());
  tests.push(await testGetPosts());
  tests.push(await testSubmitPost());
  tests.push(await testGetStats());

  // Summary
  const passed = tests.filter(Boolean).length;
  const total = tests.length;

  console.log('\n' + '='.repeat(80));
  console.log(`📊 Results: ${passed}/${total} tests passed`);
  console.log('='.repeat(80));

  if (passed === total) {
    console.log('🎉 All tests passed! Social Media API is working!\n');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.\n');
  }
}

runTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error.message);
  process.exit(1);
});

