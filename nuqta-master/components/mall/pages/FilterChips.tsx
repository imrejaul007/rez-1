/**
 * FilterChips Component
 *
 * Premium filter pills for mall pages with gradient active states
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export type FilterType = 'all' | 'featured' | 'new' | 'top-rated' | 'luxury' | 'trending' | 'reward-boosters';

interface FilterOption {
  key: FilterType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeColors: [string, string];
}

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'all', label: 'All', icon: 'grid-outline', activeColors: [colors.nileBlue, colors.brand.nileBlueLight] },
  { key: 'featured', label: 'Featured', icon: 'star', activeColors: [colors.warningScale[400], colors.nileBlue] },
  { key: 'new', label: 'New', icon: 'sparkles', activeColors: [colors.brand.orange, colors.warningScale[700]] },
  { key: 'top-rated', label: 'Top Rated', icon: 'trending-up', activeColors: [colors.lavenderMist, colors.nileBlue] },
  { key: 'luxury', label: 'Premium', icon: 'diamond', activeColors: [colors.nileBlue, colors.brand.nileBlueLight] },
  { key: 'trending', label: 'Trending', icon: 'flame', activeColors: [colors.error, colors.error] },
  { key: 'reward-boosters', label: 'Rewards', icon: 'gift', activeColors: [colors.brand.purpleLight, colors.brand.purple] },
];

interface FilterChipsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTER_OPTIONS.map((option) => {
        const isActive = activeFilter === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => onFilterChange(option.key)}
           
            style={styles.chipWrapper}
          >
            {isActive ? (
              <LinearGradient
                colors={option.activeColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.chipActive}
              >
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={colors.background.primary}
                />
                <Text style={styles.chipTextActive}>
                  {option.label}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.chip}>
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={colors.neutral[500]}
                />
                <Text style={styles.chipText}>
                  {option.label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 12,
    gap: 10,
  },
  chipWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  chipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  chipTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default memo(FilterChips);
