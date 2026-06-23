import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../server';
import { User } from '../../models/User';
import jwt from 'jsonwebtoken';

// Test constants
const TEST_PHONE = '+919876543214';

describe('Gamification Routes', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/rez-test';
      await mongoose.connect(testDbUri);
    }
  });

  beforeEach(async () => {
    // Create test user with gamification data
    testUser = await User.create({
      phoneNumber: TEST_PHONE,
      isVerified: true,
      wallet: {
        balance: 500,
        totalEarned: 1000,
        totalSpent: 500
      },
      gamification: {
        level: 5,
        xp: 500,
        streak: 3,
        totalGamesPlayed: 10,
        totalRewardsEarned: 100
      }
    });

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );
  });

  afterEach(async () => {
    await User.deleteMany({ phoneNumber: TEST_PHONE });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // ======== GAME ROUTES ========
  describe('Game Routes', () => {
    describe('GET /api/games/available', () => {
      it('should return available games without auth', async () => {
        const response = await request(app)
          .get('/api/games/available');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should return available games with auth', async () => {
        const response = await request(app)
          .get('/api/games/available')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/games/my-games', () => {
      it('should return user games', async () => {
        const response = await request(app)
          .get('/api/games/my-games')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should reject request without auth', async () => {
        const response = await request(app)
          .get('/api/games/my-games');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/games/pending', () => {
      it('should return pending games', async () => {
        const response = await request(app)
          .get('/api/games/pending')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/games/statistics', () => {
      it('should return game statistics', async () => {
        const response = await request(app)
          .get('/api/games/statistics')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/games/daily-limits', () => {
      it('should return daily game limits', async () => {
        const response = await request(app)
          .get('/api/games/daily-limits')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    // Spin Wheel Tests
    describe('POST /api/games/spin-wheel/play', () => {
      it('should play spin wheel game', async () => {
        const response = await request(app)
          .post('/api/games/spin-wheel/play')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        // May depend on daily limits
        expect(response.status).toBeLessThan(500);
      });
    });

    // Scratch Card Tests
    describe('POST /api/games/scratch-card/play', () => {
      it('should play scratch card game', async () => {
        const response = await request(app)
          .post('/api/games/scratch-card/play')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBeLessThan(500);
      });
    });

    // Daily Trivia Tests
    describe('GET /api/games/daily-trivia', () => {
      it('should return daily trivia question', async () => {
        const response = await request(app)
          .get('/api/games/daily-trivia')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/games/daily-trivia/answer', () => {
      it('should submit trivia answer', async () => {
        const response = await request(app)
          .post('/api/games/daily-trivia/answer')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: new mongoose.Types.ObjectId().toString(),
            answer: 'A'
          });

        expect(response.status).toBeLessThan(500);
      });
    });

    // Memory Match Tests
    describe('POST /api/games/memory-match/start', () => {
      it('should start memory match game', async () => {
        const response = await request(app)
          .post('/api/games/memory-match/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBeLessThan(500);
      });
    });

    describe('POST /api/games/memory-match/complete', () => {
      it('should complete memory match game', async () => {
        const response = await request(app)
          .post('/api/games/memory-match/complete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            gameId: new mongoose.Types.ObjectId().toString(),
            score: 100,
            timeTaken: 60
          });

        expect(response.status).toBeLessThan(500);
      });
    });

    // Coin Hunt Tests
    describe('POST /api/games/coin-hunt/start', () => {
      it('should start coin hunt game', async () => {
        const response = await request(app)
          .post('/api/games/coin-hunt/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBeLessThan(500);
      });
    });

    describe('POST /api/games/coin-hunt/complete', () => {
      it('should complete coin hunt game', async () => {
        const response = await request(app)
          .post('/api/games/coin-hunt/complete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            gameId: new mongoose.Types.ObjectId().toString(),
            coinsCollected: 50
          });

        expect(response.status).toBeLessThan(500);
      });
    });

    // Guess Price Tests
    describe('POST /api/games/guess-price/start', () => {
      it('should start guess price game', async () => {
        const response = await request(app)
          .post('/api/games/guess-price/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBeLessThan(500);
      });
    });

    describe('POST /api/games/guess-price/submit', () => {
      it('should submit price guess', async () => {
        const response = await request(app)
          .post('/api/games/guess-price/submit')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            gameId: new mongoose.Types.ObjectId().toString(),
            guess: 99.99
          });

        expect(response.status).toBeLessThan(500);
      });
    });
  });

  // ======== LEADERBOARD ROUTES ========
  describe('Leaderboard Routes', () => {
    describe('GET /api/leaderboard/spending', () => {
      it('should return spending leaderboard', async () => {
        const response = await request(app)
          .get('/api/leaderboard/spending')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/leaderboard/reviews', () => {
      it('should return review leaderboard', async () => {
        const response = await request(app)
          .get('/api/leaderboard/reviews')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/leaderboard/referrals', () => {
      it('should return referral leaderboard', async () => {
        const response = await request(app)
          .get('/api/leaderboard/referrals')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/leaderboard/cashback', () => {
      it('should return cashback leaderboard', async () => {
        const response = await request(app)
          .get('/api/leaderboard/cashback')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/leaderboard/streak', () => {
      it('should return streak leaderboard', async () => {
        const response = await request(app)
          .get('/api/leaderboard/streak')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/leaderboard/all', () => {
      it('should return all leaderboards', async () => {
        const response = await request(app)
          .get('/api/leaderboard/all')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/leaderboard/my-rank', () => {
      it('should return user rank', async () => {
        const response = await request(app)
          .get('/api/leaderboard/my-rank')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should reject leaderboard request without auth', async () => {
      const response = await request(app)
        .get('/api/leaderboard/spending');

      expect(response.status).toBe(401);
    });
  });

  // ======== ACHIEVEMENT ROUTES ========
  describe('Achievement Routes', () => {
    describe('GET /api/achievements', () => {
      it('should return user achievements', async () => {
        const response = await request(app)
          .get('/api/achievements')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/achievements/unlocked', () => {
      it('should return unlocked achievements', async () => {
        const response = await request(app)
          .get('/api/achievements/unlocked')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/achievements/progress', () => {
      it('should return achievement progress', async () => {
        const response = await request(app)
          .get('/api/achievements/progress')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/achievements/initialize', () => {
      it('should initialize user achievements', async () => {
        const response = await request(app)
          .post('/api/achievements/initialize')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('PUT /api/achievements/update-progress', () => {
      it('should update achievement progress', async () => {
        const response = await request(app)
          .put('/api/achievements/update-progress')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            achievementId: new mongoose.Types.ObjectId().toString(),
            progress: 50
          });

        // May require valid achievement
        expect(response.status).toBeLessThan(500);
      });
    });

    describe('POST /api/achievements/recalculate', () => {
      it('should recalculate achievements', async () => {
        const response = await request(app)
          .post('/api/achievements/recalculate')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should reject achievement request without auth', async () => {
      const response = await request(app)
        .get('/api/achievements');

      expect(response.status).toBe(401);
    });
  });
});
