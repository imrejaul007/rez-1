/**
 * EmptySearchState Component
 *
 * Display state when no search results are found with animated illustration.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  EmptySearchStateProps,
  PAYMENT_SEARCH_COLORS,
} from '@/types/paymentStoreSearch.types';

export const EmptySearchState: React.FC<EmptySearchStateProps> = ({
  query,
  onClearSearch,
  onRetry,
}) => {
  const iconScale = useSharedValue(1);
  const iconRotate = useSharedValue(0);

  useEffect(() => {
    // Gentle breathing animation for the icon
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Subtle rotation
    iconRotate.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [iconScale, iconRotate]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotate.value}deg` },
    ],
  }));

  return (
    <Animated.View
      entering={FadeIn.springify()}
      style={styles.container}
    >
      {/* Animated Icon */}
      <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="search-outline"
            size={48}
            color={PAYMENT_SEARCH_COLORS.textTertiary}
          />
        </View>
      </Animated.View>

      {/* Text Content */}
      <Text style={styles.title}>No stores found</Text>
      <Text style={styles.subtitle}>
        We couldn't find any stores matching "{query}"
      </Text>
      <Text style={styles.hint}>
        Try searching with different keywords or browse categories
      </Text>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Pressable
          onPress={onClearSearch}
          style={styles.primaryButton}
         
        >
          <Ionicons
            name="close-circle-outline"
            size={20}
            color={PAYMENT_SEARCH_COLORS.textInverse}
            style={styles.buttonIcon}
          />
          <Text style={styles.primaryButtonText}>Clear Search</Text>
        </Pressable>

        {onRetry && (
          <Pressable
            onPress={onRetry}
            style={styles.secondaryButton}
           
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={PAYMENT_SEARCH_COLORS.primary}
              style={styles.buttonIcon}
            />
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </Pressable>
        )}
      </View>

      {/* Suggestions */}
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Popular searches:</Text>
        <View style={styles.suggestionChips}>
          {['Food', 'Fashion', 'Electronics', 'Grocery'].map((suggestion) => (
            <Pressable
              key={suggestion}
              style={styles.suggestionChip}
             
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PAYMENT_SEARCH_COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: PAYMENT_SEARCH_COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: PAYMENT_SEARCH_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: PAYMENT_SEARCH_COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PAYMENT_SEARCH_COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PAYMENT_SEARCH_COLORS.textInverse,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PAYMENT_SEARCH_COLORS.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PAYMENT_SEARCH_COLORS.primary,
  },
  buttonIcon: {
    marginRight: 6,
  },
  suggestionsContainer: {
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 12,
    color: PAYMENT_SEARCH_COLORS.textTertiary,
    marginBottom: 12,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: PAYMENT_SEARCH_COLORS.surface,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PAYMENT_SEARCH_COLORS.border,
  },
  suggestionText: {
    fontSize: 12,
    color: PAYMENT_SEARCH_COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default React.memo(EmptySearchState);
