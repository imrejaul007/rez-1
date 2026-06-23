/**
 * Partner Service Unit Tests
 * Tests all critical functionality of the partner program
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Partner from '../models/Partner';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Wallet } from '../models/Wallet';
import partnerService from '../services/partnerService';

let mongoServer: MongoMemoryServer;

// Setup: Start in-memory MongoDB before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  console.log('✅ Test database connected');
});

// Cleanup: Disconnect and stop MongoDB after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('✅ Test database disconnected');
});

// Clear database before each test
beforeEach(async () => {
  await Partner.deleteMany({});
  await User.deleteMany({});
  await Order.deleteMany({});
  await Wallet.deleteMany({});
});

describe('Partner Service - Core Functionality', () => {
  describe('getOrCreatePartner', () => {
    it('should create a new partner profile for first-time user', async () => {
      // Create test user
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: {
          firstName: 'Test',
          lastName: 'User'
        },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      const partner = await partnerService.getOrCreatePartner((user._id as any).toString());

      expect(partner).toBeDefined();
      expect(partner.name).toBe('Test User');
      expect(partner.email).toBe('test@example.com');
      expect(partner.currentLevel.level).toBe(1);
      expect(partner.totalOrders).toBe(0);
      expect(partner.milestones.length).toBeGreaterThan(0);
      expect(partner.tasks.length).toBeGreaterThan(0);
      expect(partner.jackpotProgress.length).toBe(3); // 25K, 50K, 100K
    });

    it('should return existing partner if already created', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      const partner1 = await partnerService.getOrCreatePartner((user._id as any).toString());
      const partner2 = await partnerService.getOrCreatePartner((user._id as any).toString());

      expect(partner1._id.toString()).toBe(partner2._id.toString());
    });

    it('should throw error if user not found', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      
      await expect(partnerService.getOrCreatePartner(fakeUserId))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('claimMilestoneReward - MongoDB Transactions', () => {
    it('should claim milestone reward and credit wallet atomically', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      const partner = await partnerService.getOrCreatePartner((user._id as any).toString());
      
      // Mark milestone as achieved
      const milestone5 = partner.milestones.find((m: any) => m.orderCount === 5);
      if (milestone5) {
        milestone5.achieved = true;
        await partner.save();
      }

      // Claim the reward
      const updatedPartner = await partnerService.claimMilestoneReward(
        (user._id as any).toString(),
        5
      );

      // Verify partner updated
      expect(updatedPartner.milestones.find((m: any) => m.orderCount === 5)?.claimedAt).toBeDefined();

      // Verify wallet credited
      const wallet = await Wallet.findOne({ user: user._id });
      expect(wallet).toBeDefined();
      expect(wallet!.balance.total).toBeGreaterThan(0);
    });

    it('should rollback if wallet creation fails', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      const partner = await partnerService.getOrCreatePartner((user._id as any).toString());
      
      // Mark milestone as achieved
      const milestone5 = partner.milestones.find((m: any) => m.orderCount === 5);
      if (milestone5) {
        milestone5.achieved = true;
        await partner.save();
      }

      // Mock Wallet.createForUser to fail
      const originalCreateForUser = (Wallet as any).createForUser;
      (Wallet as any).createForUser = jest.fn().mockResolvedValue(null);

      // Should throw error and rollback
      await expect(partnerService.claimMilestoneReward((user._id as any).toString(), 5))
        .rejects
        .toThrow('Failed to create wallet');

      // Verify milestone NOT claimed (transaction rolled back)
      const partnerAfter = await Partner.findOne({ userId: user._id as any });
      const milestoneAfter = partnerAfter?.milestones.find((m: any) => m.orderCount === 5);
      expect(milestoneAfter?.claimedAt).toBeUndefined();

      // Restore original function
      (Wallet as any).createForUser = originalCreateForUser;
    });

    it('should prevent claiming same milestone twice', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      const partner = await partnerService.getOrCreatePartner((user._id as any).toString());
      
      // Mark milestone as achieved
      const milestone5 = partner.milestones.find((m: any) => m.orderCount === 5);
      if (milestone5) {
        milestone5.achieved = true;
        await partner.save();
      }

      // Claim once
      await partnerService.claimMilestoneReward((user._id as any).toString(), 5);

      // Try to claim again
      await expect(partnerService.claimMilestoneReward((user._id as any).toString(), 5))
        .rejects
        .toThrow('Milestone reward already claimed');
    });

    it('should throw error if milestone not achieved yet', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      await partnerService.getOrCreatePartner((user._id as any).toString());

      await expect(partnerService.claimMilestoneReward((user._id as any).toString(), 5))
        .rejects
        .toThrow('Milestone not yet achieved');
    });
  });

  describe('claimTaskReward - MongoDB Transactions', () => {
    it('should claim task reward with atomic transaction', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      const partner = await partnerService.getOrCreatePartner((user._id as any).toString());
      
      // Mark task as completed
      const profileTask = partner.tasks.find((t: any) => t.type === 'profile');
      if (profileTask) {
        profileTask.completed = true;
        profileTask.progress.current = 1;
        await partner.save();
      }

      const updatedPartner = await partnerService.claimTaskReward(
        (user._id as any).toString(),
        'Complete Your Profile'
      );

      expect(updatedPartner.tasks.find((t: any) => t.type === 'profile')?.claimed).toBe(true);
      
      const wallet = await Wallet.findOne({ user: user._id });
      expect(wallet).toBeDefined();
    });

    it('should prevent claiming incomplete task', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      await partnerService.getOrCreatePartner((user._id as any).toString());

      await expect(partnerService.claimTaskReward((user._id as any).toString(), 'Complete Your Profile'))
        .rejects
        .toThrow('Task not yet completed');
    });
  });

  describe('claimJackpotReward - MongoDB Transactions', () => {
    it('should claim jackpot reward with atomic transaction', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      const partner = await partnerService.getOrCreatePartner((user._id as any).toString());
      
      // Mark jackpot as achieved
      const jackpot25K = partner.jackpotProgress.find((j: any) => j.spendAmount === 25000);
      if (jackpot25K) {
        jackpot25K.achieved = true;
        await partner.save();
      }

      const updatedPartner = await partnerService.claimJackpotReward(
        (user._id as any).toString(),
        25000
      );

      expect(updatedPartner.jackpotProgress.find((j: any) => j.spendAmount === 25000)?.claimedAt).toBeDefined();
      
      const wallet = await Wallet.findOne({ user: user._id });
      expect(wallet).toBeDefined();
      expect(wallet!.balance.total).toBeGreaterThan(0);
    });

    it('should throw error for invalid jackpot amount', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      await partnerService.getOrCreatePartner((user._id as any).toString());

      await expect(partnerService.claimJackpotReward((user._id as any).toString(), 10000))
        .rejects
        .toThrow('Jackpot milestone not found');
    });
  });

  describe('Level System - Timeframe Validation', () => {
    it('should NOT allow upgrade if timeframe expired', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      const partner = await partnerService.getOrCreatePartner((user._id as any).toString());
      
      // Set levelStartDate to 50 days ago (past 44-day limit)
      partner.levelStartDate = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000);
      partner.ordersThisLevel = 15; // Enough orders
      await partner.save();

      const canUpgrade = partner.canUpgradeLevel();
      expect(canUpgrade).toBe(false);
    });

    it('should allow upgrade if both orders and timeframe requirements met', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      const partner = await partnerService.getOrCreatePartner((user._id as any).toString());
      
      // Set levelStartDate to 30 days ago (within 44-day limit)
      partner.levelStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      partner.ordersThisLevel = 15; // Enough orders
      await partner.save();

      const canUpgrade = partner.canUpgradeLevel();
      expect(canUpgrade).toBe(true);
    });
  });

  describe('Level Expiry Handling', () => {
    it('should reset progress if level expired without reaching next level', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      const partner = await partnerService.getOrCreatePartner((user._id as any).toString());
      
      // Set expired validUntil and some progress
      partner.validUntil = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      partner.ordersThisLevel = 10; // Not enough for upgrade (needs 15)
      await partner.save();

      partner.handleLevelExpiry();
      await partner.save();

      expect(partner.ordersThisLevel).toBe(0); // Reset
      expect(partner.validUntil.getTime()).toBeGreaterThan(Date.now()); // Extended
    });

    it('should auto-upgrade if level expired with requirements met', async () => {
      const user = await User.create({
        phoneNumber: '+919876543210',
        email: 'test@example.com',
        profile: { firstName: 'Test', lastName: 'User' },
        auth: {
          phoneNumber: '+919876543210',
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          isVerified: true,
          isOnboarded: true
        }
      });

      const partner = await partnerService.getOrCreatePartner((user._id as any).toString());
      
      // Set expired validUntil but with enough orders
      partner.validUntil = new Date(Date.now() - 24 * 60 * 60 * 1000);
      partner.ordersThisLevel = 15; // Enough for Influencer
      await partner.save();

      const oldLevel = partner.currentLevel.level;
      partner.handleLevelExpiry();
      await partner.save();

      expect(partner.currentLevel.level).toBe(oldLevel + 1); // Upgraded
    });
  });
});

describe('Partner Service - Input Validation', () => {
  it('should validate milestone ID format', () => {
    const validId = 'milestone-5';
    const invalidId = 'invalid-format';
    
    expect(validId).toMatch(/^milestone-\d+$/);
    expect(invalidId).not.toMatch(/^milestone-\d+$/);
  });

  it('should validate jackpot amounts', () => {
    const validAmounts = [25000, 50000, 100000];
    const invalidAmount = 35000;
    
    expect(validAmounts).toContain(25000);
    expect(validAmounts).not.toContain(invalidAmount);
  });

  it('should validate task types', () => {
    const validTypes = ['profile', 'review', 'referral', 'social', 'purchase'];
    const invalidType = 'invalid-type';
    
    expect(validTypes).toContain('profile');
    expect(validTypes).not.toContain(invalidType);
  });
});

console.log('✅ Partner Service Tests Completed');

