/**
 * CartSocketIntegration Component Tests
 *
 * Tests for the Socket.IO -> CartContext bridge that listens for
 * stock updates, out-of-stock events, and price changes.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

// =====================================================
// Mocks for the hooks the component depends on
// =====================================================

// Mock socket-context hooks: we keep "channel" objects that mirror the
// real shape (subscribe-functions return an unsubscribe function).
const stockUpdateHandlers: Array<(payload: any) => void> = [];
const outOfStockHandlers: Array<(payload: any) => void> = [];
const priceUpdateHandlers: Array<(payload: any) => void> = [];

const mockOnStockUpdate = jest.fn((cb: (payload: any) => void) => {
  stockUpdateHandlers.push(cb);
  return jest.fn(() => {
    const idx = stockUpdateHandlers.indexOf(cb);
    if (idx >= 0) stockUpdateHandlers.splice(idx, 1);
  });
});
const mockOnOutOfStock = jest.fn((cb: (payload: any) => void) => {
  outOfStockHandlers.push(cb);
  return jest.fn(() => {
    const idx = outOfStockHandlers.indexOf(cb);
    if (idx >= 0) outOfStockHandlers.splice(idx, 1);
  });
});
const mockOnPriceUpdate = jest.fn((cb: (payload: any) => void) => {
  priceUpdateHandlers.push(cb);
  return jest.fn(() => {
    const idx = priceUpdateHandlers.indexOf(cb);
    if (idx >= 0) priceUpdateHandlers.splice(idx, 1);
  });
});

jest.mock('@/contexts/SocketContext', () => ({
  useSocket: () => ({
    onStockUpdate: mockOnStockUpdate,
    onOutOfStock: mockOnOutOfStock,
    onPriceUpdate: mockOnPriceUpdate,
  }),
}));

// Mock utils the component imports
jest.mock('@/utils/platformAlert', () => ({
  platformAlertSimple: jest.fn(),
}));
jest.mock('@/utils/priceFormatter', () => ({
  formatPrice: jest.fn((amount: number) => `INR ${amount.toFixed(2)}`),
}));

// Mock cart store selectors with stateful cart state so we can verify re-renders.
const mockRemoveItem = jest.fn();
const mockUpdateQuantity = jest.fn();
const mockLoadCart = jest.fn();
const mockGetCurrencySymbol = jest.fn(() => 'INR ');

let mockCartState: { items: any[] } = { items: [] };

jest.mock('@/stores/selectors', () => ({
  useCartState: jest.fn(() => mockCartState),
  useCartActions: jest.fn(() => ({
    removeItem: mockRemoveItem,
    updateQuantity: mockUpdateQuantity,
    loadCart: mockLoadCart,
  })),
  useGetCurrencySymbol: jest.fn(() => mockGetCurrencySymbol),
}));

import CartSocketIntegration from '@/components/cart/CartSocketIntegration';

describe('CartSocketIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stockUpdateHandlers.length = 0;
    outOfStockHandlers.length = 0;
    priceUpdateHandlers.length = 0;
    mockCartState = { items: [] };
  });

  // ----------------------------------------------------------
  // 1. Renders without throwing
  // ----------------------------------------------------------
  it('renders without throwing', () => {
    expect(() => render(<CartSocketIntegration />)).not.toThrow();
  });

  // ----------------------------------------------------------
  // 2. Subscribes to socket events on mount
  // ----------------------------------------------------------
  it('subscribes to socket events on mount', () => {
    render(<CartSocketIntegration />);

    expect(mockOnStockUpdate).toHaveBeenCalledTimes(1);
    expect(mockOnOutOfStock).toHaveBeenCalledTimes(1);
    expect(mockOnPriceUpdate).toHaveBeenCalledTimes(1);
    // Each subscription registers a handler
    expect(stockUpdateHandlers.length).toBe(1);
    expect(outOfStockHandlers.length).toBe(1);
    expect(priceUpdateHandlers.length).toBe(1);
  });

  // ----------------------------------------------------------
  // 3. Unsubscribes on unmount
  // ----------------------------------------------------------
  it('unsubscribes from socket events on unmount', () => {
    const { unmount } = render(<CartSocketIntegration />);

    expect(stockUpdateHandlers.length).toBe(1);
    expect(outOfStockHandlers.length).toBe(1);
    expect(priceUpdateHandlers.length).toBe(1);

    unmount();

    // Each subscription returns an unsubscribe fn that removes its handler
    expect(stockUpdateHandlers.length).toBe(0);
    expect(outOfStockHandlers.length).toBe(0);
    expect(priceUpdateHandlers.length).toBe(0);
  });

  // ----------------------------------------------------------
  // 4. Re-renders cart state when socket emits updates
  //    (the effect re-runs because cartState.items changes)
  // ----------------------------------------------------------
  it('re-subscribes when cart items change (re-renders the effect)', () => {
    mockCartState = {
      items: [
        { id: 'item-1', productId: 'prod-1', name: 'Apple', quantity: 2 },
      ],
    };

    const { rerender } = render(<CartSocketIntegration />);

    expect(mockOnStockUpdate).toHaveBeenCalledTimes(1);
    expect(mockOnOutOfStock).toHaveBeenCalledTimes(1);
    expect(mockOnPriceUpdate).toHaveBeenCalledTimes(1);

    // Mutate items -> effect re-runs -> previous handlers are removed,
    // and new subscriptions are created.
    mockCartState = {
      items: [
        { id: 'item-1', productId: 'prod-1', name: 'Apple', quantity: 2 },
        { id: 'item-2', productId: 'prod-2', name: 'Banana', quantity: 1 },
      ],
    };

    rerender(<CartSocketIntegration />);

    expect(mockOnStockUpdate).toHaveBeenCalledTimes(2);
    expect(mockOnOutOfStock).toHaveBeenCalledTimes(2);
    expect(mockOnPriceUpdate).toHaveBeenCalledTimes(2);
  });

  // ----------------------------------------------------------
  // 5. Calls removeItem on out-of-stock event
  // ----------------------------------------------------------
  it('calls removeItem when an out-of-stock event fires for a cart item', () => {
    mockCartState = {
      items: [
        { id: 'item-1', productId: 'prod-1', name: 'Apple', quantity: 3 },
      ],
    };

    render(<CartSocketIntegration />);

    act(() => {
      outOfStockHandlers.forEach((h) =>
        h({ productId: 'prod-1', productName: 'Apple' })
      );
    });

    expect(mockRemoveItem).toHaveBeenCalledTimes(1);
    expect(mockRemoveItem).toHaveBeenCalledWith('item-1');
  });

  it('does not call removeItem when out-of-stock product is not in cart', () => {
    mockCartState = {
      items: [
        { id: 'item-1', productId: 'prod-1', name: 'Apple', quantity: 3 },
      ],
    };

    render(<CartSocketIntegration />);

    act(() => {
      outOfStockHandlers.forEach((h) =>
        h({ productId: 'prod-999', productName: 'Mystery' })
      );
    });

    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------
  // 6. Calls updateQuantity on stock update
  // ----------------------------------------------------------
  it('calls updateQuantity when available stock is below cart quantity', () => {
    mockCartState = {
      items: [
        { id: 'item-1', productId: 'prod-1', name: 'Apple', quantity: 5 },
      ],
    };

    render(<CartSocketIntegration />);

    act(() => {
      stockUpdateHandlers.forEach((h) =>
        h({ productId: 'prod-1', quantity: 2 })
      );
    });

    expect(mockUpdateQuantity).toHaveBeenCalledTimes(1);
    expect(mockUpdateQuantity).toHaveBeenCalledWith('item-1', 2);
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  it('calls removeItem on stock update when available quantity is zero', () => {
    mockCartState = {
      items: [
        { id: 'item-1', productId: 'prod-1', name: 'Apple', quantity: 5 },
      ],
    };

    render(<CartSocketIntegration />);

    act(() => {
      stockUpdateHandlers.forEach((h) =>
        h({ productId: 'prod-1', quantity: 0 })
      );
    });

    expect(mockRemoveItem).toHaveBeenCalledTimes(1);
    expect(mockRemoveItem).toHaveBeenCalledWith('item-1');
  });

  it('does not mutate cart when cart quantity is within stock', () => {
    mockCartState = {
      items: [
        { id: 'item-1', productId: 'prod-1', name: 'Apple', quantity: 1 },
      ],
    };

    render(<CartSocketIntegration />);

    act(() => {
      stockUpdateHandlers.forEach((h) =>
        h({ productId: 'prod-1', quantity: 10 })
      );
    });

    expect(mockUpdateQuantity).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------
  // 7. Calls loadCart on price update
  // ----------------------------------------------------------
  it('calls loadCart when a price update fires', () => {
    mockCartState = {
      items: [
        { id: 'item-1', productId: 'prod-1', name: 'Apple', quantity: 1 },
      ],
    };

    render(<CartSocketIntegration />);

    act(() => {
      priceUpdateHandlers.forEach((h) =>
        h({
          productId: 'prod-1',
          oldPrice: 100,
          newPrice: 120,
        })
      );
    });

    expect(mockLoadCart).toHaveBeenCalledTimes(1);
  });

  it('does not call loadCart when price update is for a non-cart item', () => {
    mockCartState = {
      items: [
        { id: 'item-1', productId: 'prod-1', name: 'Apple', quantity: 1 },
      ],
    };

    render(<CartSocketIntegration />);

    act(() => {
      priceUpdateHandlers.forEach((h) =>
        h({
          productId: 'prod-999',
          oldPrice: 100,
          newPrice: 120,
        })
      );
    });

    expect(mockLoadCart).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------
  // 8. Renders null (no visible output)
  // ----------------------------------------------------------
  it('renders nothing visible (toJSON returns null)', () => {
    const { toJSON } = render(<CartSocketIntegration />);
    expect(toJSON()).toBeNull();
  });
});
