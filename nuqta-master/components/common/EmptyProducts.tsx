/**
 * EmptyProducts Component
 *
 * Specialized empty state for when no products are found.
 * Provides context-aware messaging based on whether filters are active.
 */

import React from 'react';
import EmptyState from './EmptyState';

interface EmptyProductsProps {
  /**
   * Whether filters are currently active
   */
  hasFilters?: boolean;

  /**
   * Callback to clear all filters
   */
  onClearFilters?: () => void;

  /**
   * Custom container style
   */
  style?: any;
}

/**
 * EmptyProducts shows a helpful message when no products match the criteria
 *
 * @example
 * <EmptyProducts
 *   hasFilters={true}
 *   onClearFilters={clearAllFilters}
 * />
 */
function EmptyProducts({
  onClearFilters,
  hasFilters = false,
  style,
}: EmptyProductsProps) {
  return (
    <EmptyState
      icon="🔍"
      title="No Products Found"
      message={
        hasFilters
          ? "We couldn't find any products matching your filters. Try adjusting them."
          : "This store doesn't have any products yet. Check back soon!"
      }
      actionLabel={hasFilters ? 'Clear Filters' : undefined}
      onAction={onClearFilters}
      style={style}
    />
  );
}

export default React.memo(EmptyProducts);
