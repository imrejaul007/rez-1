import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Birthday Specials Page
 * Redesigned birthday rewards page
 * Based on Rez_v-2-main design, adapted for rez-frontend theme
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Share,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import apiClient from '@/services/apiClient';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BirthdayDeal {
  id: string;
  store: string;
  title: string;
  discount: string;
  description: string;
  image?: string;
}

function BirthdayRewardsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<BirthdayDeal[]>([]);
  const [birthdayActive, setBirthdayActive] = useState(false);
  const [birthdayDate, setBirthdayDate] = useState('');
  const [daysUntil, setDaysUntil] = useState(0);

  // Bottom padding = Fixed CTA height (80px) + Bottom nav bar (70px) + Safe area bottom
  const bottomPadding = 80 + 70 + insets.bottom;

  const loadBirthdayData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch birthday offers from exclusive zone
      const response = await apiClient.get<{ zone: any; offers: any[] }>('/offers/exclusive-zones/birthday/offers');

      if (response.success && response.data?.offers) {
        const mapped: BirthdayDeal[] = response.data.offers.map((offer: any) => ({
          id: offer._id,
          store: offer.store?.name || offer.merchantName || BRAND.APP_NAME,
          title: offer.title,
          discount: offer.discount?.type === 'percentage'
            ? `${offer.discount.value}%`
            : offer.discount?.type === 'fixed'
              ? `${offer.discount.value}`
              : 'FREE',
          description: offer.description || '',
          image: offer.images?.[0] || offer.store?.logo,
        }));
        if (!isMounted()) return;
        setDeals(mapped);
      }

      // Check user birthday proximity
      const userDob = user?.profile?.dateOfBirth;
      if (userDob) {
        const dob = new Date(userDob);
        const now = new Date();
        const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        if (thisYearBday < now) {
          if (!isMounted()) return;
          thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
        }
        const diffMs = thisYearBday.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (!isMounted()) return;
        setBirthdayDate(dob.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }));
        if (!isMounted()) return;
        setDaysUntil(diffDays);
        // Birthday week = within 3 days before or after
        if (!isMounted()) return;
        setBirthdayActive(diffDays <= 3 || diffDays >= 362);
      }
    } catch {
      // Silently handle — empty state will show
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadBirthdayData();
  }, [isAuthenticated, loadBirthdayData]);

  const handleClaimGift = (deal: BirthdayDeal) => {
    router.push(`/offers/${deal.id}` as any);
  };

  const renderGiftCard = (deal: BirthdayDeal) => (
    <View key={deal.id} style={styles.giftCard}>
      {/* Gift Ribbon */}
      <View style={styles.giftRibbon}>
        <ThemedText style={styles.giftRibbonText}>FREE</ThemedText>
      </View>

      <View style={styles.giftContent}>
        {deal.image && (
          <CachedImage source={deal.image} style={styles.giftImage} contentFit="cover" />
        )}
        <View style={styles.giftInfo}>
          <View style={styles.giftHeader}>
            <View style={styles.giftStoreInfo}>
              <ThemedText style={styles.giftStore}>{deal.store || BRAND.APP_NAME}</ThemedText>
              <ThemedText style={styles.giftTitle}>{deal.title}</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.giftDescription}>{deal.description}</ThemedText>

          <View style={styles.giftTags}>
            <View style={styles.tag}>
              <ThemedText style={styles.tagText}>🎂 Birthday Gift</ThemedText>
            </View>
          </View>

          <Pressable
            style={styles.claimButton}
            onPress={() => handleClaimGift(deal)}
           
          >
            <LinearGradient
              colors={[colors.warningScale[400], colors.brand.orangeDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.claimGradient}
            >
              <ThemedText style={styles.claimButtonText}>Claim Gift</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.warningScale[400]} translucent />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.warningScale[400], colors.brand.orangeDark, colors.error]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Birthday Specials</ThemedText>
              <ThemedText style={styles.headerSubtitle}>Your special day rewards</ThemedText>
            </View>

            <View style={styles.headerIcon}>
              <ThemedText style={styles.emoji}>🎂</ThemedText>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        )}

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.3)', 'rgba(236, 72, 153, 0.2)', 'rgba(220, 38, 38, 0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroGradient}
          >
            {birthdayActive ? (
              <View style={styles.heroContent}>
                <View style={styles.birthdayActiveBadge}>
                  <Ionicons name="gift" size={20} color="#F472B6" />
                  <ThemedText style={styles.birthdayActiveText}>Birthday Week Active!</ThemedText>
                </View>

                <ThemedText style={styles.heroTitle}>Happy Birthday! 🎉</ThemedText>
                <ThemedText style={styles.heroSubtitle}>
                  Enjoy exclusive gifts & rewards this week
                </ThemedText>

                <View style={styles.heroStats}>
                  <View style={styles.heroStat}>
                    <ThemedText style={styles.heroStatValue}>{deals.length}</ThemedText>
                    <ThemedText style={styles.heroStatLabel}>Free Gifts</ThemedText>
                  </View>
                  <View style={styles.heroStat}>
                    <ThemedText style={[styles.heroStatValue, { color: '#F472B6' }]}>500</ThemedText>
                    <ThemedText style={styles.heroStatLabel}>Bonus Coins</ThemedText>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.birthdayCountdown}>
                <View style={styles.countdownIcon}>
                  <Ionicons name="calendar" size={28} color={colors.brand.purpleSoft} />
                </View>
                <View style={styles.countdownContent}>
                  <ThemedText style={styles.countdownTitle}>
                    Your birthday: {birthdayDate}
                  </ThemedText>
                  <ThemedText style={styles.countdownSubtitle}>
                    {daysUntil} days until your special day
                  </ThemedText>
                </View>
                <Pressable style={styles.updateButton}>
                  <ThemedText style={styles.updateButtonText}>Update</ThemedText>
                </Pressable>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Birthday Gifts */}
        <View style={styles.giftsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="gift" size={20} color={colors.warningScale[400]} />
              <ThemedText style={styles.sectionTitle}>Your Birthday Gifts</ThemedText>
            </View>
            <ThemedText style={styles.sectionSubtitle}>Claim within your birthday week</ThemedText>
          </View>

          {deals.map((deal) => renderGiftCard(deal))}
        </View>

        {/* Bonus Coins Card */}
        <View style={styles.bonusCoinsCard}>
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.2)', 'rgba(234, 179, 8, 0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bonusCoinsGradient}
          >
            <View style={styles.bonusCoinsIcon}>
              <ThemedText style={styles.coinEmoji}>🪙</ThemedText>
            </View>
            <View style={styles.bonusCoinsContent}>
              <ThemedText style={styles.bonusCoinsValue}>500 Bonus Coins</ThemedText>
              <ThemedText style={styles.bonusCoinsSubtitle}>
                Auto-credited to your wallet
              </ThemedText>
              <View style={styles.creditedBadge}>
                <ThemedText style={styles.creditedBadgeText}>Credited</ThemedText>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Party Mode */}
        <View style={styles.partyCard}>
          <Ionicons name="balloon" size={24} color={colors.brand.purpleSoft} />
          <View style={styles.partyContent}>
            <ThemedText style={styles.partyTitle}>Share Your Birthday Joy</ThemedText>
            <ThemedText style={styles.partySubtitle}>
              Invite friends & both get bonus coins
            </ThemedText>
          </View>
          <Pressable style={styles.shareButton} onPress={async () => {
            try {
              await Share.share({
                message: `It's my birthday! Check out my birthday rewards on ${BRAND.APP_NAME}!`,
                title: 'Birthday Rewards',
              });
            } catch (_e) {}
          }}>
            <ThemedText style={styles.shareButtonText}>Share</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      {/* Fixed CTA Button */}
      <View style={styles.fixedCTA}>
        <Pressable
          style={styles.ctaButton}
          onPress={() => {
            if (deals.length > 0) {
              // Navigate to first unclaimed deal
              const firstDeal = deals[0];
              handleClaimGift(firstDeal);
            }
          }}

        >
          <LinearGradient
            colors={[colors.warningScale[400], colors.brand.pink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Ionicons name="gift" size={20} color={colors.background.primary} style={{ marginRight: Spacing.sm }} />
            <ThemedText style={styles.ctaButtonText}>Claim All Birthday Gifts</ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
  },
  safeHeader: {
    paddingBottom: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    color: colors.background.primary,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerIcon: {
    width: 40,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150, // Will be overridden by dynamic padding
  },
  heroBanner: {
    margin: Spacing.base,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.medium,
  },
  heroGradient: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: BorderRadius['2xl'],
  },
  heroContent: {
    alignItems: 'center',
  },
  birthdayActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: Spacing.base,
  },
  birthdayActiveText: {
    ...Typography.labelSmall,
    color: '#F472B6',
    fontWeight: '600',
  },
  heroTitle: {
    ...Typography.h1,
    color: Colors.text.primary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  heroStats: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  heroStat: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroStatValue: {
    ...Typography.h2,
    color: colors.warningScale[400],
    fontWeight: '700',
    marginBottom: 2,
  },
  heroStatLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  birthdayCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  countdownIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownContent: {
    flex: 1,
  },
  countdownTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  countdownSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  updateButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  updateButtonText: {
    ...Typography.labelSmall,
    color: colors.background.primary,
    fontWeight: '600',
  },
  giftsSection: {
    paddingHorizontal: Spacing.base,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  giftCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  giftRibbon: {
    position: 'absolute',
    top: 8,
    right: -24,
    width: 96,
    height: 24,
    backgroundColor: colors.warningScale[400],
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  giftRibbonText: {
    ...Typography.caption,
    color: colors.background.primary,
    fontWeight: '700',
  },
  giftContent: {
    flexDirection: 'row',
    padding: Spacing.base,
  },
  giftImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.base,
  },
  giftInfo: {
    flex: 1,
  },
  giftHeader: {
    marginBottom: Spacing.xs,
  },
  giftStoreInfo: {
    marginBottom: Spacing.xs,
  },
  giftStore: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  giftTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  giftDescription: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  giftTags: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tag: {
    backgroundColor: Colors.gray[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  claimButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  claimGradient: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonText: {
    ...Typography.labelSmall,
    color: colors.background.primary,
    fontWeight: '600',
  },
  bonusCoinsCard: {
    margin: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  bonusCoinsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: BorderRadius.lg,
    gap: Spacing.base,
  },
  bonusCoinsIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinEmoji: {
    fontSize: 32,
  },
  bonusCoinsContent: {
    flex: 1,
  },
  bonusCoinsValue: {
    ...Typography.h2,
    color: colors.warningScale[400],
    fontWeight: '700',
    marginBottom: 2,
  },
  bonusCoinsSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  creditedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  creditedBadgeText: {
    ...Typography.caption,
    color: colors.background.primary,
    fontWeight: '600',
  },
  partyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    margin: Spacing.base,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  partyContent: {
    flex: 1,
  },
  partyTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  partySubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  shareButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  shareButtonText: {
    ...Typography.labelSmall,
    color: colors.background.primary,
    fontWeight: '600',
  },
  fixedCTA: {
    position: 'absolute',
    bottom: 70, // Above bottom nav bar (70px height)
    left: 0,
    right: 0,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    ...Shadows.medium,
  },
  ctaButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    ...Typography.button,
    color: colors.background.primary,
    fontWeight: '600',
  },
});

export default withErrorBoundary(BirthdayRewardsPage, 'OffersBirthday');
