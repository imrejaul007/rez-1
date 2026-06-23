/**
 * Unit Tests for Karma Integration Service
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

describe('Karma Integration Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.KARMA_API_URL = 'http://localhost:4001';
    process.env.INTERNAL_SERVICE_KEY = 'test-internal-key';
  });

  describe('recordKarmaCheckIn', () => {
    it('should record check-in to karma service', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            booking: { _id: 'booking-123' },
            confidenceScore: 0.6,
            status: 'verified',
            karmaEarned: 30,
          }),
      });

      const { recordKarmaCheckIn } = require('../services/karmaIntegration');
      const result = await recordKarmaCheckIn('user-123', 'event-456', 'qr', 'qr-code-data', {
        lat: 12.97,
        lng: 77.59,
      });

      expect(result.success).toBe(true);
      expect(result.bookingId).toBe('booking-123');
      expect(result.confidenceScore).toBe(0.6);
      expect(result.status).toBe('verified');
      expect(result.karmaEarned).toBe(30);
    });

    it('should handle karma service errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Event not found' }),
      });

      const { recordKarmaCheckIn } = require('../services/karmaIntegration');
      const result = await recordKarmaCheckIn('user-123', 'event-456', 'qr');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Event not found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { recordKarmaCheckIn } = require('../services/karmaIntegration');
      const result = await recordKarmaCheckIn('user-123', 'event-456', 'qr');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Karma service unavailable');
    });
  });

  describe('recordKarmaCheckOut', () => {
    it('should record check-out to karma service', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'verified',
            karmaEarned: 50,
          }),
      });

      const { recordKarmaCheckOut } = require('../services/karmaIntegration');
      const result = await recordKarmaCheckOut('user-123', 'event-456', 'qr');

      expect(result.success).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.karmaEarned).toBe(50);
    });
  });

  describe('getKarmaProfile', () => {
    it('should fetch karma profile', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            totalKarma: 500,
            activeKarma: 450,
            level: 'gold',
            rank: 42,
          }),
      });

      const { getKarmaProfile } = require('../services/karmaIntegration');
      const result = await getKarmaProfile('user-123');

      expect(result.success).toBe(true);
      expect(result.profile?.totalKarma).toBe(500);
      expect(result.profile?.level).toBe('gold');
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { getKarmaProfile } = require('../services/karmaIntegration');
      const result = await getKarmaProfile('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Karma service unavailable');
    });
  });

  describe('getKarmaMultiplier', () => {
    it('should return 1.0 for bronze tier', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            totalKarma: 100,
            level: 'bronze',
          }),
      });

      const { getKarmaMultiplier } = require('../services/karmaIntegration');
      const result = await getKarmaMultiplier('user-123');

      expect(result.multiplier).toBe(1.0);
      expect(result.tier).toBe('bronze');
    });

    it('should return 2.0 for platinum tier', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            totalKarma: 5000,
            level: 'platinum',
          }),
      });

      const { getKarmaMultiplier } = require('../services/karmaIntegration');
      const result = await getKarmaMultiplier('user-123');

      expect(result.multiplier).toBe(2.0);
      expect(result.tier).toBe('platinum');
    });

    it('should return defaults on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { getKarmaMultiplier } = require('../services/karmaIntegration');
      const result = await getKarmaMultiplier('user-123');

      expect(result.multiplier).toBe(1.0);
      expect(result.tier).toBe('default');
    });
  });

  describe('approveKarmaVerification', () => {
    it('should approve verification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const { approveKarmaVerification } = require('../services/karmaIntegration');
      const result = await approveKarmaVerification('booking-123', true, 'Confirmed attendance');

      expect(result.success).toBe(true);
    });

    it('should handle rejection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const { approveKarmaVerification } = require('../services/karmaIntegration');
      const result = await approveKarmaVerification('booking-123', false, 'No attendance proof');

      expect(result.success).toBe(true);
    });
  });
});
