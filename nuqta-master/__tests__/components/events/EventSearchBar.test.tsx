/**
 * EventSearchBar Component Tests
 *
 * Tests for the event search bar component.
 */

// Mock reanimated — its types use global-augmentation patterns (e.g. `global.__sensorContainer`)
// that ts-jest cannot resolve during transform, and its `useAnimatedStyle`/`useSharedValue`
// hooks need to be stubbed for the component to render in a Node test environment.
jest.mock('react-native-reanimated', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (C: any) => C },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (v: any) => v,
    interpolateColor: () => '#000000',
  };
});

// Predictable theme values so the component renders consistently under tests.
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: (_props: any, colorName: string) => {
    if (colorName === 'text') return '#000000';
    if (colorName === 'background') return '#FFFFFF';
    if (colorName === 'tint') return '#3B82F6';
    if (colorName === 'border') return '#E5E7EB';
    return '#999999';
  },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EventSearchBar from '@/components/events/EventSearchBar';

describe('EventSearchBar', () => {
  const mockOnSearchChange = jest.fn();
  const mockOnSearchSubmit = jest.fn();
  const mockOnClearSearch = jest.fn();

  const defaultProps = {
    searchQuery: '',
    onSearchChange: mockOnSearchChange,
    onSearchSubmit: mockOnSearchSubmit,
    onClearSearch: mockOnClearSearch,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without throwing', () => {
    const { getByPlaceholderText } = render(<EventSearchBar {...defaultProps} />);
    expect(getByPlaceholderText('Search events...')).toBeTruthy();
  });

  it('renders TextInput with the provided placeholder', () => {
    const customPlaceholder = 'Find concerts near you';
    const { getByPlaceholderText } = render(
      <EventSearchBar {...defaultProps} placeholder={customPlaceholder} />
    );

    const input = getByPlaceholderText(customPlaceholder);
    expect(input).toBeTruthy();
    expect(input.props.placeholder).toBe(customPlaceholder);
  });

  it('updates value through onSearchChange when user types', () => {
    const { getByPlaceholderText } = render(<EventSearchBar {...defaultProps} />);

    const input = getByPlaceholderText('Search events...');
    fireEvent.changeText(input, 'jazz festival');

    expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
    expect(mockOnSearchChange).toHaveBeenCalledWith('jazz festival');
  });

  it('calls onSearchChange with the current text on every keystroke', () => {
    const { getByPlaceholderText, rerender } = render(
      <EventSearchBar {...defaultProps} />
    );

    const input = getByPlaceholderText('Search events...');
    fireEvent.changeText(input, 'j');
    fireEvent.changeText(input, 'ja');
    fireEvent.changeText(input, 'jaz');

    expect(mockOnSearchChange).toHaveBeenCalledTimes(3);
    expect(mockOnSearchChange).toHaveBeenNthCalledWith(1, 'j');
    expect(mockOnSearchChange).toHaveBeenNthCalledWith(2, 'ja');
    expect(mockOnSearchChange).toHaveBeenNthCalledWith(3, 'jaz');

    // Reflect the latest prop into the controlled input
    rerender(<EventSearchBar {...defaultProps} searchQuery="jaz" />);
    expect(input.props.value).toBe('jaz');
  });

  it('shows the clear button only when there is text and calls onClearSearch when pressed', () => {
    const { queryByLabelText, getByLabelText, rerender } = render(
      <EventSearchBar {...defaultProps} searchQuery="" />
    );

    // No clear button when query is empty
    expect(queryByLabelText('Clear search')).toBeNull();

    // With text, clear button appears
    rerender(<EventSearchBar {...defaultProps} searchQuery="music" />);

    const clearButton = getByLabelText('Clear search');
    expect(clearButton).toBeTruthy();
    fireEvent.press(clearButton);

    expect(mockOnClearSearch).toHaveBeenCalledTimes(1);
  });

  it('hides the clear button while loading even if there is text', () => {
    const { queryByLabelText } = render(
      <EventSearchBar {...defaultProps} searchQuery="music" loading />
    );

    expect(queryByLabelText('Clear search')).toBeNull();
  });

  it('submits the current query when the search key is pressed', () => {
    const { getByPlaceholderText } = render(
      <EventSearchBar {...defaultProps} searchQuery="live shows" />
    );

    const input = getByPlaceholderText('Search events...');
    fireEvent(input, 'submitEditing');

    expect(mockOnSearchSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSearchSubmit).toHaveBeenCalledWith('live shows');
  });

  it('exposes the search accessibility label on the input', () => {
    const { getByLabelText } = render(<EventSearchBar {...defaultProps} />);

    const input = getByLabelText('Search events');
    expect(input).toBeTruthy();
    expect(input.props.returnKeyType).toBe('search');
  });
});
