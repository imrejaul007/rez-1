/**
 * CashStoreSearchBar Component
 *
 * Premium search bar with "Deals" button for Cash Store page
 * Frosted glass design with warm accents
 *
 * Uses Nuqta Palette: Nile Blue (#1a3a52), Light Mustard (#ffcd57),
 * Linen (#faf1e0), Light Peach (#ffd7b5), Lavender Mist (#dfebf7)
 */

import React, { memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

interface CashStoreSearchBarProps {
  onSearchPress?: () => void;
}

const CashStoreSearchBar: React.FC<CashStoreSearchBarProps> = ({
  onSearchPress,
}) => {
  const router = useRouter();
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(10);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 400 });
    slideAnim.value = withTiming(0, { duration: 400 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  const handleDealsPress = () => {
    router.push('/offers' as any);
  };

  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    } else {
      router.push('/search' as any);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
      ]}
    >
      <View style={styles.searchRow}>
        {/* Search Input - frosted glass */}
        <Pressable
          style={styles.searchContainer}
          onPress={handleSearchPress}
         
        >
          <Ionicons
            name="search"
            size={18}
            color={colors.nileBlue}
            style={styles.searchIcon}
          />
          <Text style={styles.searchPlaceholder}>Search stores & deals...</Text>
        </Pressable>

        {/* Deals Button - Nile Blue for strong contrast */}
        <Pressable
          style={styles.dealsButtonWrapper}
          onPress={handleDealsPress}
         
        >
          <LinearGradient
            colors={[colors.nileBlue, colors.brand.nileBlueLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dealsButton}
          >
            <Ionicons name="flash" size={16} color={colors.lightMustard} />
            <Text style={styles.dealsText}>Deals</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,181,0.4)',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 10,
    opacity: 0.5,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: colors.nileBlue,
    opacity: 0.4,
    flex: 1,
  },
  dealsButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  dealsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 6,
    borderRadius: 16,
  },
  dealsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.3,
  },
});

export default memo(CashStoreSearchBar);
