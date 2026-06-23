import React from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';

type SortOption = 'best_value' | 'price_low' | 'price_high' | 'cashback_high' | 'distance' | 'rating';

interface SearchSortChipsProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  resultCount?: number;
}

const SORT_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: 'Best Saving', value: 'cashback_high' },
  { label: 'Nearest', value: 'distance' },
  { label: 'Top Rated', value: 'rating' },
  { label: 'Price: Low', value: 'price_low' },
];

const SearchSortChips = React.memo(function SearchSortChips({
  currentSort,
  onSortChange,
  resultCount,
}: SearchSortChipsProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SORT_OPTIONS.map((opt) => {
          const isActive = currentSort === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSortChange(opt.value)}
              style={[styles.chip, isActive && styles.activeChip]}
            >
              <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {resultCount != null && resultCount > 0 && (
        <Text style={styles.count}>{resultCount} results</Text>
      )}
    </View>
  );
});

export default SearchSortChips;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  scrollContent: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  activeChip: {
    backgroundColor: '#1a3a52',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a3a52',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  count: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
});
