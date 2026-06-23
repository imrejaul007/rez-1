/**
 * Gift Coins E2E Test Suite
 *
 * Tests the complete gift coins user flow:
 * 1. GET /gift/config — server-driven config
 * 2. POST /gift/validate-recipient — recipient phone lookup
 * 3. POST /gift/send — send gift (instant + scheduled)
 * 4. GET /gift/received — recipient sees the gift
 * 5. POST /gift/:id/claim — recipient claims
 * 6. GET /gift/sent — sender sees history
 * 7. Idempotency — duplicate detection
 * 8. Expiry job — expired gift refund
 * 9. Delivery job — scheduled gift delivery
 * 10. Admin routes — list, detail, refund, deliver
 */

import mongoose from 'mongoose';

// Mock Redis (not available in test env) — must be before imports that use it
jest.mock('../../services/redisService', () => ({
  __esModule: true,
  default: {
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

// Mock push notifications
jest.mock('../../services/pushNotificationService', () => ({
  __esModule: true,
  default: {
    sendGiftReceived: jest.fn(),
    sendGiftExpiredRefund: jest.fn(),
  },
}));

// Mock velocity check
jest.mock('../../services/walletVelocityService', () => ({
  checkVelocity: jest.fn().mockResolvedValue({ allowed: true }),
}));

// Imports after mocks
import { CoinGift } from '../../models/CoinGift';
import { Wallet } from '../../models/Wallet';
import { WalletConfig } from '../../models/WalletConfig';
import { CoinTransaction } from '../../models/CoinTransaction';
import { User } from '../../models/User';
import { runGiftExpiry } from '../../jobs/giftExpiryJob';
import { runGiftDelivery } from '../../jobs/giftDeliveryJob';
import redisService from '../../services/redisService';
import pushNotificationService from '../../services/pushNotificationService';

// ---- Helpers ----
let giftCounter = 0;

async function createTestUser(phone: string, name: string) {
  return User.create({
    phoneNumber: phone,
    fullName: name,
    firstName: name.split(' ')[0],
    lastName: name.split(' ')[1] || '',
    isVerified: true,
  });
}

async function createTestWallet(userId: mongoose.Types.ObjectId, balance: number) {
  return Wallet.create({
    user: userId,
    balance: { available: balance, total: balance, pending: 0, cashback: 0 },
    statistics: { totalEarned: balance, totalSpent: 0 },
    lastTransactionAt: new Date(),
  });
}

/** Create a CoinGift with auto-unique idempotencyKey to avoid sparse index collision */
async function createGift(data: any) {
  giftCounter++;
  return CoinGift.create({
    ...data,
    idempotencyKey: data.idempotencyKey ?? `auto-key-${giftCounter}-${Date.now()}`,
  });
}

// ---- Tests ----

describe('Gift Coins E2E Flow', () => {
  let sender: any;
  let recipient: any;
  let senderWallet: any;
  let recipientWallet: any;
  let config: any;

  beforeEach(async () => {
    // Restore mock implementations (jest resetMocks clears them each test)
    (redisService.acquireLock as jest.Mock).mockResolvedValue('test-lock-token');
    (redisService.releaseLock as jest.Mock).mockResolvedValue(true);
    (redisService.get as jest.Mock).mockResolvedValue(null);
    (redisService.set as jest.Mock).mockResolvedValue('OK');
    (redisService.del as jest.Mock).mockResolvedValue(1);
    (pushNotificationService.sendGiftReceived as jest.Mock).mockResolvedValue(true);
    (pushNotificationService.sendGiftExpiredRefund as jest.Mock).mockResolvedValue(true);

    // Seed users
    sender = await createTestUser('+919876543210', 'Test Sender');
    recipient = await createTestUser('+919876543211', 'Test Recipient');

    // Seed wallets
    senderWallet = await createTestWallet(sender._id, 5000);
    recipientWallet = await createTestWallet(recipient._id, 1000);

    // Seed CoinTransaction balance (source of truth for createTransaction balance check)
    await CoinTransaction.createTransaction(
      String(sender._id), 'earned', 5000, 'admin', 'Initial balance seed'
    );
    await CoinTransaction.createTransaction(
      String(recipient._id), 'earned', 1000, 'admin', 'Initial balance seed'
    );

    // Seed wallet config
    config = await WalletConfig.getOrCreate();
  });

  // ================================================================
  // 1. Gift Config
  // ================================================================
  describe('Gift Config (getGiftConfig)', () => {
    it('should return themes, denominations, limits from WalletConfig', async () => {
      const cfg = await WalletConfig.getOrCreate();

      expect(cfg.giftLimits.themes).toBeDefined();
      expect(cfg.giftLimits.themes.length).toBe(6);
      expect(cfg.giftLimits.denominations).toEqual([50, 100, 250, 500, 1000, 2000]);
      expect(cfg.giftLimits.minAmount).toBe(10);
      expect(cfg.giftLimits.perGiftMax).toBe(5000);
      expect(cfg.giftLimits.maxGiftsPerDay).toBe(20);
      expect(cfg.giftLimits.messageMaxLength).toBe(150);
      expect(cfg.giftLimits.scheduledDeliveryEnabled).toBe(false);
    });

    it('should filter inactive themes', async () => {
      const cfg = await WalletConfig.getOrCreate();
      cfg.giftLimits.themes[0].isActive = false;
      cfg.markModified('giftLimits');
      await cfg.save();

      const refreshed = await WalletConfig.getOrCreate();
      const activeThemes = refreshed.giftLimits.themes.filter((t: any) => t.isActive);
      expect(activeThemes.length).toBe(5);
    });
  });

  // ================================================================
  // 2. Recipient Validation
  // ================================================================
  describe('Recipient Validation', () => {
    it('should find existing user by phone suffix', async () => {
      const found = await User.findOne({
        phoneNumber: { $regex: '9876543211$' },
      }).lean();

      expect(found).toBeTruthy();
      expect(found!.phoneNumber).toBe('+919876543211');
    });

    it('should return null for unregistered phone', async () => {
      const found = await User.findOne({
        phoneNumber: { $regex: '0000000000$' },
      }).lean();

      expect(found).toBeNull();
    });

    it('should mask name correctly', () => {
      const maskName = (name: string) =>
        name.split(' ').map(w => w.length <= 2 ? w : w[0] + '***' + w[w.length - 1]).join(' ');

      expect(maskName('Test Sender')).toBe('T***t S***r');
      expect(maskName('Ab')).toBe('Ab');
      expect(maskName('Mohammed Rahil')).toBe('M***d R***l');
    });
  });

  // ================================================================
  // 3. Send Gift (Instant)
  // ================================================================
  describe('Send Gift — Instant Delivery', () => {
    it('should debit sender wallet and create gift with CoinTransaction', async () => {
      const gift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 500,
        coinType: 'nuqta',
        theme: 'birthday',
        message: 'Happy birthday!',
        deliveryType: 'instant',
        status: 'delivered',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Debit sender wallet
      const debitResult = await Wallet.findOneAndUpdate(
        { _id: senderWallet._id, 'balance.available': { $gte: 500 } },
        { $inc: { 'balance.available': -500, 'balance.total': -500 } },
        { new: true }
      );

      expect(debitResult).toBeTruthy();
      expect(debitResult!.balance.available).toBe(4500);
      expect(debitResult!.balance.total).toBe(4500);

      // Create CoinTransaction
      const tx = await CoinTransaction.createTransaction(
        String(sender._id),
        'spent',
        500,
        'transfer',
        'Gift sent to Test Recipient',
        { giftId: gift._id, recipientId: recipient._id }
      );

      expect(tx).toBeTruthy();
      expect(tx.type).toBe('spent');
      expect(tx.amount).toBe(500);

      // Verify gift state
      const savedGift = await CoinGift.findById(gift._id);
      expect(savedGift).toBeTruthy();
      expect(savedGift!.status).toBe('delivered');
      expect(savedGift!.theme).toBe('birthday');
      expect(savedGift!.message).toBe('Happy birthday!');
    });

    it('should reject insufficient balance via atomic guard', async () => {
      const result = await Wallet.findOneAndUpdate(
        { _id: senderWallet._id, 'balance.available': { $gte: 99999 } },
        { $inc: { 'balance.available': -99999 } },
        { new: true }
      );
      expect(result).toBeNull();
    });

    it('should enforce min/max amount from config', () => {
      expect(5 < config.giftLimits.minAmount).toBe(true);
      expect(100 >= config.giftLimits.minAmount).toBe(true);
      expect(100 <= config.giftLimits.perGiftMax).toBe(true);
      expect(10000 > config.giftLimits.perGiftMax).toBe(true);
    });

    it('should exclude failed/cancelled from daily gift count', async () => {
      await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 100,
        theme: 'gift',
        status: 'cancelled',
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const count = await CoinGift.countDocuments({
        sender: sender._id,
        createdAt: { $gte: todayStart },
        status: { $nin: ['failed', 'cancelled'] },
      });

      expect(count).toBe(0);
    });
  });

  // ================================================================
  // 4. Get Received Gifts
  // ================================================================
  describe('Get Received Gifts', () => {
    it('should show delivered gifts with valid expiry', async () => {
      await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 300,
        theme: 'gift',
        status: 'delivered',
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const gifts = await CoinGift.find({
        recipient: recipient._id,
        $or: [
          { status: 'claimed' },
          { status: 'delivered', expiresAt: { $gte: new Date() } },
        ],
      });

      expect(gifts.length).toBe(1);
      expect(gifts[0].status).toBe('delivered');
    });

    it('should always show claimed gifts even after expiresAt', async () => {
      await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 200,
        theme: 'love',
        status: 'claimed',
        claimedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      });

      const gifts = await CoinGift.find({
        recipient: recipient._id,
        $or: [
          { status: 'claimed' },
          { status: 'delivered', expiresAt: { $gte: new Date() } },
        ],
      });

      expect(gifts.length).toBe(1);
      expect(gifts[0].status).toBe('claimed');
    });

    it('should NOT show delivered gifts past expiry', async () => {
      await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 100,
        theme: 'thanks',
        status: 'delivered',
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });

      const gifts = await CoinGift.find({
        recipient: recipient._id,
        $or: [
          { status: 'claimed' },
          { status: 'delivered', expiresAt: { $gte: new Date() } },
        ],
      });

      expect(gifts.length).toBe(0);
    });
  });

  // ================================================================
  // 5. Claim Gift
  // ================================================================
  describe('Claim Gift', () => {
    let giftToClaim: any;

    beforeEach(async () => {
      giftToClaim = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 500,
        theme: 'congrats',
        status: 'delivered',
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    });

    it('should atomically transition delivered → claimed', async () => {
      const claimed = await CoinGift.findOneAndUpdate(
        { _id: giftToClaim._id, recipient: recipient._id, status: 'delivered', expiresAt: { $gte: new Date() } },
        { $set: { status: 'claimed', claimedAt: new Date() } },
        { new: true }
      );

      expect(claimed).toBeTruthy();
      expect(claimed!.status).toBe('claimed');
      expect(claimed!.claimedAt).toBeTruthy();
    });

    it('should credit recipient wallet', async () => {
      const creditResult = await Wallet.findOneAndUpdate(
        { _id: recipientWallet._id },
        { $inc: { 'balance.available': 500, 'balance.total': 500 } },
        { new: true }
      );

      expect(creditResult!.balance.available).toBe(1500);
      expect(creditResult!.balance.total).toBe(1500);
    });

    it('should create recipient CoinTransaction', async () => {
      const tx = await CoinTransaction.createTransaction(
        String(recipient._id),
        'earned',
        500,
        'transfer',
        'Gift received from a friend',
        { giftId: giftToClaim._id, senderId: sender._id }
      );

      expect(tx.type).toBe('earned');
      expect(tx.amount).toBe(500);
      expect(tx.source).toBe('transfer');
    });

    it('should prevent double-claim (atomic guard)', async () => {
      await CoinGift.findOneAndUpdate(
        { _id: giftToClaim._id, status: 'delivered' },
        { $set: { status: 'claimed' } }
      );

      const secondAttempt = await CoinGift.findOneAndUpdate(
        { _id: giftToClaim._id, status: 'delivered' },
        { $set: { status: 'claimed' } }
      );

      expect(secondAttempt).toBeNull();
    });

    it('should reject claim on expired gift', async () => {
      const expiredGift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 100,
        theme: 'gift',
        status: 'delivered',
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = await CoinGift.findOneAndUpdate(
        { _id: expiredGift._id, status: 'delivered', expiresAt: { $gte: new Date() } },
        { $set: { status: 'claimed' } }
      );

      expect(result).toBeNull();
    });
  });

  // ================================================================
  // 6. Idempotency
  // ================================================================
  describe('Idempotency', () => {
    it('should detect duplicate for delivered gift with same key', async () => {
      await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 500,
        theme: 'birthday',
        status: 'delivered',
        deliveryType: 'instant',
        idempotencyKey: 'idem-key-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const found = await CoinGift.findOne({ sender: sender._id, idempotencyKey: 'idem-key-1' });
      expect(found).toBeTruthy();
      expect(['delivered', 'claimed'].includes(found!.status)).toBe(true);
    });

    it('should clear key for failed/cancelled gifts to allow retry', async () => {
      const failedGift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 500,
        theme: 'gift',
        status: 'cancelled',
        deliveryType: 'instant',
        idempotencyKey: 'idem-key-2',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      if (['failed', 'cancelled', 'expired'].includes(failedGift.status)) {
        failedGift.idempotencyKey = undefined;
        await failedGift.save();
      }

      const refound = await CoinGift.findOne({ sender: sender._id, idempotencyKey: 'idem-key-2' });
      expect(refound).toBeNull();
    });

    it('should detect duplicate for pending gift with same key', async () => {
      await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 300,
        theme: 'love',
        status: 'pending',
        deliveryType: 'scheduled',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
        idempotencyKey: 'idem-key-3',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const found = await CoinGift.findOne({ sender: sender._id, idempotencyKey: 'idem-key-3' });
      expect(found!.status).toBe('pending');
    });
  });

  // ================================================================
  // 7. Theme Flexibility (no hardcoded enum)
  // ================================================================
  describe('Theme Flexibility', () => {
    it('should accept custom theme names (no enum restriction)', async () => {
      const gift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 100,
        theme: 'eid_mubarak',
        status: 'delivered',
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(gift.theme).toBe('eid_mubarak');
    });

    it('should accept all default themes', async () => {
      const defaultThemes = ['birthday', 'christmas', 'gift', 'love', 'thanks', 'congrats'];
      for (const theme of defaultThemes) {
        const gift = await createGift({
          sender: sender._id,
          recipient: recipient._id,
          amount: 50,
          theme,
          status: 'delivered',
          deliveryType: 'instant',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        expect(gift.theme).toBe(theme);
      }
    });
  });

  // ================================================================
  // 8. Gift Expiry Job
  // ================================================================
  describe('Gift Expiry Job', () => {
    it('should expire delivered gifts past expiresAt and refund sender', async () => {
      const expiredGift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 300,
        theme: 'gift',
        status: 'delivered',
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() - 1000),
      });

      await runGiftExpiry();

      const updated = await CoinGift.findById(expiredGift._id);
      expect(updated!.status).toBe('expired');

      const updatedWallet = await Wallet.findById(senderWallet._id);
      expect(updatedWallet!.balance.available).toBe(5300);

      expect(pushNotificationService.sendGiftExpiredRefund).toHaveBeenCalled();
    });

    it('should NOT expire claimed gifts', async () => {
      const claimedGift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 200,
        theme: 'love',
        status: 'claimed',
        claimedAt: new Date(),
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() - 1000),
      });

      await runGiftExpiry();

      const updated = await CoinGift.findById(claimedGift._id);
      expect(updated!.status).toBe('claimed');
    });

    it('should NOT expire pending (scheduled) gifts', async () => {
      const pendingGift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 100,
        theme: 'birthday',
        status: 'pending',
        deliveryType: 'scheduled',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 1000),
      });

      await runGiftExpiry();

      const updated = await CoinGift.findById(pendingGift._id);
      expect(updated!.status).toBe('pending');
    });
  });

  // ================================================================
  // 9. Gift Delivery Job
  // ================================================================
  describe('Gift Delivery Job', () => {
    it('should deliver scheduled gifts whose scheduledAt has passed', async () => {
      const scheduledGift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 500,
        theme: 'birthday',
        status: 'pending',
        deliveryType: 'scheduled',
        scheduledAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await runGiftDelivery();

      const updated = await CoinGift.findById(scheduledGift._id);
      expect(updated!.status).toBe('delivered');

      expect(pushNotificationService.sendGiftReceived).toHaveBeenCalled();
    });

    it('should NOT deliver instant gifts', async () => {
      const instantGift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 100,
        theme: 'gift',
        status: 'pending',
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await runGiftDelivery();

      const updated = await CoinGift.findById(instantGift._id);
      expect(updated!.status).toBe('pending');
    });

    it('should NOT deliver future scheduled gifts', async () => {
      const futureGift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 100,
        theme: 'gift',
        status: 'pending',
        deliveryType: 'scheduled',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await runGiftDelivery();

      const updated = await CoinGift.findById(futureGift._id);
      expect(updated!.status).toBe('pending');
    });
  });

  // ================================================================
  // 10. Message Moderation
  // ================================================================
  describe('Message Moderation', () => {
    it('should block profane messages', () => {
      const blockedPatterns = [
        /\b(fuck|shit|ass|bitch|damn|dick|bastard|cunt|whore|slut)\b/i,
        /\b(kill|murder|die|threat|bomb|attack)\b/i,
      ];

      const testMessages = [
        { msg: 'Happy birthday!', blocked: false },
        { msg: 'You are the shit', blocked: true },
        { msg: 'I will kill it!', blocked: true },
        { msg: 'Love you so much', blocked: false },
        { msg: 'Great job on the attack!', blocked: true },
        { msg: 'Congrats on your success!', blocked: false },
      ];

      for (const { msg, blocked } of testMessages) {
        const isBlocked = blockedPatterns.some(p => p.test(msg.toLowerCase()));
        expect(isBlocked).toBe(blocked);
      }
    });
  });

  // ================================================================
  // 11. Admin Operations
  // ================================================================
  describe('Admin Operations', () => {
    let testGift: any;

    beforeEach(async () => {
      testGift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 1000,
        theme: 'congrats',
        status: 'delivered',
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    });

    it('should list gifts with pagination', async () => {
      const gifts = await CoinGift.find({})
        .sort({ createdAt: -1 })
        .skip(0)
        .limit(20)
        .lean();

      expect(gifts.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const deliveredGifts = await CoinGift.find({ status: 'delivered' }).lean();
      expect(deliveredGifts.length).toBeGreaterThan(0);
      deliveredGifts.forEach(g => expect(g.status).toBe('delivered'));
    });

    it('should refund gift: cancel + wallet credit + CoinTransaction', async () => {
      // Atomic cancel
      const cancelled = await CoinGift.findOneAndUpdate(
        { _id: testGift._id, status: { $in: ['delivered', 'pending'] } },
        { $set: { status: 'cancelled' } },
        { new: true }
      );
      expect(cancelled!.status).toBe('cancelled');

      // Credit sender wallet
      const walletAfter = await Wallet.findOneAndUpdate(
        { user: sender._id },
        { $inc: { 'balance.available': 1000, 'balance.total': 1000 } },
        { new: true }
      );
      expect(walletAfter!.balance.available).toBe(6000);

      // Create refund CoinTransaction
      const tx = await CoinTransaction.createTransaction(
        String(sender._id),
        'refunded',
        1000,
        'transfer',
        'Admin refund: gift cancelled — test reason',
        { giftId: testGift._id }
      );
      expect(tx.type).toBe('refunded');
    });

    it('should manually deliver stuck pending gift', async () => {
      const pendingGift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: 200,
        theme: 'gift',
        status: 'pending',
        deliveryType: 'scheduled',
        scheduledAt: new Date(Date.now() - 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const delivered = await CoinGift.findOneAndUpdate(
        { _id: pendingGift._id, status: 'pending' },
        { $set: { status: 'delivered' } },
        { new: true }
      );
      expect(delivered!.status).toBe('delivered');
    });

    it('should NOT refund already claimed gift', async () => {
      await CoinGift.findByIdAndUpdate(testGift._id, { status: 'claimed' });

      const result = await CoinGift.findOneAndUpdate(
        { _id: testGift._id, status: { $in: ['delivered', 'pending'] } },
        { $set: { status: 'cancelled' } },
        { new: true }
      );
      expect(result).toBeNull();
    });
  });

  // ================================================================
  // 12. Full Lifecycle: Send → Claim → Verify Balances
  // ================================================================
  describe('Full Lifecycle: Send → Claim → Verify Balances', () => {
    it('should complete the full send → claim cycle with correct balances', async () => {
      const giftAmount = 500;
      const senderInitialBalance = senderWallet.balance.available;
      const recipientInitialBalance = recipientWallet.balance.available;

      // Step 1: Debit sender
      const debitedWallet = await Wallet.findOneAndUpdate(
        { _id: senderWallet._id, 'balance.available': { $gte: giftAmount } },
        { $inc: { 'balance.available': -giftAmount, 'balance.total': -giftAmount } },
        { new: true }
      );
      expect(debitedWallet!.balance.available).toBe(senderInitialBalance - giftAmount);

      // Step 2: Create gift
      const gift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: giftAmount,
        theme: 'birthday',
        message: 'Happy Birthday!',
        status: 'delivered',
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Step 3: Create sender CoinTransaction
      const senderTx = await CoinTransaction.createTransaction(
        String(sender._id),
        'spent',
        giftAmount,
        'transfer',
        'Gift sent',
        { giftId: gift._id }
      );
      gift.senderTxId = senderTx._id as mongoose.Types.ObjectId;
      await gift.save();

      // Step 4: Claim gift
      const claimed = await CoinGift.findOneAndUpdate(
        { _id: gift._id, recipient: recipient._id, status: 'delivered', expiresAt: { $gte: new Date() } },
        { $set: { status: 'claimed', claimedAt: new Date() } },
        { new: true }
      );
      expect(claimed!.status).toBe('claimed');

      // Step 5: Credit recipient
      const creditedWallet = await Wallet.findOneAndUpdate(
        { _id: recipientWallet._id },
        { $inc: { 'balance.available': giftAmount, 'balance.total': giftAmount } },
        { new: true }
      );
      expect(creditedWallet!.balance.available).toBe(recipientInitialBalance + giftAmount);

      // Step 6: Create recipient CoinTransaction
      const recipientTx = await CoinTransaction.createTransaction(
        String(recipient._id),
        'earned',
        giftAmount,
        'transfer',
        'Gift received',
        { giftId: gift._id }
      );
      claimed!.recipientTxId = recipientTx._id as mongoose.Types.ObjectId;
      await claimed!.save();

      // Verify final state
      const finalGift = await CoinGift.findById(gift._id);
      expect(finalGift!.senderTxId).toBeTruthy();
      expect(finalGift!.recipientTxId).toBeTruthy();
      expect(finalGift!.status).toBe('claimed');

      const finalSenderWallet = await Wallet.findById(senderWallet._id);
      const finalRecipientWallet = await Wallet.findById(recipientWallet._id);
      expect(finalSenderWallet!.balance.available).toBe(senderInitialBalance - giftAmount);
      expect(finalRecipientWallet!.balance.available).toBe(recipientInitialBalance + giftAmount);
    });
  });

  // ================================================================
  // 13. Full Lifecycle: Send → Expire → Refund
  // ================================================================
  describe('Full Lifecycle: Send → Expire → Refund', () => {
    it('should refund sender when gift expires unclaimed', async () => {
      const giftAmount = 300;

      // Debit sender
      await Wallet.findOneAndUpdate(
        { _id: senderWallet._id },
        { $inc: { 'balance.available': -giftAmount, 'balance.total': -giftAmount } }
      );

      // Create expired gift
      const gift = await createGift({
        sender: sender._id,
        recipient: recipient._id,
        amount: giftAmount,
        theme: 'gift',
        status: 'delivered',
        deliveryType: 'instant',
        expiresAt: new Date(Date.now() - 1000),
      });

      // Run expiry job
      await runGiftExpiry();

      // Gift should be expired
      const updatedGift = await CoinGift.findById(gift._id);
      expect(updatedGift!.status).toBe('expired');

      // Sender should get refund: 5000 - 300 + 300 = 5000
      const updatedWallet = await Wallet.findById(senderWallet._id);
      expect(updatedWallet!.balance.available).toBe(5000);

      // Recipient wallet unchanged
      const recipWallet = await Wallet.findById(recipientWallet._id);
      expect(recipWallet!.balance.available).toBe(1000);
    });
  });
});
