/**
 * Event Analytics Service
 * Tracks user interactions, conversions, and engagement metrics for events
 */

import apiClient from './apiClient';

interface EventAnalyticsEvent {
  eventId: string;
  eventType: 'view' | 'favorite' | 'unfavorite' | 'share' | 'booking_start' | 'booking_complete' | 'booking_cancel' | 'slot_select' | 'payment_start' | 'payment_complete' | 'payment_failed' | 'add_to_cart';
  metadata?: {
    source?: string;
    slotId?: string;
    bookingId?: string;
    paymentIntentId?: string;
    amount?: number;
    duration?: number; // Time spent on page in seconds
    scrollDepth?: number; // Percentage scrolled
    timestamp?: string;
    [key: string]: any;
  };
}

class EventAnalyticsService {
  private baseUrl: string;
  private eventsQueue: EventAnalyticsEvent[] = [];
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 500;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.baseUrl = apiClient.getBaseURL();
    this.startFlushTimer();
  }

  /**
   * Start automatic flushing of events queue
   */
  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.eventsQueue.length > 0) {
        this.flushEvents();
      }
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Track event view
   */
  trackEventView(eventId: string, source: string = 'unknown', metadata?: any) {
    this.trackEvent({
      eventId,
      eventType: 'view',
      metadata: {
        source,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Track favorite toggle
   */
  trackFavoriteToggle(eventId: string, isFavorited: boolean, source: string = 'event_page') {
    this.trackEvent({
      eventId,
      eventType: isFavorited ? 'favorite' : 'unfavorite',
      metadata: {
        source,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track share event
   */
  trackShare(eventId: string, platform: string = 'unknown', source: string = 'event_page') {
    this.trackEvent({
      eventId,
      eventType: 'share',
      metadata: {
        source,
        platform,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track booking start
   */
  trackBookingStart(eventId: string, slotId?: string, source: string = 'event_page') {
    this.trackEvent({
      eventId,
      eventType: 'booking_start',
      metadata: {
        source,
        slotId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track booking completion
   */
  trackBookingComplete(eventId: string, bookingId: string, slotId?: string, source: string = 'event_page') {
    this.trackEvent({
      eventId,
      eventType: 'booking_complete',
      metadata: {
        source,
        bookingId,
        slotId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track booking cancellation
   */
  trackBookingCancel(eventId: string, bookingId: string, reason?: string, source: string = 'event_page') {
    this.trackEvent({
      eventId,
      eventType: 'booking_cancel',
      metadata: {
        source,
        bookingId,
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track slot selection
   */
  trackSlotSelect(eventId: string, slotId: string, source: string = 'event_page') {
    this.trackEvent({
      eventId,
      eventType: 'slot_select',
      metadata: {
        source,
        slotId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track payment start
   */
  trackPaymentStart(eventId: string, amount: number, bookingId?: string, source: string = 'event_page') {
    this.trackEvent({
      eventId,
      eventType: 'payment_start',
      metadata: {
        source,
        bookingId,
        amount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track payment completion
   */
  trackPaymentComplete(eventId: string, paymentIntentId: string, amount: number, bookingId?: string, source: string = 'event_page') {
    this.trackEvent({
      eventId,
      eventType: 'payment_complete',
      metadata: {
        source,
        paymentIntentId,
        bookingId,
        amount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track payment failure
   */
  trackPaymentFailed(eventId: string, error: string, amount: number, bookingId?: string, source: string = 'event_page') {
    this.trackEvent({
      eventId,
      eventType: 'payment_failed',
      metadata: {
        source,
        bookingId,
        amount,
        error,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track add to cart
   */
  trackAddToCart(eventId: string, amount: number, slotId?: string, source: string = 'event_page') {
    this.trackEvent({
      eventId,
      eventType: 'add_to_cart',
      metadata: {
        source,
        slotId,
        amount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track page engagement metrics
   */
  trackPageEngagement(eventId: string, duration: number, scrollDepth: number) {
    this.trackEvent({
      eventId,
      eventType: 'view',
      metadata: {
        duration,
        scrollDepth,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track generic event
   */
  private trackEvent(event: EventAnalyticsEvent) {
    // Cap queue size to prevent unbounded growth
    if (this.eventsQueue.length >= this.MAX_QUEUE_SIZE) {
      this.eventsQueue = this.eventsQueue.slice(-Math.floor(this.MAX_QUEUE_SIZE / 2));
    }

    // Add to queue
    this.eventsQueue.push(event);

    // Flush if queue is full
    if (this.eventsQueue.length >= this.BATCH_SIZE) {
      this.flushEvents();
    }

    // Also log to console in development
    if (__DEV__) {
      console.log('📊 [Event Analytics]', event.eventType, event.eventId, event.metadata);
    }
  }

  /**
   * Flush events queue to backend
   */
  async flushEvents(): Promise<void> {
    if (this.eventsQueue.length === 0) {
      return;
    }

    const eventsToFlush = [...this.eventsQueue];
    this.eventsQueue = [];

    try {
      // Try to send to backend
      const response = await fetch(`${this.baseUrl}/events/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToFlush }),
      });

      if (!response.ok) {
        // If backend call fails, re-queue events (with limit)
        this.eventsQueue = [...eventsToFlush.slice(-this.BATCH_SIZE), ...this.eventsQueue].slice(-this.MAX_QUEUE_SIZE);
      }
    } catch (error) {
      // Re-queue events on error (with limit)
      this.eventsQueue = [...eventsToFlush.slice(-this.BATCH_SIZE), ...this.eventsQueue].slice(-this.MAX_QUEUE_SIZE);
    }
  }

  /**
   * Clear analytics queue
   */
  clearQueue() {
    this.eventsQueue = [];
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.eventsQueue.length;
  }

  /**
   * Destroy service and cleanup
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Flush remaining events before destroying
    this.flushEvents();
  }
}

// Export singleton instance
export const eventAnalytics = new EventAnalyticsService();
export default eventAnalytics;

