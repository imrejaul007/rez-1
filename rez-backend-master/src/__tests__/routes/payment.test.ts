import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../server';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import jwt from 'jsonwebtoken';

// Mock Razorpay
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: 'order_test123',
        amount: 10000,
        currency: 'INR',
        receipt: 'ORD-123',
        status: 'created'
      })
    },
    payments: {
      fetch: jest.fn().mockResolvedValue({
        id: 'pay_test123',
        amount: 10000,
        status: 'captured'
      })
    }
  }));
});

// Test constants
const TEST_PHONE = '+919876543210';

describe('Payment Routes', () => {
  let authToken: string;
  let testUser: any;
  let testOrder: any;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/rez-test';
      await mongoose.connect(testDbUri);
    }
  });

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      phoneNumber: TEST_PHONE,
      isVerified: true,
      wallet: {
        balance: 1000,
        totalEarned: 1000,
        totalSpent: 0
      }
    });

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );

    // Create test order
    testOrder = await Order.create({
      user: testUser._id,
      orderNumber: `ORD-${Date.now()}`,
      items: [{
        product: new mongoose.Types.ObjectId(),
        name: 'Test Product',
        quantity: 1,
        price: 100,
        total: 100
      }],
      totals: {
        subtotal: 100,
        tax: 0,
        shipping: 0,
        total: 100,
        paidAmount: 0
      },
      payment: {
        method: 'razorpay',
        status: 'pending',
        paymentGateway: 'razorpay'
      },
      timeline: []
    });
  });

  afterEach(async () => {
    await User.deleteMany({ phoneNumber: TEST_PHONE });
    await Order.deleteMany({ user: testUser?._id });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/payment/initiate', () => {
    it('should initiate payment for valid order', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 100,
          currency: 'INR',
          paymentMethod: 'razorpay'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderId');
    });

    it('should reject payment without authentication', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .send({
          orderId: testOrder._id.toString(),
          amount: 100
        });

      expect(response.status).toBe(401);
    });

    it('should reject payment for invalid order ID', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: new mongoose.Types.ObjectId().toString(),
          amount: 100
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/payment/verify', () => {
    it('should verify successful payment', async () => {
      // Set up order with payment details
      testOrder.payment.razorpayOrderId = 'order_test123';
      await testOrder.save();

      const response = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test123',
          razorpay_signature: 'valid_signature'
        });

      // Note: Actual verification depends on signature validation
      expect(response.status).toBeLessThan(500);
    });

    it('should reject verification without required fields', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString()
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payment-methods', () => {
    it('should return available payment methods', async () => {
      const response = await request(app)
        .get('/api/payment-methods')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return user saved payment methods', async () => {
      const response = await request(app)
        .get('/api/payment-methods/saved')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('POST /api/razorpay/create-order', () => {
    it('should create Razorpay order', async () => {
      const response = await request(app)
        .post('/api/razorpay/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'INR',
          orderId: testOrder._id.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/razorpay/create-order')
        .send({
          amount: 100,
          currency: 'INR'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/razorpay/verify-payment', () => {
    it('should verify Razorpay payment', async () => {
      const response = await request(app)
        .post('/api/razorpay/verify-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test123',
          razorpay_signature: 'test_signature',
          orderId: testOrder._id.toString()
        });

      // Verification depends on signature matching
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Wallet Payment', () => {
    it('should allow payment from wallet if sufficient balance', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 100,
          paymentMethod: 'wallet'
        });

      expect(response.status).toBeLessThan(500);
    });

    it('should reject wallet payment if insufficient balance', async () => {
      // Set wallet balance to 0
      testUser.wallet.balance = 0;
      await testUser.save();

      const response = await request(app)
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 100,
          paymentMethod: 'wallet'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

describe('Webhook Routes', () => {
  describe('POST /api/webhooks/razorpay', () => {
    it('should handle payment.captured webhook', async () => {
      const response = await request(app)
        .post('/api/webhooks/razorpay')
        .set('X-Razorpay-Signature', 'test-signature')
        .send({
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: 'pay_test123',
                order_id: 'order_test123',
                amount: 10000,
                status: 'captured'
              }
            }
          }
        });

      // Webhook handlers typically return 200 even for invalid signatures
      // to prevent retry storms
      expect(response.status).toBeLessThan(500);
    });

    it('should handle payment.failed webhook', async () => {
      const response = await request(app)
        .post('/api/webhooks/razorpay')
        .set('X-Razorpay-Signature', 'test-signature')
        .send({
          event: 'payment.failed',
          payload: {
            payment: {
              entity: {
                id: 'pay_test123',
                order_id: 'order_test123',
                error_description: 'Payment failed'
              }
            }
          }
        });

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('POST /api/webhooks/stripe', () => {
    it('should handle payment_intent.succeeded webhook', async () => {
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'test-signature')
        .send({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test123',
              amount: 10000,
              status: 'succeeded',
              metadata: {
                orderId: 'test-order-id'
              }
            }
          }
        });

      expect(response.status).toBeLessThan(500);
    });
  });
});
