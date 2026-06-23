import React, { useEffect} from 'react';
import { colors } from '@/constants/theme';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

function DealCardSkeleton() {
  const screenWidth = Dimensions.get('window').width;
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1
    );
  }, []);

  const shimmerOpacity = interpolate(shimmerAnim.value, [0, 1], [0.3, 0.8]);

  const styles = createStyles(screenWidth);

  return (
    <View
      style={styles.card}
      accessibilityLabel="Loading deal"
      accessibilityRole="none"
    >
      {/* Badge skeleton */}
      <Animated.View 
        style={[
          styles.badge,
          { opacity: shimmerOpacity }
        ]} 
      />

      {/* Title skeleton */}
      <Animated.View 
        style={[
          styles.title,
          { opacity: shimmerOpacity }
        ]} 
      />

      {/* Description skeleton */}
      <Animated.View 
        style={[
          styles.description,
          { opacity: shimmerOpacity }
        ]} 
      />

      {/* Minimum bill skeleton */}
      <Animated.View 
        style={[
          styles.minimumBill,
          { opacity: shimmerOpacity }
        ]} 
      />

      {/* Category badge skeleton */}
      <Animated.View 
        style={[
          styles.categoryBadge,
          { opacity: shimmerOpacity }
        ]} 
      />

      {/* Availability row skeleton */}
      <View style={styles.availabilityRow}>
        <Animated.View 
          style={[
            styles.availabilityIcon,
            { opacity: shimmerOpacity }
          ]} 
        />
        <Animated.View 
          style={[
            styles.availabilityText,
            { opacity: shimmerOpacity }
          ]} 
        />
      </View>

      {/* Terms skeleton */}
      <View style={styles.termsContainer}>
        <View style={styles.termRow}>
          <Animated.View 
            style={[
              styles.termBullet,
              { opacity: shimmerOpacity }
            ]} 
          />
          <Animated.View 
            style={[
              styles.termText,
              { opacity: shimmerOpacity }
            ]} 
          />
        </View>
        <View style={styles.termRow}>
          <Animated.View 
            style={[
              styles.termBullet,
              { opacity: shimmerOpacity }
            ]} 
          />
          <Animated.View 
            style={[
              styles.termTextShort,
              { opacity: shimmerOpacity }
            ]} 
          />
        </View>
      </View>

      {/* Button skeleton */}
      <Animated.View 
        style={[
          styles.button,
          { opacity: shimmerOpacity }
        ]} 
      />
    </View>
);
}

const createStyles = (screenWidth: number) => {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.background.primary,
      borderRadius: 16,
      marginBottom: 16,
      padding: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 6,
        },
        web: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
      }),
      borderWidth: 1,
      borderColor: colors.tint.slate,
    },
    badge: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 80,
      height: 24,
      backgroundColor: colors.neutral[200],
      borderRadius: 8,
    },
    title: {
      width: screenWidth * 0.6,
      height: 20,
      backgroundColor: colors.neutral[200],
      borderRadius: 4,
      marginTop: 8,
      marginBottom: 8,
    },
    description: {
      width: screenWidth * 0.7,
      height: 16,
      backgroundColor: colors.neutral[200],
      borderRadius: 4,
      marginBottom: 8,
    },
    minimumBill: {
      width: screenWidth * 0.4,
      height: 16,
      backgroundColor: colors.neutral[200],
      borderRadius: 4,
      marginBottom: 12,
    },
    categoryBadge: {
      width: 60,
      height: 20,
      backgroundColor: colors.neutral[200],
      borderRadius: 12,
      marginBottom: 12,
    },
    availabilityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    availabilityIcon: {
      width: 16,
      height: 16,
      backgroundColor: colors.neutral[200],
      borderRadius: 8,
      marginRight: 8,
    },
    availabilityText: {
      width: screenWidth * 0.5,
      height: 14,
      backgroundColor: colors.neutral[200],
      borderRadius: 4,
    },
    termsContainer: {
      marginBottom: 16,
    },
    termRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    termBullet: {
      width: 4,
      height: 4,
      backgroundColor: colors.neutral[200],
      borderRadius: 2,
      marginRight: 12,
    },
    termText: {
      width: screenWidth * 0.65,
      height: 12,
      backgroundColor: colors.neutral[200],
      borderRadius: 4,
    },
    termTextShort: {
      width: screenWidth * 0.5,
      height: 12,
      backgroundColor: colors.neutral[200],
      borderRadius: 4,
    },
    button: {
      width: '100%',
      height: 48,
      backgroundColor: colors.neutral[200],
      borderRadius: 12,
    },
  });
};

export default React.memo(DealCardSkeleton);
