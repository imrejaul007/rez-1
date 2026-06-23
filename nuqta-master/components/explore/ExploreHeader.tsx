/**
 * ExploreHeader — Search bar, location, category chips, quick chips.
 *
 * Renders the header that sits above the explore content feed,
 * including the location row, search bar, category filter chips,
 * and quick discovery chips.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { categoryFilters, quickChips } from './hooks/useExplore';

const { width } = Dimensions.get('window');

interface ExploreHeaderProps {
  // Location
  currentLocation: any;
  isLocationLoading: boolean;
  locationDisplay: string;
  locationSubtitle: string;

  // Coins
  rezCoins: number;

  // Search
  searchSuggestions: string[];
  currentPlaceholder: number;

  // Filters
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedChip: string;
  setSelectedChip: (chip: string) => void;

  // Navigation
  navigateTo: (path: string) => void;
}

const ExploreHeader = React.memo(function ExploreHeader({
  currentLocation,
  isLocationLoading,
  locationDisplay,
  locationSubtitle,
  rezCoins,
  searchSuggestions,
  currentPlaceholder,
  selectedCategory,
  setSelectedCategory,
  selectedChip,
  setSelectedChip,
  navigateTo,
}: ExploreHeaderProps) {
  return (
    <View style={styles.headerContainer}>
      {/* Location & Actions Row */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.locationButton}
          onPress={() => navigateTo('/explore/map')}
          accessibilityLabel={`Current location: ${locationDisplay}`}
          accessibilityRole="button"
        >
          <Ionicons
            name={currentLocation?.source === 'gps' ? 'navigate' : 'location'}
            size={18}
            color={Colors.gold}
          />
          <View style={styles.locationText}>
            {isLocationLoading ? (
              <View style={styles.locationSkeleton}>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
              </View>
            ) : (
              <>
                <Text style={styles.locationTitle} numberOfLines={1}>
                  {locationDisplay}
                </Text>
                <Text style={styles.locationSubtitle}>{locationSubtitle}</Text>
              </>
            )}
          </View>
          <Ionicons name="chevron-down" size={16} color={Colors.text.tertiary} />
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.mapButton}
            onPress={() => navigateTo('/explore/map')}
            accessibilityLabel="Open map view"
            accessibilityRole="button"
          >
            <Ionicons name="map" size={22} color={Colors.nileBlue} />
          </Pressable>
          <Pressable
            style={styles.coinsButton}
            onPress={() => navigateTo('/wallet')}
            accessibilityLabel={`Wallet: ${rezCoins.toLocaleString()} coins`}
            accessibilityRole="button"
          >
            <View style={styles.coinIcon}>
              <Text style={styles.coinEmoji}>{'\u{1FA99}'}</Text>
            </View>
            <Text style={styles.coinsText}>{rezCoins.toLocaleString()}</Text>
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Pressable
          style={styles.searchBar}
          onPress={() => navigateTo('/explore/search')}
          accessibilityLabel="Search stores and products"
          accessibilityRole="search"
        >
          <Ionicons name="search" size={20} color={Colors.text.tertiary} />
          <Text style={styles.searchPlaceholder}>
            {searchSuggestions[currentPlaceholder]}
          </Text>
        </Pressable>
        <Pressable
          style={styles.filterButton}
          onPress={() => navigateTo('/explore/stores')}
          accessibilityLabel="Filter options"
          accessibilityRole="button"
        >
          <Ionicons name="options" size={22} color={Colors.nileBlue} />
        </Pressable>
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categoryFilters.map((category) => (
          <Pressable
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
            ]}
            onPress={() => {
              setSelectedCategory(category.id);
              if (category.id !== 'all') {
                const tagFilters = ['halal', 'vegan', 'veg', 'adult', 'occasion'];
                if (tagFilters.includes(category.id)) {
                  navigateTo(`/explore/filter/${category.id}`);
                } else {
                  navigateTo(`/explore/category/${category.id}`);
                }
              }
            }}
            accessibilityLabel={category.label}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === category.id }}
          >
            <Text style={styles.categoryEmoji}>{category.emoji}</Text>
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === category.id && styles.categoryLabelActive,
              ]}
            >
              {category.label}
            </Text>
          </Pressable>
        ))}
        <View style={styles.bestValueTag}>
          <Ionicons name="trending-up" size={14} color={Colors.text.inverse} />
          <Text style={styles.bestValueText}>Best Value</Text>
        </View>
      </ScrollView>

      {/* Quick Discovery Chips */}
      <View style={styles.quickChipsRow}>
        {quickChips.map((chip) => (
          <Pressable
            key={chip.id}
            style={[
              styles.quickChip,
              selectedChip === chip.id && styles.quickChipActive,
            ]}
            onPress={() => {
              setSelectedChip(chip.id);
              if (chip.id === 'trending') navigateTo('/explore/hot');
              else if (chip.id === 'delivery') navigateTo('/explore/stores');
            }}
            accessibilityLabel={chip.label}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedChip === chip.id }}
          >
            <Ionicons
              name={chip.icon as any}
              size={16}
              color={
                selectedChip === chip.id ? chip.color : Colors.text.tertiary
              }
            />
            <Text
              style={[
                styles.quickChipText,
                selectedChip === chip.id && {
                  color: Colors.nileBlue,
                  fontWeight: '600' as const,
                },
              ]}
            >
              {chip.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.background.primary,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    maxWidth: width * 0.5,
  },
  locationText: {
    marginHorizontal: Spacing.sm,
  },
  locationTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  locationSubtitle: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  locationSkeleton: {
    gap: Spacing.xs,
  },
  skeletonLine: {
    height: Spacing.md,
    width: 100,
    backgroundColor: Colors.border.default,
    borderRadius: Spacing.xs,
  },
  skeletonLineShort: {
    width: 60,
    height: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: 6,
  },
  coinIcon: {
    width: Spacing.lg,
    height: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinEmoji: {
    ...Typography.body,
  },
  coinsText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.gold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 14,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 10,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    marginTop: Spacing.md,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: Colors.successScale[50],
    borderColor: Colors.gold,
  },
  categoryEmoji: {
    ...Typography.body,
  },
  categoryLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: Colors.gold,
    fontWeight: '600',
  },
  bestValueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  bestValueText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  quickChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.md,
    gap: 10,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 6,
  },
  quickChipActive: {
    backgroundColor: Colors.background.primary,
    borderColor: Colors.nileBlue,
  },
  quickChipText: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
});

export default ExploreHeader;
