import { DeviceFingerprint } from '../models/DeviceFingerprint';
import * as deviceFingerprintService from '../services/deviceFingerprintService';
import { logger } from '../config/logger';

/**
 * Analyzes recently updated devices for suspicious patterns.
 * Run via cron every 15 minutes with a Redis distributed lock.
 */
export async function runDevicePatternAnalysis(): Promise<void> {
  const startTime = Date.now();

  // Process devices updated in the last 20 minutes (overlaps with 15-min schedule for safety)
  const since = new Date(Date.now() - 20 * 60 * 1000);

  const devices = await DeviceFingerprint.find({
    updatedAt: { $gte: since },
    isBlocked: false, // Skip already-blocked devices
  })
    .select('deviceHash')
    .lean();

  if (devices.length === 0) {
    logger.debug('[DevicePatternJob] No recently updated devices to analyze');
    return;
  }

  let flaggedCount = 0;
  let blockedCount = 0;

  for (const device of devices) {
    try {
      const result = await deviceFingerprintService.analyzePatterns(device.deviceHash);
      if (result.flagsToAdd.length > 0) flaggedCount++;
      if (result.shouldAutoBlock) blockedCount++;
    } catch (err) {
      logger.error('[DevicePatternJob] Error analyzing device', {
        deviceHash: device.deviceHash,
        error: (err as Error).message,
      });
    }
  }

  const duration = Date.now() - startTime;
  logger.info('[DevicePatternJob] Analysis complete', {
    devicesAnalyzed: devices.length,
    flagged: flaggedCount,
    autoBlocked: blockedCount,
    durationMs: duration,
  });
}
