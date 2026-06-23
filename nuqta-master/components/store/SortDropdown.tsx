import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export type SortOption = 'newest' | 'price_low' | 'price_high' | 'rating' | 'popularity';

interface SortDropdownProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

interface SortOptionItem {
  value: SortOption;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SORT_OPTIONS: SortOptionItem[] = [
  { value: 'newest', label: 'Newest First', icon: 'time-outline' },
  { value: 'price_low', label: 'Price: Low to High', icon: 'arrow-up-outline' },
  { value: 'price_high', label: 'Price: High to Low', icon: 'arrow-down-outline' },
  { value: 'rating', label: 'Highest Rated', icon: 'star-outline' },
  { value: 'popularity', label: 'Most Popular', icon: 'trending-up-outline' },
];

const SortDropdown: React.FC<SortDropdownProps> = ({ currentSort, onSortChange }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const currentLabel = SORT_OPTIONS.find(option => option.value === currentSort)?.label || 'Sort';

  const handleSortSelect = (sort: SortOption) => {
    onSortChange(sort);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Dropdown Button */}
      <Pressable
        style={styles.button}
        onPress={() => setModalVisible(true)}
       
      >
        <Ionicons name="swap-vertical" size={18} color={colors.brand.purple} />
        <Text style={styles.buttonText} numberOfLines={1}>
          {currentLabel}
        </Text>
        <Ionicons
          name={modalVisible ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.brand.purple}
        />
      </Pressable>

      {/* Modal with Sort Options */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.slateGray} />
              </Pressable>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Sort Options */}
            {SORT_OPTIONS.map((option, index) => {
              const isSelected = option.value === currentSort;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionItem,
                    index === SORT_OPTIONS.length - 1 && styles.lastOptionItem,
                  ]}
                  onPress={() => handleSortSelect(option.value)}
                 
                >
                  <View style={styles.optionLeft}>
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isSelected ? colors.brand.purple : colors.slateGray}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.brand.purple} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    gap: 6,
    minWidth: 120,
    maxWidth: 180,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.purple,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: colors.slateLight,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.tint.slate,
  },
  lastOptionItem: {
    borderBottomWidth: 0,
    paddingBottom: 20,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
  },
  optionLabelSelected: {
    color: colors.brand.purple,
    fontWeight: '600',
  },
});

export default React.memo(SortDropdown);
