/**
 * EventsQuickFilters Component
 * Horizontal quick filter chips with sort button
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { EventFilters } from '@/services/eventsApi';
import { EventSortOption } from '@/hooks/useEventsPage';
import { colors } from '@/constants/theme';

interface QuickFilter {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
}

interface EventsQuickFiltersProps {
  filters: EventFilters;
  sortBy: EventSortOption;
  onOpenFilters: () => void;
  onOpenSort: () => void;
  onQuickFilterToggle: (filterId: string) => void;
  activeFiltersCount: number;
}

const EventsQuickFilters: React.FC<EventsQuickFiltersProps> = ({
  filters,
  sortBy,
  onOpenFilters,
  onOpenSort,
  onQuickFilterToggle,
  activeFiltersCount,
}) => {
  // Build quick filters based on current state
  const quickFilters: QuickFilter[] = [
    {
      id: 'free',
      label: 'Free',
      icon: 'pricetag-outline',
      isActive: filters.priceMax === 0,
    },
    {
      id: 'online',
      label: 'Online',
      icon: 'globe-outline',
      isActive: filters.isOnline === true,
    },
    {
      id: 'venue',
      label: 'Venue',
      icon: 'location-outline',
      isActive: filters.isOnline === false,
    },
    {
      id: 'today',
      label: 'Today',
      icon: 'today-outline',
      isActive: filters.date === new Date().toISOString().split('T')[0],
    },
  ];

  // Get sort label
  const getSortLabel = (sort: EventSortOption): string => {
    switch (sort) {
      case 'date_asc':
        return 'Upcoming';
      case 'date_desc':
        return 'Latest';
      case 'price_asc':
        return 'Price ↑';
      case 'price_desc':
        return 'Price ↓';
      case 'popularity':
        return 'Popular';
      default:
        return 'Sort';
    }
  };

  const handleQuickFilterPress = useCallback((filterId: string) => {
    onQuickFilterToggle(filterId);
  }, [onQuickFilterToggle]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All Filters Button */}
        <Pressable
          style={[
            styles.filterButton,
            activeFiltersCount > 0 && styles.filterButtonActive,
          ]}
          onPress={onOpenFilters}
         
          accessibilityLabel={`All filters, ${activeFiltersCount} active`}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={activeFiltersCount > 0 ? colors.background.primary : colors.nileBlue}
          />
          <ThemedText
            style={[
              styles.filterButtonText,
              activeFiltersCount > 0 && styles.filterButtonTextActive,
            ]}
          >
            Filters
          </ThemedText>
          {activeFiltersCount > 0 && (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>
                {activeFiltersCount}
              </ThemedText>
            </View>
          )}
        </Pressable>

        {/* Quick Filter Chips */}
        {quickFilters.map((filter) => (
          <Pressable
            key={filter.id}
            style={[
              styles.chipButton,
              filter.isActive && styles.chipButtonActive,
            ]}
            onPress={() => handleQuickFilterPress(filter.id)}
           
            accessibilityLabel={filter.label}
            accessibilityState={{ selected: filter.isActive }}
          >
            <Ionicons
              name={filter.icon}
              size={14}
              color={filter.isActive ? colors.background.primary : colors.neutral[500]}
            />
            <ThemedText
              style={[
                styles.chipText,
                filter.isActive && styles.chipTextActive,
              ]}
            >
              {filter.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sort Button */}
      <Pressable
        style={styles.sortButton}
        onPress={onOpenSort}
       
        accessibilityLabel={`Sort by ${getSortLabel(sortBy)}`}
      >
        <Ionicons name="swap-vertical" size={16} color={colors.nileBlue} />
        <ThemedText style={styles.sortButtonText}>
          {getSortLabel(sortBy)}
        </ThemedText>
        <Ionicons name="chevron-down" size={14} color={colors.nileBlue} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.nileBlue,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: colors.nileBlue,
    borderColor: colors.nileBlue,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  filterButtonTextActive: {
    color: colors.background.primary,
  },
  badge: {
    backgroundColor: colors.background.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: 4,
  },
  chipButtonActive: {
    backgroundColor: colors.nileBlue,
    borderColor: colors.nileBlue,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  chipTextActive: {
    color: colors.background.primary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 192, 106, 0.3)',
    gap: 4,
    marginLeft: 8,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
  },
});

export default memo(EventsQuickFilters);
