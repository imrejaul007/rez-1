// Quick test to verify endpoints
import axios from 'axios';

const TOKEN = '<JWT_TOKEN_REDACTED>';

async function quickTest() {
  console.log('\n🧪 QUICK ENDPOINT TEST\n');

  const endpoints = [
    { name: 'Offers', url: 'http://localhost:5001/api/offers', auth: false },
    { name: 'Referral Code', url: 'http://localhost:5001/api/referral/code', auth: true },
    { name: 'Referral Stats', url: 'http://localhost:5001/api/referral/stats', auth: true },
    { name: 'Referral Data', url: 'http://localhost:5001/api/referral/data', auth: true },
  ];

  for (const endpoint of endpoints) {
    try {
      const config: any = {
        url: endpoint.url,
        headers: endpoint.auth ? { Authorization: `Bearer ${TOKEN}` } : {}
      };

      const response = await axios(config);
      const status = response.data.success === false ? '❌' : '✅';
      const count = Array.isArray(response.data.data) ?
        ` (${response.data.data.length} items)` : '';

      console.log(`${status} ${endpoint.name}${count}`);

      if (response.data.success === false) {
        console.log(`   Error: ${response.data.message}`);
      }
    } catch (error: any) {
      console.log(`❌ ${endpoint.name}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }

  console.log('\n💡 If referral endpoints show 404, try:');
  console.log('   1. Stop backend (Ctrl+C)');
  console.log('   2. Run: npm run dev');
  console.log('   3. Or type "rs" in nodemon console\n');
}

quickTest();
