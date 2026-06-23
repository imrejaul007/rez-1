/**
 * FilterPanel Component
 *
 * Filter modal with category chips, sort options, price range, availability filter,
 * and active filter tags display bar.
 * Used in the StoreProductsPage for product filtering functionality.
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import analyticsService from '@/services/analyticsService';
import type { SortOption, AvailabilityFilter, CategoryItem } from '@/hooks/useStoreProductsPage';

// ─── Props ───────────────────────────────────────────────────────────────────

interface FilterPanelProps {
  storeId: string;
  visible: boolean;
  onClose: () => void;

  // Categories
  categories: CategoryItem[];
  loadingCategories: boolean;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;

  // Sort
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;

  // Price range
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (price: string) => void;
  onMaxPriceChange: (price: string) => void;
  currencySymbol: string;

  // Availability
  availabilityFilter: AvailabilityFilter;
  onAvailabilityChange: (filter: AvailabilityFilter) => void;
}

// ─── Active Filters Bar ─────────────────────────────────────────────────────

interface ActiveFiltersBarProps {
  selectedCategory: string | null;
  categories: CategoryItem[];
  sortBy: SortOption;
  availabilityFilter: AvailabilityFilter;
  minPrice: string;
  maxPrice: string;
  currencySymbol: string;
  onClearCategory: () => void;
  onClearSort: () => void;
  onClearAvailability: () => void;
  onClearPrice: () => void;
  onClearAll: () => void;
}

export const ActiveFiltersBar = React.memo(function ActiveFiltersBar({
  selectedCategory,
  categories,
  sortBy,
  availabilityFilter,
  minPrice,
  maxPrice,
  currencySymbol,
  onClearCategory,
  onClearSort,
  onClearAvailability,
  onClearPrice,
  onClearAll,
}: ActiveFiltersBarProps) {
  const hasActiveFilters = !!(
    selectedCategory ||
    sortBy !== 'newest' ||
    availabilityFilter !== 'all' ||
    minPrice ||
    maxPrice
  );

  if (!hasActiveFilters) return null;

  return (
    <View style={styles.activeFiltersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFilters}>
        {selectedCategory && (
          <View style={styles.activeFilterTag}>
            <ThemedText style={styles.activeFilterText}>
              {categories.find(c => c.id === selectedCategory)?.name || 'Category'}
            </ThemedText>
            <Pressable onPress={onClearCategory}>
              <Ionicons name="close" size={16} color={Colors.text.tertiary} />
            </Pressable>
          </View>
        )}
        {sortBy !== 'newest' && (
          <View style={styles.activeFilterTag}>
            <ThemedText style={styles.activeFilterText}>
              Sort: {sortBy.replace('_', ' ')}
            </ThemedText>
            <Pressable onPress={onClearSort}>
              <Ionicons name="close" size={16} color={Colors.text.tertiary} />
            </Pressable>
          </View>
        )}
        {availabilityFilter !== 'all' && (
          <View style={styles.activeFilterTag}>
            <ThemedText style={styles.activeFilterText}>
              {availabilityFilter === 'in_stock' ? 'In Stock' : 'Out of Stock'}
            </ThemedText>
            <Pressable onPress={onClearAvailability}>
              <Ionicons name="close" size={16} color={Colors.text.tertiary} />
            </Pressable>
          </View>
        )}
        {(minPrice || maxPrice) && (
          <View style={styles.activeFilterTag}>
            <ThemedText style={styles.activeFilterText}>
              {currencySymbol}{minPrice || '0'} - {currencySymbol}{maxPrice || '\u221E'}
            </ThemedText>
            <Pressable onPress={onClearPrice}>
              <Ionicons name="close" size={16} color={Colors.text.tertiary} />
            </Pressable>
          </View>
        )}
        <Pressable style={styles.clearAllButton} onPress={onClearAll}>
          <ThemedText style={styles.clearAllText}>Clear All</ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
});

// ─── Sort label helper ──────────────────────────────────────────────────────

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest First',
  price_low: 'Price: Low to High',
  price_high: 'Price: High to Low',
  rating: 'Highest Rated',
  popular: 'Most Popular',
};

const AVAILABILITY_LABELS: Record<AvailabilityFilter, string> = {
  all: 'All Products',
  in_stock: 'In Stock Only',
  out_of_stock: 'Out of Stock',
};

// ─── Component ──────────────────────────────────────────────────────────────

function FilterPanel({
  storeId,
  visible,
  onClose,
  categories,
  loadingCategories,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  currencySymbol,
  availabilityFilter,
  onAvailabilityChange,
}: FilterPanelProps) {
  const handleClose = useCallback(() => {
    onClose();
    analyticsService.track('filter_modal_closed', { storeId });
  }, [onClose, storeId]);

  const handleApply = useCallback(() => {
    onClose();
    analyticsService.track('filters_applied', {
      storeId,
      category: selectedCategory,
      sortBy,
      availabilityFilter,
      hasPriceFilter: !!(minPrice || maxPrice),
    });
  }, [onClose, storeId, selectedCategory, sortBy, availabilityFilter, minPrice, maxPrice]);

  const sanitizePrice = useCallback((text: string) => {
    return text.replace(/[^0-9]/g, '').slice(0, 10);
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Filters</ThemedText>
            <Pressable
              onPress={handleClose}
              accessible={true}
              accessibilityLabel="Close filters"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Category Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterSectionTitle}>Category</ThemedText>
              {loadingCategories ? (
                <ActivityIndicator size="small" color={Colors.nileBlue} />
              ) : (
                <View style={styles.categoryGrid}>
                  <Pressable
                    style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
                    onPress={() => onCategoryChange(null)}
                  >
                    <ThemedText style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                      All
                    </ThemedText>
                  </Pressable>
                  {categories.map((category) => (
                    <Pressable
                      key={category.id}
                      style={[styles.categoryChip, selectedCategory === category.id && styles.categoryChipActive]}
                      onPress={() => onCategoryChange(category.id)}
                    >
                      <ThemedText style={[styles.categoryChipText, selectedCategory === category.id && styles.categoryChipTextActive]}>
                        {category.name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Sort Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterSectionTitle}>Sort By</ThemedText>
              {(['newest', 'price_low', 'price_high', 'rating', 'popular'] as const).map((sort) => (
                <Pressable
                  key={sort}
                  style={[styles.sortOption, sortBy === sort && styles.sortOptionActive]}
                  onPress={() => onSortChange(sort)}
                >
                  <ThemedText style={[styles.sortOptionText, sortBy === sort && styles.sortOptionTextActive]}>
                    {SORT_LABELS[sort]}
                  </ThemedText>
                  {sortBy === sort && (
                    <Ionicons name="checkmark" size={20} color={Colors.nileBlue} />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Price Range Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterSectionTitle}>Price Range</ThemedText>
              <View style={styles.priceRangeContainer}>
                <View style={styles.priceInputContainer}>
                  <ThemedText style={styles.priceLabel}>Min ({currencySymbol})</ThemedText>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    value={minPrice}
                    onChangeText={(text) => onMinPriceChange(sanitizePrice(text))}
                    keyboardType="numeric"
                    accessible={true}
                    accessibilityLabel="Minimum price filter"
                    accessibilityHint="Enter minimum price in rupees"
                  />
                </View>
                <View style={styles.priceInputContainer}>
                  <ThemedText style={styles.priceLabel}>Max ({currencySymbol})</ThemedText>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="\u221E"
                    value={maxPrice}
                    onChangeText={(text) => onMaxPriceChange(sanitizePrice(text))}
                    keyboardType="numeric"
                    accessible={true}
                    accessibilityLabel="Maximum price filter"
                    accessibilityHint="Enter maximum price in rupees"
                  />
                </View>
              </View>
            </View>

            {/* Availability Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterSectionTitle}>Availability</ThemedText>
              {(['all', 'in_stock', 'out_of_stock'] as const).map((availability) => (
                <Pressable
                  key={availability}
                  style={[styles.sortOption, availabilityFilter === availability && styles.sortOptionActive]}
                  onPress={() => onAvailabilityChange(availability)}
                >
                  <ThemedText style={[styles.sortOptionText, availabilityFilter === availability && styles.sortOptionTextActive]}>
                    {AVAILABILITY_LABELS[availability]}
                  </ThemedText>
                  {availabilityFilter === availability && (
                    <Ionicons name="checkmark" size={20} color={Colors.nileBlue} />
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              style={styles.applyButton}
              onPress={handleApply}
              accessible={true}
              accessibilityLabel="Apply filters"
              accessibilityRole="button"
              accessibilityHint="Apply the selected filters to the product list"
            >
              <ThemedText style={styles.applyButtonText}>Apply Filters</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Active filters bar
  activeFiltersContainer: {
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    paddingVertical: Spacing.sm,
  },
  activeFilters: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 6,
  },
  activeFilterText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  clearAllButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  clearAllText: {
    ...Typography.body,
    color: Colors.nileBlue,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.base,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  filterSection: {
    marginBottom: Spacing.xl,
  },
  filterSectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  categoryChipActive: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
  },
  categoryChipText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: Colors.text.inverse,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  sortOptionActive: {
    backgroundColor: colors.tint.pink,
    borderColor: Colors.nileBlue,
  },
  sortOptionText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: Colors.nileBlue,
    fontWeight: '600',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
    fontWeight: '500',
  },
  priceInput: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
  },
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  applyButton: {
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default React.memo(FilterPanel);
