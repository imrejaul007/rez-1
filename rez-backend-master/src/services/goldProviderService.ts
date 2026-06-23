/**
 * Gold Provider Service
 *
 * Stub adapter for licensed gold providers.
 * In production, partner with: Augmont, SafeGold, or MMTC-PAMP (SEBI/RBI registered)
 *
 * FEAT-1: Live gold price integration via metals.live API + USD/INR FX rates
 */

import axios from 'axios';
import redisService from './redisService';
import { logger } from '../config/logger';

const GOLD_PRICE_CACHE_KEY = 'gold:price:inr_per_gram';
const GOLD_PRICE_TTL = 900; // 15 minutes

// Circuit breaker state for external APIs
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 consecutive failures
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 60s recovery window
const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
};

function checkCircuitBreaker(): boolean {
  if (!circuitBreaker.isOpen) return true;

  const timeSinceFailure = Date.now() - circuitBreaker.lastFailureTime;
  if (timeSinceFailure > CIRCUIT_BREAKER_TIMEOUT) {
    logger.info('[GOLD] Circuit breaker resetting after recovery window');
    circuitBreaker.failures = 0;
    circuitBreaker.isOpen = false;
    return true;
  }
  return false;
}

function recordSuccess(): void {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
}

function recordFailure(): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = Date.now();
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true;
    logger.warn('[GOLD] Circuit breaker OPEN after', CIRCUIT_BREAKER_THRESHOLD, 'failures');
  }
}

/**
 * Fetch live gold price in INR per gram
 * Flow: metals.live (USD/oz) → exchangerate-api (USD/INR) → conversion
 * Caches for 15min, falls back to stale cache, then ₹6,840
 */
export async function getLiveGoldPriceInr(): Promise<number> {
  try {
    // Check cache first
    const cached = await redisService.get<string>(GOLD_PRICE_CACHE_KEY);
    if (cached) {
      const price = parseFloat(cached);
      logger.debug('[GOLD] Price from cache:', price);
      return price;
    }

    // Circuit breaker check — prevent cascading failures
    if (!checkCircuitBreaker()) {
      logger.warn('[GOLD] Circuit breaker is OPEN, skipping external API calls');
      // Try stale cache or fallback
      try {
        const stale = await redisService.get<string>(GOLD_PRICE_CACHE_KEY);
        if (stale) {
          const price = parseFloat(stale);
          logger.info('[GOLD] Using stale cached price (CB open):', price);
          return price;
        }
      } catch (_) {
        logger.warn('[GOLD] Failed to read stale Redis cache while circuit breaker is open, using hardcoded fallback');
      }
      return 6840; // Fallback
    }

    // Fetch both APIs in parallel with timeout protection
    let goldResp, fxResp;
    try {
      [goldResp, fxResp] = (await Promise.race([
        Promise.all([
          axios.get('https://api.metals.live/v1/spot/gold', { timeout: 5000 }),
          axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 }),
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('API request timeout')), 8000)),
      ])) as any;
    } catch (timeoutErr: any) {
      recordFailure();
      throw new Error(`Gold API timeout: ${timeoutErr.message}`);
    }

    // Extract spot price in USD/troy oz
    const usdPerOz = goldResp.data?.price;
    if (!usdPerOz) {
      recordFailure();
      logger.warn('[GOLD] Invalid metals.live response:', goldResp.data);
      throw new Error('Invalid gold price API response');
    }

    // Extract USD to INR rate
    const usdToInr = fxResp.data?.rates?.INR;
    if (!usdToInr) {
      recordFailure();
      logger.warn('[GOLD] Invalid exchangerate-api response:', fxResp.data);
      throw new Error('Invalid FX rate API response');
    }

    // Convert: USD/oz → INR/gram
    // 1 troy oz = 31.1035 grams
    const inrPerGram = Math.round((usdPerOz / 31.1035) * usdToInr * 100) / 100;

    // Cache it for 15 minutes
    await redisService.set(GOLD_PRICE_CACHE_KEY, inrPerGram.toString(), GOLD_PRICE_TTL);
    recordSuccess(); // Reset circuit breaker on success
    logger.info('[GOLD] Fresh price fetched:', inrPerGram, 'INR/gram');

    return inrPerGram;
  } catch (err: any) {
    recordFailure(); // Increment failure count
    logger.warn('[GOLD] Price fetch failed:', err.message);

    // Try stale cache as fallback
    try {
      const stale = await redisService.get<string>(GOLD_PRICE_CACHE_KEY);
      if (stale) {
        const price = parseFloat(stale);
        logger.info('[GOLD] Using stale cached price:', price);
        return price;
      }
    } catch (_) {
      // Redis may be down
    }

    // Final fallback
    logger.warn('[GOLD] Using hardcoded fallback: ₹6,840/gram');
    return 6840;
  }
}

export class GoldProviderService {
  private isConfigured = !!process.env.GOLD_PROVIDER_API_KEY;

  constructor() {
    if (!this.isConfigured) {
      logger.warn('[GoldSavings] No licensed gold provider connected.');
      logger.warn('[GoldSavings] Partner with: Augmont, SafeGold, or MMTC-PAMP (SEBI/RBI registered)');
    }
  }

  async buyGold(params: {
    userId: string;
    amountINR: number;
    grams?: number;
  }): Promise<{ success: boolean; grams: number; rate: number; transactionId: string }> {
    if (!this.isConfigured) {
      logger.error('[GoldProvider] NOT configured — rejecting gold purchase to prevent silent money loss', {
        userId: params.userId,
        amountINR: params.amountINR,
      });
      throw new Error('Gold savings service is currently unavailable. Please try again later.');
    }
    throw new Error('Gold provider API not configured. Set GOLD_PROVIDER_API_KEY.');
  }

  async sellGold(params: { userId: string; grams: number }): Promise<{ success: boolean; amountINR: number }> {
    if (!this.isConfigured) {
      logger.error('[GoldProvider] NOT configured — rejecting gold sell', { userId: params.userId });
      throw new Error('Gold savings service is currently unavailable. Please try again later.');
    }
    throw new Error('Gold provider API not configured.');
  }

  async getCurrentRate(): Promise<{ buy: number; sell: number }> {
    if (!this.isConfigured) {
      // Use live price API instead of hardcoded stubs when provider is not configured
      const livePrice = await getLiveGoldPriceInr();
      // Apply a 0.7% spread (typical for gold providers)
      return { buy: Math.round(livePrice * 1.007), sell: Math.round(livePrice * 0.993) };
    }
    throw new Error('Gold provider API not configured.');
  }
}

export const goldProviderService = new GoldProviderService();
