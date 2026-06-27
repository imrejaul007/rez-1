// Security Service - PRODUCTION READY
// Device fingerprinting, IP tracking, captcha verification, and security measures
// for preventing fraud and abuse in social media earnings

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import apiClient from './apiClient';
import { safeJsonParse } from '@/utils/safeJson';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DeviceFingerprint {
  id: string;
  platform: string;
  osVersion: string;
  deviceModel: string;
  deviceName: string;
  appVersion: string;
  uniqueId: string;
  timestamp: number;
  hash: string;
}

export interface SecurityCheckResult {
  passed: boolean;
  deviceFingerprint: DeviceFingerprint;
  isBlacklisted: boolean;
  isSuspicious: boolean;
  trustScore: number; // 0-100, higher = more trustworthy
  flags: string[];
  recommendations: string[];
}

export interface CaptchaVerification {
  required: boolean;
  token?: string;
  verified: boolean;
  expiresAt?: number;
}

export interface IPInfo {
  ip?: string;
  country?: string;
  city?: string;
  isp?: string;
  isVPN?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  riskScore: number;
}

export interface MultiAccountDetection {
  detected: boolean;
  accountCount: number;
  deviceIds: string[];
  suspicionLevel: 'low' | 'medium' | 'high';
  details: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SECURITY_CONFIG = {
  // Storage keys
  DEVICE_ID_KEY: '@security_device_id',
  DEVICE_FINGERPRINT_KEY: '@security_device_fingerprint',
  CAPTCHA_TOKEN_KEY: '@security_captcha_token',
  SECURITY_FLAGS_KEY: '@security_flags',

  // Thresholds
  TRUST_SCORE_THRESHOLD_LOW: 40,
  TRUST_SCORE_THRESHOLD_MEDIUM: 70,

  // Captcha config
  CAPTCHA_EXPIRY_MINUTES: 10,
  CAPTCHA_REQUIRED_AFTER_FAILURES: 3,

  // API endpoints
  VERIFY_DEVICE_ENDPOINT: '/security/verify-device',
  CHECK_BLACKLIST_ENDPOINT: '/security/check-blacklist',
  REPORT_SUSPICIOUS_ENDPOINT: '/security/report-suspicious',
  VERIFY_CAPTCHA_ENDPOINT: '/security/verify-captcha',
  GET_IP_INFO_ENDPOINT: '/security/ip-info',
  CHECK_MULTI_ACCOUNT_ENDPOINT: '/security/check-multi-account',
};

// ============================================================================
// DEVICE FINGERPRINTING
// ============================================================================

/**
 * Generate unique device fingerprint
 */
export const generateDeviceFingerprint = async (): Promise<DeviceFingerprint> => {

  try {
    // Try to get existing device ID first
    let storedId = await AsyncStorage.getItem(SECURITY_CONFIG.DEVICE_ID_KEY);

    if (!storedId) {
      // Generate new unique ID
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      storedId = `${Platform.OS}_${timestamp}_${random}`;

      await AsyncStorage.setItem(SECURITY_CONFIG.DEVICE_ID_KEY, storedId);

    }

    // Collect device information (handle web platform where some values are undefined)
    const deviceInfo = {
      platform: Platform.OS || 'web',
      osVersion: Platform.Version ? String(Platform.Version) : 'web',
      deviceModel: Device.modelName || 'Browser',
      deviceName: Device.deviceName || 'Web Browser',
      appVersion: Application.nativeApplicationVersion || '1.0.0',
      uniqueId: storedId,
      timestamp: Date.now(),
    };

    // Generate hash from device properties
    const hash = await generateHash(JSON.stringify(deviceInfo));

    const fingerprint: DeviceFingerprint = {
      id: storedId,
      ...deviceInfo,
      hash,
    };

    // Store fingerprint
    await AsyncStorage.setItem(
      SECURITY_CONFIG.DEVICE_FINGERPRINT_KEY,
      JSON.stringify(fingerprint)
    );

    return fingerprint;
  } catch (error) {

    // Return fallback fingerprint
    return {
      id: `fallback_${Date.now()}`,
      platform: Platform.OS,
      osVersion: 'Unknown',
      deviceModel: 'Unknown',
      deviceName: 'Unknown',
      appVersion: '1.0.0',
      uniqueId: `fallback_${Date.now()}`,
      timestamp: Date.now(),
      hash: 'fallback_hash',
    };
  }
};

/**
 * Get existing device fingerprint or generate new one
 */
export const getDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
  try {
    const stored = await AsyncStorage.getItem(SECURITY_CONFIG.DEVICE_FINGERPRINT_KEY);

    if (stored) {
      const fingerprint: DeviceFingerprint | null = safeJsonParse<DeviceFingerprint | null>(stored, null);
      if (!fingerprint) return await generateDeviceFingerprint();

      // Check if fingerprint is still valid (not older than 30 days)
      const age = Date.now() - fingerprint.timestamp;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

      if (age < maxAge) {

        return fingerprint;
      }

    }

    return await generateDeviceFingerprint();
  } catch (error) {
    return await generateDeviceFingerprint();
  }
};

/**
 * Simple hash function for device properties
 */
const generateHash = async (data: string): Promise<string> => {
  try {
    // Simple hash implementation for React Native
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  } catch (error) {
    return Date.now().toString(36);
  }
};

// ============================================================================
// SECURITY CHECKS
// ============================================================================

/**
 * Perform comprehensive security check
 */
export const performSecurityCheck = async (): Promise<SecurityCheckResult> => {

  const flags: string[] = [];
  const recommendations: string[] = [];
  let trustScore = 100; // Start with full trust

  try {
    // 1. Get device fingerprint
    const deviceFingerprint = await getDeviceFingerprint();

    // 2. Check if device is blacklisted

    let isBlacklisted = false;

    try {
      const blacklistResponse = await apiClient.post(
        SECURITY_CONFIG.CHECK_BLACKLIST_ENDPOINT,
        { deviceId: deviceFingerprint.id }
      );

      isBlacklisted = (blacklistResponse.data as any)?.isBlacklisted || false;

      if (isBlacklisted) {
        flags.push('Device is blacklisted');
        trustScore = 0;
      }
    } catch (error) {
      recommendations.push('Could not verify device status');
    }

    // 3. Check for emulator/rooted device
    if (Device.isDevice === false) {
      flags.push('Running on emulator');
      trustScore -= 30;
      recommendations.push('Please use a real device for submissions');
    }

    // 4. Check device consistency
    const storedFlags = await AsyncStorage.getItem(SECURITY_CONFIG.SECURITY_FLAGS_KEY);
    if (storedFlags) {
      const parsedFlags = safeJsonParse(storedFlags, { suspiciousActivityCount: 0 });

      if (parsedFlags.suspiciousActivityCount > 0) {
        flags.push(`${parsedFlags.suspiciousActivityCount} suspicious activities detected`);
        trustScore -= parsedFlags.suspiciousActivityCount * 10;
      }
    }

    // 5. Check for VPN/Proxy (backend check)
    try {
      const ipInfoResponse = await apiClient.get(SECURITY_CONFIG.GET_IP_INFO_ENDPOINT);

      if (ipInfoResponse.success && ipInfoResponse.data) {
        const ipInfo: IPInfo = ipInfoResponse.data as IPInfo;

        if (ipInfo.isVPN || ipInfo.isProxy) {
          flags.push('VPN or Proxy detected');
          trustScore -= 20;
          recommendations.push('Disable VPN/Proxy for submissions');
        }

        if (ipInfo.isTor) {
          flags.push('Tor network detected');
          trustScore -= 40;
        }
      }
    } catch (_error) {
      // silently handle
    }

    // 6. Multi-account detection
    try {
      const multiAccountResponse = await apiClient.post(
        SECURITY_CONFIG.CHECK_MULTI_ACCOUNT_ENDPOINT,
        { deviceId: deviceFingerprint.id }
      );

      if (multiAccountResponse.success && multiAccountResponse.data) {
        const detection: MultiAccountDetection = multiAccountResponse.data as MultiAccountDetection;

        if (detection.detected && detection.suspicionLevel !== 'low') {
          flags.push(`Multiple accounts detected (${detection.accountCount})`);
          trustScore -= detection.suspicionLevel === 'high' ? 30 : 15;
        }
      }
    } catch (_error) {
      // silently handle
    }

    // Ensure trust score doesn't go below 0
    trustScore = Math.max(0, trustScore);

    const isSuspicious = trustScore < SECURITY_CONFIG.TRUST_SCORE_THRESHOLD_MEDIUM;
    const passed = !isBlacklisted && trustScore >= SECURITY_CONFIG.TRUST_SCORE_THRESHOLD_LOW;

    return {
      passed,
      deviceFingerprint,
      isBlacklisted,
      isSuspicious,
      trustScore,
      flags,
      recommendations,
    };
  } catch (error) {

    // Return permissive result to not block user on errors (fail open)
    // Backend will still validate submissions
    return {
      passed: true, // Allow submission - backend will validate
      deviceFingerprint: await getDeviceFingerprint(),
      isBlacklisted: false,
      isSuspicious: false,
      trustScore: 70, // Default moderate trust
      flags: ['Security check unavailable - using defaults'],
      recommendations: ['Please try again'],
    };
  }
};

/**
 * Report suspicious activity
 */
export const reportSuspiciousActivity = async (
  activityType: string,
  details: any
): Promise<void> => {
  try {
    const deviceFingerprint = await getDeviceFingerprint();

    await apiClient.post(SECURITY_CONFIG.REPORT_SUSPICIOUS_ENDPOINT, {
      deviceId: deviceFingerprint.id,
      activityType,
      details,
      timestamp: Date.now(),
    });

    // Update local flags
    const storedFlags = await AsyncStorage.getItem(SECURITY_CONFIG.SECURITY_FLAGS_KEY);
    const flags = safeJsonParse(storedFlags, { suspiciousActivityCount: 0 });

    flags.suspiciousActivityCount += 1;
    flags.lastActivity = Date.now();

    await AsyncStorage.setItem(SECURITY_CONFIG.SECURITY_FLAGS_KEY, JSON.stringify(flags));

  } catch (_error) {
    // silently handle
  }
};

// ============================================================================
// CAPTCHA VERIFICATION
// ============================================================================

/**
 * Check if captcha is required
 */
export const isCaptchaRequired = async (failureCount: number = 0): Promise<boolean> => {
  // Require captcha after multiple failures
  if (failureCount >= SECURITY_CONFIG.CAPTCHA_REQUIRED_AFTER_FAILURES) {
    return true;
  }

  // Check if device is suspicious
  const securityCheck = await performSecurityCheck();
  if (securityCheck.isSuspicious || securityCheck.trustScore < 50) {
    return true;
  }

  // Check stored captcha status
  try {
    const stored = await AsyncStorage.getItem(SECURITY_CONFIG.CAPTCHA_TOKEN_KEY);
    if (!stored) return false;

    const captcha: CaptchaVerification | null = safeJsonParse<CaptchaVerification | null>(stored, null);
    if (!captcha) return false;

    // If captcha expired or not verified, require new one
    if (!captcha.verified || (captcha.expiresAt && captcha.expiresAt < Date.now())) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Verify captcha token
 */
export const verifyCaptcha = async (token: string): Promise<boolean> => {
  try {

    const response = await apiClient.post(SECURITY_CONFIG.VERIFY_CAPTCHA_ENDPOINT, {
      token,
      deviceId: (await getDeviceFingerprint()).id,
    });

    if (response.success && (response.data as any)?.verified) {
      // Store verified captcha
      const captcha: CaptchaVerification = {
        required: false,
        token,
        verified: true,
        expiresAt: Date.now() + (SECURITY_CONFIG.CAPTCHA_EXPIRY_MINUTES * 60 * 1000),
      };

      await AsyncStorage.setItem(
        SECURITY_CONFIG.CAPTCHA_TOKEN_KEY,
        JSON.stringify(captcha)
      );

      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Clear captcha verification
 */
export const clearCaptcha = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SECURITY_CONFIG.CAPTCHA_TOKEN_KEY);
  } catch (_error) {
    // silently handle
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get IP information
 */
export const getIPInfo = async (): Promise<IPInfo> => {
  try {
    const response = await apiClient.get(SECURITY_CONFIG.GET_IP_INFO_ENDPOINT);

    if (response.success && response.data) {
      return response.data as IPInfo;
    }

    return {
      riskScore: 0,
    };
  } catch (error) {
    return {
      riskScore: 0,
    };
  }
};

/**
 * Clear all security data (for testing or user request)
 */
export const clearSecurityData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      SECURITY_CONFIG.DEVICE_ID_KEY,
      SECURITY_CONFIG.DEVICE_FINGERPRINT_KEY,
      SECURITY_CONFIG.CAPTCHA_TOKEN_KEY,
      SECURITY_CONFIG.SECURITY_FLAGS_KEY,
    ]);

  } catch (_error) {
    // silently handle
  }
};

/**
 * Get security statistics
 */
export const getSecurityStats = async (): Promise<{
  deviceId: string;
  trustScore: number;
  isBlacklisted: boolean;
  suspiciousActivityCount: number;
  lastSecurityCheck?: Date;
}> => {
  try {
    const fingerprint = await getDeviceFingerprint();
    const securityCheck = await performSecurityCheck();

    const storedFlags = await AsyncStorage.getItem(SECURITY_CONFIG.SECURITY_FLAGS_KEY);
    const flags = safeJsonParse(storedFlags, { suspiciousActivityCount: 0 });

    return {
      deviceId: fingerprint.id,
      trustScore: securityCheck.trustScore,
      isBlacklisted: securityCheck.isBlacklisted,
      suspiciousActivityCount: flags.suspiciousActivityCount || 0,
      lastSecurityCheck: new Date(),
    };
  } catch (error) {
    return {
      deviceId: 'unknown',
      trustScore: 0,
      isBlacklisted: false,
      suspiciousActivityCount: 0,
    };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateDeviceFingerprint,
  getDeviceFingerprint,
  performSecurityCheck,
  reportSuspiciousActivity,
  isCaptchaRequired,
  verifyCaptcha,
  clearCaptcha,
  getIPInfo,
  clearSecurityData,
  getSecurityStats,
  SECURITY_CONFIG,
};
