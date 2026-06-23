const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
require('dotenv').config();

const API_BASE = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';

// Test user (has transactions)
const TEST_USER_ID = '68c145d5f016515d8eb31c0c'; // Mukul Raj - has 10 transactions

async function testTransactionAPI() {
  try {
    console.log('🧪 Testing Transaction API\n');
    console.log('========================================\n');

    // Generate a valid token for test user
    const token = jwt.sign(
      { userId: TEST_USER_ID, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🔐 Generated test token for user:', TEST_USER_ID);
    console.log('📝 Token (first 50 chars):', token.substring(0, 50) + '...\n');

    // Test 1: Get wallet balance
    console.log('Test 1: GET /api/wallet/balance');
    console.log('----------------------------------------');
    const balanceResponse = await fetch(`${API_BASE}/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const balanceData = await balanceResponse.json();
    console.log('Status:', balanceResponse.status, balanceResponse.statusText);
    console.log('Response:', JSON.stringify(balanceData, null, 2));
    console.log('\n');

    // Test 2: Get transactions (page 1)
    console.log('Test 2: GET /api/wallet/transactions?page=1&limit=5');
    console.log('----------------------------------------');
    const transactionsResponse = await fetch(`${API_BASE}/wallet/transactions?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const transactionsData = await transactionsResponse.json();
    console.log('Status:', transactionsResponse.status, transactionsResponse.statusText);
    if (transactionsData.success) {
      console.log('Success: ✅');
      console.log('Transactions found:', transactionsData.data.transactions.length);
      console.log('Total transactions:', transactionsData.data.pagination.total);
      console.log('\nSample transactions:');
      transactionsData.data.transactions.slice(0, 3).forEach((tx, i) => {
        console.log(`\n  ${i + 1}. ${tx.transactionId}`);
        console.log(`     Type: ${tx.type} | Amount: ${tx.amount} RC`);
        console.log(`     Description: ${tx.description}`);
        console.log(`     Status: ${tx.status.current}`);
        console.log(`     Date: ${tx.createdAt}`);
      });
    } else {
      console.log('Error: ❌');
      console.log('Response:', JSON.stringify(transactionsData, null, 2));
    }
    console.log('\n');

    // Test 3: Get transactions with filters (credit only)
    console.log('Test 3: GET /api/wallet/transactions?type=credit&limit=3');
    console.log('----------------------------------------');
    const creditResponse = await fetch(`${API_BASE}/wallet/transactions?type=credit&limit=3`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const creditData = await creditResponse.json();
    console.log('Status:', creditResponse.status, creditResponse.statusText);
    if (creditData.success) {
      console.log('Success: ✅');
      console.log('Credit transactions:', creditData.data.transactions.length);
      creditData.data.transactions.forEach((tx, i) => {
        console.log(`  ${i + 1}. ${tx.type} - ${tx.amount} RC (${tx.description})`);
      });
    }
    console.log('\n');

    // Test 4: Get transaction summary
    console.log('Test 4: GET /api/wallet/summary?period=month');
    console.log('----------------------------------------');
    const summaryResponse = await fetch(`${API_BASE}/wallet/summary?period=month`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const summaryData = await summaryResponse.json();
    console.log('Status:', summaryResponse.status, summaryResponse.statusText);
    if (summaryData.success) {
      console.log('Success: ✅');
      console.log('Summary:', JSON.stringify(summaryData.data.summary, null, 2));
    }
    console.log('\n');

    // Test 5: Test without token (should fail)
    console.log('Test 5: GET /api/wallet/transactions (no token)');
    console.log('----------------------------------------');
    const noTokenResponse = await fetch(`${API_BASE}/wallet/transactions`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const noTokenData = await noTokenResponse.json();
    console.log('Status:', noTokenResponse.status, noTokenResponse.statusText);
    console.log('Expected: 401 Unauthorized ✅');
    console.log('Response:', JSON.stringify(noTokenData, null, 2));
    console.log('\n');

    console.log('========================================');
    console.log('✅ All API tests complete!\n');
    console.log('💡 Tips:');
    console.log('   - If all tests pass, the transaction API is working');
    console.log('   - If test 5 returns 401, authentication is working correctly');
    console.log('   - Use this token in your frontend for testing:');
    console.log(`   - ${token}\n`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Make sure the backend server is running on port 5001');
    process.exit(1);
  }
}

testTransactionAPI();
