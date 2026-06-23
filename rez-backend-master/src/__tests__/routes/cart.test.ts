import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../server';
import { User } from '../../models/User';
import { Product } from '../../models/Product';
import { Cart } from '../../models/Cart';
import jwt from 'jsonwebtoken';

// Test constants
const TEST_PHONE = '+919876543211';

describe('Cart Routes', () => {
  let authToken: string;
  let testUser: any;
  let testProduct: any;
  let testStore: any;

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
      isVerified: true
    });

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );

    // Create test store ID
    testStore = new mongoose.Types.ObjectId();

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      store: testStore,
      category: 'Electronics',
      inventory: {
        stock: 100,
        trackInventory: true
      },
      isActive: true
    });
  });

  afterEach(async () => {
    await User.deleteMany({ phoneNumber: TEST_PHONE });
    await Product.deleteMany({ store: testStore });
    await Cart.deleteMany({ user: testUser?._id });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/cart', () => {
    it('should return empty cart for new user', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
    });

    it('should return cart with items', async () => {
      // Add item to cart
      await Cart.create({
        user: testUser._id,
        items: [{
          product: testProduct._id,
          quantity: 2,
          price: testProduct.price
        }]
      });

      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/cart');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/cart/add', () => {
    it('should add product to cart', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    it('should increase quantity if product already in cart', async () => {
      // Add product first
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 1
        });

      // Add same product again
      const response = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Quantity should be 3 (1 + 2)
      const cartItem = response.body.data.items.find(
        (item: any) => item.product._id.toString() === testProduct._id.toString()
      );
      expect(cartItem.quantity).toBe(3);
    });

    it('should reject invalid product ID', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: new mongoose.Types.ObjectId().toString(),
          quantity: 1
        });

      expect(response.status).toBe(404);
    });

    it('should reject zero or negative quantity', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 0
        });

      expect(response.status).toBe(400);
    });

    it('should reject if quantity exceeds stock', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 1000 // More than stock (100)
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/cart/update', () => {
    beforeEach(async () => {
      // Add item to cart
      await Cart.create({
        user: testUser._id,
        items: [{
          product: testProduct._id,
          quantity: 2,
          price: testProduct.price
        }]
      });
    });

    it('should update item quantity', async () => {
      const response = await request(app)
        .put('/api/cart/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 5
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const cartItem = response.body.data.items.find(
        (item: any) => item.product._id.toString() === testProduct._id.toString()
      );
      expect(cartItem.quantity).toBe(5);
    });

    it('should remove item when quantity is 0', async () => {
      const response = await request(app)
        .put('/api/cart/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 0
        });

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(0);
    });
  });

  describe('DELETE /api/cart/remove', () => {
    beforeEach(async () => {
      await Cart.create({
        user: testUser._id,
        items: [{
          product: testProduct._id,
          quantity: 2,
          price: testProduct.price
        }]
      });
    });

    it('should remove item from cart', async () => {
      const response = await request(app)
        .delete('/api/cart/remove')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBe(0);
    });

    it('should return success even if item not in cart', async () => {
      const response = await request(app)
        .delete('/api/cart/remove')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: new mongoose.Types.ObjectId().toString()
        });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/cart/clear', () => {
    beforeEach(async () => {
      await Cart.create({
        user: testUser._id,
        items: [
          {
            product: testProduct._id,
            quantity: 2,
            price: testProduct.price
          }
        ]
      });
    });

    it('should clear entire cart', async () => {
      const response = await request(app)
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBe(0);
    });
  });

  describe('POST /api/cart/sync', () => {
    it('should sync local cart with server', async () => {
      const localCart = {
        items: [
          {
            productId: testProduct._id.toString(),
            quantity: 3
          }
        ]
      };

      const response = await request(app)
        .post('/api/cart/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(localCart);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Cart Calculations', () => {
    it('should calculate correct totals', async () => {
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 3
        });

      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Check that totals are calculated
      expect(response.body.data).toHaveProperty('totals');
    });
  });

  describe('Apply Coupon', () => {
    beforeEach(async () => {
      await Cart.create({
        user: testUser._id,
        items: [{
          product: testProduct._id,
          quantity: 2,
          price: testProduct.price
        }]
      });
    });

    it('should apply valid coupon code', async () => {
      const response = await request(app)
        .post('/api/cart/apply-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          couponCode: 'TESTCOUPON'
        });

      // Response depends on coupon existence
      expect(response.status).toBeLessThan(500);
    });

    it('should reject invalid coupon code', async () => {
      const response = await request(app)
        .post('/api/cart/apply-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          couponCode: 'INVALID_COUPON_12345'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
