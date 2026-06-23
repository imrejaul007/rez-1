/**
 * Unit Tests for shareUtils.ts
 */

import {
  shareAppPage,
  shareOffersPage,
  shareSpecificOffer,
  isSharingAvailable,
  generateAppDownloadMessage,
} from '@/utils/shareUtils';
import { Share } from 'react-native';

jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
    sharedAction: 'sharedAction',
    dismissedAction: 'dismissedAction',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

describe('shareUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shareAppPage', () => {
    it('should share app page successfully', async () => {
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      const result = await shareAppPage({
        page: 'offers',
        title: 'Test Page',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('shared');
      expect(Share.share).toHaveBeenCalled();
    });

    it('should handle share dismissal', async () => {
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.dismissedAction,
      });

      const result = await shareAppPage({ page: 'offers' });

      expect(result.success).toBe(true);
      expect(result.action).toBe('dismissed');
    });

    it('should handle share errors', async () => {
      (Share.share as jest.Mock).mockRejectedValue(new Error('Share failed'));

      const result = await shareAppPage({ page: 'offers' });

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
    });
  });

  describe('shareOffersPage', () => {
    it('should share offers page with correct content', async () => {
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      await shareOffersPage();

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'MEGA OFFERS',
          message: expect.stringContaining('MEGA OFFERS'),
        })
      );
    });
  });

  describe('shareSpecificOffer', () => {
    it('should share specific offer with details', async () => {
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      await shareSpecificOffer('offer-123', 'Great Deal', 10);

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Great Deal',
          message: expect.stringContaining('10%'),
        })
      );
    });
  });

  describe('isSharingAvailable', () => {
    it('should return true when Share.share is available', () => {
      expect(isSharingAvailable()).toBe(true);
    });
  });

  describe('generateAppDownloadMessage', () => {
    it('should generate download message with links', () => {
      const message = generateAppDownloadMessage();

      expect(message).toContain('Android:');
      expect(message).toContain('iOS:');
      expect(message).toContain('https://');
    });
  });
});
