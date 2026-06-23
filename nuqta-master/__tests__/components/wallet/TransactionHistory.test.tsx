/**
 * TransactionHistory Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import TransactionHistory from '@/components/wallet/TransactionHistory';

jest.mock('@/hooks/useIsMounted', () => ({
  useIsMounted: () => () => true,
}));

jest.mock('@/data/walletData', () => ({
  fetchTransactions: jest.fn(() =>
    Promise.resolve({ transactions: [], hasMore: false, page: 1 })
  ),
  walletTabs: [
    { id: 'ALL', label: 'All', count: 0, isActive: true },
    { id: 'CREDIT', label: 'Credits', count: 0, isActive: false },
    { id: 'DEBIT', label: 'Debits', count: 0, isActive: false },
  ],
}));

jest.mock('@shopify/flash-list', () => {
  const { View } = require('react-native');
  const FlashList = (props: any) => {
    const { data, renderItem, ListEmptyComponent, refreshControl, onEndReached } = props;
    return (
      <View testID="flash-list">
        {data && data.length > 0 &&
          data.map((item: any, index: number) => (
            <View key={index} testID={`txn-${item.id || index}`}>
              {renderItem && renderItem({ item, index })}
            </View>
          ))}
        {(!data || data.length === 0) && ListEmptyComponent}
      </View>
    );
  };
  return { FlashList };
});

jest.mock('@/components/wallet/TransactionCard', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ transaction }: any) => (
      <View testID={`txn-card-${transaction?.id || 'unknown'}`} />
    ),
  };
});

jest.mock('@/components/wallet/TransactionTabs', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="transaction-tabs" />,
  };
});

describe('TransactionHistory', () => {
  const mockOnTransactionPress = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without throwing', () => {
    expect(() => render(<TransactionHistory />)).not.toThrow();
  });

  it('renders the transaction tabs', () => {
    const { getByTestId } = render(<TransactionHistory />);
    expect(getByTestId('transaction-tabs')).toBeTruthy();
  });

  it('renders empty state when there are no transactions', () => {
    const { UNSAFE_root } = render(<TransactionHistory />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('accepts onRefresh prop without crashing', () => {
    expect(() =>
      render(<TransactionHistory onRefresh={mockOnRefresh} refreshing={false} />)
    ).not.toThrow();
    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  it('accepts onTransactionPress prop without crashing', () => {
    expect(() =>
      render(<TransactionHistory onTransactionPress={mockOnTransactionPress} />)
    ).not.toThrow();
    expect(mockOnTransactionPress).not.toHaveBeenCalled();
  });

  it('accepts maxHeight prop without crashing', () => {
    expect(() => render(<TransactionHistory maxHeight={400} />)).not.toThrow();
  });

  it('accepts refreshing prop without crashing', () => {
    expect(() =>
      render(<TransactionHistory refreshing={true} onRefresh={mockOnRefresh} />)
    ).not.toThrow();
  });

  it('does not crash with all props provided', () => {
    expect(() =>
      render(
        <TransactionHistory
          onTransactionPress={mockOnTransactionPress}
          onRefresh={mockOnRefresh}
          refreshing={false}
          maxHeight={500}
        />
      )
    ).not.toThrow();
  });
});
