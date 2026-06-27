// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Insurance Page
 * Browse insurance plans with cashback - API-driven
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import CachedImage from '@/components/ui/CachedImage';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import {
  getInsuranceTypes,
  getInsurancePlans,
  getFeaturedPlans,
  InsuranceTypeInfo,
  InsurancePlan,
  InsuranceType,
} from '@/services/insuranceApi';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  health: { icon: 'medkit', color: Colors.error, label: 'Health Insurance' },
  life: { icon: 'heart', color: colors.brand.pink, label: 'Life Insurance' },
  vehicle: { icon: 'car-sport', color: colors.infoScale[400], label: 'Vehicle Insurance' },
  travel: { icon: 'airplane', color: colors.brand.purpleLight, label: 'Travel Insurance' },
  home: { icon: 'home', color: colors.successScale[400], label: 'Home Insurance' },
  business: { icon: 'briefcase', color: colors.warningScale[400], label: 'Business Insurance' },
};

function InsurancePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const params = useLocalSearchParams();
  const initialType = (params.type as string) || '';

  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [types, setTypes] = useState<InsuranceTypeInfo[]>([]);
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [featuredPlans, setFeaturedPlans] = useState<InsurancePlan[]>([]);

  const [typesLoading, setTypesLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch insurance types
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getInsuranceTypes();
        if (!isMounted()) return;
        if (!cancelled) setTypes(data);
      } catch {
        // Types will remain empty, UI shows empty state
      } finally {
        if (!isMounted()) return;
        if (!cancelled) setTypesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch featured plans
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getFeaturedPlans();
        if (!isMounted()) return;
        if (!cancelled) setFeaturedPlans(data);
      } catch {
        // Featured will remain empty
      } finally {
        if (!isMounted()) return;
        if (!cancelled) setFeaturedLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch plans when type filter or page changes
  const fetchPlans = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setPlansLoading(true);
    else setLoadingMore(true);

    try {
      const typeFilter = selectedType as InsuranceType | undefined;
      const result = await getInsurancePlans({
        type: typeFilter || undefined,
        page: pageNum,
        limit: 10,
      });

      if (append) {
        if (!isMounted()) return;
        setPlans((prev) => [...prev, ...result.plans]);
      } else {
        if (!isMounted()) return;
        setPlans(result.plans);
      }
      if (!isMounted()) return;
      setHasMore(pageNum < result.pagination.pages);
    } catch {
      if (!isMounted()) return;
      if (!append) setPlans([]);
    } finally {
      if (!isMounted()) return;
      setPlansLoading(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [selectedType]);

  // Reset page when type changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPlans(1, false);
  }, [selectedType, fetchPlans]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !plansLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPlans(nextPage, true);
    }
  }, [loadingMore, hasMore, plansLoading, page, fetchPlans]);

  const handleTypePress = useCallback((typeId: string) => {
    setSelectedType((prev) => (prev === typeId ? '' : typeId));
  }, []);

  const handlePlanPress = useCallback((plan: InsurancePlan) => {
    router.push(`/insurance/${plan._id}` as any);
  }, [router]);

  const formatPremium = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  // Render header content (banner + types + featured) as FlatList header
  const renderListHeader = useCallback(() => (
    <View>
      {/* Cashback Banner */}
      <View style={styles.banner}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.15)', 'rgba(59, 130, 246, 0.15)']}
          style={styles.bannerGradient}
        >
          <Ionicons name="shield-checkmark" size={32} color={colors.brand.purpleLight} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Protect & Earn Rewards</Text>
            <Text style={styles.bannerSubtitle}>
              Get up to 20% cashback on insurance premiums
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Insurance Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Insurance Types</Text>
        {typesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.gold} />
          </View>
        ) : types.length === 0 ? (
          <View style={styles.emptySmall}>
            <Text style={styles.emptySmallText}>No insurance types available</Text>
          </View>
        ) : (
          <View style={styles.typesGrid}>
            {types.map((t) => {
              const meta = TYPE_META[t.type] || { icon: 'help-circle', color: colors.neutral[500], label: t.type };
              return (
                <Pressable
                  key={t.type}
                  style={[
                    styles.typeCard,
                    selectedType === t.type && styles.typeCardActive,
                  ]}
                  onPress={() => handleTypePress(t.type)}
                >
                  <View style={[styles.typeIcon, { backgroundColor: meta.color + '20' }]}>
                    <Ionicons name={meta.icon as any} size={24} color={meta.color} />
                  </View>
                  <Text style={styles.typeName}>{meta.label}</Text>
                  <Text style={styles.typeCashback}>
                    Up to {t.maxCashback}% cashback
                  </Text>
                  <View style={styles.typeCountBadge}>
                    <Text style={styles.typeCountText}>{t.count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Featured Plans (only when no type filter) */}
      {!selectedType && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Plans</Text>
          {featuredLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.gold} />
            </View>
          ) : featuredPlans.length === 0 ? (
            <View style={styles.emptySmall}>
              <Text style={styles.emptySmallText}>No featured plans right now</Text>
            </View>
          ) : (
            <View style={styles.featuredList}>
              {featuredPlans.map((plan) => (
                <Pressable
                  key={plan._id}
                  style={styles.featuredCard}
                  onPress={() => handlePlanPress(plan)}
                >
                  <View style={styles.featuredHeader}>
                    <View style={styles.featuredProviderRow}>
                      {plan.providerLogo ? (
                        <CachedImage
                          source={{ uri: plan.providerLogo }}
                          style={styles.providerLogo}
                        />
                      ) : null}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planProvider}>{plan.provider}</Text>
                        <Text style={styles.planName}>{plan.name}</Text>
                      </View>
                    </View>
                    <View style={styles.planCashback}>
                      <Text style={styles.planCashbackText}>{plan.cashbackPercent}%</Text>
                      <Text style={styles.planCashbackLabel}>cashback</Text>
                    </View>
                  </View>

                  <View style={styles.planDetails}>
                    <View style={styles.planDetail}>
                      <Text style={styles.planDetailLabel}>Coverage</Text>
                      <Text style={styles.planDetailValue}>{plan.coverage}</Text>
                    </View>
                    <View style={styles.planDetail}>
                      <Text style={styles.planDetailLabel}>Premium</Text>
                      <Text style={styles.planDetailValue}>
                        {formatPremium(plan.premium.annual)}/yr
                      </Text>
                    </View>
                    {plan.rating > 0 && (
                      <View style={styles.planDetail}>
                        <Text style={styles.planDetailLabel}>Rating</Text>
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={14} color={colors.warningScale[400]} />
                          <Text style={styles.planDetailValue}> {plan.rating.toFixed(1)}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {plan.features.length > 0 && (
                    <View style={styles.planFeatures}>
                      {plan.features.slice(0, 3).map((feature, index) => (
                        <View key={index} style={styles.planFeature}>
                          <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
                          <Text style={styles.planFeatureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.planButton}>
                    <Text style={styles.planButtonText}>View Details</Text>
                    <Ionicons name="arrow-forward" size={18} color={Colors.background.primary} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Plans Section Title */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          {selectedType
            ? `${TYPE_META[selectedType]?.label || 'Insurance'} Plans`
            : 'All Plans'}
        </Text>
      </View>
    </View>
  ), [types, typesLoading, featuredPlans, featuredLoading, selectedType, handleTypePress, handlePlanPress, formatPremium, currencySymbol]);

  const renderPlanItem = useCallback(({ item }: { item: InsurancePlan }) => {
    const meta = TYPE_META[item.type] || { icon: 'help-circle', color: colors.neutral[500], label: item.type };
    return (
      <Pressable
        style={styles.planListCard}
        onPress={() => handlePlanPress(item)}
      >
        <View style={styles.planListHeader}>
          <View style={styles.planListLeft}>
            {item.providerLogo ? (
              <CachedImage
                source={{ uri: item.providerLogo }}
                style={styles.providerLogoSmall}
              />
            ) : (
              <View style={[styles.providerIconFallback, { backgroundColor: meta.color + '20' }]}>
                <Ionicons name={meta.icon as any} size={20} color={meta.color} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.planListProvider}>{item.provider}</Text>
              <Text style={styles.planListName}>{item.name}</Text>
              <Text style={styles.planListCoverage}>Coverage: {item.coverage}</Text>
            </View>
          </View>
          <View style={styles.planListRight}>
            <Text style={styles.planListPremium}>
              {formatPremium(item.premium.monthly)}/mo
            </Text>
            <View style={styles.cashbackChip}>
              <Text style={styles.cashbackChipText}>{item.cashbackPercent}% cashback</Text>
            </View>
          </View>
        </View>

        {item.claimSettlementRatio > 0 && (
          <View style={styles.claimRatioRow}>
            <Ionicons name="checkmark-shield" size={14} color={colors.successScale[400]} />
            <Text style={styles.claimRatioText}>
              {item.claimSettlementRatio.toFixed(1)}% claim settlement ratio
            </Text>
          </View>
        )}
      </Pressable>
    );
  }, [handlePlanPress, currencySymbol]);

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={Colors.gold} />
        </View>
      );
    }
    return null;
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (plansLoading) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="shield-checkmark-outline" size={36} color={Colors.gold} />
          </View>
          <ActivityIndicator size="small" color={Colors.gold} style={{ marginTop: Spacing.base }} />
          <Text style={styles.emptySubtitle}>Loading insurance plans...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="shield-checkmark-outline" size={36} color={Colors.gold} />
        </View>
        <Text style={styles.emptyTitle}>No Plans Found</Text>
        <Text style={styles.emptySubtitle}>
          {selectedType
            ? `No ${TYPE_META[selectedType]?.label || ''} plans are available right now.`
            : 'No insurance plans are available right now.'}
        </Text>
        {selectedType && (
          <Pressable style={styles.clearFilterBtn} onPress={() => setSelectedType('')}>
            <Text style={styles.clearFilterText}>Clear Filter</Text>
          </Pressable>
        )}
      </View>
    );
  }, [plansLoading, selectedType]);

  // Why Choose Us section as footer content
  const renderWhySection = useCallback(() => {
    if (plans.length === 0 && !plansLoading) return null;
    return (
      <View style={styles.whySection}>
        <Text style={styles.sectionTitle}>{`Why Buy Insurance on ${BRAND.APP_NAME}?`}</Text>
        <View style={styles.whyGrid}>
          {[
            { icon: 'cash-outline', title: 'Best Cashback', desc: 'Up to 20% cashback' },
            { icon: 'document-text-outline', title: 'Easy Claims', desc: 'Quick claim process' },
            { icon: 'shield-checkmark-outline', title: 'Trusted Partners', desc: 'Top insurers' },
            { icon: 'headset-outline', title: '24/7 Support', desc: 'Always available' },
          ].map((item, index) => (
            <View key={index} style={styles.whyCard}>
              <Ionicons name={item.icon as any} size={28} color={Colors.gold} />
              <Text style={styles.whyTitle}>{item.title}</Text>
              <Text style={styles.whyDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }, [plans.length, plansLoading]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Insurance</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlashList
        data={plans}
        keyExtractor={(item) => item._id}
        renderItem={renderPlanItem}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          <>
            {renderFooter()}
            {renderWhySection()}
            <View style={{ height: 120 }} />
          </>
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        estimatedItemSize={120}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  banner: {
    margin: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.base,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  sectionHeaderRow: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptySmall: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptySmallText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },

  // Types grid
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  typeCard: {
    width: '31%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    }),
  },
  typeCardActive: {
    borderColor: Colors.gold,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  typeName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  typeCashback: {
    fontSize: 10,
    color: Colors.gold,
    fontWeight: '500',
  },
  typeCountBadge: {
    marginTop: 4,
    backgroundColor: Colors.gold + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.brand.amberDeep,
  },

  // Featured cards
  featuredList: {
    gap: Spacing.base,
  },
  featuredCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  featuredProviderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  providerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  planProvider: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  planCashback: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  planCashbackText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.successScale[400],
  },
  planCashbackLabel: {
    fontSize: 10,
    color: colors.successScale[400],
  },
  planDetails: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing.base,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  planDetail: {},
  planDetailLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  planDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planFeatures: {
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  planFeatureText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // Plan list cards
  planListCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    }),
  },
  planListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planListLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    marginRight: Spacing.sm,
  },
  providerLogoSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  providerIconFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planListProvider: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginBottom: 1,
  },
  planListName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  planListCoverage: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  planListRight: {
    alignItems: 'flex-end',
  },
  planListPremium: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  cashbackChip: {
    backgroundColor: colors.successScale[400] + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cashbackChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.successScale[400],
  },
  claimRatioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  claimRatioText: {
    fontSize: 12,
    color: colors.successScale[400],
    fontWeight: '500',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gold + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearFilterBtn: {
    marginTop: Spacing.base,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.gold + '18',
    borderRadius: BorderRadius.md,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.amberDeep,
  },

  // Footer loader
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },

  // Why section
  whySection: {
    margin: Spacing.base,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
  },
  whyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
  },
  whyCard: {
    width: '46%',
    alignItems: 'center',
    padding: Spacing.base,
  },
  whyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  whyDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
});

export default withErrorBoundary(InsurancePage, 'Insurance');
