import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../server';
import { User } from '../../models/User';
import { OTPLog } from '../../models/OTPLog';

// Test constants
const TEST_PHONE = '+919876543210';
const TEST_OTP = '123456';

describe('User Auth Routes', () => {
  beforeAll(async () => {
    // Connect to test database if not connected
    if (mongoose.connection.readyState === 0) {
      const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/rez-test';
      await mongoose.connect(testDbUri);
    }
  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({ phoneNumber: TEST_PHONE });
    await OTPLog.deleteMany({ phoneNumber: TEST_PHONE });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/user/auth/send-otp', () => {
    it('should send OTP for valid phone number', async () => {
      const response = await request(app)
        .post('/api/user/auth/send-otp')
        .send({ phoneNumber: TEST_PHONE });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP');
    });

    it('should reject invalid phone number format', async () => {
      const response = await request(app)
        .post('/api/user/auth/send-otp')
        .send({ phoneNumber: '123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject empty phone number', async () => {
      const response = await request(app)
        .post('/api/user/auth/send-otp')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept email along with phone number', async () => {
      const response = await request(app)
        .post('/api/user/auth/send-otp')
        .send({
          phoneNumber: TEST_PHONE,
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/user/auth/verify-otp', () => {
    beforeEach(async () => {
      // Create OTP log for testing
      await OTPLog.create({
        phoneNumber: TEST_PHONE,
        otp: TEST_OTP,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
        verified: false
      });
    });

    it('should verify correct OTP and return tokens', async () => {
      const response = await request(app)
        .post('/api/user/auth/verify-otp')
        .send({
          phoneNumber: TEST_PHONE,
          otp: TEST_OTP
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should reject incorrect OTP', async () => {
      const response = await request(app)
        .post('/api/user/auth/verify-otp')
        .send({
          phoneNumber: TEST_PHONE,
          otp: '000000'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject expired OTP', async () => {
      // Update OTP to be expired
      await OTPLog.updateOne(
        { phoneNumber: TEST_PHONE },
        { expiresAt: new Date(Date.now() - 1000) }
      );

      const response = await request(app)
        .post('/api/user/auth/verify-otp')
        .send({
          phoneNumber: TEST_PHONE,
          otp: TEST_OTP
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing OTP', async () => {
      const response = await request(app)
        .post('/api/user/auth/verify-otp')
        .send({ phoneNumber: TEST_PHONE });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/user/auth/me', () => {
    let authToken: string;
    let testUser: any;

    beforeEach(async () => {
      // Create test user
      testUser = await User.create({
        phoneNumber: TEST_PHONE,
        isVerified: true,
        isOnboarded: true,
        profile: {
          firstName: 'Test',
          lastName: 'User'
        }
      });

      // Generate token
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '7d' }
      );
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/user/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('phoneNumber', TEST_PHONE);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/user/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/user/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/user/auth/profile', () => {
    let authToken: string;
    let testUser: any;

    beforeEach(async () => {
      testUser = await User.create({
        phoneNumber: TEST_PHONE,
        isVerified: true,
        isOnboarded: true
      });

      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '7d' }
      );
    });

    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/user/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profile: {
            firstName: 'Updated',
            lastName: 'Name'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.firstName).toBe('Updated');
    });

    it('should reject unauthenticated profile update', async () => {
      const response = await request(app)
        .put('/api/user/auth/profile')
        .send({
          profile: {
            firstName: 'Test'
          }
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/user/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      const testUser = await User.create({
        phoneNumber: TEST_PHONE,
        isVerified: true
      });

      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '7d' }
      );
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/user/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/user/auth/refresh-token', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const testUser = await User.create({
        phoneNumber: TEST_PHONE,
        isVerified: true
      });

      const jwt = require('jsonwebtoken');
      refreshToken = jwt.sign(
        { userId: testUser._id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        { expiresIn: '30d' }
      );
    });

    it('should return new tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/user/auth/refresh-token')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/user/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
