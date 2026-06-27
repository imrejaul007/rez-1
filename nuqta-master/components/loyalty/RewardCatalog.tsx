// @ts-nocheck
/**
 * Reward Catalog Component
 * Browse and filter available rewards
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { RewardItem, RewardCategory } from '@/types/loyaltyRedemption.types';
import RewardCard from './RewardCard';
import { colors } from '@/constants/theme';

interface RewardCatalogProps {
  rewards: RewardItem[];
  onRedeemReward: (reward: RewardItem) => void;
  canRedeemReward: (reward: RewardItem) => { canRedeem: boolean; reason?: string };
  userPoints: number;
  tierColor?: string;
  onSearch?: (query: string) => void;
  onFilter?: (category: RewardCategory | null) => void;
}

const CATEGORIES: Array<{ label: string; value: RewardCategory | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Vouchers', value: 'voucher' },
  { label: 'Discounts', value: 'discount' },
  { label: 'Cashback', value: 'cashback' },
  { label: 'Freebies', value: 'freebie' },
  { label: 'Exclusive', value: 'exclusive' },
];

function RewardCatalog({
  rewards,
  onRedeemReward,
  canRedeemReward,
  userPoints,
  tierColor = colors.brand.purpleLight,
  onSearch,
  onFilter,
}: RewardCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RewardCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'points' | 'value' | 'popularity'>('points');

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    onSearch?.(text);
  };

  const handleCategoryChange = (category: RewardCategory | 'all') => {
    setSelectedCategory(category);
    onFilter?.(category === 'all' ? null : category);
  };

  const filteredRewards = rewards
    .filter(reward => {
      if (searchQuery) {
        return reward.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               reward.description.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.value - a.value;
        case 'popularity':
          return (b.popularity || 0) - (a.popularity || 0);
        case 'points':
        default:
          return a.points - b.points;
      }
    });

  const featuredRewards = filteredRewards.filter(r => r.featured);
  const regularRewards = filteredRewards.filter(r => !r.featured);

  const renderCategoryChip = useCallback(({ item }: { item: { label: string; value: RewardCategory | 'all' } }) => (
    <Pressable
      style={[
        styles.categoryButton,
        selectedCategory === item.value && styles.categoryButtonActive,
      ]}
      onPress={() => handleCategoryChange(item.value)}
    >
      <ThemedText
        style={[
          styles.categoryText,
          selectedCategory === item.value && styles.categoryTextActive,
        ]}
      >
        {item.label}
      </ThemedText>
    </Pressable>
  ), [selectedCategory, handleCategoryChange]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.neutral[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search rewards..."
          placeholderTextColor={colors.neutral[400]}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
          </Pressable>
        )}
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlashList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={item => item.value}
          renderItem={renderCategoryChip}
          contentContainerStyle={styles.categoryList}
          estimatedItemSize={44}
        />
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <ThemedText style={styles.sortLabel}>Sort by:</ThemedText>
        <View style={styles.sortButtons}>
          <Pressable
            style={[styles.sortButton, sortBy === 'points' && styles.sortButtonActive]}
            onPress={() => setSortBy('points')}
          >
            <ThemedText style={[styles.sortText, sortBy === 'points' && styles.sortTextActive]}>
              Points
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.sortButton, sortBy === 'value' && styles.sortButtonActive]}
            onPress={() => setSortBy('value')}
          >
            <ThemedText style={[styles.sortText, sortBy === 'value' && styles.sortTextActive]}>
              Value
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.sortButton, sortBy === 'popularity' && styles.sortButtonActive]}
            onPress={() => setSortBy('popularity')}
          >
            <ThemedText style={[styles.sortText, sortBy === 'popularity' && styles.sortTextActive]}>
              Popular
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Featured Rewards */}
      {featuredRewards.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={20} color={colors.warningScale[400]} />
            <ThemedText style={styles.sectionTitle}>Featured Rewards</ThemedText>
          </View>
          {featuredRewards.map(reward => {
            const { canRedeem } = canRedeemReward(reward);
            return (
              <RewardCard
                key={reward._id}
                reward={reward}
                canRedeem={canRedeem}
                onRedeem={onRedeemReward}
                userPoints={userPoints}
                tierColor={tierColor}
              />
            );
          })}
        </View>
      )}

      {/* Regular Rewards */}
      {regularRewards.length > 0 && (
        <View style={styles.section}>
          {featuredRewards.length > 0 && (
            <ThemedText style={styles.sectionTitle}>All Rewards</ThemedText>
          )}
          {regularRewards.map(reward => {
            const { canRedeem } = canRedeemReward(reward);
            return (
              <RewardCard
                key={reward._id}
                reward={reward}
                canRedeem={canRedeem}
                onRedeem={onRedeemReward}
                userPoints={userPoints}
                tierColor={tierColor}
              />
            );
          })}
        </View>
      )}

      {filteredRewards.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="gift-outline" size={64} color={colors.neutral[300]} />
          <ThemedText style={styles.emptyTitle}>No rewards found</ThemedText>
          <ThemedText style={styles.emptyText}>
            {searchQuery ? 'Try a different search term' : 'Check back later for new rewards'}
          </ThemedText>
        </View>
      )}
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[900],
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryList: {
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
  },
  categoryButtonActive: {
    backgroundColor: colors.brand.purpleLight,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  categoryTextActive: {
    color: colors.background.primary,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
  },
  sortButtonActive: {
    backgroundColor: colors.indigoMist,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  sortTextActive: {
    color: colors.brand.purpleLight,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[500],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[400],
    textAlign: 'center',
  },
});

export default React.memo(RewardCatalog);
