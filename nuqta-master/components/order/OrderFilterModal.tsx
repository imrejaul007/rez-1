// OrderFilterModal Component
// Modal for filtering and sorting orders

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderFilter, OrderStatus } from '@/types/order';
import { colors } from '@/constants/theme';

interface OrderFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filter: OrderFilter) => void;
  currentFilter: OrderFilter;
}

const OrderFilterModal: React.FC<OrderFilterModalProps> = ({
  visible,
  onClose,
  onApply,
  currentFilter,
}) => {
  const [filter, setFilter] = useState<OrderFilter>(currentFilter);

  const statusOptions: Array<{ value: 'all' | OrderStatus; label: string }> = [
    { value: 'all', label: 'All Orders' },
    { value: 'placed', label: 'Placed' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'dispatched', label: 'Dispatched' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'returned', label: 'Returned' },
  ];

  const dateRangeOptions: Array<{ value: OrderFilter['dateRange']; label: string }> = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  const sortOptions: Array<{ value: OrderFilter['sortBy']; label: string }> = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'amount_high', label: 'Amount: High to Low' },
    { value: 'amount_low', label: 'Amount: Low to High' },
  ];

  const handleApply = () => {
    onApply(filter);
  };

  const handleReset = () => {
    const resetFilter: OrderFilter = {
      status: 'all',
      dateRange: 'all',
      sortBy: 'newest',
    };
    setFilter(resetFilter);
  };

  const renderOption = (
    title: string,
    options: Array<{ value: any; label: string }>,
    currentValue: any,
    onSelect: (value: any) => void
  ) => (
    <View style={styles.section}>
      <Text
        style={styles.sectionTitle}
        accessibilityRole="header"
      >
        {title}
      </Text>
      <View
        style={styles.optionsContainer}
        accessibilityRole="radiogroup"
        accessibilityLabel={title}
      >
        {options.map((option) => {
          const isSelected = currentValue === option.value;
          return (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
              ]}
              onPress={() => onSelect(option.value)}
              accessibilityLabel={`${option.label}${isSelected ? ', selected' : ''}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, checked: isSelected }}
              accessibilityHint={`Double tap to select ${option.label}`}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark" size={16} color={colors.brand.purple} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close filter modal"
            accessibilityRole="button"
            accessibilityHint="Double tap to close filter options"
          >
            <Ionicons name="close" size={24} color={colors.neutral[700]} />
          </Pressable>
          <Text style={styles.headerTitle}>Filter Orders</Text>
          <Pressable
            onPress={handleReset}
            style={styles.resetButton}
            accessibilityLabel="Reset all filters"
            accessibilityRole="button"
            accessibilityHint="Double tap to reset filters to default"
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderOption(
            'Order Status',
            statusOptions,
            filter.status,
            (value) => setFilter({ ...filter, status: value })
          )}

          {renderOption(
            'Date Range',
            dateRangeOptions,
            filter.dateRange,
            (value) => setFilter({ ...filter, dateRange: value })
          )}

          {renderOption(
            'Sort By',
            sortOptions,
            filter.sortBy,
            (value) => setFilter({ ...filter, sortBy: value })
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={styles.cancelButton}
            onPress={onClose}
            accessibilityLabel="Cancel filter changes"
            accessibilityRole="button"
            accessibilityHint="Double tap to cancel and close without applying filters"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={styles.applyButton}
            onPress={handleApply}
            accessibilityLabel="Apply filters"
            accessibilityRole="button"
            accessibilityHint="Double tap to apply selected filters to order list"
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  resetButton: {
    padding: 4,
  },
  resetButtonText: {
    fontSize: 16,
    color: colors.brand.purple,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 12,
  },
  optionsContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  optionSelected: {
    backgroundColor: colors.tint.pink,
  },
  optionText: {
    fontSize: 16,
    color: colors.neutral[700],
  },
  optionTextSelected: {
    color: colors.brand.purple,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand.purple,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default React.memo(OrderFilterModal);
