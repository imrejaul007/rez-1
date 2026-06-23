/**
 * API Key Rotation Service
 *
 * Manages automatic rotation of API keys for improved security
 * Prevents key compromise impact by rotating keys at regular intervals
 */

import { Logger } from 'winston';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';

export interface ApiKeyConfig {
  keyId: string;
  key: string;
  secret: string;
  createdAt: Date;
  rotatedAt?: Date;
  expiresAt: Date;
  status: 'active' | 'revoked' | 'expired';
  metadata?: Record<string, any>;
}

export interface RotationSchedule {
  service: string;
  rotationIntervalDays: number;
  maxKeysPerService: number;
  notifyBeforeDays: number;
}

/**
 * Rotation schedules for different services
 */
export const DEFAULT_ROTATION_SCHEDULES: RotationSchedule[] = [
  {
    service: 'sendgrid',
    rotationIntervalDays: 30,
    maxKeysPerService: 3,
    notifyBeforeDays: 7,
  },
  {
    service: 'twilio',
    rotationIntervalDays: 30,
    maxKeysPerService: 3,
    notifyBeforeDays: 7,
  },
  {
    service: 'firebase',
    rotationIntervalDays: 60,
    maxKeysPerService: 2,
    notifyBeforeDays: 14,
  },
  {
    service: 'razorpay',
    rotationIntervalDays: 60,
    maxKeysPerService: 2,
    notifyBeforeDays: 14,
  },
  {
    service: 'aws',
    rotationIntervalDays: 90,
    maxKeysPerService: 2,
    notifyBeforeDays: 30,
  },
];

export class ApiKeyRotationManager {
  private redis: Redis;
  private logger: Logger;
  private rotationSchedules: Map<string, RotationSchedule>;

  constructor(redis: Redis, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
    this.rotationSchedules = new Map(DEFAULT_ROTATION_SCHEDULES.map((s) => [s.service, s]));
  }

  /**
   * Generate a new API key with cryptographic randomness
   */
  private generateNewKey(): { keyId: string; key: string; secret: string } {
    const keyId = `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const key = crypto.randomBytes(32).toString('hex');
    const secret = crypto.randomBytes(64).toString('hex');

    return { keyId, key, secret };
  }

  /**
   * Rotate an API key for a service
   */
  async rotateKey(service: string, reason: string = 'scheduled'): Promise<ApiKeyConfig> {
    const schedule = this.rotationSchedules.get(service);
    if (!schedule) {
      throw new Error(`No rotation schedule found for service: ${service}`);
    }

    const { keyId, key, secret } = this.generateNewKey();

    const newKeyConfig: ApiKeyConfig = {
      keyId,
      key,
      secret,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + schedule.rotationIntervalDays * 24 * 60 * 60 * 1000),
      status: 'active',
      metadata: {
        rotationReason: reason,
        service,
      },
    };

    // Store new key in Redis
    const storageKey = `apikey:${service}:${keyId}`;
    await this.redis.setex(storageKey, schedule.rotationIntervalDays * 24 * 60 * 60, JSON.stringify(newKeyConfig));

    // Mark as active in service key list
    await this.redis.lpush(`apikeys:${service}:active`, keyId);

    // Maintain max keys limit
    const activeKeys = await this.redis.lrange(`apikeys:${service}:active`, 0, -1);
    if (activeKeys.length > schedule.maxKeysPerService) {
      const oldestKeyId = activeKeys[activeKeys.length - 1];
      await this.revokeKey(service, oldestKeyId, 'max_keys_exceeded');
    }

    this.logger.info('[API Key Rotation] Key rotated successfully', {
      service,
      keyId,
      reason,
      expiresAt: newKeyConfig.expiresAt,
    });

    // Audit log
    await this.auditLog('rotate', service, keyId, reason);

    return newKeyConfig;
  }

  /**
   * Revoke an API key immediately
   */
  async revokeKey(service: string, keyId: string, reason: string = 'manual'): Promise<void> {
    const storageKey = `apikey:${service}:${keyId}`;
    const keyConfig = await this.getKey(service, keyId);

    if (!keyConfig) {
      throw new Error(`Key not found: ${keyId}`);
    }

    // Mark as revoked
    keyConfig.status = 'revoked';
    await this.redis.setex(storageKey, 86400, JSON.stringify(keyConfig)); // Keep for 24h audit trail

    // Remove from active list
    await this.redis.lrem(`apikeys:${service}:active`, 1, keyId);

    // Add to revoked list
    await this.redis.lpush(`apikeys:${service}:revoked`, keyId);

    this.logger.warn('[API Key Rotation] Key revoked', {
      service,
      keyId,
      reason,
    });

    // Audit log
    await this.auditLog('revoke', service, keyId, reason);
  }

  /**
   * Get an API key configuration
   */
  async getKey(service: string, keyId: string): Promise<ApiKeyConfig | null> {
    const storageKey = `apikey:${service}:${keyId}`;
    const data = await this.redis.get(storageKey);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Validate an API key
   */
  async validateKey(service: string, providedKey: string, providedSecret: string): Promise<boolean> {
    const activeKeys = await this.redis.lrange(`apikeys:${service}:active`, 0, -1);

    for (const keyId of activeKeys) {
      const keyConfig = await this.getKey(service, keyId);

      if (
        keyConfig &&
        keyConfig.status === 'active' &&
        keyConfig.key === providedKey &&
        keyConfig.secret === providedSecret
      ) {
        // Check expiration
        if (new Date() > keyConfig.expiresAt) {
          await this.revokeKey(service, keyId, 'expired');
          return false;
        }

        return true;
      }
    }

    return false;
  }

  /**
   * Get all active keys for a service
   */
  async getActiveKeys(service: string): Promise<ApiKeyConfig[]> {
    const activeKeyIds = await this.redis.lrange(`apikeys:${service}:active`, 0, -1);
    const keys: ApiKeyConfig[] = [];

    for (const keyId of activeKeyIds) {
      const keyConfig = await this.getKey(service, keyId);
      if (keyConfig) {
        keys.push(keyConfig);
      }
    }

    return keys;
  }

  /**
   * Check for keys needing rotation
   */
  async checkRotationNeeded(service: string): Promise<{ needsRotation: boolean; daysUntilExpiry: number }> {
    const schedule = this.rotationSchedules.get(service);
    if (!schedule) {
      return { needsRotation: false, daysUntilExpiry: -1 };
    }

    const activeKeys = await this.getActiveKeys(service);
    if (activeKeys.length === 0) {
      return { needsRotation: true, daysUntilExpiry: 0 };
    }

    // Check oldest key
    const oldestKey = activeKeys.reduce((oldest, current) =>
      new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest,
    );

    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(oldestKey.createdAt).getTime()) / (24 * 60 * 60 * 1000),
    );
    const daysUntilExpiry = schedule.rotationIntervalDays - daysSinceCreation;

    return {
      needsRotation: daysUntilExpiry <= schedule.notifyBeforeDays,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
    };
  }

  /**
   * Audit log for key operations
   */
  private async auditLog(
    action: 'rotate' | 'revoke' | 'validate',
    service: string,
    keyId: string,
    details: string,
  ): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      service,
      keyId,
      details,
    };

    // Store in Redis with 90-day retention
    await this.redis.lpush(`audit:apikeys`, JSON.stringify(auditEntry));
    await this.redis.expire(`audit:apikeys`, 90 * 24 * 60 * 60);

    this.logger.debug('[API Key Audit] Logged', auditEntry);
  }

  /**
   * Get audit trail for a service
   */
  async getAuditTrail(service: string, limit: number = 100): Promise<any[]> {
    const allAudits = await this.redis.lrange(`audit:apikeys`, 0, limit - 1);

    return allAudits
      .map((entry) => {
        try {
          return JSON.parse(entry);
        } catch {
          return null;
        }
      })
      .filter((entry) => entry && entry.service === service);
  }

  /**
   * Schedule automatic rotation (to be called by cron)
   */
  async scheduleAutoRotation(): Promise<void> {
    this.logger.info('[API Key Rotation] Starting automatic rotation check');

    for (const schedule of this.rotationSchedules.values()) {
      try {
        const { needsRotation, daysUntilExpiry } = await this.checkRotationNeeded(schedule.service);

        if (needsRotation) {
          this.logger.info('[API Key Rotation] Rotation needed', {
            service: schedule.service,
            daysUntilExpiry,
          });

          await this.rotateKey(schedule.service, 'automatic_rotation');
        }
      } catch (error) {
        this.logger.error('[API Key Rotation] Error checking rotation', {
          service: schedule.service,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

export default ApiKeyRotationManager;
