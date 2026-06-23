import React from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { GoingOutFilters } from '@/types/going-out.types';
import { colors } from '@/constants/theme';

interface FilterChip {
  id: string;
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
}

interface FilterChipsProps {
  filters: GoingOutFilters;
  onFilterChange: (filters: GoingOutFilters) => void;
  activeFilters: string[];
}

function _FilterChipsInner({
  filters,
  onFilterChange,
  activeFilters,
}: FilterChipsProps) {
  
  const handleHighCashbackToggle = () => {
    const newFilters = { ...filters };
    if (newFilters.cashbackRange.min >= 10) {
      newFilters.cashbackRange = { min: 0, max: 100 };
    } else {
      newFilters.cashbackRange = { min: 10, max: 100 };
    }
    onFilterChange(newFilters);
  };

  const handleRatingsToggle = () => {
    const newFilters = { ...filters };
    if (newFilters.ratings.includes(4)) {
      newFilters.ratings = newFilters.ratings.filter(r => r !== 4);
    } else {
      newFilters.ratings = [...newFilters.ratings, 4];
    }
    onFilterChange(newFilters);
  };

  const handleInStockToggle = () => {
    const newFilters = { ...filters };
    if (newFilters.availability.includes('in_stock')) {
      newFilters.availability = newFilters.availability.filter(a => a !== 'in_stock');
    } else {
      newFilters.availability = [...newFilters.availability, 'in_stock'];
    }
    onFilterChange(newFilters);
  };

  const filterChips: FilterChip[] = [
    {
      id: 'high_cashback',
      label: 'High Cashback',
      icon: 'wallet-outline',
      isActive: filters.cashbackRange.min >= 10,
      onPress: handleHighCashbackToggle,
    },
    {
      id: 'ratings',
      label: 'Top Rated',
      icon: 'star-outline',
      isActive: filters.ratings.includes(4),
      onPress: handleRatingsToggle,
    },
    {
      id: 'in_stock',
      label: 'In Stock',
      icon: 'checkmark-circle-outline',
      isActive: filters.availability.includes('in_stock'),
      onPress: handleInStockToggle,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {filterChips.map((chip) => (
          <Pressable
            key={chip.id}
            style={[
              styles.filterChip,
              chip.isActive && styles.filterChipActive,
            ]}
            onPress={chip.onPress}
           
            accessibilityRole="button"
            accessibilityLabel={`${chip.label} filter`}
            accessibilityHint={chip.isActive ? 'Double tap to remove filter' : 'Double tap to apply filter'}
            accessibilityState={{ selected: chip.isActive }}
          >
            <View style={styles.chipContent}>
              <Ionicons
                name={chip.icon as any}
                size={18}
                color={chip.isActive ? colors.background.primary : colors.neutral[500]}
                style={styles.chipIcon}
              />
              <ThemedText style={[
                styles.chipText,
                chip.isActive && styles.chipTextActive,
              ]}>
                {chip.label}
              </ThemedText>
              
              {chip.isActive && (
                <View style={styles.activeIndicator}>
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={colors.background.primary}
                  />
                </View>
              )}
            </View>
          </Pressable>
        ))}
        
        {/* Clear All Filters Button */}
        {activeFilters.length > 0 && (
          <Pressable
            style={styles.clearAllButton}
            onPress={() => onFilterChange({
              priceRange: { min: 0, max: Infinity },
              cashbackRange: { min: 0, max: 100 },
              brands: [],
              ratings: [],
              availability: [],
            })}
           
            accessibilityLabel={`Clear all ${activeFilters.length} active filters`}
            accessibilityRole="button"
            accessibilityHint="Double tap to remove all active filters"
          >
            <Ionicons
              name="close-circle-outline"
              size={16}
              color={colors.error}
              style={styles.chipIcon}
            />
            <ThemedText style={styles.clearAllText}>
              Clear All
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: colors.tint.coolGray,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    minWidth: 100,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  filterChipActive: {
    backgroundColor: colors.brand.purpleLight,
    borderColor: colors.brand.purpleLight,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purpleLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 8px rgba(139, 92, 246, 0.25)',
      },
    }),
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipIcon: {
    marginRight: 0,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
    letterSpacing: 0.2,
  },
  chipTextActive: {
    color: colors.background.primary,
    fontWeight: '700',
  },
  activeIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.errorScale[50],
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.error,
  },
});

export const FilterChips = React.memo(_FilterChipsInner);
