import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { GoingOutHeaderProps } from '@/types/going-out.types';
import { colors } from '@/constants/theme';

function _GoingOutHeaderInner({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onBack,
  onHideSearch,
  onShowSearch,
  showSearchBar = false,
  suggestions = [],
  showSuggestions = false,
}: GoingOutHeaderProps) {
  const searchInputRef = useRef<TextInput>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchHeightAnim = useSharedValue(0);

  const handleSearchIconPress = () => {
    // Toggle the search bar
    const toValue = isSearchVisible ? 0 : 1;
    setIsSearchVisible(!isSearchVisible);

    searchHeightAnim.value = withSpring(toValue, { damping: 15, stiffness: 120 });
    // Focus the input after animation if showing
    if (!isSearchVisible) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  };

  const handleSearch = () => {
    onSearchSubmit(searchQuery);
  };

  const handleClearSearch = () => {
    onSearchChange('');
    // Close search bar when clearing
    setIsSearchVisible(false);
    searchHeightAnim.value = withSpring(0, { damping: 15, stiffness: 120 });
  };

  // Animated styles
  const searchBarAnimStyle = useAnimatedStyle(() => ({
    height: interpolate(searchHeightAnim.value, [0, 1], [0, 80]),
    opacity: interpolate(searchHeightAnim.value, [0, 0.5, 1], [0, 0.5, 1]),
    overflow: 'hidden' as const,
  }));

  return (
    <View style={styles.container}>
      {/* Modern Header with Gradient */}
      <View style={styles.headerGradient}>
        {/* Header Top Row */}
        <View style={styles.headerTop}>
          <Pressable
            style={styles.backButton}
            onPress={onBack}
           
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </Pressable>

          <ThemedText style={styles.headerTitle}>Going out</ThemedText>

          <Pressable
            style={styles.searchIconButton}
            onPress={handleSearchIconPress}
           
            accessibilityLabel={isSearchVisible ? "Close search" : "Open search"}
            accessibilityRole="button"
            accessibilityHint={`Double tap to ${isSearchVisible ? 'close' : 'open'} search bar`}
          >
            <Ionicons name="search" size={22} color="white" />
          </Pressable>
        </View>

        {/* Modern Search Bar - Toggle Visible */}
        <Animated.View
          style={[
            styles.searchBarContainer,
            searchBarAnimStyle,
          ]}
        >
          <View style={styles.searchContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={18} color={colors.brand.purpleLight} />
            </View>
            
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search products, brands, stores..."
              placeholderTextColor={colors.brand.purpleSoft}
              value={searchQuery}
              onChangeText={onSearchChange}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search products"
              accessibilityHint="Enter keywords to search for products, brands, or stores"
              accessibilityRole="search"
            />
            
            {searchQuery.length > 0 && (
              <Pressable
                style={styles.clearButton}
                onPress={handleClearSearch}
               
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                accessibilityHint="Double tap to clear search input"
              >
                <Ionicons name="close-circle" size={18} color={colors.brand.purpleSoft} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  headerGradient: {
    backgroundColor: colors.brand.purpleLight,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purpleLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(139, 92, 246, 0.3)',
      },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },
  searchIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchBarContainer: {
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  searchIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[800],
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export const GoingOutHeader = React.memo(_GoingOutHeaderInner);
