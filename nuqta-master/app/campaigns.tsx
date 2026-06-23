import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * All Campaigns Page - Premium campaign listing with filters
 * Route: /campaigns
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { campaignsApi, Campaign } from '@/services/campaignsApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useUserIdentityStore } from '@/stores/userIdentityStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  white: Colors.background.primary,
  navy: Colors.nileBlue,
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray300: Colors.border.default,
  gray600: Colors.text.tertiary,
  gray800: Colors.text.primary,
  green500: Colors.success,
  emerald500: Colors.success,
  amber500: Colors.warning,
  blue500: Colors.info,
  purple500: Colors.brand.purpleLight,
  pink500: colors.brand.pink,
  red500: Colors.error,
  cyan500: colors.brand.cyan,
};

// Campaign type colors
const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  cashback: { bg: colors.greenMist, text: '#2E7D32', icon: 'cash-outline' },
  coins: { bg: '#FFF8E1', text: '#F57C00', icon: 'wallet-outline' },
  bank: { bg: '#E3F2FD', text: '#1565C0', icon: 'card-outline' },
  bill: { bg: '#FCE4EC', text: '#C2185B', icon: 'receipt-outline' },
  drop: { bg: '#FFF3E0', text: '#E65100', icon: 'gift-outline' },
  flash: { bg: '#FFEBEE', text: '#C62828', icon: 'flash-outline' },
  'new-user': { bg: colors.greenMist, text: '#388E3C', icon: 'person-add-outline' },
  general: { bg: colors.neutral[100], text: colors.neutral[700], icon: 'pricetag-outline' },
};

const AllCampaignsPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { segment } = useUserIdentityStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');

  const campaignTypes = [
    { id: 'all', label: 'All', icon: 'apps-outline' },
    { id: 'cashback', label: 'Cashback', icon: 'cash-outline' },
    { id: 'coins', label: 'Coins', icon: 'wallet-outline' },
    { id: 'bank', label: 'Bank', icon: 'card-outline' },
    { id: 'flash', label: 'Flash', icon: 'flash-outline' },
    { id: 'new-user', label: 'New User', icon: 'person-add-outline' },
  ];

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const response = await campaignsApi.getActiveCampaigns({ limit: 50 });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setCampaigns(response.data.campaigns);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCampaigns();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleCampaignPress = (campaign: Campaign) => {
    router.push(`/deals/${campaign.campaignId || campaign._id}` as any);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const eligibleCount = useMemo(() =>
    campaigns.filter(c => c.userEligible && c.exclusiveToProgramSlug).length,
    [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const typed = selectedType === 'all' ? campaigns : campaigns.filter(c => c.type === selectedType);
    // Sort eligible exclusive campaigns first, keep backend priority order otherwise
    return [...typed].sort((a, b) => {
      const aElig = a.userEligible && a.exclusiveToProgramSlug ? 1 : 0;
      const bElig = b.userEligible && b.exclusiveToProgramSlug ? 1 : 0;
      return bElig - aElig;
    });
  }, [campaigns, selectedType]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.success, colors.successScale[400]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>All Campaigns</Text>
            <Text style={styles.headerSubtitle}>{campaigns.length} active offers</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>{campaigns.length}</Text>
            <Text style={styles.statsLabel}>Active</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>
              {campaigns.filter(c => getDaysRemaining(c.endTime) <= 3 && getDaysRemaining(c.endTime) > 0).length}
            </Text>
            <Text style={styles.statsLabel}>Ending Soon</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>
              {eligibleCount > 0 ? eligibleCount : new Set(campaigns.map(c => c.type)).size}
            </Text>
            <Text style={styles.statsLabel}>{eligibleCount > 0 ? 'For You' : 'Categories'}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Chips */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {campaignTypes.map((type) => (
            <Pressable
              key={type.id}
              onPress={() => setSelectedType(type.id)}
              style={[
                styles.filterChip,
                selectedType === type.id && styles.filterChipActive
              ]}
            >
              <Ionicons
                name={type.icon as any}
                size={16}
                color={selectedType === type.id ? COLORS.white : COLORS.gray600}
              />
              <Text style={[
                styles.filterChipText,
                selectedType === type.id && styles.filterChipTextActive
              ]}>
                {type.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {filteredCampaigns.length > 0 ? (
          <View style={styles.campaignsGrid}>
            {filteredCampaigns.map((campaign) => {
              const daysRemaining = getDaysRemaining(campaign.endTime);
              const typeStyle = TYPE_COLORS[campaign.type] || TYPE_COLORS.general;

              return (
                <Pressable
                  key={campaign._id}
                  style={styles.campaignCard}
                  onPress={() => handleCampaignPress(campaign)}
                 
                >
                  {/* Card Header with Gradient */}
                  <LinearGradient
                    colors={campaign.gradientColors || [colors.success, colors.tealGreen]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardHeader}
                  >
                    {campaign.icon ? (
                      <CachedImage source={campaign.icon} style={styles.campaignIcon} />
                    ) : (
                      <View style={[styles.campaignIconPlaceholder, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Ionicons name={typeStyle.icon as any} size={24} color={COLORS.white} />
                      </View>
                    )}
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.campaignTitle} numberOfLines={1}>{campaign.title}</Text>
                      <Text style={styles.campaignSubtitle} numberOfLines={1}>{campaign.subtitle}</Text>
                    </View>
                  </LinearGradient>

                  {/* Badge */}
                  <View style={[styles.badge, { backgroundColor: campaign.badgeBg || COLORS.white }]}>
                    <Text style={[styles.badgeText, { color: campaign.badgeColor || COLORS.navy }]}>
                      {campaign.badge}
                    </Text>
                  </View>

                  {/* UNLOCKED badge for eligible exclusive campaigns */}
                  {campaign.userEligible && campaign.exclusiveToProgramSlug && (
                    <View style={styles.unlockedBadge}>
                      <Ionicons name="lock-open-outline" size={10} color="#059669" />
                      <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
                    </View>
                  )}

                  {/* Card Content */}
                  <View style={styles.cardContent}>
                    {/* Type Tag */}
                    <View style={[styles.typeTag, { backgroundColor: typeStyle.bg }]}>
                      <Ionicons name={typeStyle.icon as any} size={12} color={typeStyle.text} />
                      <Text style={[styles.typeTagText, { color: typeStyle.text }]}>
                        {campaign.type.replace('-', ' ')}
                      </Text>
                    </View>

                    {/* Description */}
                    {campaign.description && (
                      <Text style={styles.description} numberOfLines={2}>
                        {campaign.description}
                      </Text>
                    )}

                    {/* Meta Info */}
                    <View style={styles.metaContainer}>
                      <View style={styles.metaItem}>
                        <Ionicons name="pricetag-outline" size={14} color={COLORS.gray600} />
                        <Text style={styles.metaText}>{campaign.deals?.length || 0} deals</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color={COLORS.gray600} />
                        <Text style={styles.metaText}>
                          {formatDate(campaign.startTime)} - {formatDate(campaign.endTime)}
                        </Text>
                      </View>
                    </View>

                    {/* Urgency Indicator */}
                    {daysRemaining > 0 && daysRemaining <= 7 && (
                      <View style={[
                        styles.urgencyBadge,
                        daysRemaining <= 3 ? styles.urgencyHigh : styles.urgencyMedium
                      ]}>
                        <Ionicons
                          name="time-outline"
                          size={12}
                          color={daysRemaining <= 3 ? COLORS.red500 : COLORS.amber500}
                        />
                        <Text style={[
                          styles.urgencyText,
                          { color: daysRemaining <= 3 ? COLORS.red500 : COLORS.amber500 }
                        ]}>
                          {daysRemaining} day{daysRemaining > 1 ? 's' : ''} left
                        </Text>
                      </View>
                    )}

                    {/* Additional Info */}
                    {(campaign.minOrderValue || campaign.maxBenefit) && (
                      <View style={styles.additionalInfo}>
                        {campaign.minOrderValue && (
                          <View style={styles.infoChip}>
                            <Text style={styles.infoChipText}>Min {currencySymbol}{campaign.minOrderValue}</Text>
                          </View>
                        )}
                        {campaign.maxBenefit && (
                          <View style={styles.infoChip}>
                            <Text style={styles.infoChipText}>Max {currencySymbol}{campaign.maxBenefit}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* View Button */}
                  <View style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>View Campaign</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.green500} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.gray300} />
            </View>
            <Text style={styles.emptyText}>No campaigns found</Text>
            <Text style={styles.emptySubtext}>
              {selectedType !== 'all'
                ? `No ${selectedType} campaigns available right now`
                : 'Check back later for new campaigns'}
            </Text>
            {selectedType !== 'all' && (
              <Pressable
                style={styles.clearFilterButton}
                onPress={() => setSelectedType('all')}
              >
                <Text style={styles.clearFilterText}>Show All Campaigns</Text>
              </Pressable>
            )}
          </View>
        )}

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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: COLORS.gray600,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : Spacing.base,
    paddingBottom: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  statsItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsValue: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.white,
  },
  statsLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Filters
  filtersContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: COLORS.gray100,
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.green500,
  },
  filterChipText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: COLORS.gray600,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },

  // Content
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  campaignsGrid: {
    gap: Spacing.base,
  },
  campaignCard: {
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  campaignIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  campaignIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  campaignTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  campaignSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  cardContent: {
    padding: Spacing.base,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginBottom: 10,
  },
  typeTagText: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  urgencyHigh: {
    backgroundColor: colors.errorScale[100],
  },
  urgencyMedium: {
    backgroundColor: colors.tint.amberLight,
  },
  urgencyText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  additionalInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  infoChip: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  infoChipText: {
    ...Typography.caption,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: 6,
  },
  viewButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.green500,
  },

  // Empty State
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  emptyText: {
    ...Typography.h4,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  clearFilterButton: {
    backgroundColor: COLORS.green500,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  clearFilterText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white,
  },

  // UNLOCKED badge for eligible exclusive campaigns
  unlockedBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  unlockedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
  },
});

export default withErrorBoundary(AllCampaignsPage, 'Campaigns');
