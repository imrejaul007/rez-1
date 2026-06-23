import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@/components/common/CrossPlatformSlider';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

// Nuqta Brand Colors
const COLORS = {
  primary: colors.lightMustard,
  primaryDark: colors.nileBlue,
  gold: colors.lightMustard,
  navy: colors.nileBlue,
  slate: '#1F2D3D',
  muted: colors.gray[400],
  surface: '#F7FAFC',
};

interface CategoryOption {
  id: string;
  name: string;
  icon?: string;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterState) => void;
  currentFilters: FilterState;
  categories?: CategoryOption[];
}

export interface FilterState {
  priceRange: { min: number; max: number };
  rating: number | null;
  categories: string[];
  inStock: boolean;
  cashbackMin: number;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 'electronics', name: 'Electronics', icon: 'phone-portrait-outline' },
  { id: 'fashion', name: 'Fashion', icon: 'shirt-outline' },
  { id: 'food', name: 'Food & Dining', icon: 'restaurant-outline' },
  { id: 'groceries', name: 'Groceries', icon: 'cart-outline' },
  { id: 'beauty', name: 'Beauty', icon: 'sparkles-outline' },
  { id: 'services', name: 'Services', icon: 'construct-outline' },
];

const RATING_OPTIONS = [
  { value: 4, label: '4+ Stars' },
  { value: 3, label: '3+ Stars' },
  { value: 2, label: '2+ Stars' },
  { value: 1, label: '1+ Stars' },
];

function FilterModal({
  visible,
  onClose,
  onApplyFilters,
  currentFilters,
  categories: categoriesProp,
}: FilterModalProps) {
  const displayCategories = categoriesProp || DEFAULT_CATEGORIES;
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [filters, setFilters] = useState<FilterState>(currentFilters);

  // Sync internal state when parent filters change
  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      priceRange: { min: 0, max: 100000 },
      rating: null,
      categories: [],
      inStock: false,
      cashbackMin: 0,
    };
    setFilters(resetFilters);
  };

  const toggleCategory = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filters</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.neutral[800]} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Price Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range</Text>
              <View style={styles.priceDisplay}>
                <Text style={styles.priceText}>{currencySymbol}{filters.priceRange.min}</Text>
                <Text style={styles.priceText}>{currencySymbol}{filters.priceRange.max}</Text>
              </View>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100000}
                  step={1000}
                  value={filters.priceRange.min}
                  onValueChange={(value) =>
                    setFilters(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, min: value },
                    }))
                  }
                  minimumTrackTintColor={colors.nileBlue}
                  maximumTrackTintColor={colors.neutral[200]}
                  thumbTintColor={colors.nileBlue}
                />
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100000}
                  step={1000}
                  value={filters.priceRange.max}
                  onValueChange={(value) =>
                    setFilters(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, max: value },
                    }))
                  }
                  minimumTrackTintColor={colors.nileBlue}
                  maximumTrackTintColor={colors.neutral[200]}
                  thumbTintColor={colors.nileBlue}
                />
              </View>
            </View>

            {/* Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minimum Rating</Text>
              <View style={styles.ratingContainer}>
                {RATING_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.ratingOption,
                      filters.rating === option.value && styles.ratingOptionActive,
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, rating: option.value }))}
                  >
                    <Ionicons
                      name="star"
                      size={16}
                      color={filters.rating === option.value ? colors.background.primary : colors.warningScale[400]}
                    />
                    <Text
                      style={[
                        styles.ratingText,
                        filters.rating === option.value && styles.ratingTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[
                    styles.ratingOption,
                    filters.rating === null && styles.ratingOptionActive,
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, rating: null }))}
                >
                  <Text
                    style={[
                      styles.ratingText,
                      filters.rating === null && styles.ratingTextActive,
                    ]}
                  >
                    Any
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.categoriesGrid}>
                {displayCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      filters.categories.includes(category.id) && styles.categoryChipActive,
                    ]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={18}
                      color={
                        filters.categories.includes(category.id) ? colors.background.primary : colors.nileBlue
                      }
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        filters.categories.includes(category.id) && styles.categoryChipTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Cashback */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minimum Cashback</Text>
              <View style={styles.cashbackContainer}>
                <Text style={styles.cashbackValue}>{filters.cashbackMin}%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={20}
                  step={1}
                  value={filters.cashbackMin}
                  onValueChange={(value) =>
                    setFilters(prev => ({ ...prev, cashbackMin: value }))
                  }
                  minimumTrackTintColor={colors.successScale[400]}
                  maximumTrackTintColor={colors.neutral[200]}
                  thumbTintColor={colors.successScale[400]}
                />
              </View>
            </View>

            {/* In Stock */}
            <View style={styles.section}>
              <Pressable
                style={styles.toggleRow}
                onPress={() => setFilters(prev => ({ ...prev, inStock: !prev.inStock }))}
              >
                <Text style={styles.toggleLabel}>Show in-stock items only</Text>
                <View
                  style={[
                    styles.toggle,
                    filters.inStock && styles.toggleActive,
                  ]}
                >
                  {filters.inStock && (
                    <Ionicons name="checkmark" size={16} color={colors.background.primary} />
                  )}
                </View>
              </Pressable>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
            <Pressable style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 12,
  },
  priceDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  sliderContainer: {
    paddingHorizontal: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    gap: 6,
  },
  ratingOptionActive: {
    backgroundColor: colors.nileBlue,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[800],
  },
  ratingTextActive: {
    color: colors.background.primary,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.nileBlue,
    borderColor: colors.nileBlue,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[800],
  },
  categoryChipTextActive: {
    color: colors.background.primary,
  },
  cashbackContainer: {
    paddingHorizontal: 4,
  },
  cashbackValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.successScale[400],
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[800],
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.successScale[400],
    borderColor: colors.successScale[400],
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.nileBlue,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default React.memo(FilterModal);
