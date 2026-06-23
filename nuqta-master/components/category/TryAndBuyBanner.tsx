/**
 * TryAndBuyBanner Component
 * 60-min Try & Buy promotional banner
 * Adapted from Rez_v-2-main 60-min pattern
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface TryAndBuyBannerProps {
  categorySlug?: string;
  onPress?: () => void;
}

const TryAndBuyBanner: React.FC<TryAndBuyBannerProps> = ({
  categorySlug,
  onPress,
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/products',
        params: { filter: '60min', category: categorySlug },
      } as any);
    }
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
     
    >
      <LinearGradient
        colors={[colors.warningScale[400], colors.warningScale[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="flash" size={28} color={colors.background.primary} />
          </View>

          {/* Text */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>60-Min Try & Buy</Text>
            <Text style={styles.description}>
              Get products delivered in 60 mins. Try before you pay!
            </Text>
          </View>

          {/* Button */}
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>Explore</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.warningScale[700]} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.warningScale[400],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
      },
    }),
  },
  gradient: {
    padding: 18,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 3,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 17,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warningScale[700],
  },
});

export default memo(TryAndBuyBanner);
