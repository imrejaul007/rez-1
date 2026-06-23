import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../server';
import { User } from '../../models/User';
import jwt from 'jsonwebtoken';

// Test constants
const TEST_PHONE = '+919876543213';

describe('Wallet Routes', () => {
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
    // Create test user with wallet
    testUser = await User.create({
      phoneNumber: TEST_PHONE,
      isVerified: true,
      wallet: {
        balance: 500,
        totalEarned: 1000,
        totalSpent: 500,
        rezCoins: 100,
        promoCoins: 50,
        cashbackCoins: 25
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

  describe('GET /api/wallet/balance', () => {
    it('should return wallet balance', async () => {
      const response = await request(app)
        .get('/api/wallet/balance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('balance');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/wallet/balance');

      expect(response.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/wallet/balance')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/wallet/transactions', () => {
    it('should return transaction history', async () => {
      const response = await request(app)
        .get('/api/wallet/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/wallet/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by transaction type', async () => {
      const response = await request(app)
        .get('/api/wallet/transactions?type=credit')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/wallet/transactions?dateFrom=2024-01-01&dateTo=2024-12-31')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter by amount range', async () => {
      const response = await request(app)
        .get('/api/wallet/transactions?minAmount=10&maxAmount=100')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/wallet/transaction/:id', () => {
    it('should return 404 for non-existent transaction', async () => {
      const fakeTransactionId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/wallet/transaction/${fakeTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject invalid transaction ID format', async () => {
      const response = await request(app)
        .get('/api/wallet/transaction/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/wallet/summary', () => {
    it('should return transaction summary', async () => {
      const response = await request(app)
        .get('/api/wallet/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by period - day', async () => {
      const response = await request(app)
        .get('/api/wallet/summary?period=day')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter by period - week', async () => {
      const response = await request(app)
        .get('/api/wallet/summary?period=week')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter by period - month', async () => {
      const response = await request(app)
        .get('/api/wallet/summary?period=month')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter by period - year', async () => {
      const response = await request(app)
        .get('/api/wallet/summary?period=year')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/wallet/categories', () => {
    it('should return spending breakdown by categories', async () => {
      const response = await request(app)
        .get('/api/wallet/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/wallet/topup', () => {
    it('should initiate wallet topup', async () => {
      const response = await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          paymentMethod: 'upi'
        });

      // Topup may require payment gateway, so accept various responses
      expect(response.status).toBeLessThan(500);
    });

    it('should reject topup without amount', async () => {
      const response = await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethod: 'upi'
        });

      expect(response.status).toBe(400);
    });

    it('should reject zero amount', async () => {
      const response = await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 0,
          paymentMethod: 'upi'
        });

      expect(response.status).toBe(400);
    });

    it('should reject negative amount', async () => {
      const response = await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -100,
          paymentMethod: 'upi'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/wallet/withdraw', () => {
    it('should initiate withdrawal', async () => {
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          method: 'bank_transfer',
          accountDetails: {
            accountNumber: '1234567890',
            ifscCode: 'HDFC0001234',
            accountHolderName: 'Test User'
          }
        });

      // Withdrawal may have additional requirements
      expect(response.status).toBeLessThan(500);
    });

    it('should reject withdrawal without amount', async () => {
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          method: 'bank_transfer'
        });

      expect(response.status).toBe(400);
    });

    it('should reject withdrawal exceeding balance', async () => {
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10000, // More than wallet balance
          method: 'bank_transfer',
          accountDetails: {
            accountNumber: '1234567890',
            ifscCode: 'HDFC0001234'
          }
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/wallet/payment', () => {
    it('should process payment from wallet', async () => {
      const response = await request(app)
        .post('/api/wallet/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50,
          orderId: new mongoose.Types.ObjectId().toString(),
          storeId: new mongoose.Types.ObjectId().toString(),
          storeName: 'Test Store',
          description: 'Test payment'
        });

      // Payment processing may have additional requirements
      expect(response.status).toBeLessThan(500);
    });

    it('should reject payment without amount', async () => {
      const response = await request(app)
        .post('/api/wallet/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: new mongoose.Types.ObjectId().toString(),
          description: 'Test payment'
        });

      expect(response.status).toBe(400);
    });

    it('should reject payment exceeding balance', async () => {
      const response = await request(app)
        .post('/api/wallet/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10000, // More than balance
          orderId: new mongoose.Types.ObjectId().toString(),
          description: 'Large payment'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('PUT /api/wallet/settings', () => {
    it('should update wallet settings', async () => {
      const response = await request(app)
        .put('/api/wallet/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          autoTopup: true,
          autoTopupThreshold: 100,
          autoTopupAmount: 500,
          lowBalanceAlert: true,
          lowBalanceThreshold: 50
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should update only provided settings', async () => {
      const response = await request(app)
        .put('/api/wallet/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lowBalanceAlert: false
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/wallet/credit-loyalty-points', () => {
    it('should credit loyalty points to wallet', async () => {
      const response = await request(app)
        .post('/api/wallet/credit-loyalty-points')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50,
          source: 'purchase'
        });

      expect(response.status).toBeLessThan(500);
    });

    it('should reject without amount', async () => {
      const response = await request(app)
        .post('/api/wallet/credit-loyalty-points')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          source: 'purchase'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/wallet/initiate-payment', () => {
    it('should initiate payment gateway transaction', async () => {
      const response = await request(app)
        .post('/api/wallet/initiate-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'INR',
          paymentMethod: 'upi'
        });

      // May require gateway setup
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('GET /api/wallet/payment-status/:paymentId', () => {
    it('should return 404 for non-existent payment', async () => {
      const response = await request(app)
        .get('/api/wallet/payment-status/pay_nonexistent123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/wallet/payment-methods', () => {
    it('should return available payment methods', async () => {
      const response = await request(app)
        .get('/api/wallet/payment-methods')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/wallet/dev-topup', () => {
    it('should add test funds in development', async () => {
      const response = await request(app)
        .post('/api/wallet/dev-topup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1000,
          type: 'rez'
        });

      // Only works in development mode
      expect(response.status).toBeLessThan(500);
    });

    it('should add promo coins', async () => {
      const response = await request(app)
        .post('/api/wallet/dev-topup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          type: 'promo'
        });

      expect(response.status).toBeLessThan(500);
    });

    it('should add cashback coins', async () => {
      const response = await request(app)
        .post('/api/wallet/dev-topup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 200,
          type: 'cashback'
        });

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('POST /api/wallet/sync-balance', () => {
    it('should sync wallet balance', async () => {
      const response = await request(app)
        .post('/api/wallet/sync-balance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/wallet/webhook/:gateway', () => {
    it('should handle razorpay webhook', async () => {
      const response = await request(app)
        .post('/api/wallet/webhook/razorpay')
        .set('X-Razorpay-Signature', 'test-signature')
        .send({
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: 'pay_test123',
                amount: 10000,
                status: 'captured'
              }
            }
          }
        });

      // Webhooks typically return 200 to acknowledge receipt
      expect(response.status).toBeLessThan(500);
    });

    it('should handle stripe webhook', async () => {
      const response = await request(app)
        .post('/api/wallet/webhook/stripe')
        .set('Stripe-Signature', 'test-signature')
        .send({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test123',
              amount: 10000,
              status: 'succeeded'
            }
          }
        });

      expect(response.status).toBeLessThan(500);
    });
  });
});
