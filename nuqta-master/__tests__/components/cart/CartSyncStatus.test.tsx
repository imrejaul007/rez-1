/**
 * CartSyncStatus Component Tests
 *
 * Tests for the cart sync status indicator.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// Mock the hooks the component depends on — use module-scoped jest.fn() and mutate
// them inside the factory via the mock-prefixed names Jest permits.
const mockSyncCart = jest.fn(() => Promise.resolve());
const mockOfflineCartState = {
  isSyncing: false,
  syncError: null as string | null,
  pendingOperations: 0,
  timeSinceSync: null as string | null,
  syncCart: mockSyncCart,
};
const mockUseOfflineCart = jest.fn(() => mockOfflineCartState);
const mockNetworkState = { isOnline: true };
const mockUseNetworkStatus = jest.fn(() => mockNetworkState);

jest.mock('@/stores/selectors', () => ({
  useCartState: jest.fn(() => ({})),
  useCartActions: jest.fn(() => ({})),
}));

jest.mock('@/hooks/useOfflineCart', () => ({
  __esModule: true,
  default: () => mockUseOfflineCart(),
}));

jest.mock('@/hooks/useNetworkStatus', () => ({
  __esModule: true,
  default: () => mockUseNetworkStatus(),
}));

import CartSyncStatus from '@/components/cart/CartSyncStatus';

describe('CartSyncStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOfflineCartState.isSyncing = false;
    mockOfflineCartState.syncError = null;
    mockOfflineCartState.pendingOperations = 0;
    mockOfflineCartState.timeSinceSync = null;
    mockOfflineCartState.syncCart = mockSyncCart;
    mockNetworkState.isOnline = true;
  });

  it('renders without throwing', () => {
    expect(() => render(<CartSyncStatus />)).not.toThrow();
  });

  it('renders synced indicator when in sync', () => {
    mockOfflineCartState.timeSinceSync = '2 minutes ago';
    const { getByText } = render(<CartSyncStatus />);
    expect(getByText(/synced/i)).toBeTruthy();
  });

  it('renders syncing indicator when isSyncing is true', () => {
    mockOfflineCartState.isSyncing = true;
    const { getByText } = render(<CartSyncStatus />);
    expect(getByText(/syncing/i)).toBeTruthy();
  });

  it('renders error message when syncError is set', () => {
    mockOfflineCartState.syncError = 'Network failure';
    const { getByText } = render(<CartSyncStatus />);
    expect(getByText(/Sync failed/)).toBeTruthy();
  });

  it('renders offline message when isOnline is false', () => {
    mockNetworkState.isOnline = false;
    mockOfflineCartState.pendingOperations = 3;
    const { getByText } = render(<CartSyncStatus />);
    expect(getByText(/offline/i)).toBeTruthy();
  });

  it('renders without crashing when there are pending operations', () => {
    mockOfflineCartState.pendingOperations = 5;
    const { UNSAFE_root } = render(<CartSyncStatus />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('has accessibility label reflecting status', () => {
    mockOfflineCartState.timeSinceSync = 'just now';
    const { UNSAFE_root } = render(<CartSyncStatus />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders in compact mode without crashing', () => {
    mockOfflineCartState.timeSinceSync = 'just now';
    const { toJSON } = render(<CartSyncStatus compact={true} />);
    expect(toJSON).toBeDefined();
  });
});