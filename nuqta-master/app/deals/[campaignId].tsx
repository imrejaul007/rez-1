import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Campaign Detail Page - Premium Campaign View
 * Route: /deals/[campaignId]
 * Enhanced with comprehensive details and premium UI
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { campaignsApi, Campaign, CampaignDeal } from '@/services/campaignsApi';
import CoinIcon from '@/components/ui/CoinIcon';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEAL_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const COLORS = {
  white: Colors.background.primary,
  navy: colors.brand.navyDark,
  navyLight: '#1A365D',
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray300: Colors.border.default,
  gray400: Colors.text.tertiary,
  gray600: Colors.text.tertiary,
  gray800: Colors.text.primary,
  green50: Colors.successScale[50],
  green100: Colors.successScale[50],
  green500: Colors.success,
  green600: Colors.success,
  emerald500: Colors.success,
  amber50: Colors.warningScale[50],
  amber100: Colors.warningScale[50],
  amber500: Colors.warning,
  amber600: Colors.warning,
  blue50: Colors.infoScale[50],
  blue100: Colors.infoScale[50],
  blue500: Colors.info,
  purple50: '#FAF5FF',
  purple100: colors.tint.pink,
  purple500: Colors.brand.purple,
  pink500: colors.brand.pink,
  red50: Colors.errorScale[50],
  red100: Colors.errorScale[50],
  red500: Colors.error,
  cyan500: colors.brand.cyan,
  gold: Colors.gold,
};

const CampaignDetailPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
    } else {
      setError('Campaign ID is required');
      setIsLoading(false);
    }
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await campaignsApi.getCampaignById(campaignId);

      if (response.success && response.data) {
        const transformedCampaign = {
          ...response.data,
          deals: response.data.deals.map((deal: CampaignDeal) => ({
            ...deal,
            storeId: deal.storeId
              ? (typeof deal.storeId === 'string' ? deal.storeId : String(deal.storeId))
              : undefined,
          })),
        };
        if (!isMounted()) return;
        setCampaign(transformedCampaign);
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Campaign not found');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load campaign');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleDealPress = (deal: CampaignDeal, dealIndex: number) => {
    router.push(`/deals/${campaignId}/${dealIndex}` as any);
  };

  const renderDealValue = (deal: CampaignDeal) => {
    if (deal.cashback) {
      return (
        <View style={styles.dealValueRow}>
          <Text style={styles.dealCashback}>{deal.cashback}</Text>
          <Text style={styles.dealValueLabel}>Cashback</Text>
        </View>
      );
    }
    if (deal.coins) {
      return (
        <View style={styles.dealValueRow}>
          <View style={styles.dealCoinsRow}>
            <CoinIcon size={14} />
            <Text style={styles.dealCoins}>{deal.coins}</Text>
          </View>
          <Text style={styles.dealValueLabel}>Coins</Text>
        </View>
      );
    }
    if (deal.bonus) {
      return (
        <View style={styles.dealValueRow}>
          <Text style={styles.dealBonus}>{deal.bonus}</Text>
          <Text style={styles.dealValueLabel}>Bonus</Text>
        </View>
      );
    }
    if (deal.drop) {
      return (
        <View style={styles.dealValueRow}>
          <Text style={styles.dealDrop}>{deal.drop}</Text>
          <Text style={styles.dealValueLabel}>Drop</Text>
        </View>
      );
    }
    if (deal.discount) {
      return (
        <View style={styles.dealValueRow}>
          <Text style={styles.dealCashback}>{deal.discount}</Text>
          <Text style={styles.dealValueLabel}>Discount</Text>
        </View>
      );
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const getHoursRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const hours = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60));
    return Math.max(0, hours % 24);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <CardGridSkeleton />
      </View>
    );
  }

  if (error || !campaign) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.errorCard}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.red500} />
          </View>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error || 'Campaign not found'}</Text>
          <Pressable style={styles.errorButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={18} color={COLORS.white} />
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const daysRemaining = getDaysRemaining(campaign.endTime);
  const hoursRemaining = getHoursRemaining(campaign.endTime);
  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = daysRemaining <= 3 && !isExpired;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Expired Campaign Banner */}
        {isExpired && (
          <View style={styles.expiredBanner}>
            <Ionicons name="time-outline" size={20} color={COLORS.white} />
            <Text style={styles.expiredBannerText}>This campaign has ended</Text>
          </View>
        )}

        {/* Premium Hero Section */}
        <View style={styles.heroSection}>
          {campaign.bannerImage ? (
            <CachedImage source={campaign.bannerImage} style={styles.bannerImage} />
          ) : (
            <LinearGradient
              colors={campaign.gradientColors || [colors.success, colors.tealGreen]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            />
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
            style={styles.bannerOverlay}
          />

          {/* Urgent Badge */}
          {isExpiringSoon && (
            <View style={styles.urgentBadge}>
              <Ionicons name="flame" size={14} color={COLORS.white} />
              <Text style={styles.urgentBadgeText}>Ending Soon!</Text>
            </View>
          )}

          {/* Back Button */}
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </Pressable>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            {campaign.icon && (
              <CachedImage source={campaign.icon} style={styles.campaignIcon} />
            )}
            <View style={styles.heroTextContainer}>
              <View style={styles.campaignTypeBadge}>
                <Ionicons name="megaphone" size={12} color={COLORS.white} />
                <Text style={styles.campaignTypeText}>Campaign</Text>
              </View>
              <Text style={styles.heroTitle}>{campaign.title}</Text>
              {campaign.subtitle && (
                <Text style={styles.heroSubtitle}>{campaign.subtitle}</Text>
              )}
            </View>
            {campaign.badge && (
              <View style={[styles.heroBadge, { backgroundColor: campaign.badgeBg || COLORS.gold }]}>
                <Text style={[styles.heroBadgeText, { color: campaign.badgeColor || COLORS.navy }]}>
                  {campaign.badge}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Premium Stats Card */}
        <View style={styles.statsCardContainer}>
          <LinearGradient
            colors={[COLORS.navy, COLORS.navyLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsCard}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                  <Ionicons name="pricetag" size={20} color={COLORS.green500} />
                </View>
                <Text style={styles.statValue}>{campaign.deals?.length || 0}</Text>
                <Text style={styles.statLabel}>Active Deals</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: isExpiringSoon ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)' }]}>
                  <Ionicons
                    name="hourglass"
                    size={20}
                    color={isExpiringSoon ? COLORS.red500 : COLORS.blue500}
                  />
                </View>
                <Text style={[styles.statValue, isExpiringSoon && styles.statValueUrgent]}>
                  {daysRemaining}
                </Text>
                <Text style={styles.statLabel}>Days Left</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                  <Ionicons name="calendar" size={20} color={COLORS.purple500} />
                </View>
                <Text style={styles.statValue}>{formatDate(campaign.startTime).split(',')[0]}</Text>
                <Text style={styles.statLabel}>Started</Text>
              </View>
            </View>

            {/* Decorative Elements */}
            <View style={styles.statsDecor1} />
            <View style={styles.statsDecor2} />
          </LinearGradient>
        </View>

        {/* Countdown Timer */}
        {!isExpired && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.amber50 }]}>
                <Ionicons name="time-outline" size={18} color={COLORS.amber500} />
              </View>
              <Text style={styles.sectionHeaderTitle}>Time Remaining</Text>
            </View>
            <View style={styles.countdownGrid}>
              <View style={[styles.countdownItem, isExpiringSoon && styles.countdownItemUrgent]}>
                <Text style={[styles.countdownNumber, isExpiringSoon && styles.countdownNumberUrgent]}>{daysRemaining}</Text>
                <Text style={styles.countdownLabel}>Days</Text>
              </View>
              <View style={styles.countdownSeparator}><Text style={styles.countdownColon}>:</Text></View>
              <View style={[styles.countdownItem, isExpiringSoon && styles.countdownItemUrgent]}>
                <Text style={[styles.countdownNumber, isExpiringSoon && styles.countdownNumberUrgent]}>{hoursRemaining}</Text>
                <Text style={styles.countdownLabel}>Hours</Text>
              </View>
              <View style={styles.countdownSeparator}><Text style={styles.countdownColon}>:</Text></View>
              <View style={[styles.countdownItem, isExpiringSoon && styles.countdownItemUrgent]}>
                <Text style={[styles.countdownNumber, isExpiringSoon && styles.countdownNumberUrgent]}>00</Text>
                <Text style={styles.countdownLabel}>Mins</Text>
              </View>
            </View>
          </View>
        )}

        {/* Campaign Highlights */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.purple50 }]}>
              <Ionicons name="sparkles-outline" size={18} color={COLORS.purple500} />
            </View>
            <Text style={styles.sectionHeaderTitle}>Campaign Highlights</Text>
          </View>
          <View style={styles.highlightsGrid}>
            {[
              { icon: 'shield-checkmark-outline', label: 'Verified Campaign', color: COLORS.green500 },
              { icon: 'flash-outline', label: 'Instant Rewards', color: COLORS.amber500 },
              { icon: 'people-outline', label: 'Multi-Store Offers', color: COLORS.blue500 },
              { icon: 'gift-outline', label: 'Exclusive Deals', color: COLORS.purple500 },
            ].map((item, idx) => (
              <View key={idx} style={styles.highlightItem}>
                <View style={[styles.highlightIcon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={styles.highlightLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Description */}
        {campaign.description && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.blue50 }]}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.blue500} />
              </View>
              <Text style={styles.sectionHeaderTitle}>About This Campaign</Text>
            </View>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{campaign.description}</Text>
            </View>
          </View>
        )}

        {/* Offer Details */}
        {(campaign.minOrderValue || campaign.maxBenefit || (campaign.eligibleCategories && campaign.eligibleCategories.length > 0)) && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.green50 }]}>
                <Ionicons name="receipt-outline" size={18} color={COLORS.green500} />
              </View>
              <Text style={styles.sectionHeaderTitle}>Offer Details</Text>
            </View>

            {(campaign.minOrderValue || campaign.maxBenefit) && (
              <View style={styles.offerDetailsGrid}>
                {campaign.minOrderValue && (
                  <View style={styles.offerDetailCard}>
                    <View style={[styles.offerDetailIcon, { backgroundColor: COLORS.blue50 }]}>
                      <Ionicons name="cart-outline" size={22} color={COLORS.blue500} />
                    </View>
                    <Text style={styles.offerDetailValue}>{currencySymbol}{campaign.minOrderValue}</Text>
                    <Text style={styles.offerDetailLabel}>Minimum Order</Text>
                  </View>
                )}
                {campaign.maxBenefit && (
                  <View style={styles.offerDetailCard}>
                    <View style={[styles.offerDetailIcon, { backgroundColor: COLORS.green50 }]}>
                      <Ionicons name="trending-up" size={22} color={COLORS.green500} />
                    </View>
                    <Text style={styles.offerDetailValue}>{currencySymbol}{campaign.maxBenefit}</Text>
                    <Text style={styles.offerDetailLabel}>Max Savings</Text>
                  </View>
                )}
              </View>
            )}

            {campaign.eligibleCategories && campaign.eligibleCategories.length > 0 && (
              <View style={styles.categoriesSection}>
                <Text style={styles.categoriesLabel}>Valid on categories:</Text>
                <View style={styles.categoryTags}>
                  {campaign.eligibleCategories.map((cat, idx) => (
                    <View key={idx} style={styles.categoryTag}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.green500} />
                      <Text style={styles.categoryTagText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Validity Period */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.amber50 }]}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.amber500} />
            </View>
            <Text style={styles.sectionHeaderTitle}>Validity Period</Text>
          </View>
          <View style={styles.validityCard}>
            <View style={styles.validityRow}>
              <View style={styles.validityItem}>
                <View style={[styles.validityIconBg, { backgroundColor: COLORS.green100 }]}>
                  <Ionicons name="play-circle" size={20} color={COLORS.green500} />
                </View>
                <View>
                  <Text style={styles.validityLabel}>Campaign Starts</Text>
                  <Text style={styles.validityValue}>{formatDate(campaign.startTime)}</Text>
                </View>
              </View>
              <View style={styles.validityArrow}>
                <Ionicons name="arrow-forward" size={20} color={COLORS.gray300} />
              </View>
              <View style={styles.validityItem}>
                <View style={[styles.validityIconBg, { backgroundColor: COLORS.red100 }]}>
                  <Ionicons name="stop-circle" size={20} color={COLORS.red500} />
                </View>
                <View>
                  <Text style={styles.validityLabel}>Campaign Ends</Text>
                  <Text style={styles.validityValue}>{formatDate(campaign.endTime)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        {campaign.terms && campaign.terms.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.gray100 }]}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.gray600} />
              </View>
              <Text style={styles.sectionHeaderTitle}>Terms & Conditions</Text>
            </View>
            <View style={styles.termsCard}>
              {campaign.terms.map((term, idx) => (
                <View key={idx} style={styles.termItem}>
                  <View style={styles.termBullet}>
                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                  </View>
                  <Text style={styles.termText}>{term}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Available Deals */}
        {campaign.deals && campaign.deals.length > 0 && (
          <View style={styles.dealsSection}>
            <View style={styles.dealsSectionHeader}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIcon, { backgroundColor: COLORS.green50 }]}>
                  <Ionicons name="pricetags" size={18} color={COLORS.green500} />
                </View>
                <Text style={styles.sectionHeaderTitle}>Available Deals</Text>
              </View>
              <View style={styles.dealsCount}>
                <Text style={styles.dealsCountText}>{campaign.deals.length}</Text>
              </View>
            </View>
            <View style={styles.dealsGrid}>
              {campaign.deals.map((deal, idx) => (
                <Pressable
                  key={idx}
                  style={styles.dealCard}
                  onPress={() => handleDealPress(deal, idx)}
                 
                >
                  <View style={styles.dealImageContainer}>
                    {deal.image ? (
                      <CachedImage source={deal.image} style={styles.dealImage} />
                    ) : (
                      <LinearGradient
                        colors={[COLORS.gray200, COLORS.gray100]}
                        style={[styles.dealImage, styles.dealImagePlaceholder]}
                      >
                        <Ionicons name="gift-outline" size={28} color={COLORS.gray400} />
                      </LinearGradient>
                    )}

                    {/* Timer Badge */}
                    {deal.endsIn && (
                      <View style={styles.timerBadge}>
                        <Ionicons name="time-outline" size={10} color={COLORS.white} />
                        <Text style={styles.timerText}>{deal.endsIn}</Text>
                      </View>
                    )}

                    {/* Store Link Badge */}
                    {deal.storeId && (
                      <View style={styles.storeLinkBadge}>
                        <Ionicons name="storefront" size={10} color={COLORS.white} />
                      </View>
                    )}

                    {/* Verified Badge */}
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={10} color={COLORS.white} />
                    </View>
                  </View>

                  <View style={styles.dealInfo}>
                    <Text style={styles.dealStore} numberOfLines={1}>
                      {deal.store || 'Featured Store'}
                    </Text>
                    {renderDealValue(deal)}
                    <View style={styles.dealAction}>
                      <Text style={styles.dealActionText}>View Deal</Text>
                      <Ionicons name="chevron-forward" size={14} color={COLORS.green500} />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* How It Works */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.cyan500 + '20' }]}>
              <Ionicons name="help-circle-outline" size={18} color={COLORS.cyan500} />
            </View>
            <Text style={styles.sectionHeaderTitle}>How It Works</Text>
          </View>
          <View style={styles.stepsContainer}>
            {[
              { step: 1, title: 'Choose a Deal', desc: 'Browse and select from available deals', icon: 'search-outline' },
              { step: 2, title: 'Redeem Offer', desc: 'Tap redeem to activate your deal', icon: 'finger-print-outline' },
              { step: 3, title: 'Save Money', desc: 'Enjoy your rewards at the store', icon: 'wallet-outline' },
            ].map((item, idx) => (
              <View key={idx} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <LinearGradient colors={[COLORS.green500, COLORS.emerald500]} style={styles.stepNumberGradient}>
                    <Text style={styles.stepNumberText}>{item.step}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.stepContent}>
                  <View style={styles.stepIconContainer}>
                    <Ionicons name={item.icon as any} size={20} color={COLORS.navy} />
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepTitle}>{item.title}</Text>
                    <Text style={styles.stepDesc}>{item.desc}</Text>
                  </View>
                </View>
                {idx < 2 && <View style={styles.stepConnector} />}
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingCard: {
    backgroundColor: COLORS.white,
    padding: 40,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    ...Shadows.strong,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.body,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: COLORS.white,
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    ...Shadows.strong,
    maxWidth: 320,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.red50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  errorButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Expired Banner
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red500,
    paddingVertical: 14,
    gap: 8,
  },
  expiredBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Hero Section
  heroSection: {
    height: 300,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerGradient: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  urgentBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    left: '50%',
    transform: [{ translateX: -60 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.red500,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  urgentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  campaignIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 14,
  },
  heroTextContainer: {
    flex: 1,
  },
  campaignTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  campaignTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  heroBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  heroBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Stats Card
  statsCardContainer: {
    paddingHorizontal: 16,
    marginTop: -40,
    marginBottom: 16,
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 2,
  },
  statValueUrgent: {
    color: COLORS.red500,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statsDecor1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statsDecor2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  // Countdown
  countdownGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  countdownItem: {
    backgroundColor: COLORS.gray50,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 70,
  },
  countdownItemUrgent: {
    backgroundColor: COLORS.red50,
  },
  countdownNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.navy,
  },
  countdownNumberUrgent: {
    color: COLORS.red500,
  },
  countdownLabel: {
    fontSize: 11,
    color: COLORS.gray600,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  countdownSeparator: {
    paddingHorizontal: 8,
  },
  countdownColon: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gray300,
  },

  // Sections
  section: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.subtle,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  sectionHeaderTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    flex: 1,
  },

  // Highlights
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  highlightItem: {
    width: (SCREEN_WIDTH - 74) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.gray50,
    padding: 10,
    borderRadius: 10,
  },
  highlightIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.navy,
    flex: 1,
  },

  // Description
  descriptionCard: {
    backgroundColor: COLORS.gray50,
    padding: 16,
    borderRadius: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 22,
  },

  // Offer Details
  offerDetailsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  offerDetailCard: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  offerDetailIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerDetailValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 4,
  },
  offerDetailLabel: {
    fontSize: 12,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  categoriesSection: {
    marginTop: 8,
  },
  categoriesLabel: {
    fontSize: 12,
    color: COLORS.gray600,
    marginBottom: 10,
    fontWeight: '500',
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.green600,
  },

  // Validity
  validityCard: {
    backgroundColor: COLORS.gray50,
    padding: 16,
    borderRadius: 12,
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  validityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  validityIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validityLabel: {
    fontSize: 11,
    color: COLORS.gray600,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  validityValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: 2,
  },
  validityArrow: {
    paddingHorizontal: 12,
  },

  // Terms
  termsCard: {
    gap: 12,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  termBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.green500,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  termText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },

  // Deals Section
  dealsSection: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.subtle,
  },
  dealsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dealsCount: {
    backgroundColor: COLORS.green500,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  dealsCountText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  dealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  dealCard: {
    width: DEAL_CARD_WIDTH,
    backgroundColor: COLORS.gray50,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dealImageContainer: {
    position: 'relative',
    height: 100,
    backgroundColor: COLORS.gray100,
  },
  dealImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dealImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.red500,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  timerText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  storeLinkBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.navy,
    padding: 5,
    borderRadius: 6,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.green500,
    padding: 4,
    borderRadius: 6,
  },
  dealInfo: {
    padding: Spacing.md,
  },
  dealStore: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 6,
  },
  dealValueRow: {
    gap: 2,
    marginBottom: 8,
  },
  dealCashback: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.green500,
  },
  dealCoinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dealCoins: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.amber500,
  },
  dealBonus: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.purple500,
  },
  dealDrop: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.red500,
  },
  dealValueLabel: {
    fontSize: 10,
    color: COLORS.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  dealAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  dealActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.green500,
  },

  // Steps
  stepsContainer: {
    gap: 0,
  },
  stepItem: {
    position: 'relative',
  },
  stepNumber: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1,
  },
  stepNumberGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 40,
    paddingBottom: 20,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 18,
  },
  stepConnector: {
    position: 'absolute',
    left: 13,
    top: 28,
    width: 2,
    height: 40,
    backgroundColor: COLORS.gray200,
  },
});

export default withErrorBoundary(CampaignDetailPage, 'DealsCampaignId');
