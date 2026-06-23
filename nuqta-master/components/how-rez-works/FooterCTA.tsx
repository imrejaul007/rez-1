import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

const FooterCTA: React.FC = () => {
  const router = useRouter();

  const handleExploreNearby = () => {
    // Navigate to nearby stores/explore page
    router.push('/StoreListPage');
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient
      colors={[colors.successScale[700], '#047857', '#065F46']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Rocket Icon */}
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="rocket" size={32} color={colors.successScale[700]} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>Ready to Start?</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        You don't need to change how you shop.
      </Text>
      <Text style={styles.subtitleBold}>
        You just need to start with ReZ.
      </Text>

      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Primary Button - Explore Nearby */}
        <Pressable
          style={styles.primaryButton}
          onPress={handleExploreNearby}
         
        >
          <Ionicons name="location" size={18} color={colors.successScale[700]} />
          <Text style={styles.primaryButtonText}>Explore Nearby Rewards</Text>
        </Pressable>

        {/* Secondary Button - Go to Home */}
        <Pressable
          style={styles.secondaryButton}
          onPress={handleGoHome}
         
        >
          <Ionicons name="home" size={18} color={colors.background.primary} />
          <Text style={styles.secondaryButtonText}>Go to Home</Text>
        </Pressable>
      </View>

      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.background.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  subtitleBold: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
    textAlign: 'center',
    marginBottom: 28,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.successScale[700],
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});

export default React.memo(FooterCTA);
