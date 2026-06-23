import axios from 'axios';
import * as readline from 'readline';

const API_URL = process.env.API_URL || 'http://localhost:5001/api';
let authToken = '';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testGamification() {
  console.log('🧪 Testing Unified Gamification System...\n');

  try {
    // Get auth token from user
    authToken = await question('Enter your auth token (or press Enter to use default): ');

    if (!authToken.trim()) {
      console.log('⚠️  No token provided. Some tests may fail.\n');
      authToken = 'YOUR_AUTH_TOKEN';
    }

    const headers = { Authorization: `Bearer ${authToken}` };

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test 1: Get Challenges
    console.log('1️⃣  Testing Challenges Endpoint');
    console.log('GET /api/gamification/challenges');
    try {
      const challenges = await axios.get(`${API_URL}/gamification/challenges`, { headers });
      console.log(`✅ Found ${challenges.data.data?.length || 0} challenges`);
      if (challenges.data.data?.[0]) {
        console.log(`   Example: ${challenges.data.data[0].title}`);
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Test 2: Get Achievements
    console.log('2️⃣  Testing Achievements Endpoint');
    console.log('GET /api/gamification/achievements');
    try {
      const achievements = await axios.get(`${API_URL}/gamification/achievements`, { headers });
      console.log(`✅ Found ${achievements.data.data?.length || 0} achievement definitions`);
      if (achievements.data.data?.[0]) {
        console.log(`   Example: ${achievements.data.data[0].title}`);
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Test 3: Get Leaderboard
    console.log('3️⃣  Testing Leaderboard Endpoint');
    console.log('GET /api/gamification/leaderboard?type=coins&period=weekly');
    try {
      const leaderboard = await axios.get(`${API_URL}/gamification/leaderboard?type=coins&period=weekly`, { headers });
      console.log(`✅ Leaderboard has ${leaderboard.data.data?.length || 0} entries`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Test 4: Get Coin Balance
    console.log('4️⃣  Testing Coin Balance Endpoint');
    console.log('GET /api/gamification/coins/balance');
    try {
      const coins = await axios.get(`${API_URL}/gamification/coins/balance`, { headers });
      console.log(`✅ Current coin balance: ${coins.data.data?.balance || 0}`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Test 5: Get Coin Transactions
    console.log('5️⃣  Testing Coin Transactions Endpoint');
    console.log('GET /api/gamification/coins/transactions');
    try {
      const transactions = await axios.get(`${API_URL}/gamification/coins/transactions`, { headers });
      console.log(`✅ Found ${transactions.data.data?.transactions?.length || 0} transactions`);
      console.log(`   Total: ${transactions.data.data?.total || 0}`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Test 6: Check Spin Wheel Eligibility
    console.log('6️⃣  Testing Spin Wheel Eligibility');
    console.log('GET /api/gamification/spin-wheel/eligibility');
    try {
      const spinEligibility = await axios.get(`${API_URL}/gamification/spin-wheel/eligibility`, { headers });
      console.log(`✅ Eligible: ${spinEligibility.data.data?.eligible}`);
      if (!spinEligibility.data.data?.eligible) {
        console.log(`   Reason: ${spinEligibility.data.data?.reason}`);
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Test 7: Create Spin Wheel Session
    console.log('7️⃣  Testing Spin Wheel Creation');
    console.log('POST /api/gamification/spin-wheel/create');
    try {
      const createSpin = await axios.post(`${API_URL}/gamification/spin-wheel/create`, {}, { headers });
      console.log(`✅ Spin wheel session created`);
      console.log(`   Session ID: ${createSpin.data.data?.sessionId}`);
      console.log(`   Expires at: ${createSpin.data.data?.expiresAt}`);

      // Test 7b: Spin the wheel
      if (createSpin.data.data?.sessionId) {
        console.log('\n   7b. Spinning the wheel...');
        try {
          const spinResult = await axios.post(
            `${API_URL}/gamification/spin-wheel/spin`,
            { sessionId: createSpin.data.data.sessionId },
            { headers }
          );
          console.log(`   ✅ Spin result: ${spinResult.data.data?.prize}`);
          console.log(`      Value: ${spinResult.data.data?.value}`);
        } catch (spinError: any) {
          console.log(`   ❌ Spin failed: ${spinError.response?.data?.message || spinError.message}`);
        }
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Test 8: Create Scratch Card
    console.log('8️⃣  Testing Scratch Card Creation');
    console.log('POST /api/gamification/scratch-card/create');
    try {
      const createScratch = await axios.post(`${API_URL}/gamification/scratch-card/create`, {}, { headers });
      console.log(`✅ Scratch card created`);
      console.log(`   Session ID: ${createScratch.data.data?.sessionId}`);
      console.log(`   Grid size: ${createScratch.data.data?.gridSize}x${createScratch.data.data?.gridSize}`);

      // Test 8b: Scratch a cell
      if (createScratch.data.data?.sessionId) {
        console.log('\n   8b. Scratching cell 4 (center)...');
        try {
          const scratchResult = await axios.post(
            `${API_URL}/gamification/scratch-card/scratch`,
            {
              sessionId: createScratch.data.data.sessionId,
              cellIndex: 4
            },
            { headers }
          );
          console.log(`   ✅ Cell scratched successfully`);
          console.log(`      Prize: ${scratchResult.data.data?.cellData?.prize}`);
          console.log(`      Won: ${scratchResult.data.data?.won}`);
        } catch (scratchError: any) {
          console.log(`   ❌ Scratch failed: ${scratchError.response?.data?.message || scratchError.message}`);
        }
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Test 9: Start Quiz
    console.log('9️⃣  Testing Quiz Game');
    console.log('POST /api/gamification/quiz/start');
    try {
      const startQuiz = await axios.post(
        `${API_URL}/gamification/quiz/start`,
        { difficulty: 'easy', questionCount: 3 },
        { headers }
      );
      console.log(`✅ Quiz started`);
      console.log(`   Quiz ID: ${startQuiz.data.data?.quizId}`);
      console.log(`   Questions: ${startQuiz.data.data?.totalQuestions}`);
      console.log(`   Time limit: ${startQuiz.data.data?.timeLimit}s per question`);

      if (startQuiz.data.data?.questions?.[0]) {
        const firstQuestion = startQuiz.data.data.questions[0];
        console.log(`\n   First question: ${firstQuestion.question}`);
        firstQuestion.options?.forEach((opt: string, idx: number) => {
          console.log(`      ${idx}. ${opt}`);
        });

        // Test 9b: Submit answer
        if (startQuiz.data.data?.quizId) {
          console.log('\n   9b. Submitting answer (option 1)...');
          try {
            const answerResult = await axios.post(
              `${API_URL}/gamification/quiz/${startQuiz.data.data.quizId}/answer`,
              {
                questionIndex: 0,
                answer: 1,
                timeSpent: 5
              },
              { headers }
            );
            console.log(`   ✅ Answer submitted`);
            console.log(`      Correct: ${answerResult.data.data?.correct}`);
            console.log(`      Coins earned: ${answerResult.data.data?.coinsEarned}`);
            console.log(`      Current score: ${answerResult.data.data?.currentScore}`);
          } catch (answerError: any) {
            console.log(`   ❌ Answer submission failed: ${answerError.response?.data?.message || answerError.message}`);
          }
        }
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Test 10: Get Badges
    console.log('🔟 Testing Badges Endpoint');
    console.log('GET /api/gamification/badges');
    try {
      const badges = await axios.get(`${API_URL}/gamification/badges`, { headers });
      console.log(`✅ Found ${badges.data.data?.length || 0} badge definitions`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ All gamification endpoint tests completed!\n');
    console.log('Summary of tested endpoints:');
    console.log('  ✓ Challenges');
    console.log('  ✓ Achievements');
    console.log('  ✓ Leaderboard');
    console.log('  ✓ Coins (balance & transactions)');
    console.log('  ✓ Spin Wheel');
    console.log('  ✓ Scratch Card');
    console.log('  ✓ Quiz Game');
    console.log('  ✓ Badges');
    console.log('');

  } catch (error: any) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run the tests
testGamification().catch(console.error);
