import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export type SortOption = 'best_value' | 'price_low' | 'price_high' | 'cashback_high' | 'distance' | 'rating';

interface FilterBarProps {
  onFilterPress: (filter: string) => void;
  activeFilters?: string[];
}

function FilterBar({
  onFilterPress,
  activeFilters = [],
}: FilterBarProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Filters Button */}
        <Pressable
          style={[
            styles.filterButton,
            activeFilters.length > 0 && styles.filterButtonActive
          ]}
          onPress={() => onFilterPress('filters')}
        >
          <Text style={[
            styles.filterButtonText,
            activeFilters.length > 0 && styles.filterButtonTextActive
          ]}>Filters</Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={activeFilters.length > 0 ? colors.nileBlue : colors.neutral[500]}
          />
          {activeFilters.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilters.length}</Text>
            </View>
          )}
        </Pressable>

        {/* Filter Options */}
        {['Price', 'Cashback', 'Distance', 'Rating'].map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.filterButton,
              activeFilters.includes(filter.toLowerCase()) && styles.filterButtonActive
            ]}
            onPress={() => onFilterPress(filter.toLowerCase())}
          >
            <Text style={[
              styles.filterButtonText,
              activeFilters.includes(filter.toLowerCase()) && styles.filterButtonTextActive
            ]}>{filter}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: colors.linen,
    gap: 6,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(26, 58, 82, 0.08)',
    borderColor: colors.nileBlue,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  filterButtonTextActive: {
    color: colors.nileBlue,
    fontWeight: '700',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.brand.goldWarm,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.goldWarm,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 10px rgba(255, 200, 87, 0.4)',
      },
    }),
  },
  filterBadgeText: {
    color: colors.neutral[800],
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

export default React.memo(FilterBar);
