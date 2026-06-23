/**
 * Unit Tests for Mind Integration Service
 */

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock logger
jest.mock('../config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Mind Integration Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REZ_MIND_URL = 'http://localhost:4008';
    process.env.INTENT_CAPTURE_URL = 'https://rez-intent-graph.onrender.com';
    process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
  });

  describe('sendEventToMind', () => {
    it('should send event to Mind', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const { sendEventToMind } = require('../services/mindIntegration');
      const result = await sendEventToMind({
        event: 'test_event',
        userId: 'user-123',
        source: 'test-source',
        metadata: { key: 'value' },
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4008/webhook/consumer/event',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Internal-Token': 'test-token',
          }),
        }),
      );
    });

    it('should return false on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { sendEventToMind } = require('../services/mindIntegration');
      const result = await sendEventToMind({
        event: 'test_event',
        userId: 'user-123',
        source: 'test-source',
      });

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { sendEventToMind } = require('../services/mindIntegration');
      const result = await sendEventToMind({
        event: 'test_event',
        userId: 'user-123',
        source: 'test-source',
      });

      expect(result).toBe(false);
    });
  });

  describe('captureIntent', () => {
    it('should capture intent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const { captureIntent } = require('../services/mindIntegration');
      const result = await captureIntent({
        userId: 'user-123',
        appType: 'social-impact',
        event: 'event_completed',
        intentKey: 'social_impact_event-123',
        metadata: { eventId: 'event-123' },
      });

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { captureIntent } = require('../services/mindIntegration');
      const result = await captureIntent({
        userId: 'user-123',
        appType: 'social-impact',
        event: 'event_completed',
        intentKey: 'social_impact_event-123',
      });

      expect(result).toBe(false);
    });
  });

  describe('sendSocialImpactEventToMind', () => {
    it('should send social impact event', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendSocialImpactEventToMind } = require('../services/mindIntegration');
      await sendSocialImpactEventToMind({
        userId: 'user-123',
        eventId: 'event-456',
        eventName: 'Charity Run',
        eventType: 'charity',
        sponsorId: 'sponsor-789',
        karmaEarned: 50,
        coinsEarned: 100,
        location: { lat: 12.97, lng: 77.59, city: 'Bangalore' },
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { sendSocialImpactEventToMind } = require('../services/mindIntegration');

      // Should not throw
      await expect(
        sendSocialImpactEventToMind({
          userId: 'user-123',
          eventId: 'event-456',
          eventName: 'Charity Run',
          eventType: 'charity',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('sendBillUploadEventToMind', () => {
    it('should send bill upload event', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendBillUploadEventToMind } = require('../services/mindIntegration');
      await sendBillUploadEventToMind({
        userId: 'user-123',
        billId: 'bill-456',
        merchantId: 'merchant-789',
        merchantName: 'Starbucks',
        amount: 250,
        cashbackEarned: 12.5,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendAdEngagementToMind', () => {
    it('should send ad engagement event', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendAdEngagementToMind } = require('../services/mindIntegration');
      await sendAdEngagementToMind({
        userId: 'user-123',
        campaignId: 'campaign-456',
        adId: 'ad-789',
        merchantId: 'merchant-abc',
        action: 'scanned',
        location: { lat: 12.97, lng: 77.59 },
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle all action types', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendAdEngagementToMind } = require('../services/mindIntegration');

      for (const action of ['scanned', 'viewed', 'clicked', 'converted']) {
        await sendAdEngagementToMind({
          userId: 'user-123',
          campaignId: 'campaign-456',
          action: action as any,
        });
      }

      expect(mockFetch).toHaveBeenCalledTimes(8); // 2 calls per action
    });
  });
});
