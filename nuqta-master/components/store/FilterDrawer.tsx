import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  Dimensions,
  TextInput,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export interface ProductFilters {
  categories: string[];
  minPrice?: number;
  maxPrice?: number;
  stockStatus?: ('in_stock' | 'out_of_stock' | 'low_stock')[];
  minRating?: number;
}

interface FilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: ProductFilters) => void;
  currentFilters: ProductFilters;
  categories: string[];
  priceRange: { min: number; max: number };
}

const STOCK_STATUS_OPTIONS = [
  { value: 'in_stock', label: 'In Stock', icon: 'checkmark-circle', color: colors.success },
  { value: 'out_of_stock', label: 'Out of Stock', icon: 'close-circle', color: colors.error },
  { value: 'low_stock', label: 'Low Stock', icon: 'alert-circle', color: colors.warning },
] as const;

const RATING_OPTIONS = [
  { value: 5, label: '5 Stars' },
  { value: 4, label: '4+ Stars' },
  { value: 3, label: '3+ Stars' },
  { value: 2, label: '2+ Stars' },
  { value: 1, label: '1+ Stars' },
];

function FilterDrawer({
  visible,
  onClose,
  onApplyFilters,
  currentFilters,
  categories,
  priceRange,
}: FilterDrawerProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [filters, setFilters] = useState<ProductFilters>(currentFilters);
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    price: true,
    stock: true,
    rating: true,
  });

  const slideAnim = useSharedValue(height);
  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setFilters(currentFilters);
      fadeAnim.value = withTiming(1, { duration: 250 });
      slideAnim.value = withSpring(0, { damping: 11, stiffness: 65 });
    } else {
      fadeAnim.value = withTiming(0, { duration: 200 });
      slideAnim.value = withTiming(height, { duration: 250 });
    }
  }, [visible]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: ProductFilters = {
      categories: [],
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      stockStatus: [],
      minRating: undefined,
    };
    setFilters(resetFilters);
  };

  const toggleCategory = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const toggleStockStatus = (status: 'in_stock' | 'out_of_stock' | 'low_stock') => {
    setFilters(prev => ({
      ...prev,
      stockStatus: prev.stockStatus?.includes(status)
        ? prev.stockStatus.filter(s => s !== status)
        : [...(prev.stockStatus || []), status],
    }));
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count += filters.categories.length;
    if (filters.minPrice !== priceRange.min || filters.maxPrice !== priceRange.max) count += 1;
    if (filters.stockStatus && filters.stockStatus.length > 0) count += filters.stockStatus.length;
    if (filters.minRating) count += 1;
    return count;
  };

  const renderStars = (rating: number, isSelected: boolean) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={isSelected ? colors.text.white : colors.warning}
          />
        ))}
      </View>
    );
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.overlayBackground,
              overlayAnimatedStyle,
            ]}
          />
        </View>
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.drawerContainer,
          drawerAnimatedStyle,
        ]}
      >
        <TouchableWithoutFeedback>
          <View style={styles.drawer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Filters</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.neutral[800]} />
              </Pressable>
            </View>

            {/* Drawer Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {/* Categories Section */}
              <View style={styles.section}>
                <Pressable
                  style={styles.sectionHeader}
                  onPress={() => toggleSection('categories')}
                 
                >
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="grid-outline" size={20} color={colors.brand.purple} />
                    <Text style={styles.sectionTitle}>Category</Text>
                    {filters.categories.length > 0 && (
                      <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>{filters.categories.length}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons
                    name={expandedSections.categories ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.neutral[400]}
                  />
                </Pressable>

                {expandedSections.categories && (
                  <View style={styles.sectionContent}>
                    {categories.map((category) => (
                      <Pressable
                        key={category}
                        style={styles.checkboxItem}
                        onPress={() => toggleCategory(category)}
                       
                      >
                        <View
                          style={[
                            styles.checkbox,
                            filters.categories.includes(category) && styles.checkboxActive,
                          ]}
                        >
                          {filters.categories.includes(category) && (
                            <Ionicons name="checkmark" size={16} color={colors.background.primary} />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>{category}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Price Range Section */}
              <View style={styles.section}>
                <Pressable
                  style={styles.sectionHeader}
                  onPress={() => toggleSection('price')}
                 
                >
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="cash-outline" size={20} color={colors.brand.purple} />
                    <Text style={styles.sectionTitle}>Price Range</Text>
                  </View>
                  <Ionicons
                    name={expandedSections.price ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.neutral[400]}
                  />
                </Pressable>

                {expandedSections.price && (
                  <View style={styles.sectionContent}>
                    <View style={styles.priceInputContainer}>
                      <View style={styles.priceInputWrapper}>
                        <Text style={styles.priceInputLabel}>Min Price</Text>
                        <View style={styles.priceInput}>
                          <Text style={styles.currencySymbolText}>{currencySymbol}</Text>
                          <TextInput
                            style={styles.priceInputField}
                            value={filters.minPrice?.toString() || ''}
                            onChangeText={(text) => {
                              const value = parseInt(text) || priceRange.min;
                              setFilters(prev => ({ ...prev, minPrice: value }));
                            }}
                            keyboardType="numeric"
                            placeholder={priceRange.min.toString()}
                            placeholderTextColor={colors.neutral[400]}
                          />
                        </View>
                      </View>

                      <View style={styles.priceInputSeparator}>
                        <View style={styles.priceInputLine} />
                      </View>

                      <View style={styles.priceInputWrapper}>
                        <Text style={styles.priceInputLabel}>Max Price</Text>
                        <View style={styles.priceInput}>
                          <Text style={styles.currencySymbolText}>{currencySymbol}</Text>
                          <TextInput
                            style={styles.priceInputField}
                            value={filters.maxPrice?.toString() || ''}
                            onChangeText={(text) => {
                              const value = parseInt(text) || priceRange.max;
                              setFilters(prev => ({ ...prev, maxPrice: value }));
                            }}
                            keyboardType="numeric"
                            placeholder={priceRange.max.toString()}
                            placeholderTextColor={colors.neutral[400]}
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.priceRangeDisplay}>
                      <Text style={styles.priceRangeText}>
                        {currencySymbol}{filters.minPrice || priceRange.min} - {currencySymbol}{filters.maxPrice || priceRange.max}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Stock Status Section */}
              <View style={styles.section}>
                <Pressable
                  style={styles.sectionHeader}
                  onPress={() => toggleSection('stock')}
                 
                >
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="cube-outline" size={20} color={colors.brand.purple} />
                    <Text style={styles.sectionTitle}>Stock Status</Text>
                    {filters.stockStatus && filters.stockStatus.length > 0 && (
                      <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>{filters.stockStatus.length}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons
                    name={expandedSections.stock ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.neutral[400]}
                  />
                </Pressable>

                {expandedSections.stock && (
                  <View style={styles.sectionContent}>
                    {STOCK_STATUS_OPTIONS.map((option) => (
                      <Pressable
                        key={option.value}
                        style={styles.stockStatusItem}
                        onPress={() => toggleStockStatus(option.value)}
                       
                      >
                        <View
                          style={[
                            styles.checkbox,
                            filters.stockStatus?.includes(option.value) && [
                              styles.checkboxActive,
                              { backgroundColor: option.color },
                            ],
                          ]}
                        >
                          {filters.stockStatus?.includes(option.value) && (
                            <Ionicons name="checkmark" size={16} color={colors.background.primary} />
                          )}
                        </View>
                        <Ionicons
                          name={option.icon as any}
                          size={18}
                          color={option.color}
                          style={styles.stockStatusIcon}
                        />
                        <Text style={styles.stockStatusLabel}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Rating Section */}
              <View style={styles.section}>
                <Pressable
                  style={styles.sectionHeader}
                  onPress={() => toggleSection('rating')}
                 
                >
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="star-outline" size={20} color={colors.brand.purple} />
                    <Text style={styles.sectionTitle}>Minimum Rating</Text>
                  </View>
                  <Ionicons
                    name={expandedSections.rating ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.neutral[400]}
                  />
                </Pressable>

                {expandedSections.rating && (
                  <View style={styles.sectionContent}>
                    {RATING_OPTIONS.map((option) => {
                      const isSelected = filters.minRating === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          style={[
                            styles.ratingOption,
                            isSelected && styles.ratingOptionActive,
                          ]}
                          onPress={() =>
                            setFilters(prev => ({
                              ...prev,
                              minRating: prev.minRating === option.value ? undefined : option.value,
                            }))
                          }
                         
                        >
                          {renderStars(option.value, isSelected)}
                          <Text
                            style={[
                              styles.ratingOptionText,
                              isSelected && styles.ratingOptionTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={colors.background.primary}
                              style={styles.ratingCheckmark}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Bottom Padding */}
              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Pressable
                style={styles.resetButton}
                onPress={handleReset}
               
              >
                <Ionicons name="refresh-outline" size={18} color={colors.neutral[500]} />
                <Text style={styles.resetButtonText}>Reset</Text>
              </Pressable>

              <Pressable
                style={styles.applyButton}
                onPress={handleApply}
               
              >
                <Text style={styles.applyButtonText}>
                  Apply Filters
                  {activeFilterCount > 0 && ` (${activeFilterCount})`}
                </Text>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '90%',
  },
  drawer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  filterBadge: {
    backgroundColor: colors.brand.purple,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.white,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  sectionBadge: {
    backgroundColor: colors.tint.purple,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  sectionContent: {
    paddingTop: 8,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: colors.brand.purple,
    borderColor: colors.brand.purple,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
    marginBottom: 8,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  currencySymbolText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.purple,
    marginRight: 4,
  },
  priceInputField: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    padding: 0,
  },
  priceInputSeparator: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  priceInputLine: {
    width: 12,
    height: 2,
    backgroundColor: colors.neutral[300],
  },
  priceRangeDisplay: {
    backgroundColor: colors.tint.purple,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  priceRangeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  stockStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  stockStatusIcon: {
    marginRight: 8,
  },
  stockStatusLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  ratingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.neutral[50],
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: 12,
    marginBottom: 10,
  },
  ratingOptionActive: {
    backgroundColor: colors.brand.purple,
    borderColor: colors.brand.purple,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 12,
  },
  ratingOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[700],
    flex: 1,
  },
  ratingOptionTextActive: {
    color: colors.text.white,
  },
  ratingCheckmark: {
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    backgroundColor: colors.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.neutral[50],
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: 12,
    gap: 6,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[500],
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: colors.brand.purple,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.white,
  },
});

export default React.memo(FilterDrawer);
