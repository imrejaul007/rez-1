/**
 * Game Security Middleware
 *
 * Provides security utilities for API calls and data handling
 * Anti-cheat measures and suspicious pattern detection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import gameAuthGuard from './gameAuthGuard';
import gameRateLimiter from './gameRateLimiter';
import { validateCoinAmount, sanitizeObject } from './gameValidation';

// Security flags storage
const SECURITY_FLAGS_KEY = 'security_flags';
const SUSPICIOUS_ACTIVITY_KEY = 'suspicious_activity';

// Suspicious activity threshold
const SUSPICIOUS_THRESHOLD = 5;
const SUSPICIOUS_TIME_WINDOW = 60 * 60 * 1000; // 1 hour

/**
 * Security check result
 */
export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  action?: string;
}

/**
 * Suspicious activity record
 */
interface SuspiciousActivity {
  type: string;
  timestamp: number;
  details: any;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Game session token
 */
export interface GameSession {
  sessionId: string;
  gameId: string;
  userId: string;
  startTime: number;
  serverSeed: string; // For verifiable fairness
}

/**
 * Game Security Middleware Class
 */
export class GameSecurityMiddleware {
  /**
   * Perform comprehensive security check before game action
   */
  async performSecurityCheck(
    userId: string,
    action: string,
    data?: any
  ): Promise<SecurityCheckResult> {
    // 1. Check authentication
    const authResult = await gameAuthGuard.isAuthenticated();
    if (!authResult.isAuthenticated) {
      return {
        allowed: false,
        reason: 'NOT_AUTHENTICATED',
        action: 'REDIRECT_LOGIN',
      };
    }

    // 2. Check rate limiting
    const rateLimitResult = await gameRateLimiter.checkRateLimit(userId, action);
    if (!rateLimitResult.allowed) {
      this.logSuspiciousActivity(userId, 'RATE_LIMIT_EXCEEDED', {
        action,
        reason: rateLimitResult.reason,
      }, 'medium');

      return {
        allowed: false,
        reason: rateLimitResult.reason,
        action: 'SHOW_COOLDOWN',
      };
    }

    // 3. Check for suspicious activity patterns
    const isSuspicious = await this.checkSuspiciousActivity(userId);
    if (isSuspicious) {
      return {
        allowed: false,
        reason: 'SUSPICIOUS_ACTIVITY_DETECTED',
        action: 'BLOCK_USER',
      };
    }

    // 4. Validate data if provided
    if (data) {
      try {
        await this.validateGameData(action, data);
      } catch (error: any) {
        this.logSuspiciousActivity(userId, 'INVALID_DATA', {
          action,
          error: error.message,
        }, 'high');

        return {
          allowed: false,
          reason: 'INVALID_DATA',
          action: 'REJECT_REQUEST',
        };
      }
    }

    // 5. Update activity
    await gameAuthGuard.updateActivity();

    // All checks passed
    return {
      allowed: true,
    };
  }

  /**
   * Validate game-specific data
   */
  private async validateGameData(action: string, data: any): Promise<void> {
    switch (action) {
      case 'SPIN_WHEEL':
        // No additional validation needed for spin
        break;

      case 'QUIZ_ANSWER':
        // Validate answer is within range
        if (typeof data.answer !== 'number' || data.answer < 0 || data.answer > 3) {
          throw new Error('Invalid quiz answer');
        }
        break;

      case 'CLAIM_REWARD':
        // Validate coin amount if present
        if (data.coinAmount !== undefined) {
          validateCoinAmount(data.coinAmount);
        }
        break;

      case 'SCRATCH_CARD':
        // Validate card ID format
        if (!data.cardId || typeof data.cardId !== 'string') {
          throw new Error('Invalid scratch card ID');
        }
        break;

      default:
        // Sanitize all data
        sanitizeObject(data);
    }
  }

  /**
   * Create game session with server seed (for provably fair games)
   */
  async createGameSession(userId: string, gameId: string): Promise<GameSession> {
    const sessionId = this.generateSessionId();
    const serverSeed = this.generateServerSeed();

    const session: GameSession = {
      sessionId,
      gameId,
      userId,
      startTime: Date.now(),
      serverSeed,
    };

    // Store session
    await AsyncStorage.setItem(`game_session_${sessionId}`, JSON.stringify(session));

    return session;
  }

  /**
   * Verify game result using session data
   */
  async verifyGameResult(
    sessionId: string,
    result: any
  ): Promise<{ isValid: boolean; reason?: string }> {
    try {
      // Get session
      const sessionStr = await AsyncStorage.getItem(`game_session_${sessionId}`);
      if (!sessionStr) {
        return { isValid: false, reason: 'SESSION_NOT_FOUND' };
      }

      const session: GameSession = JSON.parse(sessionStr);

      // Verify result is within reasonable bounds
      if (result.coinsEarned !== undefined) {
        // Check if coins earned is suspiciously high
        if (result.coinsEarned > 10000) {
          this.logSuspiciousActivity(session.userId, 'SUSPICIOUS_REWARD', {
            sessionId,
            coinsEarned: result.coinsEarned,
          }, 'high');
          return { isValid: false, reason: 'SUSPICIOUS_REWARD_AMOUNT' };
        }
      }

      // Verify timing only when result is suspicious - allow quick completion
      // for legitimate low-value results (anti-cheat focuses on suspicious values)
      const gameTime = Date.now() - session.startTime;
      const isSuspiciousResult =
        result.coinsEarned !== undefined && result.coinsEarned > 5000;
      if (isSuspiciousResult && gameTime < 1000) {
        this.logSuspiciousActivity(session.userId, 'SUSPICIOUS_TIMING', {
          sessionId,
          gameTime,
        }, 'high');
        return { isValid: false, reason: 'GAME_COMPLETED_TOO_FAST' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, reason: 'VERIFICATION_ERROR' };
    }
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string,
    type: string,
    details: any,
    severity: 'low' | 'medium' | 'high'
  ): Promise<void> {
    try {
      const activity: SuspiciousActivity = {
        type,
        timestamp: Date.now(),
        details,
        severity,
      };

      // Get existing activities
      const existing = await this.getSuspiciousActivities(userId);
      existing.push(activity);

      // Store updated activities
      await AsyncStorage.setItem(
        `${SUSPICIOUS_ACTIVITY_KEY}_${userId}`,
        JSON.stringify(existing)
      );

      // Log to console in development
      if (__DEV__) {
        console.warn(`[GameSecurityMiddleware] Suspicious activity logged:`, activity);
      }

      // In production, send to backend security service
      // securityApi.reportSuspiciousActivity(userId, activity);
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  async checkSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      const activities = await this.getSuspiciousActivities(userId);

      // Filter recent activities (within time window)
      const now = Date.now();
      const recentActivities = activities.filter(
        (activity) => now - activity.timestamp < SUSPICIOUS_TIME_WINDOW
      );

      // Count high severity activities
      const highSeverityCount = recentActivities.filter(
        (activity) => activity.severity === 'high'
      ).length;

      // Flag if too many suspicious activities
      if (recentActivities.length >= SUSPICIOUS_THRESHOLD || highSeverityCount >= 2) {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get suspicious activities for user
   */
  private async getSuspiciousActivities(userId: string): Promise<SuspiciousActivity[]> {
    try {
      const stored = await AsyncStorage.getItem(`${SUSPICIOUS_ACTIVITY_KEY}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear suspicious activity logs (admin action or after investigation)
   */
  async clearSuspiciousActivities(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${SUSPICIOUS_ACTIVITY_KEY}_${userId}`);
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate server seed for provably fair games
   */
  private generateServerSeed(): string {
    // Generate a cryptographically secure random seed
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Sanitize API request before sending
   */
  sanitizeRequest<T extends Record<string, any>>(data: T): T {
    return sanitizeObject(data);
  }

  /**
   * Add security headers to API request
   */
  async getSecurityHeaders(): Promise<Record<string, string>> {
    const token = await gameAuthGuard.getToken();
    const sessionId = await this.getCurrentSessionId();

    return {
      Authorization: token ? `Bearer ${token}` : '',
      'X-Session-ID': sessionId || '',
      'X-Client-Version': '1.0.0', // App version
      'X-Platform': 'react-native',
    };
  }

  /**
   * Get current session ID
   */
  private async getCurrentSessionId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('current_session_id');
    } catch {
      return null;
    }
  }
}

// Singleton instance
const gameSecurityMiddleware = new GameSecurityMiddleware();

/**
 * Hook for using security middleware in components
 */
export function useGameSecurity(userId: string, action: string) {
  const performCheck = async (data?: any) => {
    return await gameSecurityMiddleware.performSecurityCheck(userId, action, data);
  };

  const createSession = async (gameId: string) => {
    return await gameSecurityMiddleware.createGameSession(userId, gameId);
  };

  const verifyResult = async (sessionId: string, result: any) => {
    return await gameSecurityMiddleware.verifyGameResult(sessionId, result);
  };

  const logActivity = async (type: string, details: any, severity: 'low' | 'medium' | 'high') => {
    await gameSecurityMiddleware.logSuspiciousActivity(userId, type, details, severity);
  };

  return {
    performCheck,
    createSession,
    verifyResult,
    logActivity,
  };
}

// Export singleton
export default gameSecurityMiddleware;
