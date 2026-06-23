/**
 * Worker group classification.
 *
 * CRITICAL workers: process financial events, reward grants, and merchant-facing
 * state changes. Their failure has direct user-visible and financial consequences.
 * Run these in a separate process (WORKER_ROLE=critical) with dedicated
 * Redis connection limits and higher restart priority.
 *
 * NONCRITICAL workers: analytics, notifications, broadcast, email. Their failure
 * degrades UX but does not lose money or corrupt financial state.
 * Run these in a separate process (WORKER_ROLE=noncritical).
 */

export const CRITICAL_QUEUE_NAMES = [
  'payments',
  'payment-events',
  'rewards',
  'merchant-events',
  'gamification-events',
  'order-events',
  'wallet-events',
] as const;

export const NONCRITICAL_QUEUE_NAMES = [
  'analytics',
  'analytics-events',
  'notifications',
  'notification-events',
  'media-events',
  'catalog-events',
  'broadcast',
  'email',
  'sms',
  'exports',
  'scheduled',
  'integrations',
] as const;

export type CriticalQueue = (typeof CRITICAL_QUEUE_NAMES)[number];
export type NoncriticalQueue = (typeof NONCRITICAL_QUEUE_NAMES)[number];

export function isCriticalQueue(name: string): boolean {
  return (CRITICAL_QUEUE_NAMES as readonly string[]).includes(name);
}
