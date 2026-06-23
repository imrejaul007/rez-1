import { logger } from '../config/logger';
// Security Controller
// Handles device verification, fraud detection, and security checks

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import AuditLog from '../models/AuditLog';
import redisService from '../services/redisService';

// Redis key prefixes for persistent security data
const REDIS_KEYS = {
  BLACKLISTED_DEVICES: 'security:blacklist:devices',
  BLACKLISTED_IPS: 'security:blacklist:ips',
  SUSPICIOUS_PREFIX: 'security:suspicious:',
  TRUST_PREFIX: 'security:trust:',
  DEVICE_USERS_PREFIX: 'security:device_users:',
};

// Helper: Get a set stored as JSON array in Redis
const getRedisSet = async (key: string): Promise<Set<string>> => {
  const data = await redisService.get<string[]>(key);
  return new Set(data || []);
};

// Helper: Add to a set stored as JSON array in Redis
const addToRedisSet = async (key: string, value: string): Promise<void> => {
  const current = await getRedisSet(key);
  current.add(value);
  await redisService.set(key, Array.from(current));
};

// Helper: Check if device is blacklisted (Redis)
const isDeviceBlacklisted = async (deviceId: string): Promise<boolean> => {
  const set = await getRedisSet(REDIS_KEYS.BLACKLISTED_DEVICES);
  return set.has(deviceId);
};

// Helper: Check if IP is blacklisted (Redis)
const isIpBlacklistedFn = async (ip: string): Promise<boolean> => {
  const set = await getRedisSet(REDIS_KEYS.BLACKLISTED_IPS);
  return set.has(ip);
};

// Helper: Blacklist a device (Redis)
const blacklistDevice = async (deviceId: string): Promise<void> => {
  await addToRedisSet(REDIS_KEYS.BLACKLISTED_DEVICES, deviceId);
};

// Helper: Track device-user mapping (Redis)
const trackDeviceUser = async (deviceId: string, userId: string): Promise<{ count: number; isNew: boolean }> => {
  const key = `${REDIS_KEYS.DEVICE_USERS_PREFIX}${deviceId}`;
  const current = await getRedisSet(key);
  const isNew = !current.has(userId);
  current.add(userId);
  await redisService.set(key, Array.from(current), 86400 * 30); // 30 days TTL
  return { count: current.size, isNew };
};

// Helper: Get/update trust score (Redis)
const getTrustData = async (deviceId: string): Promise<{ score: number; verificationCount: number } | null> => {
  return redisService.get<{ score: number; verificationCount: number }>(`${REDIS_KEYS.TRUST_PREFIX}${deviceId}`);
};

const setTrustData = async (deviceId: string, score: number, verificationCount: number): Promise<void> => {
  await redisService.set(`${REDIS_KEYS.TRUST_PREFIX}${deviceId}`, { score, verificationCount }, 86400 * 30);
};

// Helper: Calculate trust score based on device info
const calculateTrustScore = (
  isNewDevice: boolean,
  suspiciousFlags: string[],
  deviceUserCount: number,
  verificationCount: number
): number => {
  let score = 100;

  if (isNewDevice) score -= 20;
  score -= suspiciousFlags.length * 15;

  if (deviceUserCount > 1) {
    score -= (deviceUserCount - 1) * 25;
  }

  if (verificationCount > 5) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
};

// Verify device fingerprint
export const verifyDevice = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { deviceId, platform, osVersion, appVersion, deviceModel, deviceName } = req.body;

  logger.info('🔒 [SECURITY] Verifying device:', { userId, deviceId: deviceId?.substring(0, 10) + '...' });

  try {
    const suspiciousFlags: string[] = [];

    // Check if device is blacklisted (Redis)
    if (await isDeviceBlacklisted(deviceId)) {
      return sendSuccess(res, {
        passed: false,
        isBlacklisted: true,
        isSuspicious: true,
        trustScore: 0,
        flags: ['Device is blacklisted'],
        deviceFingerprint: { id: deviceId }
      });
    }

    // Track device-user relationship (Redis)
    const { count: deviceUserCount, isNew: isNewDevice } = await trackDeviceUser(deviceId, userId);

    // Check for multiple accounts on same device
    if (deviceUserCount > 3) {
      suspiciousFlags.push('Multiple accounts detected on device');
    }

    // Get existing trust data (Redis)
    const existingTrust = await getTrustData(deviceId);
    const verificationCount = (existingTrust?.verificationCount || 0) + 1;
    const trustScore = calculateTrustScore(isNewDevice, suspiciousFlags, deviceUserCount, verificationCount);

    // Update trust score (Redis)
    await setTrustData(deviceId, trustScore, verificationCount);

    const isSuspicious = trustScore < 50 || suspiciousFlags.length > 0;

    // Log verification
    await AuditLog.log({
      merchantId: new Types.ObjectId('000000000000000000000000'),
      merchantUserId: new Types.ObjectId(userId),
      action: 'device_verification',
      resourceType: 'Security',
      resourceId: new Types.ObjectId(),
      details: {
        changes: {
          deviceId: deviceId?.substring(0, 20),
          platform,
          trustScore,
          isSuspicious,
          flagsCount: suspiciousFlags.length
        }
      },
      ipAddress: (req.ip || '0.0.0.0') as string,
      userAgent: (req.headers['user-agent'] || 'unknown') as string
    });

    sendSuccess(res, {
      passed: trustScore >= 30,
      isBlacklisted: false,
      isSuspicious,
      trustScore,
      flags: suspiciousFlags,
      deviceFingerprint: {
        id: deviceId,
        platform,
        osVersion,
        appVersion,
        deviceModel,
        deviceName,
        verifiedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('[SECURITY] Device verification error:', error);
    sendSuccess(res, {
      passed: true,
      isBlacklisted: false,
      isSuspicious: false,
      trustScore: 70,
      flags: [],
      deviceFingerprint: { id: deviceId }
    });
  }
});

// Check if device/IP is blacklisted
export const checkBlacklist = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId, ip } = req.body;
  const clientIp = ip || req.ip || req.socket.remoteAddress;

  logger.info('🔒 [SECURITY] Checking blacklist:', { deviceId: deviceId?.substring(0, 10), ip: clientIp });

  try {
    const deviceBlocked = deviceId ? await isDeviceBlacklisted(deviceId) : false;
    const ipBlocked = clientIp ? await isIpBlacklistedFn(clientIp as string) : false;

    sendSuccess(res, {
      isBlacklisted: deviceBlocked || ipBlocked,
      deviceBlacklisted: deviceBlocked,
      ipBlacklisted: ipBlocked,
      reason: deviceBlocked ? 'Device blocked' : (ipBlocked ? 'IP blocked' : null)
    });

  } catch (error) {
    logger.error('[SECURITY] Blacklist check error:', error);
    sendSuccess(res, {
      isBlacklisted: false,
      deviceBlacklisted: false,
      ipBlacklisted: false,
      reason: null
    });
  }
});

// Report suspicious activity
export const reportSuspicious = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { type, details } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress;

  logger.info('⚠️ [SECURITY] Suspicious activity reported:', { userId, type });

  try {
    const redisKey = `${REDIS_KEYS.SUSPICIOUS_PREFIX}${userId}_${type}`;
    const incrResult = await redisService.incr(redisKey);
    const reportCount = incrResult || 1;

    if (reportCount === 1) {
      await redisService.expire(redisKey, 86400); // 24h TTL
    }

    // Auto-blacklist if too many reports
    if (reportCount >= 10 && details?.deviceId) {
      await blacklistDevice(details.deviceId);
    }

    const activity = { count: reportCount };

    // Log the report
    await AuditLog.log({
      merchantId: new Types.ObjectId('000000000000000000000000'),
      merchantUserId: new Types.ObjectId(userId),
      action: 'suspicious_activity_reported',
      resourceType: 'Security',
      resourceId: new Types.ObjectId(),
      details: {
        changes: {
          type,
          reportCount: activity.count,
          ...details
        }
      },
      ipAddress: (clientIp || '0.0.0.0') as string,
      userAgent: (req.headers['user-agent'] || 'unknown') as string
    });

    sendSuccess(res, {
      reported: true,
      reportId: `report_${Date.now()}`,
      totalReports: activity.count
    });

  } catch (error) {
    logger.error('❌ [SECURITY] Report suspicious error:', error);
    sendSuccess(res, {
      reported: true,
      reportId: `report_${Date.now()}`,
      totalReports: 1
    });
  }
});

// Verify captcha token
export const verifyCaptcha = asyncHandler(async (req: Request, res: Response) => {
  const { token, action } = req.body;

  logger.info('🔒 [SECURITY] Verifying captcha:', { action });

  try {
    // In production, verify token with reCAPTCHA or hCaptcha API
    // For now, accept all tokens with basic validation

    const isValidFormat = token && token.length > 20;

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // In production:
    // const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    //   method: 'POST',
    //   body: `secret=${RECAPTCHA_SECRET}&response=${token}`
    // });
    // const data = await response.json();

    const simulatedScore = isValidFormat ? 0.9 : 0.3;

    sendSuccess(res, {
      success: isValidFormat,
      score: simulatedScore,
      action: action || 'submit',
      challengeTs: new Date().toISOString(),
      hostname: 'rezapp.com'
    });

  } catch (error) {
    logger.error('❌ [SECURITY] Captcha verification error:', error);
    sendSuccess(res, {
      success: true, // Fail open to not block users
      score: 0.5,
      action: action || 'submit',
      challengeTs: new Date().toISOString(),
      hostname: 'rezapp.com'
    });
  }
});

// Get IP information
export const getIpInfo = asyncHandler(async (req: Request, res: Response) => {
  const { ip } = req.body;
  const clientIp = ip || req.ip || req.socket.remoteAddress || 'unknown';

  logger.info('🔒 [SECURITY] Getting IP info:', { ip: clientIp });

  try {
    // In production, use IP geolocation service (ipinfo.io, maxmind, etc.)
    // For now, return simulated data

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simple VPN/proxy detection heuristics
    const isVpn = false; // In production, check against VPN IP databases
    const isProxy = false;
    const isTor = false;

    sendSuccess(res, {
      ip: clientIp,
      country: 'IN',
      countryName: 'India',
      region: 'MH',
      regionName: 'Maharashtra',
      city: 'Mumbai',
      timezone: 'Asia/Kolkata',
      isp: 'Sample ISP',
      isVpn,
      isProxy,
      isTor,
      isDatacenter: false,
      riskScore: isVpn || isProxy || isTor ? 70 : 10
    });

  } catch (error) {
    logger.error('❌ [SECURITY] IP info error:', error);
    sendSuccess(res, {
      ip: clientIp,
      country: 'UNKNOWN',
      isVpn: false,
      isProxy: false,
      isTor: false,
      riskScore: 0
    });
  }
});

// Check for multi-account patterns
export const checkMultiAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { deviceId, ip } = req.body;
  const clientIp = ip || req.ip || req.socket.remoteAddress;

  logger.info('🔒 [SECURITY] Checking multi-account:', { userId });

  try {
    const warnings: string[] = [];
    let riskScore = 0;
    let deviceAccountCount = 1;
    let ipAccountCount = 1;

    // Check device-user relationship (Redis)
    if (deviceId) {
      const deviceData = await trackDeviceUser(deviceId, userId);
      deviceAccountCount = deviceData.count;
      if (deviceData.count > 1) {
        const otherUsers = deviceData.count - 1;
        warnings.push(`Device used by ${otherUsers} other account(s)`);
        riskScore += otherUsers * 20;
      }
    }

    // Check IP-user relationship (Redis)
    if (clientIp) {
      const ipKey = `security:ip_users:${clientIp}`;
      const ipSet = await getRedisSet(ipKey);
      ipSet.add(userId);
      await redisService.set(ipKey, Array.from(ipSet), 86400 * 30);
      ipAccountCount = ipSet.size;

      if (ipSet.size > 2) {
        const otherUsers = ipSet.size - 1;
        warnings.push(`IP used by ${otherUsers} other account(s)`);
        riskScore += otherUsers * 10;
      }
    }

    const isMultiAccount = warnings.length > 0;
    const riskLevel = riskScore >= 60 ? 'high' : (riskScore >= 30 ? 'medium' : 'low');

    sendSuccess(res, {
      isMultiAccount,
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      warnings,
      deviceAccounts: deviceAccountCount,
      ipAccounts: ipAccountCount
    });

  } catch (error) {
    logger.error('❌ [SECURITY] Multi-account check error:', error);
    sendSuccess(res, {
      isMultiAccount: false,
      riskScore: 0,
      riskLevel: 'low',
      warnings: [],
      deviceAccounts: 1,
      ipAccounts: 1
    });
  }
});
