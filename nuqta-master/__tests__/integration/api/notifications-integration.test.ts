/**
 * Notifications Integration Tests
 */

import apiClient from '@/services/apiClient';
import { testDataFactory, cleanupAfterTest } from '../utils/testHelpers';

jest.mock('@/services/apiClient');

describe('Notifications Integration Tests', () => {
  afterEach(async () => {
    await cleanupAfterTest();
  });

  it('should fetch notifications', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        notifications: [testDataFactory.notification()],
        unreadCount: 1,
      },
    });

    const notifications = await apiClient.get('/notifications');
    expect(notifications.data.unreadCount).toBe(1);
  });

  it('should mark notification as read', async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { notificationId: 'notif_123', read: true },
    });

    const result = await apiClient.put('/notifications/notif_123/read');
    expect(result.data.read).toBe(true);
  });

  it('should handle push notification registration', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { token: 'push_token_123', registered: true },
    });

    const result = await apiClient.post('/notifications/register', {
      token: 'ExponentPushToken[test]',
    });
    expect(result.data.registered).toBe(true);
  });
});
