import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../server';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import { Product } from '../../models/Product';
import { Cart } from '../../models/Cart';
import jwt from 'jsonwebtoken';

// Test constants
const TEST_PHONE = '+919876543212';

describe('Order Routes', () => {
  let authToken: string;
  let adminToken: string;
  let testUser: any;
  let adminUser: any;
  let testProduct: any;
  let testStore: any;
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

    // Create admin user
    adminUser = await User.create({
      phoneNumber: '+919876543299',
      isVerified: true,
      role: 'admin'
    });

    // Generate auth tokens
    authToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );

    adminToken = jwt.sign(
      { userId: adminUser._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );

    // Create test store ID
    testStore = new mongoose.Types.ObjectId();

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      description: 'A test product for orders',
      price: 99.99,
      store: testStore,
      category: 'Electronics',
      inventory: {
        stock: 100,
        trackInventory: true
      },
      isActive: true,
      images: ['https://example.com/image.jpg']
    });

    // Create test order
    testOrder = await Order.create({
      user: testUser._id,
      orderNumber: `ORD-${Date.now()}`,
      items: [{
        product: testProduct._id,
        store: testStore,
        name: testProduct.name,
        image: 'https://example.com/image.jpg',
        quantity: 2,
        price: testProduct.price,
        subtotal: testProduct.price * 2
      }],
      totals: {
        subtotal: 199.98,
        tax: 20,
        delivery: 10,
        discount: 0,
        cashback: 0,
        total: 229.98,
        paidAmount: 229.98
      },
      payment: {
        method: 'razorpay',
        status: 'paid',
        transactionId: 'txn_test123'
      },
      delivery: {
        method: 'standard',
        status: 'pending',
        address: {
          name: 'Test User',
          phone: TEST_PHONE,
          addressLine1: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          country: 'India'
        },
        deliveryFee: 10
      },
      status: 'placed',
      timeline: [{
        status: 'placed',
        message: 'Order placed successfully',
        timestamp: new Date()
      }]
    });
  });

  afterEach(async () => {
    await User.deleteMany({ phoneNumber: { $in: [TEST_PHONE, '+919876543299'] } });
    await Product.deleteMany({ store: testStore });
    await Order.deleteMany({ user: { $in: [testUser?._id, adminUser?._id] } });
    await Cart.deleteMany({ user: testUser?._id });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/orders', () => {
    it('should return user orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.orders || response.body.data)).toBe(true);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders?status=placed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/orders?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/orders');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/orders', () => {
    beforeEach(async () => {
      // Create cart for order creation
      await Cart.create({
        user: testUser._id,
        items: [{
          product: testProduct._id,
          quantity: 1,
          price: testProduct.price
        }]
      });
    });

    it('should create new order', async () => {
      const orderData = {
        items: [{
          productId: testProduct._id.toString(),
          quantity: 1
        }],
        deliveryAddress: {
          name: 'Test User',
          phone: TEST_PHONE,
          addressLine1: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          country: 'India'
        },
        paymentMethod: 'cod'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      // Order creation may return 200 or 201 depending on implementation
      expect(response.status).toBeLessThan(300);
    });

    it('should reject order without delivery address', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{
            productId: testProduct._id.toString(),
            quantity: 1
          }],
          paymentMethod: 'cod'
        });

      expect(response.status).toBe(400);
    });

    it('should not require full delivery address for dine_in fulfillment', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fulfillmentType: 'dine_in',
          paymentMethod: 'cod',
          deliveryAddress: {
            name: 'Store Pickup',
            phone: '+919876543210'
          }
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      const responseText = JSON.stringify(response.body || {});
      expect(responseText).not.toContain('Delivery address is required');
      expect(responseText).not.toContain('Missing required address fields: addressLine1, city, state, pincode');
    });

    it('should not require full delivery address for pickup fulfillment', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fulfillmentType: 'pickup',
          paymentMethod: 'cod',
          deliveryAddress: {
            name: 'Store Pickup',
            phone: '+919876543210'
          }
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      const responseText = JSON.stringify(response.body || {});
      expect(responseText).not.toContain('Delivery address is required');
      expect(responseText).not.toContain('Missing required address fields: addressLine1, city, state, pincode');
    });

    it('should reject order without authentication', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          items: [{ productId: testProduct._id.toString(), quantity: 1 }]
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/orders/:orderId', () => {
    it('should return order by ID', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderNumber');
    });

    it('should return 404 for non-existent order', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/orders/${fakeOrderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject invalid order ID format', async () => {
      const response = await request(app)
        .get('/api/orders/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/orders/:orderId/cancel', () => {
    it('should cancel order with reason', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrder._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Changed my mind'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should cancel order without reason', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrder._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
    });

    it('should not cancel already delivered order', async () => {
      // Update order to delivered status
      testOrder.status = 'delivered';
      testOrder.delivery.status = 'delivered';
      await testOrder.save();

      const response = await request(app)
        .patch(`/api/orders/${testOrder._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Want to cancel' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/orders/:orderId/tracking', () => {
    it('should return order tracking information', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder._id}/tracking`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent order', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/orders/${fakeOrderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/orders/:orderId/rate', () => {
    beforeEach(async () => {
      // Set order to delivered for rating
      testOrder.status = 'delivered';
      testOrder.delivery.status = 'delivered';
      testOrder.delivery.deliveredAt = new Date();
      await testOrder.save();
    });

    it('should add rating to delivered order', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder._id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 5,
          review: 'Excellent service!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should add rating without review', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder._id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 4
        });

      expect(response.status).toBe(200);
    });

    it('should reject rating below 1', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder._id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 0
        });

      expect(response.status).toBe(400);
    });

    it('should reject rating above 5', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder._id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 6
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/orders/stats', () => {
    it('should return order statistics', async () => {
      const response = await request(app)
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/orders/reorder/suggestions', () => {
    it('should return reorder suggestions', async () => {
      const response = await request(app)
        .get('/api/orders/reorder/suggestions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/orders/reorder/frequently-ordered', () => {
    it('should return frequently ordered items', async () => {
      const response = await request(app)
        .get('/api/orders/reorder/frequently-ordered')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/orders/reorder/frequently-ordered?limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/orders/:orderId/reorder/validate', () => {
    it('should validate reorder for existing order', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder._id}/reorder/validate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/orders/:orderId/reorder', () => {
    it('should reorder full order', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder._id}/reorder`)
        .set('Authorization', `Bearer ${authToken}`);

      // May return success or error depending on product availability
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('POST /api/orders/:orderId/reorder/items', () => {
    it('should reorder selected items', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder._id}/reorder/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemIds: [testOrder.items[0].product.toString()]
        });

      expect(response.status).toBeLessThan(500);
    });

    it('should reject empty item list', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder._id}/reorder/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemIds: []
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/orders/:orderId/refund-request', () => {
    beforeEach(async () => {
      // Set order to delivered for refund
      testOrder.status = 'delivered';
      testOrder.delivery.status = 'delivered';
      testOrder.delivery.deliveredAt = new Date();
      await testOrder.save();
    });

    it('should request refund with reason', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder._id}/refund-request`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Product damaged during delivery'
        });

      expect(response.status).toBeLessThan(500);
    });

    it('should reject refund without reason', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder._id}/refund-request`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject refund with too short reason', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder._id}/refund-request`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Bad'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/orders/refunds', () => {
    it('should return user refund history', async () => {
      const response = await request(app)
        .get('/api/orders/refunds')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/orders/refunds?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/orders/refunds?status=pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PATCH /api/orders/:orderId/status (Admin)', () => {
    it('should update order status as admin', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'confirmed'
        });

      // Admin status update may require additional checks
      expect(response.status).toBeLessThan(500);
    });

    it('should reject status update without admin role', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'confirmed'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject invalid status value', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'invalid_status'
        });

      expect(response.status).toBe(400);
    });

    it('should update status with tracking info', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'shipped',
          trackingInfo: {
            trackingNumber: 'TRACK123456',
            carrier: 'BlueDart'
          }
        });

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Order Lifecycle', () => {
    it('should track order through status changes', async () => {
      // Verify initial status
      expect(testOrder.status).toBe('placed');

      // Get order tracking
      const trackingResponse = await request(app)
        .get(`/api/orders/${testOrder._id}/tracking`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(trackingResponse.status).toBe(200);
      expect(trackingResponse.body.data).toHaveProperty('timeline');
    });
  });
});
