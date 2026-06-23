/**
 * Custom Analytics Provider
 *
 * Sends events to our custom backend API
 */

import { Platform } from 'react-native';
import { BaseAnalyticsProvider } from './BaseProvider';
import { PurchaseTransaction, AnalyticsEvent } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CustomProviderConfig {
  apiUrl: string;
  apiKey?: string;
  batchSize?: number;
  flushInterval?: number;
}

export class CustomAnalyticsProvider extends BaseAnalyticsProvider {
  name = 'CustomAnalytics';
  private config: CustomProviderConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private userId?: string;
  private sessionId: string;
  private flushTimer?: NodeJS.Timeout;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds
  private readonly STORAGE_KEY = '@analytics:custom:queue';
  private static readonly MAX_QUEUE_SIZE = 500;
  private flushFailedAt: number = 0;
  private flushBackoffMs: number = 0;

  constructor() {
    super();
    this.sessionId = this.generateSessionId();
    this.config = {
      apiUrl: '',
      batchSize: this.BATCH_SIZE,
      flushInterval: this.FLUSH_INTERVAL,
    };
  }

  async initialize(config: CustomProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    this.log('Initializing with config:', config);

    // Load persisted events from storage
    await this.loadPersistedEvents();

    // Start auto-flush timer
    this.startFlushTimer();

    this.log('Initialized successfully');
  }

  trackEvent(name: string, properties?: Record<string, any>): void {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      platform: Platform.OS as any,
      appVersion: '1.0.0', // TODO: Get from app config
    };

    this.log('Tracking event:', name, properties);
    this.eventQueue.push(event);

    // Flush if batch size reached (skip if in backoff from previous failure)
    if (this.eventQueue.length >= (this.config.batchSize || this.BATCH_SIZE)) {
      if (Date.now() - this.flushFailedAt > this.flushBackoffMs) {
        this.flush();
      }
    }
  }

  trackScreen(name: string, properties?: Record<string, any>): void {
    this.trackEvent('screen_viewed', {
      screen_name: name,
      ...properties,
    });
  }

  setUserId(userId: string): void {
    this.userId = userId;
    this.log('User ID set:', userId);
  }

  setUserProperties(properties: Record<string, any>): void {
    this.trackEvent('user_properties_updated', {
      ...properties,
    });
  }

  trackPurchase(transaction: PurchaseTransaction): void {
    this.trackEvent('purchase_completed', {
      transaction_id: transaction.transactionId,
      revenue: transaction.revenue,
      tax: transaction.tax,
      shipping: transaction.shipping,
      currency: transaction.currency,
      items: transaction.items,
      coupon: transaction.coupon,
      discount: transaction.discount,
      payment_method: transaction.paymentMethod,
    });
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    this.log(`Flushing ${eventsToSend.length} events`);

    try {
      const response = await fetch(`${this.config.apiUrl}/t/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        },
        body: JSON.stringify({
          events: eventsToSend,
          sessionId: this.sessionId,
          userId: this.userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.log('Events sent successfully');
      this.flushBackoffMs = 0;
      this.flushFailedAt = 0;

      // Clear persisted events
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      this.error('Failed to send events:', error);

      // Exponential backoff: 30s, 60s, 120s, max 5min
      this.flushFailedAt = Date.now();
      this.flushBackoffMs = Math.min((this.flushBackoffMs || 15000) * 2, 300000);

      // Re-queue events and persist them, capped to MAX_QUEUE_SIZE
      this.eventQueue = [...eventsToSend, ...this.eventQueue].slice(-CustomAnalyticsProvider.MAX_QUEUE_SIZE);
      await this.persistEvents();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0 && Date.now() - this.flushFailedAt > this.flushBackoffMs) {
        this.flush();
      }
    }, this.config.flushInterval || this.FLUSH_INTERVAL);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async persistEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.eventQueue));
    } catch (error) {
      this.error('Failed to persist events:', error);
    }
  }

  private async loadPersistedEvents(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.eventQueue = JSON.parse(stored);
        this.log(`Loaded ${this.eventQueue.length} persisted events`);
      }
    } catch (error) {
      this.error('Failed to load persisted events:', error);
    }
  }

  async destroy(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
  }
}
