/**
 * Onboarding Flow Integration Tests
 */

import authService from '@/services/authApi';
import apiClient from '@/services/apiClient';
import { cleanupAfterTest } from '../utils/testHelpers';
import { setupMockHandlers } from '../utils/mockApiHandlers';

jest.mock('@/services/apiClient');

describe('Onboarding Flow Integration Tests', () => {
  beforeEach(() => {
    setupMockHandlers(apiClient);
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  it('should complete: Signup → OTP → Profile → Preferences → Complete', async () => {
    // Send OTP
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { message: 'OTP sent', isNewUser: true },
    });

    await authService.sendOtp({ phoneNumber: '+1234567890' });

    // Verify OTP
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        user: { id: 'user_new', isOnboarded: false },
        tokens: { accessToken: 'token_123', refreshToken: 'refresh_123' },
      },
    });

    const loginResponse = await authService.verifyOtp({
      phoneNumber: '+1234567890',
      otp: '123456',
    });
    expect(loginResponse.data.user.isOnboarded).toBe(false);

    // Complete profile
    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        profile: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      },
    });

    await authService.updateProfile({
      profile: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    });

    // Set preferences (mock not consumed by this test flow — preferences are
    // included in the completeOnboarding call payload instead).

    // Complete onboarding
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { user: { isOnboarded: true } },
    });

    const onboarding = await authService.completeOnboarding({
      profile: { firstName: 'John', lastName: 'Doe' },
      preferences: { notifications: true },
    });
    expect(onboarding.data.user.isOnboarded).toBe(true);
  });
});
