/**
 * Analytics Offline Queue
 *
 * Queues analytics events when offline and sends when back online
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AnalyticsEvent } from '@/services/analytics/types';
import apiClient from '@/services/apiClient';

const QUEUE_KEY = '@analytics:offline_queue';
const MAX_QUEUE_SIZE = 1000;
const RETRY_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;

interface QueuedEvent extends AnalyticsEvent {
  id: string;
  retryCount: number;
  queuedAt: number;
}

export class AnalyticsQueue {
  private static instance: AnalyticsQueue;
  private queue: QueuedEvent[] = [];
  private isOnline: boolean = true;
  private isProcessing: boolean = false;
  private retryTimer?: NodeJS.Timeout;
  private networkUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): AnalyticsQueue {
    if (!AnalyticsQueue.instance) {
      AnalyticsQueue.instance = new AnalyticsQueue();
    }
    return AnalyticsQueue.instance;
  }

  /**
   * Initialize queue system
   */
  private async initialize(): Promise<void> {
    // Load persisted queue
    await this.loadQueue();

    // Listen for network changes (store unsubscribe for cleanup)
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected === true;

      if (!wasOnline && this.isOnline) {
        this.processQueue();
      }
    });

    // Start retry timer
    this.startRetryTimer();
  }

  /**
   * Add event to queue
   */
  async enqueue(event: AnalyticsEvent): Promise<void> {
    const queuedEvent: QueuedEvent = {
      ...event,
      id: this.generateId(),
      retryCount: 0,
      queuedAt: Date.now(),
    };

    this.queue.push(queuedEvent);

    // Trim queue if too large
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
    }

    await this.persistQueue();

    // Try to process if online
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process queued events
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;


    const eventsToProcess = [...this.queue];
    const successfulIds: string[] = [];
    const failedEvents: QueuedEvent[] = [];

    for (const event of eventsToProcess) {
      try {
        await this.sendEvent(event);
        successfulIds.push(event.id);
      } catch (error) {

        // Increment retry count
        event.retryCount++;

        if (event.retryCount < MAX_RETRIES) {
          failedEvents.push(event);
        } else {
        }
      }
    }

    // Remove successful events, keep failed ones
    this.queue = this.queue.filter(e => !successfulIds.includes(e.id));
    this.queue.push(...failedEvents);

    await this.persistQueue();

    this.isProcessing = false;

    // If there are still events and we're online, schedule another attempt
    if (this.queue.length > 0 && this.isOnline) {
      setTimeout(() => this.processQueue(), RETRY_INTERVAL);
    }
  }

  /**
   * Send single event
   */
  private async sendEvent(event: QueuedEvent): Promise<void> {
    const apiUrl = apiClient.getBaseURL();

    const response = await fetch(`${apiUrl}/analytics/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
    }
  }

  /**
   * Persist queue to storage
   */
  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
    }
  }

  /**
   * Start retry timer
   */
  private startRetryTimer(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }

    this.retryTimer = setInterval(() => {
      if (this.isOnline && this.queue.length > 0 && !this.isProcessing) {
        this.processQueue();
      }
    }, RETRY_INTERVAL);
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get queue contents
   */
  getQueue(): QueuedEvent[] {
    return [...this.queue];
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(QUEUE_KEY);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy queue
   */
  destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = undefined;
    }
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
  }
}

// Export singleton
export const analyticsQueue = AnalyticsQueue.getInstance();
export default analyticsQueue;
