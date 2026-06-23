/**
 * ML-Based Anomaly Detection Service
 * Phase 5 Week 5-6: Resilience & Reliability
 *
 * Detects anomalies in system metrics using statistical models
 */

import { logger } from '../config/logger';
import redisService from './redisService';

// Use raw Redis client for list/expire/pattern operations
const redis = {
  lpush: (key: string, value: string) => redisService.getClient()?.lPush(key, value) ?? Promise.resolve(0),
  lrange: (key: string, start: number, stop: number) =>
    redisService.getClient()?.lRange(key, start, stop) ?? Promise.resolve([] as string[]),
  ltrim: (key: string, start: number, stop: number) =>
    redisService.getClient()?.lTrim(key, start, stop) ?? Promise.resolve('OK'),
  expire: (key: string, seconds: number) => redisService.getClient()?.expire(key, seconds) ?? Promise.resolve(false),
  flushdb: () => redisService.getClient()?.flushDb() ?? Promise.resolve('OK'),
  keys: (pattern: string): Promise<string[]> => redisService.getClient()?.keys(pattern) ?? Promise.resolve([]),
};

// ─────────────────────────────────────────────────────────────────────────
// ANOMALY DETECTOR
// ─────────────────────────────────────────────────────────────────────────

export interface Anomaly {
  timestamp: Date;
  metric: string;
  value: number;
  expected: number;
  deviation: number; // % from expected
  severity: 'low' | 'medium' | 'high';
  zScore: number;
}

export class AnomalyDetector {
  private static windowSize = 100; // Use last 100 data points
  private static zScoreThreshold = 3; // 3 standard deviations
  private static deviationThreshold = 50; // 50% deviation

  /**
   * Detect anomalies in metric data
   */
  static async detectAnomalies(metricName: string, value: number): Promise<Anomaly | null> {
    try {
      // Get historical data
      const history = await this.getMetricHistory(metricName);

      if (history.length < 10) {
        // Need at least 10 points for meaningful analysis
        logger.debug('[ANOMALY] Insufficient history for', { metricName });
        return null;
      }

      // Calculate statistics
      const { mean, stdDev } = this.calculateStats(history);
      const zScore = Math.abs((value - mean) / stdDev);
      const deviation = Math.abs((value - mean) / mean) * 100;

      // Check if anomaly
      if (zScore > this.zScoreThreshold || deviation > this.deviationThreshold) {
        const severity = this.calculateSeverity(zScore, deviation);

        const anomaly: Anomaly = {
          timestamp: new Date(),
          metric: metricName,
          value,
          expected: mean,
          deviation,
          severity,
          zScore,
        };

        logger.warn('[ANOMALY] Detected anomaly', {
          metric: metricName,
          value: value.toFixed(2),
          expected: mean.toFixed(2),
          deviation: deviation.toFixed(1),
          severity,
        });

        // Store for analysis
        await this.storeAnomaly(anomaly);

        return anomaly;
      }

      // Update history
      await this.addToHistory(metricName, value);
      return null;
    } catch (error) {
      logger.error('[ANOMALY] Detection error', {
        metric: metricName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Calculate mean and standard deviation
   */
  private static calculateStats(values: number[]): {
    mean: number;
    stdDev: number;
  } {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  /**
   * Calculate anomaly severity
   */
  private static calculateSeverity(zScore: number, deviation: number): 'low' | 'medium' | 'high' {
    if (zScore > 5 || deviation > 100) return 'high';
    if (zScore > 4 || deviation > 75) return 'medium';
    return 'low';
  }

  /**
   * Get metric history from Redis
   */
  private static async getMetricHistory(metricName: string): Promise<number[]> {
    const key = `metric:history:${metricName}`;
    const history = await redis.lrange(key, 0, this.windowSize - 1);

    return history.map((v: string) => parseFloat(v));
  }

  /**
   * Add value to metric history
   */
  private static async addToHistory(metricName: string, value: number): Promise<void> {
    const key = `metric:history:${metricName}`;

    await redis.lpush(key, value.toString());
    await redis.ltrim(key, 0, this.windowSize - 1);
    await redis.expire(key, 7 * 24 * 60 * 60); // 7 days
  }

  /**
   * Store detected anomaly
   */
  private static async storeAnomaly(anomaly: Anomaly): Promise<void> {
    const key = `anomalies:${anomaly.metric}`;

    await redis.lpush(key, JSON.stringify(anomaly));
    await redis.ltrim(key, 0, 999); // Keep last 1000 anomalies
    await redis.expire(key, 30 * 24 * 60 * 60); // 30 days
  }

  /**
   * Get detected anomalies
   */
  static async getAnomalies(metricName?: string): Promise<Anomaly[]> {
    if (metricName) {
      const key = `anomalies:${metricName}`;
      const anomalies = await redis.lrange(key, 0, -1);
      return anomalies.map((a: string) => JSON.parse(a) as Anomaly);
    } else {
      // Get all anomalies across metrics
      const keys = await redis.keys('anomalies:*');
      const allAnomalies: Anomaly[] = [];

      for (const key of keys) {
        const anomalies = await redis.lrange(key, 0, -1);
        allAnomalies.push(...anomalies.map((a: string) => JSON.parse(a) as Anomaly));
      }

      return allAnomalies.sort((a: Anomaly, b: Anomaly) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  }

  /**
   * Get anomaly statistics
   */
  static async getAnomalyStats(): Promise<any> {
    const anomalies = await this.getAnomalies();

    const stats = {
      totalAnomalies: anomalies.length,
      byMetric: {} as Record<string, number>,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
      },
      recent24h: 0,
    };

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const anomaly of anomalies) {
      // Count by metric
      stats.byMetric[anomaly.metric] = (stats.byMetric[anomaly.metric] || 0) + 1;

      // Count by severity
      stats.bySeverity[anomaly.severity]++;

      // Count recent
      if (new Date(anomaly.timestamp) > oneDayAgo) {
        stats.recent24h++;
      }
    }

    return stats;
  }

  /**
   * Predict next expected value
   */
  static async predictNextValue(metricName: string): Promise<number | null> {
    try {
      const history = await this.getMetricHistory(metricName);

      if (history.length < 5) return null;

      // Simple moving average prediction
      const recentPoints = history.slice(0, 5);
      const trend = (history[0] - history[4]) / 4;
      const nextValue = history[0] + trend;

      return Math.max(0, nextValue); // Don't predict negative values
    } catch (error) {
      logger.error('[ANOMALY] Prediction error', {
        metric: metricName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

export default AnomalyDetector;
