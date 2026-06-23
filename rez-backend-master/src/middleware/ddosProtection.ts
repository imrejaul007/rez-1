/**
 * Enhanced DDoS Protection Middleware
 *
 * Multi-layer DDoS protection:
 * - Rate limiting per IP, user, endpoint
 * - Behavioral analysis
 * - Adaptive throttling
 * - Automatic blocking of suspicious patterns
 */

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { logger } from '../config/logger';

/**
 * DDoS detection thresholds
 */
export interface DdosConfig {
  redis: Redis;
  enableBehavioralAnalysis: boolean;
  enableAdaptiveThrottling: boolean;
  requestsPerSecond: number;
  burstAllowance: number;
  blockDurationSeconds: number;
  detectionWindow: number; // seconds
}

/**
 * Client metrics for behavioral analysis
 */
export interface ClientMetrics {
  totalRequests: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  uniqueEndpoints: number;
  suspiciousPatterns: number;
}

/**
 * DDoS protection manager
 */
export class DdosProtectionManager {
  private redis: Redis;
  private config: DdosConfig;
  private blockedIps: Set<string> = new Set();
  private clientMetrics: Map<string, ClientMetrics> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: DdosConfig) {
    this.config = config;
    this.redis = config.redis;
    this.startCleanupTask();
  }

  /**
   * Check if an IP is blocked
   */
  async isIpBlocked(ip: string): Promise<boolean> {
    const blocked = await this.redis.get(`ddos:blocked:${ip}`);
    return !!blocked;
  }

  /**
   * Block an IP temporarily
   */
  async blockIp(ip: string, reason: string, durationSeconds: number = this.config.blockDurationSeconds): Promise<void> {
    await this.redis.setex(`ddos:blocked:${ip}`, durationSeconds, reason);
    this.blockedIps.add(ip);

    logger.warn('[DDoS Protection] IP blocked', {
      ip,
      reason,
      duration: durationSeconds,
    });
  }

  /**
   * Unblock an IP
   */
  async unblockIp(ip: string): Promise<void> {
    await this.redis.del(`ddos:blocked:${ip}`);
    this.blockedIps.delete(ip);

    logger.info('[DDoS Protection] IP unblocked', { ip });
  }

  /**
   * Track request for rate limiting
   */
  async trackRequest(ip: string, userId?: string): Promise<{ allowed: boolean; reason?: string }> {
    const now = Math.floor(Date.now() / 1000);
    const window = this.config.detectionWindow;

    // IP-based rate limiting
    const ipKey = `ratelimit:ip:${ip}`;
    const ipCount = await this.redis.incr(ipKey);

    if (ipCount === 1) {
      await this.redis.expire(ipKey, window);
    }

    // Per-second check
    if (ipCount > this.config.requestsPerSecond * window + this.config.burstAllowance) {
      await this.blockIp(ip, 'excessive_requests', this.config.blockDurationSeconds);
      return { allowed: false, reason: 'Rate limit exceeded' };
    }

    // User-based rate limiting (if authenticated)
    if (userId) {
      const userKey = `ratelimit:user:${userId}`;
      const userCount = await this.redis.incr(userKey);

      if (userCount === 1) {
        await this.redis.expire(userKey, window);
      }

      // Limit per user: 5x IP limit
      if (userCount > this.config.requestsPerSecond * window * 5 + this.config.burstAllowance * 5) {
        return { allowed: false, reason: 'User rate limit exceeded' };
      }
    }

    return { allowed: true };
  }

  /**
   * Analyze client behavior for DDoS patterns
   */
  async analyzeBehavior(ip: string): Promise<{ suspicious: boolean; patterns: string[] }> {
    if (!this.config.enableBehavioralAnalysis) {
      return { suspicious: false, patterns: [] };
    }

    const patterns: string[] = [];

    // Pattern 1: Rapid endpoint switching
    const endpointsKey = `behavior:endpoints:${ip}`;
    const uniqueEndpoints = await this.redis.scard(endpointsKey);
    if (uniqueEndpoints > 50) {
      patterns.push('rapid_endpoint_switching');
    }

    // Pattern 2: High error rate
    const errorsKey = `behavior:errors:${ip}`;
    const errorCount = (await this.redis.get(errorsKey)) || '0';
    const requestCount = (await this.redis.get(`behavior:requests:${ip}`)) || '1';
    const errorRate = parseInt(errorCount, 10) / parseInt(requestCount, 10);

    if (errorRate > 0.5) {
      patterns.push('high_error_rate');
    }

    // Pattern 3: Slow request pattern (request timeout spam)
    const slowKey = `behavior:slow:${ip}`;
    const slowCount = await this.redis.incr(slowKey);
    if (slowCount > 100) {
      patterns.push('slow_request_spam');
    }

    // Pattern 4: Same request repeated
    const lastRequestKey = `behavior:lastRequest:${ip}`;
    const lastRequest = await this.redis.get(lastRequestKey);
    if (lastRequest) {
      const repeatCount = (await this.redis.incr(`behavior:repeats:${ip}`)) || 1;
      if (repeatCount > 1000) {
        patterns.push('request_repetition');
      }
    }

    // Pattern 5: Unusual header patterns
    const headersKey = `behavior:headers:${ip}`;
    const headerVariations = await this.redis.scard(headersKey);
    if (headerVariations < 3 && parseInt(requestCount, 10) > 100) {
      patterns.push('suspicious_header_consistency');
    }

    return {
      suspicious: patterns.length >= 2,
      patterns,
    };
  }

  /**
   * Get current client metrics
   */
  async getClientMetrics(ip: string): Promise<ClientMetrics> {
    const window = this.config.detectionWindow;

    const totalRequests = parseInt((await this.redis.get(`ratelimit:ip:${ip}`)) || '0', 10);
    const errorCount = parseInt((await this.redis.get(`behavior:errors:${ip}`)) || '0', 10);
    const totalTime = parseInt((await this.redis.get(`behavior:totalTime:${ip}`)) || '0', 10);
    const uniqueEndpoints = await this.redis.scard(`behavior:endpoints:${ip}`);

    const metrics: ClientMetrics = {
      totalRequests,
      requestsPerSecond: Math.round(totalRequests / window),
      averageResponseTime: totalRequests > 0 ? totalTime / totalRequests : 0,
      errorRate: totalRequests > 0 ? errorCount / totalRequests : 0,
      uniqueEndpoints,
      suspiciousPatterns: 0,
    };

    return metrics;
  }

  /**
   * Adaptive throttling based on server load
   */
  async getAdaptiveThrottle(): Promise<number> {
    if (!this.config.enableAdaptiveThrottling) {
      return this.config.requestsPerSecond;
    }

    // Check server metrics
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();

    // If memory usage > 80%, reduce requests per second
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (heapUsagePercent > 80) {
      return Math.max(10, this.config.requestsPerSecond * 0.5); // 50% reduction
    }

    // If memory usage > 90%, severe reduction
    if (heapUsagePercent > 90) {
      return Math.max(5, this.config.requestsPerSecond * 0.2); // 80% reduction
    }

    return this.config.requestsPerSecond;
  }

  /**
   * Track request metrics
   */
  async trackMetrics(ip: string, endpoint: string, statusCode: number, responseTime: number): Promise<void> {
    // Track endpoint
    await this.redis.sadd(`behavior:endpoints:${ip}`, endpoint);

    // Track errors
    if (statusCode >= 400) {
      await this.redis.incr(`behavior:errors:${ip}`);
    }

    // Track total requests
    await this.redis.incr(`behavior:requests:${ip}`);

    // Track response time
    await this.redis.incrby(`behavior:totalTime:${ip}`, responseTime);

    // Expire old data after detection window
    await this.redis.expire(`behavior:endpoints:${ip}`, this.config.detectionWindow * 2);
    await this.redis.expire(`behavior:errors:${ip}`, this.config.detectionWindow * 2);
    await this.redis.expire(`behavior:requests:${ip}`, this.config.detectionWindow * 2);
    await this.redis.expire(`behavior:totalTime:${ip}`, this.config.detectionWindow * 2);
  }

  /**
   * Get blocked IPs list
   */
  async getBlockedIps(): Promise<string[]> {
    const keys = await this.redis.keys('ddos:blocked:*');
    return keys.map((k) => k.replace('ddos:blocked:', ''));
  }

  /**
   * Cleanup task to clear old metrics
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(async () => {
      const blockedIps = await this.getBlockedIps();
      logger.debug('[DDoS Protection] Cleanup task', {
        blockedIpsCount: blockedIps.length,
      });
    }, 60000); // Every minute
  }

  /**
   * Stop the cleanup task (call during graceful shutdown)
   */
  public stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * DDoS protection middleware
 */
export const ddosProtection = (manager: DdosProtectionManager) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    try {
      // Check if IP is blocked
      const isBlocked = await manager.isIpBlocked(clientIp);
      if (isBlocked) {
        logger.warn('[DDoS Protection] Blocked IP attempted access', {
          ip: clientIp,
          path: req.path,
          method: req.method,
        });

        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: 'Your IP has been temporarily blocked due to excessive requests',
        });
        return;
      }

      // Track request
      const userId = (req as any).user?.id || undefined;
      const { allowed, reason } = await manager.trackRequest(clientIp, userId);

      if (!allowed) {
        logger.warn('[DDoS Protection] Rate limit triggered', {
          ip: clientIp,
          reason,
          path: req.path,
        });

        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
        });
        return;
      }

      // Analyze behavior
      const { suspicious, patterns } = await manager.analyzeBehavior(clientIp);
      if (suspicious) {
        logger.warn('[DDoS Protection] Suspicious behavior detected', {
          ip: clientIp,
          patterns,
          path: req.path,
        });

        // Block after multiple suspicious patterns
        if (patterns.length >= 3) {
          await manager.blockIp(clientIp, `suspicious_patterns: ${patterns.join(',')}`, 300);
        }
      }

      // Track metrics
      const startTime = Date.now();
      const originalSend = res.send;

      res.send = function (data: any) {
        const responseTime = Date.now() - startTime;
        manager.trackMetrics(clientIp, req.path, res.statusCode, responseTime);
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('[DDoS Protection] Error in middleware', {
        error: error instanceof Error ? error.message : String(error),
        ip: clientIp,
      });

      next();
    }
  };
};

export default DdosProtectionManager;
