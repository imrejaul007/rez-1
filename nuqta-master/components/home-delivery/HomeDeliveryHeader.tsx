import React, { useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { HomeDeliveryHeaderProps } from '@/types/home-delivery.types';
import { colors } from '@/constants/theme';

// Nuqta Design System Colors
const COLORS = {
  primary: colors.nileBlue,
  primaryDark: colors.nileBlue,
  gold: colors.lightMustard,
  navy: colors.brand.navyDark,
  surface: '#F7FAFC',
  glassWhite: 'rgba(255, 255, 255, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
  glassHighlight: 'rgba(255, 255, 255, 0.5)',
};

function _HomeDeliveryHeaderInner({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onBack,
  onHideSearch,
  onShowSearch,
  showSearchBar = false,
  suggestions = [],
  showSuggestions = false,
}: HomeDeliveryHeaderProps) {
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
      {/* Premium Glassmorphism Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Glass overlay effect */}
        <View style={styles.glassOverlay} />

        {/* Decorative elements */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.decorCircle3} />

        {/* Header Top Row */}
        <View style={styles.headerTop}>
          <Pressable
            style={styles.backButton}
            onPress={onBack}
           
            accessibilityLabel="Back"
            accessibilityRole="button"
            accessibilityHint="Double tap to go back to previous page"
          >
            <View style={styles.glassButton}>
              <Ionicons name="arrow-back" size={20} color="white" />
            </View>
          </Pressable>

          <View style={styles.titleContainer}>
            <ThemedText style={styles.headerTitle}>Home Delivery</ThemedText>
            <View style={styles.titleUnderline} />
          </View>

          <Pressable
            style={styles.searchIconButton}
            onPress={handleSearchIconPress}
           
            accessibilityLabel={isSearchVisible ? "Hide search bar" : "Show search bar"}
            accessibilityRole="button"
            accessibilityHint={`Double tap to ${isSearchVisible ? 'hide' : 'show'} the search bar`}
            accessibilityState={{ expanded: isSearchVisible }}
          >
            <View style={[styles.glassButton, isSearchVisible && styles.glassButtonActive]}>
              <Ionicons name="search" size={20} color="white" />
            </View>
          </Pressable>
        </View>

        {/* Premium Glass Search Bar - Toggle Visible */}
        <Animated.View
          style={[
            styles.searchBarContainer,
            searchBarAnimStyle,
          ]}
        >
          <View style={styles.searchContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={18} color={COLORS.primary} />
            </View>

            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search products, brands, stores..."
              placeholderTextColor={colors.gray[400]}
              value={searchQuery}
              onChangeText={onSearchChange}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search input"
              accessibilityHint="Enter product name, brand, or store to search"
              accessibilityRole="search"
            />

            {searchQuery.length > 0 && (
              <Pressable
                style={styles.clearButton}
                onPress={handleClearSearch}
               
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                accessibilityHint="Double tap to clear search text"
              >
                <Ionicons name="close-circle" size={18} color={COLORS.primary} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0px 8px 32px rgba(26, 58, 82, 0.35)',
      },
    }),
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    top: 60,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 200, 87, 0.15)',
  },
  decorCircle3: {
    position: 'absolute',
    bottom: -20,
    right: 60,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    zIndex: 2,
  },
  backButton: {
    zIndex: 3,
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      },
    }),
  },
  glassButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
    marginTop: 6,
    opacity: 0.9,
  },
  searchIconButton: {
    zIndex: 3,
  },
  searchBarContainer: {
    marginTop: 8,
    zIndex: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      },
    }),
  },
  searchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 58, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.navy,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export const HomeDeliveryHeader = React.memo(_HomeDeliveryHeaderInner);
