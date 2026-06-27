// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Heroes/Special Profiles Page - Production Ready
 * Fetches real data from backend API for Defence/Healthcare/Teachers/Seniors
 */

import React, { useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Dimensions
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import realOffersApi from '@/services/realOffersApi';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProfileOffer {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  cashbackPercentage?: number;
  store?: {
    name: string;
    logo?: string;
  };
}

interface SpecialProfile {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  offersCount: number;
  verificationRequired: boolean;
  eligibilityDetails?: string;
  discountRange?: string;
  userEligible?: boolean;
  offers?: ProfileOffer[];
}

// Icon and gradient mapping for profiles
const PROFILE_CONFIG: Record<string, { emoji: string; gradientColors: string[] }> = {
  'defence': { emoji: '🪖', gradientColors: [colors.successScale[700], '#047857', '#065F46'] },
  'healthcare': { emoji: '🩺', gradientColors: ['#0EA5E9', colors.brand.sky, colors.brand.skyDark] },
  'senior': { emoji: '👴', gradientColors: [colors.warningScale[400], colors.warningScale[700], colors.brand.amberDeep] },
  'teachers': { emoji: '📚', gradientColors: [colors.brand.purpleLight, colors.brand.purple, colors.brand.purpleDeep] },
  'government': { emoji: '🏛️', gradientColors: [colors.brand.indigo, '#4F46E5', '#4338CA'] },
  'differently-abled': { emoji: '♿', gradientColors: [colors.brand.pink, colors.deepPink, '#BE185D'] } };

function HeroesZonePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { profile: profileParam } = useLocalSearchParams<{ profile?: string }>();
  const insets = useSafeAreaInsets();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<SpecialProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(profileParam || null);
  const [profileOffers, setProfileOffers] = useState<Record<string, ProfileOffer[]>>({});
  const [loadingOffers, setLoadingOffers] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shimmerAnim = useSharedValue(0);
  const shimmerOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));
  const bottomPadding = 80 + 70 + insets.bottom;

  useEffect(() => {
    fetchProfiles();
    shimmerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
    return () => { shimmerAnim.value = 0; };
  }, []);

  // Auto-select profile from URL param after profiles are loaded
  useEffect(() => {
    if (profileParam && profiles.length > 0) {
      const profileExists = profiles.some(p => p.slug === profileParam);
      if (profileExists && !profileOffers[profileParam]) {
        setSelectedProfile(profileParam);
        // Fetch offers for this profile
        fetchProfileOffersForParam(profileParam);
      }
    }
  }, [profileParam, profiles]);

  const fetchProfileOffersForParam = async (slug: string) => {
    setLoadingOffers(slug);
    try {
      const response = await realOffersApi.getSpecialProfileOffers(slug);
      if (response.success && response.data) {
        const offersData = response.data.offers || response.data;
        if (!isMounted()) return;
        setProfileOffers(prev => ({
          ...prev,
          [slug]: Array.isArray(offersData) ? offersData : [] }));
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoadingOffers(null);
    }
  };

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await realOffersApi.getSpecialProfiles();

      if (response.success && response.data) {
        if (!isMounted()) return;
        setProfiles(response.data);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load profiles. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const fetchProfileOffers = async (profileSlug: string) => {
    if (profileOffers[profileSlug]) return; // Already loaded

    try {
      setLoadingOffers(profileSlug);
      const response = await realOffersApi.getSpecialProfileOffers(profileSlug);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setProfileOffers(prev => ({ ...prev, [profileSlug]: response.data }));
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoadingOffers(null);
    }
  };

  const handleProfileToggle = async (profileId: string, profileSlug: string) => {
    if (selectedProfile === profileId) {
      setSelectedProfile(null);
    } else {
      setSelectedProfile(profileId);
      await fetchProfileOffers(profileSlug);
    }
  };

  const handleVerify = (profileSlug: string) => {
    // Map profile slugs to verification zone names
    const slugToZone: Record<string, string> = {
      'defence': 'defence',
      'healthcare': 'healthcare',
      'senior': 'senior',
      'teachers': 'teacher',
      'government': 'government',
      'differently-abled': 'differentlyAbled' };
    const zone = slugToZone[profileSlug] || profileSlug;

    router.push({
      pathname: '/profile/verification',
      params: { zone }
    } as any);
  };

  const handleDealPress = (offer: ProfileOffer) => {
    router.push(`/offers/${offer._id}` as any);
  };

  const isProfileVerified = (profile: SpecialProfile): boolean => {
    if (profile.userEligible) return true;

    const verifications = user?.verifications as any;
    if (!verifications) return false;

    // Map profile slugs to verification keys
    const slugToVerificationKey: Record<string, string> = {
      'defence': 'defence',
      'healthcare': 'healthcare',
      'senior': 'senior',
      'teachers': 'teacher',
      'government': 'government',
      'differently-abled': 'differentlyAbled' };

    const key = slugToVerificationKey[profile.slug];
    return key ? verifications[key]?.verified === true : false;
  };

  const getProfileConfig = (slug: string) => {
    return PROFILE_CONFIG[slug] || { emoji: '🎖️', gradientColors: [colors.brand.indigo, '#4F46E5', '#4338CA'] };
  };

  const renderSkeletonProfile = () => (
    <View style={styles.profileCard}>
      <Animated.View
        style={[
          styles.skeletonHeader,
          shimmerOpacityStyle,
        ]}
      />
    </View>
  );

  const renderProfileCard = (profile: SpecialProfile) => {
    const isVerified = isProfileVerified(profile);
    const isExpanded = selectedProfile === profile._id;
    const config = getProfileConfig(profile.slug);
    const offers = profileOffers[profile.slug] || [];

    return (
      <View key={profile._id} style={styles.profileCard}>
        {/* Profile Header */}
        <Pressable
          onPress={() => handleProfileToggle(profile._id, profile.slug)}
         
        >
          <LinearGradient
            colors={config.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.profileHeader, isExpanded && styles.profileHeaderExpanded]}
          >
            <ThemedText style={styles.profileIcon}>{config.emoji}</ThemedText>
            <View style={styles.profileHeaderContent}>
              <View style={styles.profileTitleRow}>
                <ThemedText style={styles.profileTitle}>{profile.name}</ThemedText>
                {isVerified && <Ionicons name="checkmark-circle" size={16} color={colors.background.primary} />}
              </View>
              <ThemedText style={styles.profileSubtitle}>
                {profile.discountRange || `${profile.offersCount} exclusive deals`}
              </ThemedText>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="rgba(255, 255, 255, 0.7)"
            />
          </LinearGradient>
        </Pressable>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.profileContent}>
            {/* Verification Status */}
            {!isVerified ? (
              <View style={styles.verificationCard}>
                <View style={styles.verificationContent}>
                  <Ionicons name="cloud-upload" size={20} color={colors.warningScale[400]} />
                  <View style={styles.verificationText}>
                    <ThemedText style={styles.verificationTitle}>Verification Required</ThemedText>
                    <ThemedText style={styles.verificationSubtitle}>
                      {profile.eligibilityDetails || 'Valid ID proof required'}
                    </ThemedText>
                  </View>
                  <Pressable
                    style={styles.verifyButton}
                    onPress={() => handleVerify(profile.slug)}
                   
                  >
                    <ThemedText style={styles.verifyButtonText}>Verify</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.verifiedCard}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <ThemedText style={styles.verifiedText}>Verified - Access Granted</ThemedText>
              </View>
            )}

            {/* Deals List */}
            <ThemedText style={styles.dealsTitle}>
              Available Deals ({loadingOffers === profile.slug ? '...' : offers.length})
            </ThemedText>
            <View style={styles.dealsList}>
              {loadingOffers === profile.slug ? (
                <View style={styles.loadingDeals}>
                  <Animated.View
                    style={[
                      styles.skeletonDeal,
                      shimmerOpacityStyle,
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.skeletonDeal,
                      shimmerOpacityStyle,
                    ]}
                  />
                </View>
              ) : offers.length > 0 ? (
                offers.map((deal) => (
                  <Pressable
                    key={deal._id}
                    style={[styles.dealItem, !isVerified && styles.dealItemDisabled]}
                    onPress={() => handleDealPress(deal)}
                    disabled={!isVerified}
                   
                  >
                    {deal.store?.logo ? (
                      <CachedImage source={deal.store.logo} style={styles.dealLogo} contentFit="contain" />
                    ) : (
                      <View style={styles.dealLogoPlaceholder}>
                        <Ionicons name="storefront" size={20} color={Colors.text.tertiary} />
                      </View>
                    )}
                    <View style={styles.dealItemContent}>
                      <ThemedText style={styles.dealItemStore}>{deal.store?.name || 'Store'}</ThemedText>
                      <ThemedText style={styles.dealItemTitle}>{deal.title}</ThemedText>
                    </View>
                    {deal.cashbackPercentage && (
                      <View style={styles.dealItemDiscount}>
                        <ThemedText style={styles.dealItemDiscountText}>{deal.cashbackPercentage}%</ThemedText>
                      </View>
                    )}
                  </Pressable>
                ))
              ) : (
                <ThemedText style={styles.noDealsText}>No offers available yet</ThemedText>
              )}
            </View>

            {!isVerified && (
              <ThemedText style={styles.verificationHint}>
                Verify your profile to unlock these exclusive deals
              </ThemedText>
            )}
          </View>
        )}
      </View>
    );
  };

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable style={styles.retryButton} onPress={fetchProfiles}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.indigo} translucent />

      {/* Header */}
      <LinearGradient
        colors={[colors.brand.indigo, '#4F46E5', '#4338CA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Special Profiles</ThemedText>
              <ThemedText style={styles.headerSubtitle}>Exclusive access for verified members</ThemedText>
            </View>

            <View style={styles.headerIcon}>
              <ThemedText style={styles.emoji}>🎖️</ThemedText>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.3)', 'rgba(139, 92, 246, 0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="shield-checkmark" size={32} color="#818CF8" />
              </View>
              <View style={styles.heroTextContainer}>
                <ThemedText style={styles.heroTitle}>Honoring Our Heroes</ThemedText>
                <ThemedText style={styles.heroSubtitle}>
                  Exclusive deals for special community members
                </ThemedText>
              </View>
            </View>

            {/* Profile Icons Grid */}
            <View style={styles.profileIconsGrid}>
              {profiles.slice(0, 4).map((profile) => {
                const config = getProfileConfig(profile.slug);
                return (
                  <View key={profile._id} style={styles.profileIconCard}>
                    <ThemedText style={styles.profileIconEmoji}>{config.emoji}</ThemedText>
                    <ThemedText style={styles.profileIconLabel}>
                      {profile.name.split(' ')[0]}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        </View>

        {/* Profile Cards */}
        <View style={styles.profilesSection}>
          {loading ? (
            <>
              {renderSkeletonProfile()}
              {renderSkeletonProfile()}
              {renderSkeletonProfile()}
            </>
          ) : profiles.length > 0 ? (
            profiles.map((profile) => renderProfileCard(profile))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyStateText}>No special profiles available</ThemedText>
            </View>
          )}
        </View>

        {/* Support Message */}
        <View style={styles.supportCard}>
          <ThemedText style={styles.supportText}>
            Don't see your category?{' '}
            <ThemedText style={styles.supportLink}>Contact us</ThemedText> to request special
            profile verification.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Fixed CTA Button */}
      <View style={styles.fixedCTA}>
        <Pressable
          style={styles.ctaButton}
          onPress={() => {
            const profile = selectedProfile
              ? profiles.find(p => p._id === selectedProfile)
              : profiles[0];
            router.push({
              pathname: '/profile/verification',
              params: { zone: profile?.slug || 'defence' }
            } as any);
          }}
         
        >
          <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
            <ThemedText style={styles.ctaButtonText}>Apply for Special Profile Verification</ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorText: { ...Typography.body, color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  retryButton: { backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  retryButtonText: { ...Typography.button, color: colors.background.primary },
  header: { paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0 },
  safeHeader: { paddingBottom: Spacing.base },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  backButton: { padding: Spacing.sm, marginRight: Spacing.sm },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { ...Typography.h3, color: colors.background.primary, fontWeight: '700' },
  headerSubtitle: { ...Typography.bodySmall, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 },
  headerIcon: { width: 40, alignItems: 'center' },
  emoji: { fontSize: 32 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 150 },
  heroBanner: { margin: Spacing.base, borderRadius: BorderRadius['2xl'], overflow: 'hidden', ...Shadows.medium },
  heroGradient: { padding: Spacing.lg, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)', borderRadius: BorderRadius['2xl'] },
  heroContent: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.base },
  heroIconContainer: { width: 64, height: 64, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(129, 140, 248, 0.3)', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.base },
  heroTextContainer: { flex: 1 },
  heroTitle: { ...Typography.h4, color: Colors.text.primary, fontWeight: '600', marginBottom: 2 },
  heroSubtitle: { ...Typography.bodySmall, color: Colors.text.secondary },
  profileIconsGrid: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.base },
  profileIconCard: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center' },
  profileIconEmoji: { fontSize: 24, marginBottom: 4 },
  profileIconLabel: { ...Typography.caption, color: Colors.text.tertiary, textAlign: 'center' },
  profilesSection: { paddingHorizontal: Spacing.base, gap: Spacing.md },
  profileCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.medium },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.base },
  profileHeaderExpanded: { borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  profileIcon: { fontSize: 32 },
  profileHeaderContent: { flex: 1 },
  profileTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 2 },
  profileTitle: { ...Typography.h4, color: colors.background.primary, fontWeight: '600' },
  profileSubtitle: { ...Typography.bodySmall, color: 'rgba(255, 255, 255, 0.7)' },
  profileContent: { backgroundColor: Colors.background.primary, padding: Spacing.base },
  verificationCard: { padding: Spacing.base, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.05)', marginBottom: Spacing.base },
  verificationContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  verificationText: { flex: 1 },
  verificationTitle: { ...Typography.body, color: Colors.text.primary, fontWeight: '600', marginBottom: 2 },
  verificationSubtitle: { ...Typography.caption, color: Colors.text.tertiary },
  verifyButton: { backgroundColor: colors.warningScale[400], paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  verifyButtonText: { ...Typography.labelSmall, color: colors.background.primary, fontWeight: '600' },
  verifiedCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(46, 204, 113, 0.1)', borderWidth: 1, borderColor: 'rgba(46, 204, 113, 0.2)', marginBottom: Spacing.base, gap: Spacing.sm },
  verifiedText: { ...Typography.bodySmall, color: Colors.success },
  dealsTitle: { ...Typography.label, color: Colors.text.tertiary, marginBottom: Spacing.md },
  dealsList: { gap: Spacing.sm },
  loadingDeals: { gap: Spacing.sm },
  skeletonDeal: { height: 60, borderRadius: BorderRadius.lg, backgroundColor: Colors.gray[200] },
  skeletonHeader: { height: 80, borderRadius: BorderRadius.lg, backgroundColor: Colors.gray[200] },
  dealItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.05)', gap: Spacing.md },
  dealItemDisabled: { opacity: 0.5 },
  dealLogo: { width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.background.primary },
  dealLogoPlaceholder: { width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.gray[100], alignItems: 'center', justifyContent: 'center' },
  dealItemContent: { flex: 1 },
  dealItemStore: { ...Typography.label, color: Colors.text.primary, fontWeight: '600', marginBottom: 2 },
  dealItemTitle: { ...Typography.caption, color: Colors.text.tertiary },
  dealItemDiscount: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  dealItemDiscountText: { ...Typography.labelSmall, color: colors.brand.indigo, fontWeight: '700' },
  noDealsText: { ...Typography.body, color: Colors.text.tertiary, textAlign: 'center', padding: Spacing.md },
  verificationHint: { ...Typography.caption, color: Colors.text.tertiary, textAlign: 'center', marginTop: Spacing.base },
  emptyState: { alignItems: 'center', padding: Spacing.xl },
  emptyStateText: { ...Typography.body, color: Colors.text.tertiary, marginTop: Spacing.md },
  supportCard: { margin: Spacing.base, padding: Spacing.base, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: BorderRadius.lg, alignItems: 'center' },
  supportText: { ...Typography.bodySmall, color: Colors.text.tertiary, textAlign: 'center' },
  supportLink: { color: colors.brand.indigo, fontWeight: '600' },
  fixedCTA: { position: 'absolute', bottom: 70, left: 0, right: 0, padding: Spacing.base, backgroundColor: Colors.background.primary, borderTopWidth: 1, borderTopColor: Colors.border.light, ...Shadows.medium },
  ctaButton: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  ctaGradient: { paddingVertical: Spacing.base, alignItems: 'center', justifyContent: 'center' },
  ctaButtonText: { ...Typography.button, color: colors.background.primary, fontWeight: '600' } });

export default withErrorBoundary(HeroesZonePage, 'OffersZonesHeroes');
