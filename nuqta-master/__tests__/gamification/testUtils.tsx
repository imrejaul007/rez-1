// Test Utilities for Gamification Tests
// Helper functions and utilities for testing gamification features

import { render, RenderOptions } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { GamificationProvider } from '@/contexts/GamificationContext';
import { AuthProvider } from '@/contexts/AuthContext';

// ==================== PROVIDERS ====================

/**
 * Wrapper with all required providers
 */
export const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <AuthProvider>
      <GamificationProvider>{children}</GamificationProvider>
    </AuthProvider>
  );
};

/**
 * Custom render with providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// ==================== DELAY HELPERS ====================

/**
 * Wait for a specific amount of time
 */
export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wait for animation to complete (default 300ms)
 */
export const waitForAnimation = (ms: number = 300): Promise<void> =>
  delay(ms);

// ==================== MOCK HELPERS ====================

/**
 * Create a successful API response
 */
export const createSuccessResponse = <T,>(data: T) => ({
  success: true,
  data,
  error: undefined,
});

/**
 * Create an error API response
 */
export const createErrorResponse = (error: string) => ({
  success: false,
  data: undefined,
  error,
});

/**
 * Create a mock API with common methods
 */
export const createMockAPI = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
});

// ==================== ASSERTION HELPERS ====================

/**
 * Check if a value is within a range
 */
export const expectInRange = (
  value: number,
  min: number,
  max: number
): void => {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
};

/**
 * Check if a date is recent (within last 5 seconds)
 */
export const expectRecentDate = (date: Date | string): void => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  expect(diff).toBeLessThan(5000);
  expect(diff).toBeGreaterThanOrEqual(0);
};

/**
 * Check if percentage is valid
 */
export const expectValidPercentage = (value: number): void => {
  expectInRange(value, 0, 100);
};

// ==================== DATA GENERATORS ====================

/**
 * Generate random coin amount
 */
export const generateRandomCoins = (min: number = 0, max: number = 1000): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Generate random progress
 */
export const generateRandomProgress = (target: number) => {
  const current = Math.floor(Math.random() * (target + 1));
  const percentage = Math.round((current / target) * 100);
  return { current, target, percentage };
};

/**
 * Generate mock user ID
 */
export const generateUserId = (): string =>
  `user-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Generate mock transaction ID
 */
export const generateTransactionId = (): string =>
  `txn-${Math.random().toString(36).substr(2, 9)}`;

// ==================== TEST DATA BUILDERS ====================

/**
 * Build test spin wheel result
 */
export const buildSpinResult = (options: {
  type?: 'coins' | 'discount' | 'cashback' | 'voucher' | 'nothing';
  value?: number;
}) => ({
  segment: {
    id: '1',
    label: `${options.value || 10} ${options.type || 'coins'}`,
    value: options.value || 10,
    color: '#FFD700',
    type: options.type || 'coins',
  },
  prize: {
    type: options.type || 'coins',
    value: options.value || 10,
    description: `You won ${options.value || 10} ${options.type || 'coins'}!`,
  },
  rotation: 720,
});

/**
 * Build test challenge
 */
export const buildChallenge = (options: {
  type?: 'daily' | 'weekly' | 'special';
  status?: 'active' | 'completed' | 'claimed' | 'expired';
  progress?: { current: number; target: number };
}) => ({
  id: `challenge-${Date.now()}`,
  title: 'Test Challenge',
  description: 'Complete test task',
  type: options.type || 'daily',
  difficulty: 'easy' as const,
  progress: options.progress || { current: 0, target: 10, percentage: 0 },
  rewards: { coins: 50, badges: [], vouchers: [] },
  status: options.status || 'active',
  startDate: new Date(),
  endDate: new Date(Date.now() + 86400000),
  icon: 'star',
  color: '#10B981',
});

/**
 * Build test achievement
 */
export const buildAchievement = (options: {
  unlocked?: boolean;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  progress?: { current: number; target: number };
}) => ({
  id: `ach-${Date.now()}`,
  title: 'Test Achievement',
  description: 'Complete test criteria',
  icon: 'trophy',
  badge: 'test-badge',
  tier: options.tier || 'bronze',
  coinReward: 50,
  isUnlocked: options.unlocked || false,
  unlockedAt: options.unlocked ? new Date() : undefined,
  progress: options.progress || { current: 0, target: 10 },
  category: 'shopping' as const,
});

// ==================== ASYNC TEST HELPERS ====================

/**
 * Poll a condition until it's true or timeout
 */
export const pollUntil = async (
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> => {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Polling timeout exceeded');
    }
    await delay(interval);
  }
};

/**
 * Wait for API call to complete
 */
export const waitForAPICall = async (
  mockFn: jest.Mock,
  options: { timeout?: number } = {}
): Promise<void> => {
  await pollUntil(() => mockFn.mock.calls.length > 0, options);
};

// ==================== VALIDATION HELPERS ====================

/**
 * Validate coin transaction structure
 */
export const validateTransaction = (transaction: any): void => {
  expect(transaction).toHaveProperty('id');
  expect(transaction).toHaveProperty('type');
  expect(transaction).toHaveProperty('amount');
  expect(transaction).toHaveProperty('source');
  expect(transaction).toHaveProperty('description');
  expect(transaction).toHaveProperty('createdAt');
  expect(['earned', 'spent', 'expired', 'refunded']).toContain(transaction.type);
  expect(typeof transaction.amount).toBe('number');
};

/**
 * Validate challenge structure
 */
export const validateChallenge = (challenge: any): void => {
  expect(challenge).toHaveProperty('id');
  expect(challenge).toHaveProperty('title');
  expect(challenge).toHaveProperty('description');
  expect(challenge).toHaveProperty('type');
  expect(challenge).toHaveProperty('progress');
  expect(challenge).toHaveProperty('rewards');
  expect(challenge).toHaveProperty('status');
  expect(['daily', 'weekly', 'special']).toContain(challenge.type);
  expect(['active', 'completed', 'claimed', 'expired']).toContain(challenge.status);
};

/**
 * Validate achievement structure
 */
export const validateAchievement = (achievement: any): void => {
  expect(achievement).toHaveProperty('id');
  expect(achievement).toHaveProperty('title');
  expect(achievement).toHaveProperty('description');
  expect(achievement).toHaveProperty('tier');
  expect(achievement).toHaveProperty('coinReward');
  expect(achievement).toHaveProperty('isUnlocked');
  expect(['bronze', 'silver', 'gold', 'platinum', 'diamond']).toContain(achievement.tier);
};

// ==================== CLEANUP HELPERS ====================

/**
 * Clear all mocks and timers
 */
export const cleanupAfterTest = (): void => {
  jest.clearAllMocks();
  jest.clearAllTimers();
};

/**
 * Reset all mocks to initial state
 */
export const resetAllMocks = (): void => {
  jest.resetAllMocks();
};

// ==================== EXPORT ALL ====================

export * from '@testing-library/react-native';
export { renderWithProviders as render };
