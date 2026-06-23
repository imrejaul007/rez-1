import React, { useEffect } from 'react';
import { Pressable, View, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ProjectStatusCardProps } from '@/types/earnPage.types';
import { PROJECT_STATUS_COLORS } from '@/constants/EarnPageColors';
import { colors } from '@/constants/theme';

function ProjectStatusCard({ 
  label, 
  count, 
  color, 
  gradient,
  onPress,
  delay = 0,
}: ProjectStatusCardProps & { gradient?: string[]; delay?: number }) {
  const statusKey = label.toLowerCase().replace(' ', '-') as keyof typeof PROJECT_STATUS_COLORS;
  const statusColors = PROJECT_STATUS_COLORS[statusKey] || {
    background: color || colors.brand.purpleLight,
    text: colors.background.primary,
    count: colors.background.primary,
  };

  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);
  const pressAnim = useSharedValue(1);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 500 });
    scaleAnim.value = withSpring(1);
  }, [delay]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value * pressAnim.value }],
  }));

  const handlePressIn = () => {
    pressAnim.value = withSpring(0.92);
  };

  const handlePressOut = () => {
    pressAnim.value = withSpring(1);
  };

  const defaultColor = statusColors.background || color || colors.brand.purpleLight;
  const gradientColors = (gradient && Array.isArray(gradient) && gradient.length > 0)
    ? gradient
    : [defaultColor, `${defaultColor}AA`];

  return (
    <Animated.View style={[cardAnimStyle]}>
      <View>
        <Pressable
          style={styles.container}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
         
          accessibilityLabel={`${label}: ${count} project${count !== 1 ? 's' : ''}`}
          accessibilityRole="button"
          accessibilityHint={`Double tap to view ${label.toLowerCase()} projects`}
        >
          <LinearGradient
            colors={Array.isArray(gradientColors) ? gradientColors : [colors.brand.purpleLight, colors.brand.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.content}
          >
            {/* Decorative background element */}
            <View style={styles.decorativeCircle} />
            
            <View style={styles.contentWrapper}>
              <ThemedText style={[styles.count, { color: statusColors.count }]}>
                {count.toString().padStart(2, '0')}
              </ThemedText>
              
              <ThemedText style={[styles.label, { color: statusColors.text }]}>
                {label}
              </ThemedText>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 0, // Prevent overflow
    maxWidth: '100%', // Ensure it doesn't overflow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 3px 6px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  content: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 5,
    minHeight: 110,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    top: -25,
    right: -25,
  },
  contentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    width: '100%',
  },
  count: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
      web: {
        textShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    opacity: 0.95,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.15)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.15)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0px 1px 2px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
});

export default React.memo(ProjectStatusCard);
