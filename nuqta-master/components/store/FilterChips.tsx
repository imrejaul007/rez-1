import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export interface ProductFilters {
  categories?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  inStock?: boolean;
  brands?: string[];
  discount?: number;
  [key: string]: any;
}

interface FilterChipsProps {
  filters: ProductFilters;
  onRemoveFilter: (filterType: string, value?: any) => void;
  onClearAll: () => void;
}

interface FilterChip {
  type: string;
  label: string;
  value?: any;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
}) => {
  const generateChips = (): FilterChip[] => {
    const chips: FilterChip[] = [];

    // Categories
    if (filters.categories && filters.categories.length > 0) {
      filters.categories.forEach((category) => {
        chips.push({
          type: 'categories',
          label: `Category: ${category}`,
          value: category,
        });
      });
    }

    // Price Range
    if (filters.priceRange) {
      const { min, max } = filters.priceRange;
      chips.push({
        type: 'priceRange',
        label: `Price: $${min}-$${max}`,
      });
    }

    // Rating
    if (filters.rating !== undefined && filters.rating > 0) {
      chips.push({
        type: 'rating',
        label: `Rating: ${filters.rating}+ stars`,
      });
    }

    // In Stock
    if (filters.inStock) {
      chips.push({
        type: 'inStock',
        label: 'In Stock Only',
      });
    }

    // Brands
    if (filters.brands && filters.brands.length > 0) {
      filters.brands.forEach((brand) => {
        chips.push({
          type: 'brands',
          label: `Brand: ${brand}`,
          value: brand,
        });
      });
    }

    // Discount
    if (filters.discount !== undefined && filters.discount > 0) {
      chips.push({
        type: 'discount',
        label: `${filters.discount}%+ Off`,
      });
    }

    return chips;
  };

  const chips = generateChips();
  const hasFilters = chips.length > 0;

  if (!hasFilters) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {chips.length} {chips.length === 1 ? 'Filter' : 'Filters'} Active
        </Text>
        <Pressable
          onPress={onClearAll}
          style={styles.clearButton}
         
        >
          <Text style={styles.clearButtonText}>Clear All</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {chips.map((chip, index) => (
          <View key={`${chip.type}-${index}`} style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {chip.label}
            </Text>
            <Pressable
              onPress={() => onRemoveFilter(chip.type, chip.value)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
             
            >
              <Ionicons name="close-circle" size={18} color={colors.brand.purple} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.tint.slate,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slateGray,
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.purple,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F4FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 6,
    maxWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purple,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.brand.purple,
    maxWidth: 150,
  },
});

export default React.memo(FilterChips);
