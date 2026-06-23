import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Offers Page - "Near U" (White Theme)
 *
 * Redesigned offers page with ReZ brand styling
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, StatusBar, Dimensions, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { OffersThemeProvider } from '@/contexts/OffersThemeContext';
import { OffersPageContent } from '@/components/offers/OffersPageContent';
import { useAuthUser, useIsAuthenticated, useRezBalance, useRefreshWallet } from '@/stores/selectors';
import { NuqtaCoin as ReZCoin } from '@/components/homepage/ReZCoin';
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '@/constants/DesignSystem';
import { platformAlertSimple } from '@/utils/platformAlert';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useUserIdentityStore, IdentitySegment } from '@/stores/userIdentityStore';

// Segment-aware hero banner config
const SEGMENT_HERO: Partial<Record<IdentitySegment, { title: string; subtitle: string; icon: string; color: string }>> = {
  verified_student:    { title: 'STUDENT OFFERS',    subtitle: 'Exclusive deals for campus life',          icon: 'school',     color: '#8B5CF6' },
  verified_employee:   { title: 'WORK PERKS',        subtitle: 'Corporate benefits & savings',             icon: 'briefcase',  color: '#0EA5E9' },
  verified_healthcare: { title: 'HEALTH DEALS',      subtitle: 'Pharmacy, wellness & medical offers',      icon: 'medkit',     color: '#2ECC71' },
  verified_defence:    { title: 'DEFENCE PERKS',     subtitle: 'Exclusive service member benefits',        icon: 'shield',     color: '#6366F1' },
  verified_teacher:    { title: 'TEACHER BENEFITS',  subtitle: 'Education & stationery savings',           icon: 'book',       color: '#F59E0B' },
  verified_senior:     { title: 'SENIOR OFFERS',     subtitle: 'Special benefits for you',                 icon: 'heart',      color: '#EC4899' },
};

const { width } = Dimensions.get('window');

// New Color Palette
const PALETTE = {
  nileBlue: colors.nileBlue,
  lightMustard: colors.lightMustard,
  linen: colors.linen,
  lightPeach: colors.lightPeach,
  lavenderMist: colors.lavenderMist,
};

function OffersScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { segment } = useUserIdentityStore();
  const heroConfig = SEGMENT_HERO[segment];
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const userCoins = useRezBalance();
  const refreshWallet = useRefreshWallet();
  // Favorite state removed — no backend API integration for page-level favorites

  // Get URL query parameters for filtering
  const searchParams = useLocalSearchParams<{
    type?: string;           // e.g., 'flash-sale', 'bogo', 'nearby'
    tab?: string;            // e.g., 'cashback'
    category?: string;       // category filter
    multiplier?: string;     // e.g., '2' for 2X cashback
    filter?: string;         // e.g., 'double', 'coindrops'
  }>();

  // Convert search params to filter props
  const filterProps = {
    initialType: searchParams.type,
    initialTab: searchParams.tab,
    initialCategory: searchParams.category,
    cashbackMultiplier: searchParams.multiplier ? parseInt(searchParams.multiplier) : undefined,
    initialFilter: searchParams.filter,
  };

  // Reference to OffersPageContent for refresh
  const contentRef = useRef<any>(null);

  const handleBack = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: 'Check out amazing offers on ${BRAND.APP_NAME}! Get up to 50% off + extra cashback on your favorite stores. Download now!',
        url: 'https://nuqta.app/offers',
        title: `${BRAND.APP_NAME} Offers`,
      });

      if (result.action === Share.sharedAction) {
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to share. Please try again.');
    }
  };


  const handleRefresh = useCallback(async () => {
    // Refresh wallet balance
    await refreshWallet();
  }, [refreshWallet]);

  return (
    <OffersThemeProvider mode="light">
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Gradient Header - Linen to White */}
        <LinearGradient
          colors={[PALETTE.linen, '#fdf8f0', colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} style={styles.safeHeader}>
            <View style={styles.header}>
              {/* Back Button */}
              <Pressable
                style={styles.backButton}
                onPress={handleBack}
               
              >
                <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
              </Pressable>

              {/* Center - Title & Coins on same line */}
              <View style={styles.headerCenter}>
                <View style={styles.locationIcon}>
                  <Ionicons name="location" size={14} color={PALETTE.nileBlue} />
                </View>
                <ThemedText style={styles.headerTitle}>Near U Offers</ThemedText>

                {/* ReZ Coin with real balance */}
                <ReZCoin
                  balance={userCoins}
                  size="small"
                  onPress={() => router.push('/coins')}
                  style={styles.coinPill}
                />
              </View>

              {/* Right Actions */}
              <View style={styles.headerRight}>
                <Pressable
                  style={styles.iconButton}
                  onPress={handleShare}
                 
                >
                  <Ionicons name="share-outline" size={20} color={Colors.text.primary} />
                </Pressable>
              </View>
            </View>

            {/* Hero Banner — segment-aware or default */}
            <View style={styles.heroBanner}>
              <LinearGradient
                colors={heroConfig
                  ? [heroConfig.color, heroConfig.color + 'CC', heroConfig.color + '99']
                  : [PALETTE.nileBlue, '#234a64', colors.nileBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroBannerGradient}
              >
                <View style={styles.heroBannerContent}>
                  <View style={styles.heroBannerText}>
                    <ThemedText style={styles.heroTitle}>
                      {heroConfig?.title ?? 'MEGA OFFERS'}
                    </ThemedText>
                    <ThemedText style={styles.heroSubtitle}>
                      {heroConfig?.subtitle ?? 'Up to 50% off + Extra Cashback'}
                    </ThemedText>
                  </View>
                  <View style={styles.heroIconContainer}>
                    <Ionicons
                      name={(heroConfig?.icon ?? 'gift') as any}
                      size={40}
                      color={heroConfig ? '#FFFFFF' : PALETTE.lightMustard}
                    />
                  </View>
                </View>
                <View style={styles.heroShine} />
              </LinearGradient>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Page Content */}
        <OffersPageContent onRefresh={handleRefresh} {...filterProps} />
      </View>
    </OffersThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.linen,
  },
  headerGradient: {
    paddingBottom: 0,
  },
  safeHeader: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    ...Shadows.subtle,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  locationIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PALETTE.lightMustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.nileBlue,
    letterSpacing: -0.3,
  },
  coinPill: {
    backgroundColor: PALETTE.nileBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    ...Shadows.subtle,
  },
  iconButtonActive: {
    backgroundColor: colors.errorScale[100],
  },
  // Hero Banner
  heroBanner: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  heroBannerGradient: {
    padding: Spacing.base,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBannerText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: PALETTE.lightMustard,
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.background.primary,
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroShine: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
  },
});

export default withErrorBoundary(OffersScreen, 'OffersIndex');
