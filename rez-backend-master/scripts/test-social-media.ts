// Test Social Media API Integration
// Run this script to verify all social media endpoints work correctly with MongoDB

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001';
const API_PREFIX = '/api';

// Test user token (provided by user)
const TEST_TOKEN = '<JWT_TOKEN_REDACTED>';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function testSubmitPost(token: string, orderId?: string) {
  try {
    console.log('\n📝 Testing: Submit Social Media Post');

    const response = await axios.post(
      `${API_BASE_URL}${API_PREFIX}/social-media/submit`,
      {
        platform: 'instagram',
        postUrl: `https://instagram.com/p/test${Date.now()}`,
        ...(orderId && { orderId })
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    results.push({
      name: 'Submit Post',
      success: response.data.success,
      message: response.data.message || 'Post submitted successfully',
      data: response.data.data
    });

    console.log('✅ Post submitted:', response.data.data?.post?.id);
    return response.data.data?.post?.id;
  } catch (error: any) {
    results.push({
      name: 'Submit Post',
      success: false,
      message: error.response?.data?.message || error.message
    });
    console.error('❌ Submit failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetEarnings(token: string) {
  try {
    console.log('\n💰 Testing: Get User Earnings');

    const response = await axios.get(
      `${API_BASE_URL}${API_PREFIX}/social-media/earnings`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    results.push({
      name: 'Get Earnings',
      success: response.data.success,
      message: 'Earnings retrieved successfully',
      data: response.data.data
    });

    console.log('✅ Earnings:', response.data.data);
    return response.data.data;
  } catch (error: any) {
    results.push({
      name: 'Get Earnings',
      success: false,
      message: error.response?.data?.message || error.message
    });
    console.error('❌ Get earnings failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetPosts(token: string) {
  try {
    console.log('\n📋 Testing: Get User Posts');

    const response = await axios.get(
      `${API_BASE_URL}${API_PREFIX}/social-media/posts`,
      {
        params: { page: 1, limit: 20 },
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    results.push({
      name: 'Get Posts',
      success: response.data.success,
      message: `Retrieved ${response.data.data?.posts?.length || 0} posts`,
      data: {
        count: response.data.data?.posts?.length,
        pagination: response.data.data?.pagination
      }
    });

    console.log(`✅ Posts retrieved: ${response.data.data?.posts?.length}`);
    return response.data.data?.posts || [];
  } catch (error: any) {
    results.push({
      name: 'Get Posts',
      success: false,
      message: error.response?.data?.message || error.message
    });
    console.error('❌ Get posts failed:', error.response?.data || error.message);
    return [];
  }
}

async function testGetPostById(token: string, postId: string) {
  try {
    console.log('\n🔍 Testing: Get Post by ID');

    const response = await axios.get(
      `${API_BASE_URL}${API_PREFIX}/social-media/posts/${postId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    results.push({
      name: 'Get Post By ID',
      success: response.data.success,
      message: 'Post details retrieved successfully',
      data: response.data.data
    });

    console.log('✅ Post details retrieved:', postId);
    return response.data.data;
  } catch (error: any) {
    results.push({
      name: 'Get Post By ID',
      success: false,
      message: error.response?.data?.message || error.message
    });
    console.error('❌ Get post by ID failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetPlatformStats(token: string) {
  try {
    console.log('\n📊 Testing: Get Platform Statistics');

    const response = await axios.get(
      `${API_BASE_URL}${API_PREFIX}/social-media/stats`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    results.push({
      name: 'Get Platform Stats',
      success: response.data.success,
      message: 'Platform statistics retrieved successfully',
      data: response.data.data
    });

    console.log('✅ Platform stats:', response.data.data);
    return response.data.data;
  } catch (error: any) {
    results.push({
      name: 'Get Platform Stats',
      success: false,
      message: error.response?.data?.message || error.message
    });
    console.error('❌ Get platform stats failed:', error.response?.data || error.message);
    return null;
  }
}

async function testDeletePost(token: string, postId: string) {
  try {
    console.log('\n🗑️  Testing: Delete Post');

    const response = await axios.delete(
      `${API_BASE_URL}${API_PREFIX}/social-media/posts/${postId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    results.push({
      name: 'Delete Post',
      success: response.data.success,
      message: 'Post deleted successfully',
      data: response.data.data
    });

    console.log('✅ Post deleted:', postId);
    return true;
  } catch (error: any) {
    results.push({
      name: 'Delete Post',
      success: false,
      message: error.response?.data?.message || error.message
    });
    console.error('❌ Delete post failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDuplicateSubmission(token: string, postUrl: string) {
  try {
    console.log('\n🔁 Testing: Duplicate Post Submission (Should Fail)');

    const response = await axios.post(
      `${API_BASE_URL}${API_PREFIX}/social-media/submit`,
      {
        platform: 'instagram',
        postUrl
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    results.push({
      name: 'Duplicate Submission Test',
      success: false,
      message: 'Should have rejected duplicate URL but accepted it'
    });

    console.log('❌ Duplicate check failed - accepted duplicate');
    return false;
  } catch (error: any) {
    if (error.response?.status === 409) {
      results.push({
        name: 'Duplicate Submission Test',
        success: true,
        message: 'Correctly rejected duplicate URL'
      });
      console.log('✅ Duplicate check passed - rejected duplicate URL');
      return true;
    } else {
      results.push({
        name: 'Duplicate Submission Test',
        success: false,
        message: error.response?.data?.message || error.message
      });
      console.error('❌ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testInvalidPlatformUrl(token: string) {
  try {
    console.log('\n🚫 Testing: Invalid Platform URL (Should Fail)');

    const response = await axios.post(
      `${API_BASE_URL}${API_PREFIX}/social-media/submit`,
      {
        platform: 'instagram',
        postUrl: 'https://facebook.com/invalid'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    results.push({
      name: 'Invalid URL Validation Test',
      success: false,
      message: 'Should have rejected invalid URL but accepted it'
    });

    console.log('❌ URL validation failed - accepted invalid URL');
    return false;
  } catch (error: any) {
    if (error.response?.status === 400) {
      results.push({
        name: 'Invalid URL Validation Test',
        success: true,
        message: 'Correctly rejected invalid platform URL'
      });
      console.log('✅ URL validation passed - rejected invalid URL');
      return true;
    } else {
      results.push({
        name: 'Invalid URL Validation Test',
        success: false,
        message: error.response?.data?.message || error.message
      });
      console.error('❌ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
}

function printResults() {
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`\n${index + 1}. ${status} ${result.name}`);
    console.log(`   Message: ${result.message}`);
    if (result.data) {
      console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL: ${successCount}/${totalCount} tests passed`);
  console.log('='.repeat(80) + '\n');

  if (successCount === totalCount) {
    console.log('🎉 All tests passed! Social Media API is production ready.\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
  }
}

async function runTests() {
  console.log('🚀 Starting Social Media API Integration Tests\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Using provided JWT token\n`);

  try {
    // Use provided token
    const token = TEST_TOKEN;
    console.log('✅ Using provided authentication token\n');

    // Step 2: Submit a post
    const postId = await testSubmitPost(token);

    // Step 3: Get earnings
    await testGetEarnings(token);

    // Step 4: Get all posts
    const posts = await testGetPosts(token);

    // Step 5: Get post by ID (if we created one)
    if (postId) {
      await testGetPostById(token, postId);
    }

    // Step 6: Get platform stats
    await testGetPlatformStats(token);

    // Step 7: Test duplicate submission
    if (posts.length > 0) {
      await testDuplicateSubmission(token, posts[0].postUrl);
    }

    // Step 8: Test invalid URL
    await testInvalidPlatformUrl(token);

    // Step 9: Delete the test post (if created and still pending)
    if (postId) {
      await testDeletePost(token, postId);
    }

    // Print results
    printResults();

  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();

