// @ts-nocheck
import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { FilterChipsProps, SearchFilters, FilterOption } from '@/types/store-search';
import {
  FILTER_CATEGORIES,
  GENDER_OPTIONS,
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS
} from '@/constants/search-constants';
import { colors } from '@/constants/theme';

const FilterChips: React.FC<FilterChipsProps & { parentCategorySlug?: string }> = ({
  filters,
  availableFilters,
  onFilterChange,
  isLoading = false,
  parentCategorySlug,
}) => {
  const [showGenderModal, setShowGenderModal] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  // Handle fashion filter toggle
  const handleFashionToggle = () => {
    const newCategories = filters.categories.includes('fashion')
      ? filters.categories.filter(cat => cat !== 'fashion')
      : [...filters.categories, 'fashion'];
    
    onFilterChange({
      ...filters,
      categories: newCategories,
    });
  };

  // Handle gender selection
  const handleGenderSelect = (genderId: string) => {
    const newGenders = filters.gender.includes(genderId as any)
      ? filters.gender.filter(g => g !== genderId)
      : [...filters.gender, genderId as any];
    
    onFilterChange({
      ...filters,
      gender: newGenders,
    });
  };

  // Determine which filters to show based on parent category
  const showFashion = parentCategorySlug === 'fashion';
  const showGender = ['fashion', 'beauty-wellness', 'fitness-sports'].includes(parentCategorySlug || '');

  // Check if filter is active
  const isFashionActive = filters.categories.includes('fashion');
  const isGenderActive = filters.gender.length > 0;

  const styles = createStyles(screenWidth);

  const renderGenderOption = useCallback(({ item }: { item: { id: string; label: string; icon: string; color: string } }) => (
    <Pressable
      style={[
        styles.genderOption,
        filters.gender.includes(item.id as any) && styles.genderOptionSelected
      ]}
      onPress={() => handleGenderSelect(item.id)}
      accessibilityRole="checkbox"
      accessibilityLabel={item.label}
      accessibilityHint={filters.gender.includes(item.id as any) ? 'Double tap to deselect' : 'Double tap to select'}
      accessibilityState={{ checked: filters.gender.includes(item.id as any) }}
    >
      <Ionicons
        name={item.icon as any}
        size={22}
        color={filters.gender.includes(item.id as any) ? COLORS.WHITE : item.color}
      />
      <ThemedText style={[
        styles.genderOptionText,
        filters.gender.includes(item.id as any) && styles.genderOptionTextSelected
      ]}>
        {item.label}
      </ThemedText>
      {filters.gender.includes(item.id as any) && (
        <Ionicons
          name="checkmark-circle"
          size={22}
          color={COLORS.WHITE}
        />
      )}
    </Pressable>
  ), [filters.gender, handleGenderSelect, styles]);

  // Hide entire component if no filters are relevant for this category
  if (!showFashion && !showGender) {
    return null;
  }

  // Render gender selection modal
  const renderGenderModal = () => (
    <Modal
      visible={showGenderModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowGenderModal(false)}
    >
      <Pressable 
        style={styles.modalOverlay}
       
        onPress={() => setShowGenderModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Select Gender</ThemedText>
            <Pressable
              onPress={() => setShowGenderModal(false)}
              style={styles.modalCloseButton}
              accessibilityRole="button"
              accessibilityLabel="Close gender selection"
              accessibilityHint="Double tap to close modal"
            >
              <Ionicons name="close" size={24} color={COLORS.GRAY_600} />
            </Pressable>
          </View>
          
          <FlashList
            data={Object.values(GENDER_OPTIONS)}
            keyExtractor={(item) => item.id}
            renderItem={renderGenderOption}
            showsVerticalScrollIndicator={false}
            estimatedItemSize={70}
          />
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Fashion Filter — only for fashion category */}
        {showFashion && (
          <Pressable
            style={[
              styles.filterChip,
              isFashionActive && styles.filterChipActive,
              isLoading && styles.filterChipDisabled
            ]}
            onPress={handleFashionToggle}
            disabled={isLoading}
           
            accessibilityRole="button"
            accessibilityLabel="Fashion filter"
            accessibilityHint={isFashionActive ? 'Double tap to remove fashion filter' : 'Double tap to apply fashion filter'}
            accessibilityState={{ selected: isFashionActive, disabled: isLoading }}
          >
            <Ionicons
              name={FILTER_CATEGORIES.FASHION.icon as any}
              size={16}
              color={isFashionActive ? colors.background.primary : FILTER_CATEGORIES.FASHION.color}
              style={styles.chipIcon}
            />
            <ThemedText style={[
              styles.chipText,
              isFashionActive && styles.chipTextActive
            ]}>
              {FILTER_CATEGORIES.FASHION.label}
            </ThemedText>
          </Pressable>
        )}

        {/* Gender Filter — only for fashion, beauty, fitness */}
        {showGender && (
          <Pressable
            style={[
              styles.filterChip,
              isGenderActive && styles.filterChipActive,
              isLoading && styles.filterChipDisabled
            ]}
            onPress={() => setShowGenderModal(true)}
            disabled={isLoading}
           
            accessibilityRole="button"
            accessibilityLabel={filters.gender.length > 0 ? `Gender filter. ${filters.gender.length} selected` : 'Gender filter'}
            accessibilityHint="Double tap to open gender selection"
            accessibilityState={{ selected: isGenderActive, disabled: isLoading }}
          >
            <Ionicons
              name={FILTER_CATEGORIES.GENDER.icon as any}
              size={16}
              color={isGenderActive ? colors.background.primary : FILTER_CATEGORIES.GENDER.color}
              style={styles.chipIcon}
            />
            <ThemedText style={[
              styles.chipText,
              isGenderActive && styles.chipTextActive
            ]}>
              {filters.gender.length > 0
                ? `Gender (${filters.gender.length})`
                : FILTER_CATEGORIES.GENDER.label
              }
            </ThemedText>
            <Ionicons
              name="chevron-down"
              size={14}
              color={isGenderActive ? colors.background.primary : FILTER_CATEGORIES.GENDER.color}
              style={styles.chevronIcon}
            />
          </Pressable>
        )}

        {/* Clear Filters Button (shows when any visible filter is active) */}
        {((showFashion && isFashionActive) || (showGender && isGenderActive)) && (
          <Pressable
            style={styles.clearFiltersChip}
            onPress={() => onFilterChange({
              categories: [],
              gender: [],
              hasRezPay: false,
              priceRange: undefined,
              distance: undefined,
              storeStatus: [],
            })}
            disabled={isLoading}
           
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            accessibilityHint="Double tap to remove all active filters"
          >
            <Ionicons
              name="close-circle"
              size={16}
              color={colors.error}
              style={styles.chipIcon}
            />
            <ThemedText style={styles.clearFiltersText}>
              Clear All
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>

      {/* Gender Selection Modal */}
      {renderGenderModal()}
    </View>
  );
};

const createStyles = (screenWidth: number) => {
  const isTablet = screenWidth > 768;
  const horizontalPadding = isTablet ? 24 : 16;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.offWhite,
      paddingVertical: 10,
    },
    scrollContent: {
      paddingHorizontal: horizontalPadding,
      gap: 6,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.WHITE,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 8,
      borderWidth: 1.5,
      borderColor: '#E8E8E8',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    filterChipActive: {
      backgroundColor: colors.brand.green,
      borderColor: colors.brand.green,
      shadowColor: colors.brand.green,
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    filterChipDisabled: {
      opacity: 0.5,
    },
    clearFiltersChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.errorScale[100],
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 8,
      borderWidth: 1.5,
      borderColor: '#FCA5A5',
    },
    chipIcon: {
      marginRight: 4,
    },
    chevronIcon: {
      marginLeft: 2,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.neutral[800],
      letterSpacing: 0.1,
    },
    chipTextActive: {
      color: COLORS.WHITE,
      fontWeight: '700',
    },
    clearFiltersText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.error,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.LG,
    },
    modalContent: {
      backgroundColor: COLORS.WHITE,
      borderRadius: 24,
      padding: SPACING.XL,
      width: '90%',
      maxWidth: 400,
      maxHeight: '70%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 15,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.XL,
      paddingBottom: SPACING.MD,
      borderBottomWidth: 2,
      borderBottomColor: colors.neutral[100],
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.neutral[900],
      letterSpacing: 0.3,
    },
    modalCloseButton: {
      padding: 8,
      backgroundColor: colors.neutral[100],
      borderRadius: 20,
    },
    genderOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: SPACING.LG,
      borderRadius: 16,
      marginBottom: 10,
      backgroundColor: colors.neutral[50],
      borderWidth: 2,
      borderColor: 'transparent',
    },
    genderOptionSelected: {
      backgroundColor: colors.brand.green,
      borderColor: colors.brand.green,
      shadowColor: colors.brand.green,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    genderOptionText: {
      flex: 1,
      marginLeft: 12,
      fontSize: 16,
      fontWeight: '600',
      color: colors.neutral[700],
      letterSpacing: 0.2,
    },
    genderOptionTextSelected: {
      color: COLORS.WHITE,
      fontWeight: '700',
    },
  });
};

export default React.memo(FilterChips);