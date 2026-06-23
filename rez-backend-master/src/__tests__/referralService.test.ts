/**
 * Referral Service Test Suite
 * Tests for referral business logic
 */

import { Types } from 'mongoose';
import referralService from '../services/referralService';
import Referral, { ReferralStatus } from '../models/Referral';
import { User } from '../models/User';
import { CoinTransaction } from '../models/CoinTransaction';
import { Wallet } from '../models/Wallet';
import challengeService from '../services/challengeService';
import activityService from '../services/activityService';
import { ReferralTierService } from '../services/referralTierService';

// Mock dependencies
jest.mock('../models/Referral');
jest.mock('../models/User');
jest.mock('../models/CoinTransaction');
jest.mock('../models/Wallet');
jest.mock('../services/activityService');
jest.mock('../services/challengeService');
jest.mock('../services/referralTierService');

describe('Referral Service', () => {
  const mockReferrerId = new Types.ObjectId();
  const mockRefereeId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks that return Promises (called with .catch()/.then() in service)
    (challengeService.updateProgress as jest.Mock).mockResolvedValue({});
    (activityService as any).referral = {
      onReferralSignup: jest.fn().mockResolvedValue({}),
      onReferralCompleted: jest.fn().mockResolvedValue({}),
    };
    // ReferralTierService is a class mock — its prototype methods need setup
    (ReferralTierService.prototype.checkTierUpgrade as jest.Mock).mockResolvedValue({ upgraded: false });
  });

  describe('createReferral', () => {
    it('should create a new referral relationship', async () => {
      const mockReferral = {
        _id: new Types.ObjectId(),
        referrer: mockReferrerId,
        referee: mockRefereeId,
        referralCode: 'REF12345678',
        status: ReferralStatus.PENDING,
      };

      (Referral.findOne as jest.Mock).mockResolvedValue(null);
      (Referral.create as jest.Mock).mockResolvedValue(mockReferral);

      const result = await referralService.createReferral({
        referrerId: mockReferrerId,
        refereeId: mockRefereeId,
        referralCode: 'REF12345678',
      });

      expect(result).toEqual(mockReferral);
      expect(Referral.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referrer: mockReferrerId,
          referee: mockRefereeId,
          referralCode: 'REF12345678',
          status: ReferralStatus.PENDING,
        })
      );
    });

    it('should throw error if referral already exists', async () => {
      (Referral.findOne as jest.Mock).mockResolvedValue({
        _id: new Types.ObjectId(),
      });

      await expect(
        referralService.createReferral({
          referrerId: mockReferrerId,
          refereeId: mockRefereeId,
          referralCode: 'REF12345678',
        })
      ).rejects.toThrow('User already has a referral relationship');
    });

    it('should not create referral if referee already referred', async () => {
      (Referral.findOne as jest.Mock).mockResolvedValue({ _id: new Types.ObjectId() });

      await expect(
        referralService.createReferral({
          referrerId: mockReferrerId,
          refereeId: mockRefereeId,
          referralCode: 'REF12345678',
        })
      ).rejects.toThrow();

      expect(Referral.create).not.toHaveBeenCalled();
    });
  });

  describe('getReferralStats', () => {
    it('should calculate correct referral statistics', async () => {
      const mockReferrals = [
        {
          status: ReferralStatus.PENDING,
          rewards: { referrerAmount: 50, milestoneBonus: 20 },
          referrerRewarded: false,
          milestoneRewarded: false,
        },
        {
          status: ReferralStatus.ACTIVE,
          rewards: { referrerAmount: 50, milestoneBonus: 20 },
          referrerRewarded: true,
          milestoneRewarded: false,
        },
        {
          status: ReferralStatus.COMPLETED,
          rewards: { referrerAmount: 50, milestoneBonus: 20 },
          referrerRewarded: true,
          milestoneRewarded: true,
        },
      ];

      (Referral.find as jest.Mock).mockResolvedValue(mockReferrals);

      const stats = await referralService.getReferralStats(mockReferrerId);

      expect(stats).toEqual({
        totalReferrals: 3,
        activeReferrals: 1,
        completedReferrals: 1,
        pendingReferrals: 1,
        totalEarnings: 120, // 50 + 50 + 20
        pendingEarnings: 50,
        milestoneEarnings: 20,
        referralBonus: 50,
      });
    });

    it('should return zero stats for user with no referrals', async () => {
      (Referral.find as jest.Mock).mockResolvedValue([]);

      const stats = await referralService.getReferralStats(mockReferrerId);

      expect(stats).toEqual({
        totalReferrals: 0,
        activeReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        milestoneEarnings: 0,
        referralBonus: 50,
      });
    });

    it('should not count expired referrals as pending earnings', async () => {
      const mockReferrals = [
        {
          status: ReferralStatus.EXPIRED,
          rewards: { referrerAmount: 50, milestoneBonus: 20 },
          referrerRewarded: false,
          milestoneRewarded: false,
        },
      ];

      (Referral.find as jest.Mock).mockResolvedValue(mockReferrals);

      const stats = await referralService.getReferralStats(mockReferrerId);

      expect(stats.pendingEarnings).toBe(0);
      expect(stats.totalEarnings).toBe(0);
    });
  });

  describe('validateReferralCode', () => {
    it('should validate correct referral code', async () => {
      const mockUser = {
        _id: mockReferrerId,
        phoneNumber: '+1234567890',
        profile: { firstName: 'John' },
        referral: { referralCode: 'REF12345678' },
      };

      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await referralService.validateReferralCode('REF12345678');

      expect(result.valid).toBe(true);
      expect(result.referrer).toBeDefined();
      expect(result.referrer?.referralCode).toBe('REF12345678');
    });

    it('should reject invalid referral code', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const result = await referralService.validateReferralCode('INVALID');

      expect(result.valid).toBe(false);
      expect(result.referrer).toBeUndefined();
    });
  });

  describe('processFirstOrder', () => {
    it('should use CoinTransaction for referrer reward', async () => {
      const mockReferral = {
        _id: new Types.ObjectId(),
        referrer: mockReferrerId,
        referee: mockRefereeId,
        status: ReferralStatus.PENDING,
        rewards: { referrerAmount: 50 },
        referrerRewarded: false,
        refereeRewarded: false,
        metadata: {},
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };

      (Referral.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockReferral),
      });

      (CoinTransaction.createTransaction as jest.Mock).mockResolvedValue({});
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (Referral.find as jest.Mock).mockResolvedValue([]);

      await referralService.processFirstOrder({
        refereeId: mockRefereeId,
        orderId: new Types.ObjectId(),
        orderAmount: 500,
      });

      // Verify CoinTransaction was used (not Transaction)
      expect(CoinTransaction.createTransaction).toHaveBeenCalledWith(
        String(mockReferrerId),
        'earned',
        50,
        'referral',
        expect.stringContaining('Referral reward'),
        expect.objectContaining({
          referralId: mockReferral._id,
          level: 'first_order',
        })
      );
    });

    it('should mark referral as ACTIVE when no referrer reward amount', async () => {
      const mockReferral = {
        _id: new Types.ObjectId(),
        referrer: mockReferrerId,
        referee: mockRefereeId,
        status: ReferralStatus.PENDING,
        rewards: { referrerAmount: 0 },
        referrerRewarded: false,
        refereeRewarded: false,
        metadata: {},
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };

      (Referral.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockReferral),
      });

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (Referral.find as jest.Mock).mockResolvedValue([]);

      await referralService.processFirstOrder({
        refereeId: mockRefereeId,
        orderId: new Types.ObjectId(),
        orderAmount: 500,
      });

      // With no referrer reward, status stays ACTIVE (not COMPLETED)
      expect(mockReferral.status).toBe(ReferralStatus.ACTIVE);
      expect(mockReferral.refereeRewarded).toBe(true);
      expect(mockReferral.referrerRewarded).toBe(false);
      expect(mockReferral.save).toHaveBeenCalled();
    });

    it('should mark referral as COMPLETED when both rewarded', async () => {
      const mockReferral = {
        _id: new Types.ObjectId(),
        referrer: mockReferrerId,
        referee: mockRefereeId,
        status: ReferralStatus.PENDING,
        rewards: { referrerAmount: 50 },
        referrerRewarded: false,
        refereeRewarded: true, // Already rewarded
        metadata: {},
        completedAt: null,
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };

      (Referral.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockReferral),
      });

      (CoinTransaction.createTransaction as jest.Mock).mockResolvedValue({});
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (Referral.find as jest.Mock).mockResolvedValue([]);

      await referralService.processFirstOrder({
        refereeId: mockRefereeId,
        orderId: new Types.ObjectId(),
        orderAmount: 500,
      });

      expect(mockReferral.status).toBe(ReferralStatus.COMPLETED);
      expect(mockReferral.completedAt).toBeDefined();
    });

    it('should skip if no pending referral found', async () => {
      (Referral.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await referralService.processFirstOrder({
        refereeId: mockRefereeId,
        orderId: new Types.ObjectId(),
        orderAmount: 500,
      });

      expect(CoinTransaction.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('processMilestoneBonus', () => {
    it('should only trigger on exactly 3rd order', async () => {
      await referralService.processMilestoneBonus(mockRefereeId, 2);
      expect(Referral.findOne).not.toHaveBeenCalled();

      await referralService.processMilestoneBonus(mockRefereeId, 4);
      expect(Referral.findOne).not.toHaveBeenCalled();
    });

    it('should use CoinTransaction for milestone bonus', async () => {
      const mockReferral = {
        _id: new Types.ObjectId(),
        referrer: mockReferrerId,
        referee: mockRefereeId,
        rewards: { milestoneBonus: 20 },
        milestoneRewarded: false,
        metadata: {},
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };

      (Referral.findOne as jest.Mock).mockResolvedValue(mockReferral);
      (CoinTransaction.createTransaction as jest.Mock).mockResolvedValue({});
      (Referral.find as jest.Mock).mockResolvedValue([]);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await referralService.processMilestoneBonus(mockRefereeId, 3);

      expect(CoinTransaction.createTransaction).toHaveBeenCalledWith(
        String(mockReferrerId),
        'earned',
        20,
        'referral',
        expect.stringContaining('milestone'),
        expect.objectContaining({
          level: 'milestone_3',
        })
      );
      expect(mockReferral.milestoneRewarded).toBe(true);
    });
  });

  describe('markExpiredReferrals', () => {
    it('should mark expired referrals', async () => {
      (Referral.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 5 });

      const count = await referralService.markExpiredReferrals();

      expect(count).toBe(5);
      expect(Referral.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: [ReferralStatus.PENDING, ReferralStatus.ACTIVE] },
          expiresAt: { $lt: expect.any(Date) },
        }),
        expect.objectContaining({
          $set: { status: ReferralStatus.EXPIRED },
        })
      );
    });

    it('should return 0 if no referrals expired', async () => {
      (Referral.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      const count = await referralService.markExpiredReferrals();
      expect(count).toBe(0);
    });
  });

  describe('Security and Data Privacy', () => {
    it('should not log PII in referral creation', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      const mockReferral = {
        _id: new Types.ObjectId(),
        referrer: mockReferrerId,
        referee: mockRefereeId,
        referralCode: 'REF12345678',
        status: ReferralStatus.PENDING,
      };

      (Referral.findOne as jest.Mock).mockResolvedValue(null);
      (Referral.create as jest.Mock).mockResolvedValue(mockReferral);

      await referralService.createReferral({
        referrerId: mockReferrerId,
        refereeId: mockRefereeId,
        referralCode: 'REF12345678',
      });

      // Verify logs are sanitized
      const logs = consoleSpy.mock.calls.map(call => call.join(' '));
      logs.forEach(log => {
        // Should not contain full ObjectIds
        expect(log).not.toContain(mockReferrerId.toString());
        expect(log).not.toContain(mockRefereeId.toString());
      });

      consoleSpy.mockRestore();
    });
  });
});
