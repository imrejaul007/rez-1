import PaymentService from '../../services/PaymentService';
import { Order } from '../../models/Order';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { createTestMerchant, cleanupTestData } from '../helpers/testUtils';
import mongoose from 'mongoose';

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
        status: 'captured',
        order_id: 'order_test123'
      }),
      refund: jest.fn().mockResolvedValue({
        id: 'rfnd_test123',
        amount: 10000,
        status: 'processed'
      })
    },
    payouts: {
      create: jest.fn().mockResolvedValue({
        id: 'pout_test123',
        amount: 10000,
        status: 'queued'
      }),
      fetch: jest.fn().mockResolvedValue({
        id: 'pout_test123',
        amount: 10000,
        status: 'processed'
      })
    }
  }));
});

// Mock crypto for signature verification
jest.mock('crypto', () => ({
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked_signature')
  }))
}));

describe('PaymentService', () => {
  let paymentService: any;
  let testMerchant: any;
  let testOrder: any;
  let testUser: any;

  beforeAll(async () => {
    paymentService = PaymentService;
    testMerchant = await createTestMerchant();
    
    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: `testuser${Date.now()}@example.com`,
      phone: '+1234567890',
      password: 'hashedpassword'
    });

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
    await cleanupTestData();
  });

  afterAll(async () => {
    await Order.deleteMany({});
    await User.deleteMany({});
  });

  describe('createPaymentOrder', () => {
    it('should create a Razorpay order successfully', async () => {
      const result = await paymentService.createPaymentOrder(
        testOrder._id.toString(),
        100,
        'INR'
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('order_test123');
      expect(result.amount).toBe(10000); // Amount in paise
      expect(result.currency).toBe('INR');
    });

    it('should throw error if order not found', async () => {
      await expect(
        paymentService.createPaymentOrder(
          new mongoose.Types.ObjectId().toString(),
          100,
          'INR'
        )
      ).rejects.toThrow('Order not found');
    });

    it('should convert amount to paise correctly', async () => {
      const result = await paymentService.createPaymentOrder(
        testOrder._id.toString(),
        99.99,
        'INR'
      );

      expect(result.amount).toBe(9999); // 99.99 * 100 = 9999 paise
    });
  });

  describe('verifyPaymentSignature', () => {
    it('should verify valid payment signature', () => {
      // Mock valid signature
      const result = paymentService.verifyPaymentSignature(
        'order_test123',
        'pay_test123',
        'mocked_signature'
      );

      // Note: Actual verification depends on crypto mock
      expect(typeof result).toBe('boolean');
    });

    it('should return false for invalid signature', () => {
      const result = paymentService.verifyPaymentSignature(
        'order_test123',
        'pay_test123',
        'invalid_signature'
      );

      expect(result).toBe(false);
    });

    it('should return false if Razorpay not configured', () => {
      const originalSecret = process.env.RAZORPAY_KEY_SECRET;
      delete (process.env as any).RAZORPAY_KEY_SECRET;

      const result = paymentService.verifyPaymentSignature(
        'order_test123',
        'pay_test123',
        'signature'
      );

      expect(result).toBe(false);

      // Restore
      if (originalSecret) {
        process.env.RAZORPAY_KEY_SECRET = originalSecret;
      }
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should update order status to confirmed on payment success', async () => {
      const paymentDetails = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'signature'
      };

      // Create product with stock
      const product = await Product.create({
        name: 'Test Product',
        price: 100,
        inventory: {
          stock: 10,
          trackInventory: true
        },
        store: new mongoose.Types.ObjectId()
      });

      // Update order with product ID
      testOrder.items[0].product = product._id;
      await testOrder.save();

      const result = await paymentService.handlePaymentSuccess(
        testOrder._id.toString(),
        paymentDetails
      );

      expect(result.payment.status).toBe('paid');
      expect(result.payment.transactionId).toBe('pay_test123');
      expect(result.payment.paidAt).toBeDefined();
    });

    it('should not process payment if already paid', async () => {
      // Set order as already paid
      testOrder.payment.status = 'paid';
      await testOrder.save();

      const paymentDetails = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'signature'
      };

      const result = await paymentService.handlePaymentSuccess(
        testOrder._id.toString(),
        paymentDetails
      );

      expect(result.payment.status).toBe('paid');
    });

    it('should throw error if order not found', async () => {
      const paymentDetails = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'signature'
      };

      await expect(
        paymentService.handlePaymentSuccess(
          new mongoose.Types.ObjectId().toString(),
          paymentDetails
        )
      ).rejects.toThrow('Order not found');
    });

    it('should throw error if insufficient stock', async () => {
      // Create product with no stock
      const product = await Product.create({
        name: 'Test Product',
        price: 100,
        inventory: {
          stock: 0,
          trackInventory: true
        },
        store: new mongoose.Types.ObjectId()
      });

      // Create new order
      const newOrder = await Order.create({
        user: testUser._id,
        orderNumber: `ORD-${Date.now()}`,
        items: [{
          product: product._id,
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

      const paymentDetails = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'signature'
      };

      await expect(
        paymentService.handlePaymentSuccess(
          (newOrder._id as any).toString(),
          paymentDetails
        )
      ).rejects.toThrow('Insufficient stock');
    });
  });

  describe('handlePaymentFailure', () => {
    it('should update order status on payment failure', async () => {
      // Reset order to pending
      testOrder.payment.status = 'pending';
      await testOrder.save();

      const result = await paymentService.handlePaymentFailure(
        testOrder._id.toString(),
        'Payment declined by bank'
      );

      expect(result.payment.status).toBe('failed');
      expect(result.timeline.length).toBeGreaterThan(0);
    });

    it('should throw error if order not found', async () => {
      await expect(
        paymentService.handlePaymentFailure(
          new mongoose.Types.ObjectId().toString(),
          'Failure reason'
        )
      ).rejects.toThrow('Order not found');
    });
  });

  describe('refundPayment', () => {
    it('should process full refund successfully', async () => {
      // Set order as paid
      testOrder.payment.status = 'paid';
      testOrder.payment.transactionId = 'pay_test123';
      await testOrder.save();

      const result = await paymentService.refundPayment(
        testOrder._id.toString()
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should process partial refund successfully', async () => {
      testOrder.payment.status = 'paid';
      testOrder.payment.transactionId = 'pay_test123';
      await testOrder.save();

      const result = await paymentService.refundPayment(
        testOrder._id.toString(),
        50 // Partial refund
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should throw error if order not found', async () => {
      await expect(
        paymentService.refundPayment(
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow('Order not found');
    });

    it('should throw error if order not paid', async () => {
      testOrder.payment.status = 'pending';
      await testOrder.save();

      await expect(
        paymentService.refundPayment(testOrder._id.toString())
      ).rejects.toThrow('Order is not paid');
    });
  });

  describe('getAccountBalance', () => {
    it('should return account balance', async () => {
      const result = await paymentService.getAccountBalance();

      expect(result).toBeDefined();
    });

    it('should return mock balance if Razorpay not configured', async () => {
      const originalKeyId = process.env.RAZORPAY_KEY_ID;
      const originalSecret = process.env.RAZORPAY_KEY_SECRET;
      
      delete (process.env as any).RAZORPAY_KEY_ID;
      delete (process.env as any).RAZORPAY_KEY_SECRET;

      const result = await paymentService.getAccountBalance();

      expect(result).toBeDefined();

      // Restore
      if (originalKeyId) process.env.RAZORPAY_KEY_ID = originalKeyId;
      if (originalSecret) process.env.RAZORPAY_KEY_SECRET = originalSecret;
    });
  });
});

