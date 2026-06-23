/**
 * useResponsiveGrid Hook
 *
 * Calculates optimal grid configuration based on screen width.
 * Provides number of columns, card width, and gap spacing for responsive layouts.
 */

import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { LAYOUT } from '@/constants/DesignTokens';

interface GridConfig {
  /**
   * Number of columns to display
   */
  numColumns: number;

  /**
   * Calculated width for each card/item
   */
  cardWidth: number;

  /**
   * Gap spacing between items
   */
  gap: number;
}

/**
 * Hook to calculate responsive grid layout based on screen width
 *
 * @param minCardWidth - Minimum width for each card (default: 150)
 * @param gap - Gap between cards (default: 16)
 * @returns Grid configuration object
 *
 * @example
 * const { numColumns, cardWidth, gap } = useResponsiveGrid(150, 16);
 *
 * <FlatList
 *   data={products}
 *   numColumns={numColumns}
 *   renderItem={({ item }) => (
 *     <ProductCard product={item} width={cardWidth} />
 *   )}
 * />
 */
export function useResponsiveGrid(
  minCardWidth: number = 150,
  gap: number = 16
): GridConfig {
  const [config, setConfig] = useState<GridConfig>({
    numColumns: 2,
    cardWidth: 0,
    gap,
  });

  useEffect(() => {
    const updateGrid = () => {
      const screenWidth = Dimensions.get('window').width;

      // Calculate number of columns based on screen width and breakpoints
      let numColumns = 2; // Default for mobile

      if (screenWidth >= LAYOUT.breakpoints.xxl) {
        numColumns = 4;
      } else if (screenWidth >= LAYOUT.breakpoints.xl) {
        numColumns = 4;
      } else if (screenWidth >= LAYOUT.breakpoints.lg) {
        numColumns = 3;
      } else if (screenWidth >= LAYOUT.breakpoints.md) {
        numColumns = 3;
      } else if (screenWidth >= LAYOUT.breakpoints.sm) {
        numColumns = 2;
      } else {
        numColumns = 2;
      }

      // Ensure we don't exceed the maximum number of columns that fit
      // based on minCardWidth
      const maxColumnsByWidth = Math.floor(screenWidth / (minCardWidth + gap));
      numColumns = Math.min(numColumns, Math.max(1, maxColumnsByWidth));

      // Calculate card width based on screen width, columns, and gaps
      const totalGap = gap * (numColumns + 1);
      const availableWidth = screenWidth - totalGap;
      const cardWidth = availableWidth / numColumns;

      setConfig({ numColumns, cardWidth, gap });
    };

    // Calculate initial grid
    updateGrid();

    // Listen for dimension changes (screen rotation, window resize)
    const subscription = Dimensions.addEventListener('change', updateGrid);

    return () => {
      subscription?.remove();
    };
  }, [gap, minCardWidth]);

  return config;
}

/**
 * Hook variant with explicit column counts per breakpoint
 *
 * @param columnConfig - Object mapping breakpoints to column counts
 * @param gap - Gap between cards (default: 16)
 * @returns Grid configuration object
 *
 * @example
 * const { numColumns, cardWidth } = useResponsiveGridCustom({
 *   xs: 1,
 *   sm: 2,
 *   md: 3,
 *   lg: 4,
 *   xl: 4,
 * });
 */
export function useResponsiveGridCustom(
  columnConfig: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  } = {},
  gap: number = 16
): GridConfig {
  const [config, setConfig] = useState<GridConfig>({
    numColumns: 2,
    cardWidth: 0,
    gap,
  });

  useEffect(() => {
    const updateGrid = () => {
      const screenWidth = Dimensions.get('window').width;

      // Default column configuration
      const defaults = {
        xs: 1,
        sm: 2,
        md: 3,
        lg: 4,
        xl: 4,
        xxl: 4,
      };

      const config = { ...defaults, ...columnConfig };

      // Determine number of columns based on screen width
      let numColumns = config.xs;

      if (screenWidth >= LAYOUT.breakpoints.xxl) {
        numColumns = config.xxl;
      } else if (screenWidth >= LAYOUT.breakpoints.xl) {
        numColumns = config.xl;
      } else if (screenWidth >= LAYOUT.breakpoints.lg) {
        numColumns = config.lg;
      } else if (screenWidth >= LAYOUT.breakpoints.md) {
        numColumns = config.md;
      } else if (screenWidth >= LAYOUT.breakpoints.sm) {
        numColumns = config.sm;
      } else {
        numColumns = config.xs;
      }

      // Calculate card width
      const totalGap = gap * (numColumns + 1);
      const availableWidth = screenWidth - totalGap;
      const cardWidth = availableWidth / numColumns;

      setConfig({ numColumns, cardWidth, gap });
    };

    updateGrid();

    const subscription = Dimensions.addEventListener('change', updateGrid);

    return () => {
      subscription?.remove();
    };
  }, [gap, JSON.stringify(columnConfig)]);

  return config;
}

export default useResponsiveGrid;
