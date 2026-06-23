// @ts-nocheck
import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { SearchHeaderProps } from '@/types/store-search';
import { COLORS, TYPOGRAPHY, SPACING, DEFAULTS } from '@/constants/search-constants';

const SearchHeader: React.FC<SearchHeaderProps & { title?: string; rightElement?: React.ReactNode }> = ({
  query,
  onQueryChange,
  onBack,
  placeholder = DEFAULTS.SEARCH_PLACEHOLDER,
  isLoading = false,
  title,
  rightElement,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const screenWidth = Dimensions.get('window').width;

  const handleClearSearch = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };

  const handleSearchSubmit = () => {
    inputRef.current?.blur();
  };

  const styles = createStyles(screenWidth);

  return (
    <LinearGradient
      colors={[COLORS.PRIMARY, COLORS.PRIMARY_LIGHT, '#00E681']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Header Content */}
      <View style={styles.headerContent}>
        {/* Back Button */}
        <Pressable
          style={styles.backButton}
          onPress={onBack}
         
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={COLORS.WHITE}
          />
        </Pressable>

        {/* Page Title */}
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {title || 'Store list page'}
          </ThemedText>
        </View>

        {/* Right action or spacing */}
        {rightElement || <View style={styles.rightSpacer} />}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[
          styles.searchInputContainer,
          isFocused && styles.searchInputContainerFocused
        ]}>
          {/* Search Icon */}
          <Ionicons
            name="search"
            size={18}
            color={COLORS.GRAY_400}
            style={styles.searchIcon}
          />

          {/* Search Input */}
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={onQueryChange}
            placeholder={placeholder}
            placeholderTextColor={COLORS.GRAY_400}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={100}
            editable={!isLoading}
            accessibilityLabel="Search products"
            accessibilityHint="Enter product name to search across stores"
             underlineColorAndroid="transparent"
          />

          {/* Clear Button or Loading */}
          {query.length > 0 && (
            <Pressable
              style={styles.clearButton}
              onPress={handleClearSearch}
             
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              {isLoading ? (
                <Ionicons
                  name="refresh"
                  size={16}
                  color={COLORS.GRAY_400}
                />
              ) : (
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={COLORS.GRAY_400}
                />
              )}
            </Pressable>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

const createStyles = (screenWidth: number) => {
  const isTablet = screenWidth > 768;
  const horizontalPadding = isTablet ? 24 : 16;

  return StyleSheet.create({
    container: {
      paddingTop: Platform.OS === 'ios' ? SPACING.LG : SPACING.XL,
      paddingBottom: SPACING.LG,
      paddingHorizontal: horizontalPadding,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.MD,
      minHeight: 44,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: SPACING.SM,
    },
    title: {
      color: COLORS.WHITE,
      fontSize: isTablet
        ? TYPOGRAPHY.FONT_SIZE_4XL
        : TYPOGRAPHY.FONT_SIZE_2XL,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    rightSpacer: {
      width: 40,
    },
    searchContainer: {
      width: '100%',
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.WHITE,
      borderRadius: 28,
      paddingHorizontal: SPACING.LG,
      paddingVertical: Platform.OS === 'ios' ? SPACING.MD : SPACING.SM,
      minHeight: 46,
      shadowColor: 'rgba(0, 0, 0, 0.15)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 4,
    },
    searchInputContainerFocused: {
      shadowColor: COLORS.PRIMARY,
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
      borderWidth: 2,
      borderColor: 'rgba(0, 192, 106, 0.3)',
    },
    searchIcon: {
      marginRight: SPACING.SM,
    },
    searchInput: {
      flex: 1,
      fontSize: TYPOGRAPHY.FONT_SIZE_BASE,
      color: COLORS.TEXT_PRIMARY,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_NORMAL,
      paddingVertical: 0,
       outlineWidth: 0,
    },
    clearButton: {
      padding: SPACING.XS,
      marginLeft: SPACING.XS,
    },
  });
};

export default React.memo(SearchHeader);