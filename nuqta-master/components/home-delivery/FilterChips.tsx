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
import { FilterChipsProps } from '@/types/home-delivery.types';
import { colors } from '@/constants/theme';

// Nuqta Design System Colors
const COLORS = {
  primary: colors.nileBlue,
  primaryDark: colors.nileBlue,
  gold: colors.lightMustard,
  navy: colors.brand.navyDark,
  slate: '#1F2D3D',
  muted: colors.gray[400],
  surface: '#F7FAFC',
  error: colors.error,
  glassWhite: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.4)',
};

interface FilterChip {
  id: string;
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
}

function _FilterChipsInner({
  filters,
  onFilterChange,
  activeFilters,
}: FilterChipsProps) {
  
  const handleFreeShippingToggle = () => {
    const newFilters = { ...filters };
    if (newFilters.shipping.includes('free')) {
      newFilters.shipping = newFilters.shipping.filter(s => s !== 'free');
    } else {
      newFilters.shipping = [...newFilters.shipping, 'free'];
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

  const handleDeliveryTimeToggle = () => {
    const newFilters = { ...filters };
    if (newFilters.deliveryTime.includes('Under 30min')) {
      newFilters.deliveryTime = newFilters.deliveryTime.filter(d => d !== 'Under 30min');
    } else {
      newFilters.deliveryTime = [...newFilters.deliveryTime, 'Under 30min'];
    }
    onFilterChange(newFilters);
  };

  const filterChips: FilterChip[] = [
    {
      id: 'free_shipping',
      label: 'Free Shipping',
      icon: 'car-outline',
      isActive: filters.shipping.includes('free'),
      onPress: handleFreeShippingToggle,
    },
    {
      id: 'ratings',
      label: 'Ratings',
      icon: 'star-outline',
      isActive: filters.ratings.includes(4),
      onPress: handleRatingsToggle,
    },
    {
      id: 'under_30min',
      label: 'Under 30min',
      icon: 'time-outline',
      isActive: filters.deliveryTime.includes('Under 30min'),
      onPress: handleDeliveryTimeToggle,
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
           
            accessibilityLabel={`${chip.label} filter${chip.isActive ? ', active' : ''}`}
            accessibilityRole="button"
            accessibilityHint={`Double tap to ${chip.isActive ? 'remove' : 'apply'} ${chip.label} filter`}
            accessibilityState={{ selected: chip.isActive }}
          >
            <View style={styles.chipContent}>
              <Ionicons
                name={chip.icon as any}
                size={16}
                color={chip.isActive ? COLORS.primary : COLORS.muted}
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
                    size={11}
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
              shipping: [],
              ratings: [],
              deliveryTime: [],
              priceRange: { min: 0, max: Infinity },
              brands: [],
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
    backgroundColor: COLORS.glassWhite,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      },
    }),
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      },
    }),
  },
  filterChipActive: {
    backgroundColor: 'rgba(26, 58, 82, 0.1)',
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 3px 12px rgba(26, 58, 82, 0.15)',
      },
    }),
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipIcon: {
    marginRight: 2,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.slate,
  },
  chipTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  activeIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 6px rgba(26, 58, 82, 0.3)',
      },
    }),
  },
  clearAllButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.error,
  },
});

export const FilterChips = React.memo(_FilterChipsInner);
