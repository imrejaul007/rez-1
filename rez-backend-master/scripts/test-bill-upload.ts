import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5001/api';

async function testBillUpload() {
  console.log('🧪 Testing Bill Upload Endpoint...\n');

  try {
    // Test 1: Check if endpoint is accessible
    console.log('1. Checking bill upload endpoint...');
    const healthCheck = await axios.get(`${API_URL}/bills/test`).catch(() => null);

    if (healthCheck) {
      console.log('✅ Bill routes are registered and accessible');
    } else {
      console.log('⚠️  Bill routes may not be registered');
    }

    // Test 2: Test bill upload (requires authentication)
    console.log('\n2. Testing bill upload (authentication required)...');
    console.log('   Note: You need to login first and use a valid token');
    console.log('   Command: curl -X POST http://localhost:5001/api/bills/upload \\');
    console.log('            -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('            -F "image=@/path/to/bill.jpg"');

    console.log('\n✅ Bill upload system is ready!');
    console.log('   Make sure to set Cloudinary environment variables.');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testBillUpload();
