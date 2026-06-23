import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@/components/common/CrossPlatformSlider';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

export interface FilterOptions {
  deliveryTime: {
    min: number;
    max: number;
  };
  priceRange: {
    min: number;
    max: number;
  };
  rating: number;
  paymentMethods: string[];
  features: {
    freeDelivery: boolean;
    walletPayment: boolean;
    verified: boolean;
    featured: boolean;
  };
  sortBy: 'rating' | 'distance' | 'name' | 'newest' | 'price';
}

interface StoreFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  initialFilters?: Partial<FilterOptions>;
}

const StoreFilters: React.FC<StoreFiltersProps> = ({
  visible,
  onClose,
  onApplyFilters,
  initialFilters,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [filters, setFilters] = useState<FilterOptions>({
    deliveryTime: { min: 15, max: 90 },
    priceRange: { min: 0, max: 2000 },
    rating: 0,
    paymentMethods: [],
    features: {
      freeDelivery: false,
      walletPayment: false,
      verified: false,
      featured: false,
    },
    sortBy: 'rating',
    ...initialFilters,
  });

  const paymentMethodOptions = [
    { id: 'cash', label: 'Cash', icon: '💵' },
    { id: 'card', label: 'Card', icon: '💳' },
    { id: 'upi', label: 'UPI', icon: '📱' },
    { id: 'wallet', label: 'Wallet', icon: '👛' },
    { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
  ];

  const sortOptions = [
    { id: 'rating', label: 'Rating', icon: '⭐' },
    { id: 'distance', label: 'Distance', icon: '📍' },
    { id: 'name', label: 'Name', icon: '🔤' },
    { id: 'newest', label: 'Newest', icon: '🆕' },
    { id: 'price', label: 'Price', icon: '💰' },
  ];

  const handleDeliveryTimeChange = (type: 'min' | 'max', value: number) => {
    setFilters(prev => ({
      ...prev,
      deliveryTime: {
        ...prev.deliveryTime,
        [type]: value,
      },
    }));
  };

  const handlePriceRangeChange = (type: 'min' | 'max', value: number) => {
    setFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [type]: value,
      },
    }));
  };

  const handleRatingChange = (value: number) => {
    setFilters(prev => ({
      ...prev,
      rating: value,
    }));
  };

  const togglePaymentMethod = (methodId: string) => {
    setFilters(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(methodId)
        ? prev.paymentMethods.filter(id => id !== methodId)
        : [...prev.paymentMethods, methodId],
    }));
  };

  const toggleFeature = (feature: keyof FilterOptions['features']) => {
    setFilters(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature],
      },
    }));
  };

  const handleSortChange = (sortBy: FilterOptions['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
    }));
  };

  const handleApplyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleResetFilters = () => {
    const defaultFilters: FilterOptions = {
      deliveryTime: { min: 15, max: 90 },
      priceRange: { min: 0, max: 2000 },
      rating: 0,
      paymentMethods: [],
      features: {
        freeDelivery: false,
        walletPayment: false,
        verified: false,
        featured: false,
      },
      sortBy: 'rating',
    };
    setFilters(defaultFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.deliveryTime.min !== 15 || filters.deliveryTime.max !== 90) count++;
    if (filters.priceRange.min !== 0 || filters.priceRange.max !== 2000) count++;
    if (filters.rating > 0) count++;
    if (filters.paymentMethods.length > 0) count++;
    if (Object.values(filters.features).some(Boolean)) count++;
    return count;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.darkGray} />
          </Pressable>
          <Text style={styles.headerTitle}>Filters</Text>
          <Pressable onPress={handleResetFilters} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Sort By */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            <View style={styles.sortOptions}>
              {sortOptions.map(option => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.sortOption,
                    filters.sortBy === option.id && styles.sortOptionActive,
                  ]}
                  onPress={() => handleSortChange(option.id as FilterOptions['sortBy'])}
                >
                  <Text style={styles.sortOptionIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.sortOptionText,
                      filters.sortBy === option.id && styles.sortOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Delivery Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Delivery Time: {filters.deliveryTime.min} - {filters.deliveryTime.max} mins
            </Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Min: {filters.deliveryTime.min} mins</Text>
              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={120}
                value={filters.deliveryTime.min}
                onValueChange={(value) => handleDeliveryTimeChange('min', Math.round(value))}
                minimumTrackTintColor="#7B61FF"
                maximumTrackTintColor="#E5E5E5"
              />
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Max: {filters.deliveryTime.max} mins</Text>
              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={120}
                value={filters.deliveryTime.max}
                onValueChange={(value) => handleDeliveryTimeChange('max', Math.round(value))}
                minimumTrackTintColor="#7B61FF"
                maximumTrackTintColor="#E5E5E5"
              />
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Price Range: {currencySymbol}{filters.priceRange.min} - {currencySymbol}{filters.priceRange.max}
            </Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Min: {currencySymbol}{filters.priceRange.min}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={5000}
                value={filters.priceRange.min}
                onValueChange={(value) => handlePriceRangeChange('min', Math.round(value))}
                minimumTrackTintColor="#7B61FF"
                maximumTrackTintColor="#E5E5E5"
              />
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Max: {currencySymbol}{filters.priceRange.max}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={5000}
                value={filters.priceRange.max}
                onValueChange={(value) => handlePriceRangeChange('max', Math.round(value))}
                minimumTrackTintColor="#7B61FF"
                maximumTrackTintColor="#E5E5E5"
              />
            </View>
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Minimum Rating: {filters.rating > 0 ? `${filters.rating}+ ⭐` : 'Any'}
            </Text>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={5}
                value={filters.rating}
                onValueChange={(value) => handleRatingChange(Math.round(value * 2) / 2)}
                minimumTrackTintColor="#7B61FF"
                maximumTrackTintColor="#E5E5E5"
                step={0.5}
              />
            </View>
          </View>

          {/* Payment Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <View style={styles.paymentMethods}>
              {paymentMethodOptions.map(method => (
                <Pressable
                  key={method.id}
                  style={[
                    styles.paymentMethod,
                    filters.paymentMethods.includes(method.id) && styles.paymentMethodActive,
                  ]}
                  onPress={() => togglePaymentMethod(method.id)}
                >
                  <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                  <Text
                    style={[
                      styles.paymentMethodText,
                      filters.paymentMethods.includes(method.id) && styles.paymentMethodTextActive,
                    ]}
                  >
                    {method.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.features}>
              <View style={styles.feature}>
                <Text style={styles.featureText}>Free Delivery Available</Text>
                <Switch
                  value={filters.features.freeDelivery}
                  onValueChange={() => toggleFeature('freeDelivery')}
                  trackColor={{ false: '#E5E5E5', true: '#7B61FF' }}
                  thumbColor={filters.features.freeDelivery ? colors.background.primary : '#f4f3f4'}
                />
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureText}>Wallet Payment Accepted</Text>
                <Switch
                  value={filters.features.walletPayment}
                  onValueChange={() => toggleFeature('walletPayment')}
                  trackColor={{ false: '#E5E5E5', true: '#7B61FF' }}
                  thumbColor={filters.features.walletPayment ? colors.background.primary : '#f4f3f4'}
                />
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureText}>Verified Stores Only</Text>
                <Switch
                  value={filters.features.verified}
                  onValueChange={() => toggleFeature('verified')}
                  trackColor={{ false: '#E5E5E5', true: '#7B61FF' }}
                  thumbColor={filters.features.verified ? colors.background.primary : '#f4f3f4'}
                />
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureText}>Featured Stores Only</Text>
                <Switch
                  value={filters.features.featured}
                  onValueChange={() => toggleFeature('featured')}
                  trackColor={{ false: '#E5E5E5', true: '#7B61FF' }}
                  thumbColor={filters.features.featured ? colors.background.primary : '#f4f3f4'}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={styles.applyButton}
            onPress={handleApplyFilters}
           
          >
            <Text style={styles.applyButtonText}>
              Apply Filters {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
  },
  resetButton: {
    padding: 8,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#7B61FF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 16,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: colors.background.primary,
  },
  sortOptionActive: {
    backgroundColor: '#7B61FF',
    borderColor: '#7B61FF',
  },
  sortOptionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  sortOptionText: {
    fontSize: 14,
    color: colors.midGray,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: colors.background.primary,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    color: colors.midGray,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#7B61FF',
    width: 20,
    height: 20,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: colors.background.primary,
  },
  paymentMethodActive: {
    backgroundColor: '#7B61FF',
    borderColor: '#7B61FF',
  },
  paymentMethodIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  paymentMethodText: {
    fontSize: 14,
    color: colors.midGray,
    fontWeight: '500',
  },
  paymentMethodTextActive: {
    color: colors.background.primary,
  },
  features: {
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featureText: {
    fontSize: 16,
    color: colors.darkGray,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  applyButton: {
    backgroundColor: '#7B61FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default React.memo(StoreFilters);
