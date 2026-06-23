/**
 * StoreExperienceCard Component
 * A gradient card for store experience types (60-min delivery, ₹1 store, luxury, organic)
 * Navigates to StoreListPage with the appropriate store type filter
 */

import React, { memo, useCallback } from 'react';
import { catchSilent } from '@/utils/catchAndReport';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(Pressable);

export type StoreType = 'fastDelivery' | 'budgetFriendly' | 'premium' | 'organic';

export interface StoreExperienceCardProps {
  title: string;
  subtitle: string;
  icon: string;
  buttonText: string;
  gradientColors: readonly [string, string];
  storeType: StoreType;
  buttonTextColor?: string;
}

const StoreExperienceCard: React.FC<StoreExperienceCardProps> = memo(({
  title,
  subtitle,
  icon,
  buttonText,
  gradientColors,
  storeType,
  buttonTextColor = colors.text.primary,
}) => {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 15 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15 });
  }, []);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch (e) { catchSilent(e, 'StoreExperienceCard/haptics'); }
    }
    router.push({
      pathname: '/StoreListPage',
      params: { category: storeType },
    });
  }, [router, storeType]);

  return (
    <AnimatedTouchable
      style={[styles.cardContainer, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
     
      accessibilityRole="button"
      accessibilityLabel={`${title} - ${subtitle}`}
    >
      <LinearGradient
        colors={gradientColors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Pressable
            style={styles.button}
            onPress={handlePress}
           
          >
            <Text style={[styles.buttonText, { color: buttonTextColor }]}>
              {buttonText}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    </AnimatedTouchable>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.icon === nextProps.icon &&
    prevProps.buttonText === nextProps.buttonText &&
    prevProps.storeType === nextProps.storeType &&
    prevProps.gradientColors[0] === nextProps.gradientColors[0] &&
    prevProps.gradientColors[1] === nextProps.gradientColors[1]
  );
});

StoreExperienceCard.displayName = 'StoreExperienceCard';

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  gradient: {
    borderRadius: 16,
  },
  contentContainer: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
    marginLeft: 28,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export { StoreExperienceCard };
