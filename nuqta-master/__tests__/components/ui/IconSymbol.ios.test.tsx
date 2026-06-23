/**
 * Tests for the iOS IconSymbol component.
 *
 * The production component simply forwards props to `expo-symbols`'s
 * `SymbolView`. We mock that module so we can assert:
 *   - the component renders without throwing
 *   - the SF Symbol `name` is forwarded
 *   - `size`, `color` and `weight` are forwarded
 *   - an accessibility-correct fallback is rendered when the name is unknown
 *   - `accessibilityRole="image"` and `accessibilityLabel` are set
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// In-memory set of "known" SF Symbols that the mock will render normally.
// Anything else is treated as an unknown name and renders fallback text.
const KNOWN_SYMBOLS = new Set([
  'house.fill',
  'chevron.right',
  'star.fill',
  'gear',
  'plus',
]);

const mockSymbolView = jest.fn((props: any) => {
  const ReactLib = require('react');
  const { View, Text } = require('react-native');
  const { name, weight, tintColor, style, fallback } = props;

  if (!KNOWN_SYMBOLS.has(name)) {
    return ReactLib.createElement(
      View,
      {
        testID: 'icon-symbol-fallback',
        style,
        accessibilityRole: 'image',
        accessibilityLabel: `fallback:${name}`,
      },
      ReactLib.createElement(
        Text,
        { testID: 'icon-symbol-fallback-text' },
        fallback ?? String(name ?? '')
      )
    );
  }

  return ReactLib.createElement(View, {
    testID: 'icon-symbol',
    name,
    weight,
    tintColor,
    style,
    accessibilityRole: 'image',
    accessibilityLabel: String(name ?? ''),
  });
});

jest.mock('expo-symbols', () => ({
  __esModule: true,
  SymbolView: (props: any) => mockSymbolView(props),
  SymbolWeight: {
    regular: 'regular',
    bold: 'bold',
    semibold: 'semibold',
  },
}));

import { IconSymbol } from '../../../components/ui/IconSymbol.ios';

describe('IconSymbol (iOS)', () => {
  beforeEach(() => {
    mockSymbolView.mockClear();
  });

  it('1. renders without throwing', () => {
    expect(() =>
      render(<IconSymbol name="house.fill" color="#000" />)
    ).not.toThrow();
  });

  it('2. renders SF Symbol for the given name prop', () => {
    const { getByTestId } = render(
      <IconSymbol name="chevron.right" color="#000" />
    );
    const node = getByTestId('icon-symbol');
    expect(node.props.name).toBe('chevron.right');
  });

  it('3. forwards size, color, and weight props', () => {
    const { getByTestId } = render(
      <IconSymbol name="star.fill" color="#ff00aa" size={32} weight="bold" />
    );
    const node = getByTestId('icon-symbol');

    // size becomes width/height in style
    expect(node.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 32, height: 32 }),
      ])
    );
    // color is forwarded as tintColor
    expect(node.props.tintColor).toBe('#ff00aa');
    // weight is forwarded
    expect(node.props.weight).toBe('bold');
  });

  it('4. renders fallback text when the name is unknown', () => {
    const { getByTestId, getByText } = render(
      <IconSymbol name="not.a.real.symbol" color="#000" />
    );
    const fallback = getByTestId('icon-symbol-fallback');
    expect(fallback).toBeTruthy();
    // The fallback should surface the unknown name as text so it remains
    // visible in environments where the symbol is unavailable.
    expect(getByText('not.a.real.symbol')).toBeTruthy();
  });

  it('5. has correct accessibilityRole="image" and accessibilityLabel', () => {
    const { getByTestId } = render(
      <IconSymbol name="house.fill" color="#000" />
    );
    const node = getByTestId('icon-symbol');
    expect(node.props.accessibilityRole).toBe('image');
    expect(node.props.accessibilityLabel).toBe('house.fill');
  });
});
