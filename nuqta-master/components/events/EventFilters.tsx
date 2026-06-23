import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { EventFilters as EventFiltersType } from '@/services/eventsApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

interface EventFiltersProps {
  filters: EventFiltersType;
  onFiltersChange: (filters: EventFiltersType) => void;
  onResetFilters: () => void;
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  'All',
  'Music',
  'Technology',
  'Wellness',
  'Sports',
  'Education',
  'Business',
  'Arts',
  'Food',
  'Entertainment',
];

const LOCATIONS = [
  'All',
  'Bangalore',
  'Mumbai',
  'Delhi',
  'Chennai',
  'Kolkata',
  'Hyderabad',
  'Pune',
  'Online',
];

const getPriceRanges = (currencySymbol: string) => [
  { label: 'All', min: 0, max: Infinity },
  { label: 'Free', min: 0, max: 0 },
  { label: `Under ${currencySymbol}500`, min: 0, max: 500 },
  { label: `${currencySymbol}500 - ${currencySymbol}1000`, min: 500, max: 1000 },
  { label: `${currencySymbol}1000 - ${currencySymbol}2000`, min: 1000, max: 2000 },
  { label: `Above ${currencySymbol}2000`, min: 2000, max: Infinity },
];

function EventFilters({
  filters,
  onFiltersChange,
  onResetFilters,
  visible,
  onClose
}: EventFiltersProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const PRICE_RANGES = getPriceRanges(currencySymbol);
  const [localFilters, setLocalFilters] = useState<EventFiltersType>(filters);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: colors.neutral[200], dark: colors.neutral[700] }, 'border');
  const tintColor = useThemeColor({}, 'tint');
  const cardBackground = useThemeColor({ light: colors.background.primary, dark: colors.neutral[800] }, 'background');

  const handleCategorySelect = (category: string) => {
    const newFilters = {
      ...localFilters,
      category: category === 'All' ? undefined : category
    };
    setLocalFilters(newFilters);
  };

  const handleLocationSelect = (location: string) => {
    const newFilters = {
      ...localFilters,
      location: location === 'All' ? undefined : location
    };
    setLocalFilters(newFilters);
  };

  const handlePriceRangeSelect = (range: { min: number; max: number }) => {
    const newFilters = {
      ...localFilters,
      priceMin: range.min === 0 && range.max === Infinity ? undefined : range.min,
      priceMax: range.max === Infinity ? undefined : range.max
    };
    setLocalFilters(newFilters);
  };

  const handleEventTypeSelect = (isOnline: boolean | undefined) => {
    const newFilters = {
      ...localFilters,
      isOnline
    };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleResetFilters = () => {
    const resetFilters: EventFiltersType = {};
    setLocalFilters(resetFilters);
    onResetFilters();
    onClose();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.category) count++;
    if (localFilters.location) count++;
    if (localFilters.priceMin !== undefined || localFilters.priceMax !== undefined) count++;
    if (localFilters.isOnline !== undefined) count++;
    return count;
  };

  const isFilterActive = (type: string, value: any) => {
    switch (type) {
      case 'category':
        return localFilters.category === value;
      case 'location':
        return localFilters.location === value;
      case 'price':
        return localFilters.priceMin === value.min && localFilters.priceMax === value.max;
      case 'eventType':
        return localFilters.isOnline === value;
      default:
        return false;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.container, { backgroundColor }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={textColor} />
          </Pressable>
          
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            Filter Events
          </ThemedText>
          
          <Pressable onPress={handleResetFilters} style={styles.resetButton}>
            <ThemedText style={[styles.resetText, { color: tintColor }]}>
              Reset
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Category Filter */}
          <View style={styles.filterSection}>
            <ThemedText style={[styles.filterTitle, { color: textColor }]}>
              Category
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
              {CATEGORIES.map((category) => (
                <Pressable
                  key={category}
                  style={[
                    styles.chip,
                    { backgroundColor: cardBackground, borderColor },
                    isFilterActive('category', category) && { backgroundColor: tintColor, borderColor: tintColor }
                  ]}
                  onPress={() => handleCategorySelect(category)}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: textColor },
                      isFilterActive('category', category) && { color: colors.background.primary }
                    ]}
                  >
                    {category}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Location Filter */}
          <View style={styles.filterSection}>
            <ThemedText style={[styles.filterTitle, { color: textColor }]}>
              Location
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
              {LOCATIONS.map((location) => (
                <Pressable
                  key={location}
                  style={[
                    styles.chip,
                    { backgroundColor: cardBackground, borderColor },
                    isFilterActive('location', location) && { backgroundColor: tintColor, borderColor: tintColor }
                  ]}
                  onPress={() => handleLocationSelect(location)}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: textColor },
                      isFilterActive('location', location) && { color: colors.background.primary }
                    ]}
                  >
                    {location}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Price Range Filter */}
          <View style={styles.filterSection}>
            <ThemedText style={[styles.filterTitle, { color: textColor }]}>
              Price Range
            </ThemedText>
            <View style={styles.priceGrid}>
              {PRICE_RANGES.map((range, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.priceChip,
                    { backgroundColor: cardBackground, borderColor },
                    isFilterActive('price', range) && { backgroundColor: tintColor, borderColor: tintColor }
                  ]}
                  onPress={() => handlePriceRangeSelect(range)}
                >
                  <ThemedText
                    style={[
                      styles.priceChipText,
                      { color: textColor },
                      isFilterActive('price', range) && { color: colors.background.primary }
                    ]}
                  >
                    {range.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Event Type Filter */}
          <View style={styles.filterSection}>
            <ThemedText style={[styles.filterTitle, { color: textColor }]}>
              Event Type
            </ThemedText>
            <View style={styles.eventTypeContainer}>
              <Pressable
                style={[
                  styles.eventTypeChip,
                  { backgroundColor: cardBackground, borderColor },
                  isFilterActive('eventType', undefined) && { backgroundColor: tintColor, borderColor: tintColor }
                ]}
                onPress={() => handleEventTypeSelect(undefined)}
              >
                <ThemedText
                  style={[
                    styles.eventTypeChipText,
                    { color: textColor },
                    isFilterActive('eventType', undefined) && { color: colors.background.primary }
                  ]}
                >
                  All Events
                </ThemedText>
              </Pressable>
              
              <Pressable
                style={[
                  styles.eventTypeChip,
                  { backgroundColor: cardBackground, borderColor },
                  isFilterActive('eventType', true) && { backgroundColor: tintColor, borderColor: tintColor }
                ]}
                onPress={() => handleEventTypeSelect(true)}
              >
                <Ionicons
                  name="globe"
                  size={16}
                  color={isFilterActive('eventType', true) ? colors.background.primary : textColor}
                  style={styles.eventTypeIcon}
                />
                <ThemedText
                  style={[
                    styles.eventTypeChipText,
                    { color: textColor },
                    isFilterActive('eventType', true) && { color: colors.background.primary }
                  ]}
                >
                  Online
                </ThemedText>
              </Pressable>
              
              <Pressable
                style={[
                  styles.eventTypeChip,
                  { backgroundColor: cardBackground, borderColor },
                  isFilterActive('eventType', false) && { backgroundColor: tintColor, borderColor: tintColor }
                ]}
                onPress={() => handleEventTypeSelect(false)}
              >
                <Ionicons
                  name="location"
                  size={16}
                  color={isFilterActive('eventType', false) ? colors.background.primary : textColor}
                  style={styles.eventTypeIcon}
                />
                <ThemedText
                  style={[
                    styles.eventTypeChipText,
                    { color: textColor },
                    isFilterActive('eventType', false) && { color: colors.background.primary }
                  ]}
                >
                  Venue
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: cardBackground, borderTopColor: borderColor }]}>
          <Pressable
            style={[styles.applyButton, { backgroundColor: tintColor }]}
            onPress={handleApplyFilters}
          >
            <ThemedText style={styles.applyButtonText}>
              Apply Filters {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  resetButton: {
    padding: 8,
  },
  resetText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  priceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: (screenWidth - 80) / 2,
  },
  priceChipText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  eventTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  eventTypeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  eventTypeIcon: {
    marginRight: 8,
  },
  eventTypeChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default React.memo(EventFilters);
