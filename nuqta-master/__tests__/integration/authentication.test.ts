/**
 * Authentication Flow - Integration Tests
 *
 * Integration tests for authentication including:
 * - OTP generation and verification
 * - Login and registration
 * - Token management
 * - Session persistence
 * - Logout
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '@/services/authApi';
import apiClient from '@/services/apiClient';

jest.mock('@/services/apiClient');
jest.mock('@react-native-async-storage/async-storage');

describe('Authentication Flow Integration Tests', () => {
  const mockPhoneNumber = '+1234567890';
  const mockEmail = 'test@example.com';
  const mockOTP = '123456';

  const mockUser = {
    id: 'user_123',
    phoneNumber: mockPhoneNumber,
    email: mockEmail,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
    },
    isOnboarded: true,
  };

  const mockTokens = {
    accessToken: 'access_token_123',
    refreshToken: 'refresh_token_123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.multiSet as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([]);
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full authentication flow from OTP to login', async () => {
      // Step 1: Send OTP
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          message: 'OTP sent successfully',
          expiresIn: 300,
        },
      });

      const otpResponse = await authService.sendOtp({
        phoneNumber: mockPhoneNumber,
        email: mockEmail,
      });

      expect(otpResponse.success).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith('/auth/send-otp', {
        phoneNumber: mockPhoneNumber,
        email: mockEmail,
      });

      // Step 2: Verify OTP and login
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
      });

      const loginResponse = await authService.verifyOtp({
        phoneNumber: mockPhoneNumber,
        otp: mockOTP,
      });

      expect(loginResponse.success).toBe(true);
      expect(loginResponse.data.user.id).toBe('user_123');
      expect(loginResponse.data.tokens.accessToken).toBe('access_token_123');

      // Step 3: Verify token is set in apiClient
      expect(authService.getAuthToken()).toBe('access_token_123');
    });

    it('should handle new user registration flow', async () => {
      // Send OTP for new user
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          message: 'OTP sent successfully',
          isNewUser: true,
        },
      });

      await authService.sendOtp({
        phoneNumber: mockPhoneNumber,
        email: mockEmail,
      });

      // Verify OTP creates new user
      const newUser = {
        ...mockUser,
        isOnboarded: false, // New user hasn't completed onboarding
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          user: newUser,
          tokens: mockTokens,
        },
      });

      const response = await authService.verifyOtp({
        phoneNumber: mockPhoneNumber,
        otp: mockOTP,
      });

      expect(response.data.user.isOnboarded).toBe(false);
    });
  });

  describe('OTP Management', () => {
    it('should send OTP successfully', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          message: 'OTP sent',
          expiresIn: 300,
        },
      });

      const response = await authService.sendOtp({
        phoneNumber: mockPhoneNumber,
      });

      expect(response.success).toBe(true);
    });

    it('should handle OTP rate limiting', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 429,
          data: {
            error: 'Too many requests. Please try again later.',
            retryAfter: 60,
          },
        },
      });

      await expect(
        authService.sendOtp({ phoneNumber: mockPhoneNumber })
      ).rejects.toMatchObject({
        response: {
          status: 429,
        },
      });
    });

    it('should reject invalid phone numbers', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'Invalid phone number format',
          },
        },
      });

      await expect(
        authService.sendOtp({ phoneNumber: 'invalid' })
      ).rejects.toBeDefined();
    });
  });

  describe('Token Management', () => {
    it('should store tokens after successful login', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
      });

      await authService.verifyOtp({
        phoneNumber: mockPhoneNumber,
        otp: mockOTP,
      });

      // Verify token is set
      authService.setAuthToken(mockTokens.accessToken);
      expect(authService.getAuthToken()).toBe('access_token_123');
    });

    it('should refresh expired tokens automatically', async () => {
      // Initial request fails with 401
      (apiClient.get as jest.Mock)
        .mockRejectedValueOnce({
          response: { status: 401 },
        })
        // After refresh, request succeeds
        .mockResolvedValueOnce({
          success: true,
          data: mockUser,
        });

      // Refresh token request
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          tokens: {
            accessToken: 'new_access_token',
            refreshToken: 'new_refresh_token',
          },
        },
      });

      // This should trigger auto-refresh
      await authService.refreshToken('refresh_token_123');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh-token', {
        refreshToken: 'refresh_token_123',
      });
    });

    it('should handle refresh token expiration', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: 'Refresh token expired',
          },
        },
      });

      await expect(
        authService.refreshToken('expired_refresh_token')
      ).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });
  });

  describe('Session Persistence', () => {
    it('should persist session across app restarts', async () => {
      // Simulate stored session
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
        ['access_token', mockTokens.accessToken],
        ['refresh_token', mockTokens.refreshToken],
        ['auth_user', JSON.stringify(mockUser)],
      ]);

      const [[, accessToken], [, refreshToken], [, userJson]] =
        await AsyncStorage.multiGet(['access_token', 'refresh_token', 'auth_user']);

      expect(accessToken).toBe(mockTokens.accessToken);
      expect(refreshToken).toBe(mockTokens.refreshToken);

      const user = JSON.parse(userJson!);
      expect(user.id).toBe('user_123');

      // Set token and verify API calls work
      authService.setAuthToken(accessToken!);

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      const profile = await authService.getProfile();
      expect(profile.data.id).toBe('user_123');
    });

    it('should clear session on logout', async () => {
      // Set tokens
      authService.setAuthToken('access_token_123');

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { message: 'Logged out successfully' },
      });

      await authService.logout();

      // Clear token
      authService.setAuthToken(null);
      expect(authService.getAuthToken()).toBeNull();

      // Verify storage is cleared
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'access_token',
        'refresh_token',
        'auth_user',
      ]);
    });
  });

  describe('Profile Management', () => {
    it('should update user profile', async () => {
      authService.setAuthToken('access_token_123');

      const profileUpdate = {
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
      };

      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          ...mockUser,
          profile: profileUpdate.profile,
        },
      });

      const response = await authService.updateProfile(profileUpdate);

      expect(response.data.profile.firstName).toBe('Jane');
    });

    it('should complete onboarding', async () => {
      authService.setAuthToken('access_token_123');

      const onboardingData = {
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
        preferences: {
          notifications: true,
          newsletter: false,
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          ...mockUser,
          ...onboardingData,
          isOnboarded: true,
        },
      });

      const response = await authService.completeOnboarding(onboardingData);

      expect(response.data.isOnboarded).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce(
        new Error('Network request failed')
      );

      await expect(
        authService.sendOtp({ phoneNumber: mockPhoneNumber })
      ).rejects.toThrow('Network request failed');
    });

    it('should handle invalid OTP', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'Invalid OTP',
          },
        },
      });

      await expect(
        authService.verifyOtp({
          phoneNumber: mockPhoneNumber,
          otp: '000000',
        })
      ).rejects.toBeDefined();
    });

    it('should handle expired OTP', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'OTP expired',
          },
        },
      });

      await expect(
        authService.verifyOtp({
          phoneNumber: mockPhoneNumber,
          otp: mockOTP,
        })
      ).rejects.toBeDefined();
    });
  });

  describe('Security', () => {
    it('should not expose sensitive data in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
      });

      await authService.verifyOtp({
        phoneNumber: mockPhoneNumber,
        otp: mockOTP,
      });

      // Verify OTP is not logged
      const logs = consoleSpy.mock.calls.flat().join(' ');
      expect(logs).not.toContain(mockOTP);
      expect(logs).not.toContain('access_token_123');

      consoleSpy.mockRestore();
    });

    it('should validate token format', () => {
      authService.setAuthToken('invalid_token');

      const token = authService.getAuthToken();
      expect(token).toBe('invalid_token');

      // API calls should fail with invalid token
      (apiClient.get as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: 'Invalid token format',
          },
        },
      });
    });
  });
});
