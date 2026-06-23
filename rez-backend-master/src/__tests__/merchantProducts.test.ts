import request from 'supertest';
import { app } from '../server';
import { createTestMerchant, generateMerchantToken, createAuthHeaders } from './helpers/testUtils';
import { MProduct } from '../models/MerchantProduct';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import mongoose from 'mongoose';

describe('Merchant Products', () => {
  let merchant: any;
  let token: string;
  let store: any;
  let category: any;

  beforeEach(async () => {
    merchant = await createTestMerchant();
    token = generateMerchantToken(merchant.id);

    // Create a category
    category = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
      type: 'product',
      isActive: true,
    });

    // Create a store for the merchant
    store = await Store.create({
      name: 'Test Store',
      slug: `test-store-${Date.now()}`,
      merchantId: merchant._id,
      category: category._id,
      location: {
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '12345',
      },
      contact: {
        phone: '+1234567890',
        email: 'store@example.com',
      },
    });
  });

  describe('POST /api/merchant/products', () => {
    it('should create a new product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product description that is long enough',
        price: 999,
        inventory: {
          stock: 50,
          lowStockThreshold: 5,
          trackInventory: true,
        },
        category: category._id.toString(),
        cashback: {
          percentage: 5,
          isActive: true,
        },
      };

      const response = await request(app)
        .post('/api/merchant/products')
        .set(createAuthHeaders(token))
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.product.name).toBe('Test Product');
      expect(response.body.data.product.sku).toBeDefined();
      expect(response.body.data.product.price).toBe(999);
    });

    it('should auto-generate SKU if not provided', async () => {
      const productData = {
        name: 'Auto SKU Product',
        description: 'Product without manual SKU that should auto-generate',
        price: 1999,
        inventory: {
          stock: 100,
        },
        category: category._id.toString(),
        cashback: {
          percentage: 10,
        },
      };

      const response = await request(app)
        .post('/api/merchant/products')
        .set(createAuthHeaders(token))
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.data.product.sku).toBeDefined();
      expect(response.body.data.product.sku).toMatch(/^[A-Z]{3}\d+/);
    });

    it('should reject duplicate SKU', async () => {
      const sku = `TEST${Date.now()}`;

      // Create first product with SKU
      await MProduct.create({
        merchantId: merchant._id,
        name: 'First Product',
        description: 'First product with specific SKU',
        sku: sku,
        price: 100,
        category: category._id,
        inventory: { stock: 10 },
        cashback: { percentage: 5 },
      });

      // Try to create second product with same SKU
      const response = await request(app)
        .post('/api/merchant/products')
        .set(createAuthHeaders(token))
        .send({
          name: 'Second Product',
          description: 'Second product trying to use same SKU',
          sku: sku,
          price: 200,
          category: category._id.toString(),
          inventory: { stock: 20 },
          cashback: { percentage: 5 },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('SKU already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/merchant/products')
        .set(createAuthHeaders(token))
        .send({
          name: 'Test',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/merchant/products')
        .send({
          name: 'Test Product',
          description: 'This should fail without auth',
          price: 999,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/merchant/products', () => {
    beforeEach(async () => {
      // Create test products
      await MProduct.create([
        {
          merchantId: merchant._id,
          name: 'Product 1',
          description: 'First test product',
          sku: 'TEST001',
          price: 100,
          category: category._id,
          inventory: { stock: 50 },
          cashback: { percentage: 5 },
          status: 'active',
        },
        {
          merchantId: merchant._id,
          name: 'Product 2',
          description: 'Second test product',
          sku: 'TEST002',
          price: 200,
          category: category._id,
          inventory: { stock: 0 },
          cashback: { percentage: 10 },
          status: 'active',
        },
        {
          merchantId: merchant._id,
          name: 'Product 3',
          description: 'Third test product',
          sku: 'TEST003',
          price: 300,
          category: category._id,
          inventory: { stock: 3, lowStockThreshold: 5 },
          cashback: { percentage: 15 },
          status: 'draft',
        },
      ]);
    });

    it('should get all merchant products', async () => {
      const response = await request(app)
        .get('/api/merchant/products')
        .set(createAuthHeaders(token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeDefined();
      expect(response.body.data.products.length).toBe(3);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/merchant/products?status=active')
        .set(createAuthHeaders(token));

      expect(response.status).toBe(200);
      expect(response.body.data.products.length).toBe(2);
    });

    it('should filter by stock level', async () => {
      const response = await request(app)
        .get('/api/merchant/products?stockLevel=out_of_stock')
        .set(createAuthHeaders(token));

      expect(response.status).toBe(200);
      expect(response.body.data.products.length).toBe(1);
      expect(response.body.data.products[0].sku).toBe('TEST002');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/merchant/products?page=1&limit=2')
        .set(createAuthHeaders(token));

      expect(response.status).toBe(200);
      expect(response.body.data.products.length).toBe(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.hasNext).toBe(true);
    });

    it('should sort products', async () => {
      const response = await request(app)
        .get('/api/merchant/products?sortBy=price&sortOrder=asc')
        .set(createAuthHeaders(token));

      expect(response.status).toBe(200);
      expect(response.body.data.products[0].price).toBe(100);
      expect(response.body.data.products[2].price).toBe(300);
    });
  });

  describe('GET /api/merchant/products/:id', () => {
    let testProduct: any;

    beforeEach(async () => {
      testProduct = await MProduct.create({
        merchantId: merchant._id,
        name: 'Single Product',
        description: 'Product for single retrieval',
        sku: 'SINGLE001',
        price: 500,
        category: category._id,
        inventory: { stock: 25 },
        cashback: { percentage: 5 },
      });
    });

    it('should get a single product by ID', async () => {
      const response = await request(app)
        .get(`/api/merchant/products/${testProduct._id}`)
        .set(createAuthHeaders(token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Single Product');
      expect(response.body.data.sku).toBe('SINGLE001');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/merchant/products/${fakeId}`)
        .set(createAuthHeaders(token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not allow access to another merchant\'s product', async () => {
      // Create another merchant
      const otherMerchant = await createTestMerchant({ email: `other${Date.now()}@example.com` });

      // Create product for other merchant
      const otherProduct = await MProduct.create({
        merchantId: otherMerchant._id,
        name: 'Other Product',
        description: 'Product owned by another merchant',
        sku: 'OTHER001',
        price: 100,
        category: category._id,
        inventory: { stock: 10 },
        cashback: { percentage: 5 },
      });

      const response = await request(app)
        .get(`/api/merchant/products/${otherProduct._id}`)
        .set(createAuthHeaders(token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/merchant/products/:id', () => {
    let testProduct: any;

    beforeEach(async () => {
      testProduct = await MProduct.create({
        merchantId: merchant._id,
        name: 'Update Test Product',
        description: 'Product to be updated',
        sku: 'UPDATE001',
        price: 300,
        category: category._id,
        inventory: { stock: 15 },
        cashback: { percentage: 5 },
      });
    });

    it('should update product fields', async () => {
      const updates = {
        name: 'Updated Product Name',
        price: 350,
        inventory: { stock: 20 },
      };

      const response = await request(app)
        .put(`/api/merchant/products/${testProduct._id}`)
        .set(createAuthHeaders(token))
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe('Updated Product Name');
      expect(response.body.data.product.price).toBe(350);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/merchant/products/${fakeId}`)
        .set(createAuthHeaders(token))
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/merchant/products/:id', () => {
    let testProduct: any;

    beforeEach(async () => {
      testProduct = await MProduct.create({
        merchantId: merchant._id,
        name: 'Delete Test Product',
        description: 'Product to be deleted',
        sku: 'DELETE001',
        price: 150,
        category: category._id,
        inventory: { stock: 5 },
        cashback: { percentage: 5 },
      });
    });

    it('should delete a product', async () => {
      const response = await request(app)
        .delete(`/api/merchant/products/${testProduct._id}`)
        .set(createAuthHeaders(token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify product is deleted
      const deletedProduct = await MProduct.findById(testProduct._id);
      expect(deletedProduct).toBeNull();
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/merchant/products/${fakeId}`)
        .set(createAuthHeaders(token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
