/**
 * QuickReorder Component Tests
 *
 * Tests for the homepage Quick Reorder widget.
 *
 * NOTE: The real component does not accept `orders`/`onReorder`/`isLoading` props
 * directly. It pulls state from `useFrequentlyOrdered(limit)`, the auth selector
 * and the currency selector. We mock those hooks/selectors to drive each test
 * scenario and verify the rendered output and user interactions.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';

// Mock the entire reorder hook module so the real implementation
// (which imports reorderApi → apiClient → Sentry) is never loaded.
jest.mock('@/hooks/useReorder', () => ({
  useFrequentlyOrdered: jest.fn(),
  useReorder: jest.fn(),
  useReorderSuggestions: jest.fn(),
}));
import * as reorderHook from '@/hooks/useReorder';

// Mock the entire selectors module — the real one pulls in many stores
// (auth/theme/gamification/subscription) that have unrelated TS errors and
// heavy module graphs. We only need `useIsAuthenticated` and
// `useGetCurrencySymbol` for this component.
jest.mock('@/stores/selectors', () => ({
  useIsAuthenticated: jest.fn(),
  useGetCurrencySymbol: jest.fn(),
  useUserId: jest.fn(),
  useRefreshCart: jest.fn(),
}));
import * as selectors from '@/stores/selectors';

// Mock expo-router (router.push is called when items are tapped / View All)
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
}));

// Mock FlashList so it just renders the provided data through the renderItem
// function (which is the easiest way to assert on what QuickReorder produces).
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  const FlashList = React.forwardRef((props: any, ref: any) => {
    const { data, renderItem, keyExtractor, ListEmptyComponent, horizontal } = props;
    if (!data || data.length === 0) {
      if (ListEmptyComponent) {
        return React.createElement(ListEmptyComponent);
      }
      return React.createElement(View, { ref });
    }
    return React.createElement(
      View,
      { ref, ...(horizontal ? { horizontal: true } : {}) },
      data.map((item: any, index: number) =>
        React.createElement(
          View,
          { key: keyExtractor ? keyExtractor(item, index) : index },
          renderItem({ item, index })
        )
      )
    );
  });
  FlashList.displayName = 'FlashListMock';
  return { FlashList };
});

// Mock CachedImage to a simple View
jest.mock('@/components/ui/CachedImage', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => React.createElement(View, props),
  };
});

// Import the component under test AFTER mocks are registered.
import QuickReorder from '@/components/home/QuickReorder';

const mockItems: any[] = [
  {
    productId: 'p1',
    storeId: 's1',
    productName: 'Organic Almond Butter',
    storeName: 'Fresh Mart',
    productImage: 'https://example.com/a.jpg',
    currentPrice: 12.5,
    orderCount: 3,
    isAvailable: true,
    lastOrderDate: '2026-06-10',
    averageQuantity: 1,
    totalSpent: 37.5,
  },
  {
    productId: 'p2',
    storeId: 's2',
    productName: 'Greek Yogurt 500g',
    storeName: 'Dairy Daily',
    productImage: 'https://example.com/b.jpg',
    currentPrice: 5.99,
    orderCount: 7,
    isAvailable: true,
    lastOrderDate: '2026-06-15',
    averageQuantity: 2,
    totalSpent: 41.93,
  },
  {
    productId: 'p3',
    storeId: 's1',
    productName: 'Whole Wheat Bread',
    storeName: 'Fresh Mart',
    productImage: 'https://example.com/c.jpg',
    currentPrice: 3.25,
    orderCount: 2,
    isAvailable: false,
    lastOrderDate: '2026-05-30',
    averageQuantity: 1,
    totalSpent: 6.5,
  },
];

describe('QuickReorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to authenticated + currency symbol available
    jest
      .spyOn(selectors, 'useIsAuthenticated')
      .mockReturnValue(true);
    jest
      .spyOn(selectors, 'useGetCurrencySymbol')
      .mockReturnValue(() => '$');
  });

  it('1. Renders without throwing', () => {
    jest.spyOn(reorderHook, 'useFrequentlyOrdered').mockReturnValue({
      items: [],
      loading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    expect(() => render(<QuickReorder />)).not.toThrow();
  });

  it('2. Renders list of recent orders from the items returned by the hook', () => {
    jest.spyOn(reorderHook, 'useFrequentlyOrdered').mockReturnValue({
      items: mockItems,
      loading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const { getByText } = render(<QuickReorder />);

    // Header copy confirms the widget is mounted
    expect(getByText('Quick Reorder')).toBeTruthy();
    // Each item's product name should be rendered
    expect(getByText('Organic Almond Butter')).toBeTruthy();
    expect(getByText('Greek Yogurt 500g')).toBeTruthy();
    expect(getByText('Whole Wheat Bread')).toBeTruthy();
  });

  it('3. Tapping an item triggers navigation (the reorder action for that item)', () => {
    const { router } = require('expo-router');
    jest.spyOn(reorderHook, 'useFrequentlyOrdered').mockReturnValue({
      items: mockItems,
      loading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const { getByText } = render(<QuickReorder />);

    fireEvent.press(getByText('Organic Almond Butter'));

    // The component pushes the product page route with the productId
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith(
      '/product-page?cardId=p1&cardType=product'
    );
  });

  it('4. Shows a loading indicator when useFrequentlyOrdered.loading=true', () => {
    jest.spyOn(reorderHook, 'useFrequentlyOrdered').mockReturnValue({
      items: [],
      loading: true,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const { UNSAFE_queryByType, queryByText } = render(<QuickReorder />);

    // ActivityIndicator from react-native is the visible "skeleton/spinner"
    expect(UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
    // The list of products must not be rendered while loading
    expect(queryByText('Organic Almond Butter')).toBeNull();
  });

  it('5. Renders nothing visible when items list is empty (per component contract)', () => {
    jest.spyOn(reorderHook, 'useFrequentlyOrdered').mockReturnValue({
      items: [],
      loading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const { toJSON } = render(<QuickReorder />);
    // The real component returns null when there is nothing to show.
    expect(toJSON()).toBeNull();
  });

  it('6. Renders order meta (store name, order count and price) for each item', () => {
    jest.spyOn(reorderHook, 'useFrequentlyOrdered').mockReturnValue({
      items: mockItems,
      loading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const { getByText, getAllByText } = render(<QuickReorder />);

    // Store names — "Fresh Mart" is shared by two items, so use getAllByText
    expect(getAllByText('Fresh Mart').length).toBe(2);
    expect(getByText('Dairy Daily')).toBeTruthy();

    // Order counts (component renders "Ordered Nx")
    expect(getByText('Ordered 3x')).toBeTruthy();
    expect(getByText('Ordered 7x')).toBeTruthy();
    expect(getByText('Ordered 2x')).toBeTruthy();

    // Prices — the component prepends the currency symbol returned by
    // useGetCurrencySymbol (mocked to '$' here).
    expect(getByText('$12.5')).toBeTruthy();
    expect(getByText('$5.99')).toBeTruthy();
    expect(getByText('$3.25')).toBeTruthy();
  });
});
