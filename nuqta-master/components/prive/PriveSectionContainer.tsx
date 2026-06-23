/**
 * PriveSectionContainer - Main container for Privé tab content
 * Brings together all Privé components in a scrollable layout
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { usePriveSection } from '@/hooks/usePriveSection';
import usePriveEligibility from '@/hooks/usePriveEligibility';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';
import PriveLockedTeaser from './PriveLockedTeaser';

// Import all Privé components (PriveMemberCard moved to header in index.tsx)
import { PriveHabitLoops } from './PriveHabitLoops';
import { PriveHighlightsSection } from './PriveHighlightsSection';
import { PriveBalanceCard } from './PriveBalanceCard';
import { PriveQuickActions } from './PriveQuickActions';
import { PrivePillarGrid } from './PrivePillarGrid';
import { PriveOffersCarousel } from './PriveOffersCarousel';
import { PriveActivitySummary } from './PriveActivitySummary';
import { PriveBenefitsGrid } from './PriveBenefitsGrid';
import { PriveConciergeCard } from './PriveConciergeCard';
import PriveHeroBanner from './PriveHeroBanner';
import { colors } from '@/constants/theme';

export const PriveSectionContainer: React.FC = () => {
  const router = useRouter();
  const { hasAccess, isLoading: accessLoading, refresh: refreshAccess } = usePriveEligibility();
  const {
    userData,
    eligibility,
    featuredOffers,
    highlights,
    dailyProgress,
    isLoading,
    isRefreshing,
    error,
    refresh,
    checkIn,
    trackOfferClick,
    handleLoopPress,
    handleEarningsPress,
  } = usePriveSection();

  const handleBannerPress = (banner: { id: string }) => {
    switch (banner.id) {
      case '1': // Welcome — explore pillars
        router.push('/prive/pillars' as any);
        break;
      case '2': // Tier Progress
        router.push('/prive/tier-progress' as any);
        break;
      case '3': // Redeem
        router.push('/prive/redeem' as any);
        break;
    }
  };

  // Access gate: show locked teaser for users without Privé access
  if (!accessLoading && !hasAccess) {
    return (
      <PriveLockedTeaser
        onAccessGranted={() => {
          refreshAccess();
          refresh();
        }}
      />
    );
  }

  if (isLoading || accessLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={PRIVE_COLORS.gold.primary} />
        <Text style={styles.loadingText}>Loading Privé...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient
          colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <Pressable
          style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#C9A96233', borderRadius: 10 }}
          onPress={refresh}
        >
          <Text style={{ color: colors.brand.goldAccent, fontSize: 14, fontWeight: '600' }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      {/* Dark Privé Gradient Background */}
      <LinearGradient
        colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]}
        style={styles.gradientBackground}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={PRIVE_COLORS.gold.primary}
            colors={[PRIVE_COLORS.gold.primary]}
          />
        }
      >
        {/* Hero Banner - Premium carousel (member card moved to header) */}
        <PriveHeroBanner onBannerPress={handleBannerPress} />

        {/* Daily Habit Loops Section */}
        <PriveHabitLoops
          isCheckedIn={dailyProgress.isCheckedIn}
          streak={dailyProgress.streak}
          weeklyEarnings={dailyProgress.weeklyEarnings}
          loops={dailyProgress.loops}
          allCompleted={dailyProgress.allCompleted}
          onCheckIn={checkIn}
          onLoopPress={handleLoopPress}
          onEarningsPress={handleEarningsPress}
        />

        {/* Today's Highlights */}
        <PriveHighlightsSection highlights={highlights} />

        {/* Coin Balance Card */}
        <PriveBalanceCard
          totalCoins={userData.totalCoins}
          rezCoins={userData.rezCoins}
          priveCoins={userData.priveCoins}
          brandedCoins={userData.brandedCoins}
          monthlyEarnings={userData.monthlyEarnings}
        />

        {/* Quick Actions */}
        <PriveQuickActions currentTier={eligibility.tier} />

        {/* 6-Pillar Grid */}
        <PrivePillarGrid
          pillars={userData.pillars}
          totalScore={userData.totalScore}
          tier={eligibility.tier}
          accessState={userData.accessState}
        />

        {/* Featured Offers Carousel */}
        <PriveOffersCarousel
          offers={featuredOffers}
          onViewAll={() => router.push('/prive/prive-offers' as any)}
        />

        {/* Activity Summary */}
        <PriveActivitySummary
          activeCampaigns={userData.activeCampaigns}
          completedCampaigns={userData.completedCampaigns}
          avgRating={userData.avgRating}
        />

        {/* Benefits Grid (replaces How It Works) */}
        <PriveBenefitsGrid condensed currentTier={eligibility.tier} />

        {/* Concierge CTA */}
        <PriveConciergeCard />

        {/* Bottom Spacing */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    position: 'relative',
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  welcomeSection: {
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingTop: PRIVE_SPACING.lg,
    paddingBottom: PRIVE_SPACING.sm,
  },
  welcomeText: {
    fontSize: 15,
    color: PRIVE_COLORS.text.secondary,
  },
  welcomeName: {
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: PRIVE_SPACING.lg,
    fontSize: 14,
    color: PRIVE_COLORS.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  errorText: {
    fontSize: 14,
    color: PRIVE_COLORS.status.error,
    textAlign: 'center',
  },
  bottomSpace: {
    height: PRIVE_SPACING.xxxl,
  },
});

export default React.memo(PriveSectionContainer);
