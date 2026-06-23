/**
 * EventFilters Component - Unit Tests
 *
 * Tests for the EventFilters modal component including:
 * - Basic rendering
 * - Filter chip rendering (categories, locations, price ranges, event types)
 * - Toggling filters
 * - "Clear all" / Reset affordance
 * - Active filter count display
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock the store selector for currency symbol
jest.mock('@/stores/selectors', () => ({
  useGetCurrencySymbol: () => () => '$',
}));

// Mock the theme hook to return predictable values
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: (_props: any, colorName: string) => {
    if (colorName === 'text') return '#000000';
    if (colorName === 'background') return '#FFFFFF';
    if (colorName === 'tint') return '#3B82F6';
    if (colorName === 'border') return '#E5E7EB';
    return '#000000';
  },
}));

import EventFilters from '@/components/events/EventFilters';
import { EventFilters as EventFiltersType } from '@/services/eventsApi';

describe('EventFilters', () => {
  const defaultProps = {
    filters: {} as EventFiltersType,
    onFiltersChange: jest.fn(),
    onResetFilters: jest.fn(),
    visible: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without throwing', () => {
    const { getByText } = render(<EventFilters {...defaultProps} />);
    // Header should be present
    expect(getByText('Filter Events')).toBeTruthy();
  });

  it('renders all filter chips from filters prop categories', () => {
    const { getByText, getAllByText } = render(<EventFilters {...defaultProps} />);

    // Category section
    expect(getByText('Category')).toBeTruthy();
    expect(getByText('Music')).toBeTruthy();
    expect(getByText('Technology')).toBeTruthy();
    expect(getByText('Wellness')).toBeTruthy();

    // "All" appears in both Category and Location sections
    expect(getAllByText('All').length).toBeGreaterThanOrEqual(2);

    // Location section
    expect(getByText('Location')).toBeTruthy();
    expect(getByText('Bangalore')).toBeTruthy();
    expect(getByText('Mumbai')).toBeTruthy();

    // "Online" appears in both Location and Event Type sections
    expect(getAllByText('Online').length).toBeGreaterThanOrEqual(2);

    // Price Range section
    expect(getByText('Price Range')).toBeTruthy();
    expect(getByText('Free')).toBeTruthy();

    // Event Type section
    expect(getByText('Event Type')).toBeTruthy();
    expect(getByText('All Events')).toBeTruthy();
    expect(getByText('Venue')).toBeTruthy();
  });

  it('toggles a category filter on press and updates local state', () => {
    const { getByText } = render(<EventFilters {...defaultProps} />);

    // Press a non-"All" category
    fireEvent.press(getByText('Music'));

    // Pressing doesn't immediately call onFiltersChange; user must press "Apply Filters"
    // But the apply button should now show the count
    const applyButton = getByText('Apply Filters (1)');
    expect(applyButton).toBeTruthy();
    expect(defaultProps.onFiltersChange).not.toHaveBeenCalled();
  });

  it('invokes onFiltersChange when Apply Filters is pressed', () => {
    const { getByText } = render(<EventFilters {...defaultProps} />);

    // Select a category
    fireEvent.press(getByText('Music'));
    // Apply
    fireEvent.press(getByText('Apply Filters (1)'));

    expect(defaultProps.onFiltersChange).toHaveBeenCalledTimes(1);
    expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Music' })
    );
  });

  it('renders Reset (clear all) affordance when any filter is active', () => {
    const { getByText } = render(<EventFilters {...defaultProps} />);

    // Reset button is always visible, but we verify the active state behavior
    // When no filter is active, the apply button does not show a count
    const applyText = getByText('Apply Filters');
    expect(applyText).toBeTruthy();

    // After selecting a category, Reset and count both surface
    fireEvent.press(getByText('Music'));
    expect(getByText('Reset')).toBeTruthy();
    expect(getByText('Apply Filters (1)')).toBeTruthy();
  });

  it('pressing Reset clears filters and fires onResetFilters and onClose', () => {
    const { getByText } = render(<EventFilters {...defaultProps} />);

    // Activate one filter
    fireEvent.press(getByText('Music'));
    expect(getByText('Apply Filters (1)')).toBeTruthy();

    // Press Reset
    fireEvent.press(getByText('Reset'));

    expect(defaultProps.onResetFilters).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalled();

    // Apply Filters should no longer show the count
    expect(getByText('Apply Filters')).toBeTruthy();
  });

  it('shows count of active filters in the apply button', () => {
    const { getByText, getAllByText } = render(<EventFilters {...defaultProps} />);

    // No active filters
    expect(getByText('Apply Filters')).toBeTruthy();

    // Activate a category
    fireEvent.press(getByText('Music'));
    expect(getByText('Apply Filters (1)')).toBeTruthy();

    // Activate a location too
    fireEvent.press(getByText('Bangalore'));
    expect(getByText('Apply Filters (2)')).toBeTruthy();

    // Activate an event type (Online appears in both Location and Event Type sections;
    // the Event Type one is the second occurrence)
    fireEvent.press(getAllByText('Online')[1]);
    expect(getByText('Apply Filters (3)')).toBeTruthy();
  });
});
