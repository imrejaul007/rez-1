import request from 'supertest';
import { app } from '../server';
import { Merchant } from '../models/Merchant';
import { createTestMerchant, generateMerchantToken, createAuthHeaders, TEST_PASSWORD } from './helpers/testUtils';
import bcrypt from 'bcryptjs';

describe('Merchant Authentication', () => {
  describe('POST /api/merchant/auth/register', () => {
    it('should register a new merchant', async () => {
      const response = await request(app)
        .post('/api/merchant/auth/register')
        .send({
          businessName: 'Test Business',
          ownerName: 'Test Owner',
          email: 'newmerchant@example.com',
          password: 'Password123',
          phone: '+1234567890',
          businessAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.merchant).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.merchant.email).toBe('newmerchant@example.com');
      expect(response.body.data.merchant.businessName).toBe('Test Business');
    });

    it('should not register with duplicate email', async () => {
      const testEmail = 'duplicate@example.com';
      await createTestMerchant({ email: testEmail });

      const response = await request(app)
        .post('/api/merchant/auth/register')
        .send({
          businessName: 'Test Business 2',
          ownerName: 'Test Owner 2',
          email: testEmail,
          password: 'Password123',
          phone: '+1234567891',
          businessAddress: {
            street: '456 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/merchant/auth/register')
        .send({
          businessName: 'Test Business',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/merchant/auth/register')
        .send({
          businessName: 'Test Business',
          ownerName: 'Test Owner',
          email: 'invalid-email',
          password: 'Password123',
          phone: '+1234567890',
          businessAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should hash the password', async () => {
      const password = 'TestPassword123';
      const response = await request(app)
        .post('/api/merchant/auth/register')
        .send({
          businessName: 'Test Business',
          ownerName: 'Test Owner',
          email: `test${Date.now()}@example.com`,
          password: password,
          phone: '+1234567890',
          businessAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        });

      expect(response.status).toBe(201);

      // Check that password is hashed in database
      const merchant = await Merchant.findOne({ email: response.body.data.merchant.email }).select('+password');
      expect(merchant).toBeDefined();
      expect(merchant!.password).not.toBe(password);
      expect(merchant!.password.length).toBeGreaterThan(20); // Bcrypt hash is long
    });
  });

  describe('POST /api/merchant/auth/login', () => {
    it('should login with valid credentials', async () => {
      const testEmail = `login${Date.now()}@example.com`;
      const password = 'Password123';

      // Create merchant with known password
      const hashedPassword = await bcrypt.hash(password, 10);
      await createTestMerchant({
        email: testEmail,
        password: hashedPassword,
      });

      const response = await request(app)
        .post('/api/merchant/auth/login')
        .send({
          email: testEmail,
          password: password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.merchant.email).toBe(testEmail);
    });

    it('should not login with invalid password', async () => {
      const testEmail = `test${Date.now()}@example.com`;
      await createTestMerchant({ email: testEmail });

      const response = await request(app)
        .post('/api/merchant/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/merchant/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should update lastLogin on successful login', async () => {
      const testEmail = `lastlogin${Date.now()}@example.com`;
      const password = 'Password123';

      const hashedPassword = await bcrypt.hash(password, 10);
      const merchant = await createTestMerchant({
        email: testEmail,
        password: hashedPassword,
      });

      const beforeLogin = new Date();

      const response = await request(app)
        .post('/api/merchant/auth/login')
        .send({
          email: testEmail,
          password: password,
        });

      expect(response.status).toBe(200);

      const updatedMerchant = await Merchant.findById(merchant._id);
      expect(updatedMerchant!.lastLogin).toBeDefined();
      expect(updatedMerchant!.lastLogin!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('GET /api/merchant/auth/me', () => {
    it('should return merchant profile with valid token', async () => {
      const merchant = await createTestMerchant();
      const token = generateMerchantToken(merchant.id);

      const response = await request(app)
        .get('/api/merchant/auth/me')
        .set(createAuthHeaders(token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.merchant).toBeDefined();
      expect(response.body.data.merchant.email).toBe(merchant.email);
      expect(response.body.data.merchant.businessName).toBe(merchant.businessName);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/merchant/auth/me')
        .set(createAuthHeaders('invalid-token'));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/api/merchant/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should not return password in response', async () => {
      const merchant = await createTestMerchant();
      const token = generateMerchantToken(merchant.id);

      const response = await request(app)
        .get('/api/merchant/auth/me')
        .set(createAuthHeaders(token));

      expect(response.status).toBe(200);
      expect(response.body.data.merchant.password).toBeUndefined();
    });
  });

  describe('POST /api/merchant/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const merchant = await createTestMerchant();
      const token = generateMerchantToken(merchant.id);

      const response = await request(app)
        .post('/api/merchant/auth/logout')
        .set(createAuthHeaders(token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/merchant/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/merchant/auth/test', () => {
    it('should respond with success for connectivity test', async () => {
      const response = await request(app)
        .get('/api/merchant/auth/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('working');
    });
  });
});
