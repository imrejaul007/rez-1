/**
 * Test Script for Product Integration
 *
 * This script tests the new product features including:
 * - Analytics tracking
 * - Cashback calculations
 * - Delivery estimations
 * - Frequently bought together
 * - Bundle products
 */

import axios from 'axios';
import { Product } from '../src/models/Product';
import mongoose from 'mongoose';

const API_URL = process.env.API_URL || 'http://localhost:5001/api';
const TOKEN = '<JWT_TOKEN_REDACTED>';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

interface TestResult {
  test: string;
  status: 'passed' | 'failed';
  message?: string;
  data?: any;
}

const results: TestResult[] = [];

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function testProductAPIs() {
  console.log('\n🧪 Testing Product APIs...\n');

  try {
    // 1. Get featured products
    console.log('📍 Test 1: Get Featured Products');
    const featuredRes = await axios.get(`${API_URL}/products/featured`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      params: { limit: 5 }
    });

    results.push({
      test: 'Get Featured Products',
      status: featuredRes.data.success ? 'passed' : 'failed',
      message: `Found ${featuredRes.data.data?.length || 0} featured products`,
      data: featuredRes.data.data?.slice(0, 2)
    });

    // 2. Get a specific product with new fields
    const productId = featuredRes.data.data?.[0]?.id;
    if (productId) {
      console.log('📍 Test 2: Get Product Details with New Fields');
      const productRes = await axios.get(`${API_URL}/products/${productId}`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });

      const product = productRes.data.data;
      const hasNewFields = !!(
        product.cashback &&
        product.deliveryInfo &&
        product.analytics
      );

      results.push({
        test: 'Get Product with New Fields',
        status: hasNewFields ? 'passed' : 'failed',
        message: hasNewFields ? 'Product has new fields' : 'Missing new fields',
        data: {
          cashback: product.cashback,
          deliveryInfo: product.deliveryInfo,
          todayPurchases: product.todayPurchases,
          todayViews: product.todayViews,
          computedCashback: product.computedCashback,
          computedDelivery: product.computedDelivery
        }
      });

      // 3. Track product view
      console.log('📍 Test 3: Track Product View');
      const trackRes = await axios.post(`${API_URL}/products/${productId}/track-view`, {}, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });

      results.push({
        test: 'Track Product View',
        status: trackRes.data.success ? 'passed' : 'failed',
        message: `Views: ${trackRes.data.data?.views}, Today: ${trackRes.data.data?.todayViews}`,
        data: trackRes.data.data
      });

      // 4. Get product analytics
      console.log('📍 Test 4: Get Product Analytics');
      const analyticsRes = await axios.get(`${API_URL}/products/${productId}/analytics`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
        params: { location: JSON.stringify({ city: 'Bangalore' }) }
      });

      results.push({
        test: 'Get Product Analytics',
        status: analyticsRes.data.success ? 'passed' : 'failed',
        message: 'Analytics retrieved successfully',
        data: analyticsRes.data.data
      });

      // 5. Get frequently bought together
      console.log('📍 Test 5: Get Frequently Bought Together');
      const frequentRes = await axios.get(`${API_URL}/products/${productId}/frequently-bought`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
        params: { limit: 3 }
      });

      results.push({
        test: 'Get Frequently Bought Together',
        status: frequentRes.data.success ? 'passed' : 'failed',
        message: `Found ${frequentRes.data.data?.length || 0} related products`,
        data: frequentRes.data.data?.length
      });

      // 6. Get bundle products
      console.log('📍 Test 6: Get Bundle Products');
      const bundleRes = await axios.get(`${API_URL}/products/${productId}/bundles`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });

      results.push({
        test: 'Get Bundle Products',
        status: bundleRes.data.success ? 'passed' : 'failed',
        message: bundleRes.data.message,
        data: {
          bundleCount: bundleRes.data.data?.bundleProducts?.length || 0,
          bundleDiscount: bundleRes.data.data?.bundleDiscount
        }
      });
    }

    // 7. Test search with new fields
    console.log('📍 Test 7: Search Products with Enhanced Data');
    const searchRes = await axios.get(`${API_URL}/products/search`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      params: { q: 'pizza', limit: 5 }
    });

    results.push({
      test: 'Search Products',
      status: searchRes.data.success ? 'passed' : 'failed',
      message: `Found ${searchRes.data.data?.products?.length || 0} products`,
      data: searchRes.data.data?.products?.length
    });

  } catch (error: any) {
    console.error('❌ API Test Error:', error.response?.data || error.message);
    results.push({
      test: 'API Tests',
      status: 'failed',
      message: error.message
    });
  }
}

async function updateSampleProducts() {
  console.log('\n🔧 Updating Sample Products with New Fields...\n');

  try {
    // Update a few products with cashback and delivery info
    const products = await Product.find().limit(5);

    for (const product of products) {
      // Add cashback
      if (!product.cashback) {
        product.cashback = {
          percentage: Math.floor(Math.random() * 10) + 5, // 5-15%
          maxAmount: Math.floor(Math.random() * 500) + 100, // 100-600
          minPurchase: 100
        };
      }

      // Add delivery info
      if (!product.deliveryInfo) {
        product.deliveryInfo = {
          estimatedDays: ['Under 30min', '1-2 days', '2-3 days'][Math.floor(Math.random() * 3)],
          freeShippingThreshold: 500,
          expressAvailable: Math.random() > 0.5,
          standardDeliveryTime: '2-3 days',
          expressDeliveryTime: 'Under 30min'
        };
      }

      // Initialize analytics if not present
      if (!product.analytics.todayPurchases) {
        product.analytics.todayPurchases = Math.floor(Math.random() * 100) + 50;
        product.analytics.todayViews = Math.floor(Math.random() * 500) + 100;
        product.analytics.lastResetDate = new Date();
      }

      await product.save();
      console.log(`✅ Updated product: ${product.name}`);
    }

    results.push({
      test: 'Update Sample Products',
      status: 'passed',
      message: `Updated ${products.length} products with new fields`
    });

  } catch (error: any) {
    console.error('❌ Update Error:', error.message);
    results.push({
      test: 'Update Sample Products',
      status: 'failed',
      message: error.message
    });
  }
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;

  results.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.status.toUpperCase()}`);
    if (result.message) {
      console.log(`   ${result.message}`);
    }
    if (result.data) {
      console.log(`   Data:`, JSON.stringify(result.data, null, 2).split('\n').map(line => '   ' + line).join('\n'));
    }
    console.log();
  });

  console.log('='.repeat(60));
  console.log(`TOTAL: ${passed} passed, ${failed} failed out of ${results.length} tests`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  } else {
    console.log('\n🎉 All tests passed! Product integration is working correctly.');
  }
}

async function main() {
  try {
    console.log('🚀 Starting Product Integration Tests...\n');

    // Connect to database
    await connectDB();

    // Update sample products with new fields
    await updateSampleProducts();

    // Test APIs
    await testProductAPIs();

    // Print results
    printResults();

    // Close connection
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);
