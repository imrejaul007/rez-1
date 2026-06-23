/**
 * TransactionTabs Component Tests
 *
 * Verifies rendering, active tab selection, tab switching,
 * badge count rendering, and tab list filtering.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TransactionTabs from '@/components/wallet/TransactionTabs';
import type { WalletTab } from '@/types/wallet.types';

describe('TransactionTabs', () => {
  const mockOnTabPress = jest.fn();

  const buildTabs = (overrides: Partial<WalletTab>[] = []): WalletTab[] => {
    const defaults: WalletTab[] = [
      { id: 'ALL', title: 'All', isActive: true, count: 12 },
      { id: 'HOME_DELIVERY', title: 'Home Delivery', isActive: false, count: 4 },
      { id: 'VOUCHER', title: 'Voucher', isActive: false, count: 0 },
      { id: 'NUQTA_PAY', title: 'Nuqta Pay', isActive: false, count: 7 },
    ];
    return defaults.map((tab, idx) => ({ ...tab, ...(overrides[idx] || {}) }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without throwing', () => {
    const { getByLabelText } = render(
      <TransactionTabs
        tabs={buildTabs()}
        activeTab="ALL"
        onTabPress={mockOnTabPress}
      />
    );

    expect(getByLabelText('All tab')).toBeTruthy();
    expect(getByLabelText('Home Delivery tab')).toBeTruthy();
    expect(getByLabelText('Voucher tab')).toBeTruthy();
    expect(getByLabelText('Nuqta Pay tab')).toBeTruthy();
  });

  it('marks the tab matching the initial activeTab prop as selected', () => {
    const { getByLabelText } = render(
      <TransactionTabs
        tabs={buildTabs()}
        activeTab="HOME_DELIVERY"
        onTabPress={mockOnTabPress}
      />
    );

    const allTab = getByLabelText('All tab');
    const homeTab = getByLabelText('Home Delivery tab');

    expect(allTab.props.accessibilityState.selected).toBe(false);
    expect(homeTab.props.accessibilityState.selected).toBe(true);
  });

  it('switches the active tab on press and fires onTabPress with the tab id', () => {
    const { getByLabelText } = render(
      <TransactionTabs
        tabs={buildTabs()}
        activeTab="ALL"
        onTabPress={mockOnTabPress}
      />
    );

    fireEvent.press(getByLabelText('Nuqta Pay tab'));

    expect(mockOnTabPress).toHaveBeenCalledTimes(1);
    expect(mockOnTabPress).toHaveBeenCalledWith('NUQTA_PAY');
  });

  it('updates selected state when activeTab prop changes', () => {
    const { getByLabelText, rerender } = render(
      <TransactionTabs
        tabs={buildTabs()}
        activeTab="ALL"
        onTabPress={mockOnTabPress}
      />
    );

    expect(getByLabelText('All tab').props.accessibilityState.selected).toBe(true);

    rerender(
      <TransactionTabs
        tabs={buildTabs()}
        activeTab="VOUCHER"
        onTabPress={mockOnTabPress}
      />
    );

    expect(getByLabelText('All tab').props.accessibilityState.selected).toBe(false);
    expect(getByLabelText('Voucher tab').props.accessibilityState.selected).toBe(true);
  });

  it('renders the badge count for each tab that provides one', () => {
    const tabs = buildTabs();

    const { getByText, queryByText } = render(
      <TransactionTabs
        tabs={tabs}
        activeTab="ALL"
        onTabPress={mockOnTabPress}
      />
    );

    expect(getByText('12')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
    // Voucher has count: 0 -> component should not render the badge
    expect(queryByText('0')).toBeNull();
  });

  it('omits the badge entirely when count is undefined', () => {
    const tabs: WalletTab[] = [
      { id: 'ALL', title: 'All', isActive: true },
      { id: 'HOME_DELIVERY', title: 'Home Delivery', isActive: false, count: 3 },
    ];

    const { queryByText, getByText } = render(
      <TransactionTabs
        tabs={tabs}
        activeTab="ALL"
        onTabPress={mockOnTabPress}
      />
    );

    expect(queryByText('0')).toBeNull();
    expect(getByText('3')).toBeTruthy();
  });

  it('only renders tabs that are included in the tabs array', () => {
    const tabs: WalletTab[] = [
      { id: 'ALL', title: 'All', isActive: true, count: 5 },
      { id: 'VOUCHER', title: 'Voucher', isActive: false, count: 2 },
    ];

    const { getByLabelText, queryByLabelText, getByText, queryByText } = render(
      <TransactionTabs
        tabs={tabs}
        activeTab="ALL"
        onTabPress={mockOnTabPress}
      />
    );

    expect(getByLabelText('All tab')).toBeTruthy();
    expect(getByLabelText('Voucher tab')).toBeTruthy();

    expect(queryByLabelText('Home Delivery tab')).toBeNull();
    expect(queryByLabelText('Nuqta Pay tab')).toBeNull();
    expect(queryByText('4')).toBeNull();
    expect(queryByText('7')).toBeNull();
    expect(queryByText('12')).toBeNull();

    expect(getByText('5')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });

  it('renders an empty container when the tabs array is empty', () => {
    const { queryByLabelText } = render(
      <TransactionTabs
        tabs={[]}
        activeTab="ALL"
        onTabPress={mockOnTabPress}
      />
    );

    expect(queryByLabelText('All tab')).toBeNull();
  });
});