import { Types } from 'mongoose';
import { DeviceFingerprint, IDeviceFingerprint, RiskLevel } from '../models/DeviceFingerprint';
import { CoinTransaction } from '../models/CoinTransaction';
import redisService from './redisService';
import { logger } from '../config/logger';
import { Lean } from '../types/lean';

// ── Constants ──

const REDIS_BLACKLIST_DEVICES_KEY = 'security:blacklist:devices';
const CACHE_PREFIX = 'device:status:';
const CACHE_TTL = 60; // 1 minute for device status cache

// Pattern thresholds
const THRESHOLDS = {
  MULTI_ACCOUNT_USERS: 3,           // >3 users on same device
  MERCHANT_VELOCITY_24H: 10,        // >10 merchants in 24h
  TRANSACTION_VELOCITY_1H: 50,      // >50 transactions in 1h
  GEOGRAPHIC_ANOMALY_HOURS: 1,      // 2+ countries in 1h
  EMULATOR_TRUST_SCORE: 20,         // Trust score < 20
  AUTO_BLOCK_FLAG_COUNT: 3,         // 3+ unresolved flags
};

// ── Helpers ──

async function getRedisSet(key: string): Promise<string[]> {
  try {
    const data = await redisService.get<string[]>(key);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function addToRedisSet(key: string, value: string, ttl?: number): Promise<void> {
  try {
    const set = await getRedisSet(key);
    if (!set.includes(value)) {
      set.push(value);
      await redisService.set(key, set, ttl);
    }
  } catch {
    logger.warn('[DeviceFingerprint] Failed to add to Redis set', { key });
  }
}

async function removeFromRedisSet(key: string, value: string): Promise<void> {
  try {
    const set = await getRedisSet(key);
    const filtered = set.filter(v => v !== value);
    await redisService.set(key, filtered);
  } catch {
    logger.warn('[DeviceFingerprint] Failed to remove from Redis set', { key });
  }
}

function computeRiskLevel(trustScore: number, isBlocked: boolean): RiskLevel {
  if (isBlocked) return 'blocked';
  if (trustScore < 30) return 'high';
  if (trustScore < 60) return 'medium';
  return 'low';
}

function computeTrustScore(device: IDeviceFingerprint): number {
  let score = 100;

  // Deduct for multiple users
  const activeUsers = device.users.filter(u => u.isActive).length;
  if (activeUsers > THRESHOLDS.MULTI_ACCOUNT_USERS) {
    score -= 25;
  } else if (activeUsers > 1) {
    score -= 10;
  }

  // Deduct for unresolved flags
  const unresolvedFlags = device.flags.filter(f => !f.resolved).length;
  score -= unresolvedFlags * 15;

  // Deduct for high merchant overlap
  const recentMerchants = device.merchantsAccessed.filter(m => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return m.lastAccess > dayAgo;
  }).length;
  if (recentMerchants > THRESHOLDS.MERCHANT_VELOCITY_24H) {
    score -= 20;
  }

  // Bonus for device age (older devices = more trusted)
  const ageInDays = (Date.now() - device.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > 30) score += 5;
  if (ageInDays > 90) score += 5;

  return Math.max(0, Math.min(100, score));
}

// ── Service Methods ──

/**
 * Register or update a device when a user authenticates.
 */
export async function registerDevice(
  deviceHash: string,
  osVersion: string,
  deviceModel: string,
  platform: string,
  userId: string,
  ip?: string,
  country?: string,
  city?: string
): Promise<IDeviceFingerprint> {
  const normalizedPlatform = (['ios', 'android', 'web'].includes(platform) ? platform : 'web') as 'ios' | 'android' | 'web';
  const userOid = new Types.ObjectId(userId);

  // Upsert device
  let device = await DeviceFingerprint.findOneAndUpdate(
    { deviceHash },
    {
      $set: {
        osVersion,
        deviceModel,
        platform: normalizedPlatform,
        appVersion: '', // updated by frontend header
      },
      $setOnInsert: {
        deviceHash,
        trustScore: 100,
        riskLevel: 'low',
        isBlocked: false,
      },
    },
    { upsert: true, new: true }
  );

  // Add/update user in users array
  const existingUser = device.users.find(u => u.userId.equals(userOid));
  if (existingUser) {
    await DeviceFingerprint.updateOne(
      { deviceHash, 'users.userId': userOid },
      { $set: { 'users.$.lastSeen': new Date(), 'users.$.isActive': true } }
    );
  } else {
    await DeviceFingerprint.updateOne(
      { deviceHash },
      {
        $push: {
          users: { userId: userOid, firstSeen: new Date(), lastSeen: new Date(), isActive: true },
        },
      }
    );
  }

  // Add location if IP provided
  if (ip) {
    await DeviceFingerprint.updateOne(
      { deviceHash },
      {
        $push: {
          locations: {
            $each: [{ ip, country: country || '', city: city || '', seenAt: new Date() }],
            $slice: -100, // Keep last 100
          },
        },
      }
    );
  }

  // Re-fetch after updates
  device = (await DeviceFingerprint.findOne({ deviceHash }))!;

  // Recompute trust score and risk level
  const trustScore = computeTrustScore(device);
  const riskLevel = computeRiskLevel(trustScore, device.isBlocked);
  if (device.trustScore !== trustScore || device.riskLevel !== riskLevel) {
    await DeviceFingerprint.updateOne(
      { deviceHash },
      { $set: { trustScore, riskLevel } }
    );
  }

  // Invalidate cache
  await redisService.del(`${CACHE_PREFIX}${deviceHash}`);

  return device;
}

/**
 * Track merchant access from a device (fire-and-forget).
 */
export async function trackMerchantAccess(
  deviceHash: string,
  merchantId: string,
  merchantName: string
): Promise<void> {
  const merchantOid = new Types.ObjectId(merchantId);

  // Try atomic update on existing entry
  const result = await DeviceFingerprint.updateOne(
    { deviceHash, 'merchantsAccessed.merchantId': merchantOid },
    {
      $set: { 'merchantsAccessed.$.lastAccess': new Date(), 'merchantsAccessed.$.merchantName': merchantName },
      $inc: { 'merchantsAccessed.$.accessCount': 1 },
    }
  );

  // If no existing entry, push new one
  if (result.modifiedCount === 0) {
    await DeviceFingerprint.updateOne(
      { deviceHash },
      {
        $push: {
          merchantsAccessed: {
            merchantId: merchantOid,
            merchantName,
            firstAccess: new Date(),
            lastAccess: new Date(),
            accessCount: 1,
            transactionCount: 0,
          },
        },
      }
    );
  }

  // Invalidate cache
  await redisService.del(`${CACHE_PREFIX}${deviceHash}`);
}

/**
 * Increment transaction count for a merchant on a device.
 */
export async function trackMerchantTransaction(
  deviceHash: string,
  merchantId: string
): Promise<void> {
  await DeviceFingerprint.updateOne(
    { deviceHash, 'merchantsAccessed.merchantId': new Types.ObjectId(merchantId) },
    { $inc: { 'merchantsAccessed.$.transactionCount': 1 } }
  );
}

/**
 * Check device status (cached in Redis).
 */
export async function checkDeviceStatus(deviceHash: string): Promise<{
  isBlocked: boolean;
  riskLevel: RiskLevel;
  trustScore: number;
  flags: string[];
}> {
  // Check cache first
  const cached = await redisService.get<{
    isBlocked: boolean;
    riskLevel: RiskLevel;
    trustScore: number;
    flags: string[];
  }>(`${CACHE_PREFIX}${deviceHash}`);
  if (cached) return cached;

  const device = await DeviceFingerprint.findOne({ deviceHash }).lean();
  if (!device) {
    return { isBlocked: false, riskLevel: 'low', trustScore: 100, flags: [] };
  }

  const status = {
    isBlocked: device.isBlocked,
    riskLevel: device.riskLevel,
    trustScore: device.trustScore,
    flags: device.flags.filter(f => !f.resolved).map(f => f.type),
  };

  // Cache for 60s
  await redisService.set(`${CACHE_PREFIX}${deviceHash}`, status, CACHE_TTL);
  return status;
}

/**
 * Analyze patterns for a single device and return detected issues.
 */
export async function analyzePatterns(deviceHash: string): Promise<{
  flagsToAdd: { type: string; reason: string }[];
  shouldAutoBlock: boolean;
}> {
  const device = await DeviceFingerprint.findOne({ deviceHash });
  if (!device) return { flagsToAdd: [], shouldAutoBlock: false };

  const flagsToAdd: { type: string; reason: string }[] = [];
  const existingFlagTypes = new Set(device.flags.filter(f => !f.resolved).map(f => f.type));

  // 1. Multi-account: >3 active users on same device
  const activeUsers = device.users.filter(u => u.isActive);
  if (activeUsers.length > THRESHOLDS.MULTI_ACCOUNT_USERS && !existingFlagTypes.has('multi_account')) {
    flagsToAdd.push({
      type: 'multi_account',
      reason: `${activeUsers.length} active users detected on this device (threshold: ${THRESHOLDS.MULTI_ACCOUNT_USERS})`,
    });
  }

  // 2. Merchant velocity: >10 merchants in 24h
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentMerchants = device.merchantsAccessed.filter(m => m.lastAccess > dayAgo);
  if (recentMerchants.length > THRESHOLDS.MERCHANT_VELOCITY_24H && !existingFlagTypes.has('merchant_overlap')) {
    flagsToAdd.push({
      type: 'merchant_overlap',
      reason: `${recentMerchants.length} merchants accessed in last 24h (threshold: ${THRESHOLDS.MERCHANT_VELOCITY_24H})`,
    });
  }

  // 3. Transaction velocity: >50 transactions in 1h
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const userIds = device.users.map(u => u.userId);
  if (userIds.length > 0) {
    const txCount = await CoinTransaction.countDocuments({
      user: { $in: userIds },
      createdAt: { $gte: hourAgo },
    });
    if (txCount > THRESHOLDS.TRANSACTION_VELOCITY_1H && !existingFlagTypes.has('velocity')) {
      flagsToAdd.push({
        type: 'velocity',
        reason: `${txCount} transactions from device users in last hour (threshold: ${THRESHOLDS.TRANSACTION_VELOCITY_1H})`,
      });
    }
  }

  // 4. Geographic anomaly: 2+ countries in 1h
  const recentLocations = device.locations.filter(l => l.seenAt > hourAgo);
  const uniqueCountries = new Set(recentLocations.map(l => l.country).filter(Boolean));
  if (uniqueCountries.size >= 2 && !existingFlagTypes.has('geographic_anomaly')) {
    flagsToAdd.push({
      type: 'geographic_anomaly',
      reason: `Device seen in ${uniqueCountries.size} countries within 1 hour: ${[...uniqueCountries].join(', ')}`,
    });
  }

  // 5. Emulator detection (low trust score from frontend)
  if (device.trustScore < THRESHOLDS.EMULATOR_TRUST_SCORE && !existingFlagTypes.has('emulator')) {
    flagsToAdd.push({
      type: 'emulator',
      reason: `Trust score ${device.trustScore} below emulator threshold (${THRESHOLDS.EMULATOR_TRUST_SCORE})`,
    });
  }

  // Apply flags
  if (flagsToAdd.length > 0) {
    const newFlags = flagsToAdd.map(f => ({
      type: f.type,
      reason: f.reason,
      flaggedAt: new Date(),
      flaggedBy: 'system',
      resolved: false,
    }));
    await DeviceFingerprint.updateOne(
      { deviceHash },
      { $push: { flags: { $each: newFlags } } }
    );
  }

  // Check if auto-block is warranted
  const totalUnresolved = (device.flags.filter(f => !f.resolved).length) + flagsToAdd.length;
  const shouldAutoBlock = totalUnresolved >= THRESHOLDS.AUTO_BLOCK_FLAG_COUNT ||
    flagsToAdd.some(f => f.type === 'geographic_anomaly');

  if (shouldAutoBlock && !device.isBlocked) {
    await blockDevice(
      deviceHash,
      totalUnresolved >= THRESHOLDS.AUTO_BLOCK_FLAG_COUNT
        ? `Auto-blocked: ${totalUnresolved} unresolved flags`
        : 'Auto-blocked: geographic anomaly detected',
      'system'
    );
  }

  // Recompute trust score
  const updated = await DeviceFingerprint.findOne({ deviceHash });
  if (updated) {
    const trustScore = computeTrustScore(updated);
    const riskLevel = computeRiskLevel(trustScore, updated.isBlocked);
    await DeviceFingerprint.updateOne(
      { deviceHash },
      { $set: { trustScore, riskLevel } }
    );
  }

  // Invalidate cache
  await redisService.del(`${CACHE_PREFIX}${deviceHash}`);

  return { flagsToAdd, shouldAutoBlock };
}

/**
 * Block a device and add to Redis blacklist.
 */
export async function blockDevice(
  deviceHash: string,
  reason: string,
  blockedBy: string
): Promise<void> {
  await DeviceFingerprint.updateOne(
    { deviceHash },
    {
      $set: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: reason,
        blockedBy,
        riskLevel: 'blocked',
      },
    }
  );

  // Add to Redis blacklist for fast lookups
  await addToRedisSet(REDIS_BLACKLIST_DEVICES_KEY, deviceHash);

  // Invalidate cache
  await redisService.del(`${CACHE_PREFIX}${deviceHash}`);

  logger.info('[DeviceFingerprint] Device blocked', { deviceHash, reason, blockedBy });
}

/**
 * Unblock a device and remove from Redis blacklist.
 */
export async function unblockDevice(
  deviceHash: string,
  adminUserId: string
): Promise<void> {
  // Resolve all flags
  await DeviceFingerprint.updateOne(
    { deviceHash },
    {
      $set: {
        isBlocked: false,
        blockedAt: undefined,
        blockedReason: undefined,
        blockedBy: undefined,
        'flags.$[unresolvedFlag].resolved': true,
        'flags.$[unresolvedFlag].resolvedAt': new Date(),
      },
    },
    {
      arrayFilters: [{ 'unresolvedFlag.resolved': false }],
    }
  );

  // Recompute trust/risk
  const device = await DeviceFingerprint.findOne({ deviceHash });
  if (device) {
    const trustScore = computeTrustScore(device);
    const riskLevel = computeRiskLevel(trustScore, false);
    await DeviceFingerprint.updateOne(
      { deviceHash },
      { $set: { trustScore, riskLevel } }
    );
  }

  // Remove from Redis blacklist
  await removeFromRedisSet(REDIS_BLACKLIST_DEVICES_KEY, deviceHash);

  // Invalidate cache
  await redisService.del(`${CACHE_PREFIX}${deviceHash}`);

  logger.info('[DeviceFingerprint] Device unblocked', { deviceHash, adminUserId });
}

/**
 * Get full device history for admin review.
 */
export async function getDeviceHistory(deviceHash: string): Promise<Lean<IDeviceFingerprint> | null> {
  return DeviceFingerprint.findOne({ deviceHash }).populate('users.userId', 'fullName phoneNumber email')
    .lean();
}

/**
 * Get all devices for a user.
 */
export async function getUserDevices(userId: string): Promise<Lean<IDeviceFingerprint>[]> {
  return DeviceFingerprint.find({ 'users.userId': new Types.ObjectId(userId) }).select('deviceHash osVersion deviceModel platform trustScore riskLevel isBlocked users createdAt updatedAt')
    .lean();
}

/**
 * Get devices accessing a merchant + their overlap with other merchants.
 */
export async function getMerchantDeviceOverlap(merchantId: string): Promise<{
  devices: Array<{
    deviceHash: string;
    platform: string;
    trustScore: number;
    riskLevel: string;
    isBlocked: boolean;
    userCount: number;
    merchantCount: number;
    accessCount: number;
  }>;
  totalDevices: number;
}> {
  const merchantOid = new Types.ObjectId(merchantId);

  const devices = await DeviceFingerprint.find(
    { 'merchantsAccessed.merchantId': merchantOid }
  )
    .select('deviceHash platform trustScore riskLevel isBlocked users merchantsAccessed')
      .lean();

  return {
    devices: devices.map(d => {
      const merchantEntry = d.merchantsAccessed.find(
        m => m.merchantId.toString() === merchantId
      );
      return {
        deviceHash: d.deviceHash,
        platform: d.platform,
        trustScore: d.trustScore,
        riskLevel: d.riskLevel,
        isBlocked: d.isBlocked,
        userCount: d.users.length,
        merchantCount: d.merchantsAccessed.length,
        accessCount: merchantEntry?.accessCount || 0,
      };
    }),
    totalDevices: devices.length,
  };
}

/**
 * List devices with pagination and optional filters (for admin).
 */
export async function listDevices(options: {
  page?: number;
  limit?: number;
  riskLevel?: string;
  isBlocked?: boolean;
  search?: string;
}): Promise<{
  devices: Lean<IDeviceFingerprint>[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}> {
  const { page = 1, limit = 20, riskLevel, isBlocked, search } = options;
  const query: any = {};

  if (riskLevel) query.riskLevel = riskLevel;
  if (isBlocked !== undefined) query.isBlocked = isBlocked;
  if (search) {
    query.$or = [
      { deviceHash: { $regex: search, $options: 'i' } },
      { deviceModel: { $regex: search, $options: 'i' } },
    ];
  }

  const [devices, totalItems] = await Promise.all([
    DeviceFingerprint.find(query)
      .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
          .limit(limit)
            .populate('users.userId', 'fullName phoneNumber')
              .lean(),
    DeviceFingerprint.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    devices,
    currentPage: page,
    totalPages,
    totalItems,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export default {
  registerDevice,
  trackMerchantAccess,
  trackMerchantTransaction,
  checkDeviceStatus,
  analyzePatterns,
  blockDevice,
  unblockDevice,
  getDeviceHistory,
  getUserDevices,
  getMerchantDeviceOverlap,
  listDevices,
};
