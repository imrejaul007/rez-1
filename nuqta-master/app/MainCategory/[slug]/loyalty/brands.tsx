// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shared Brand Loyalty Tracking Page
 * /MainCategory/[slug]/loyalty/brands
 * Shows all brand loyalty tiers with progress bars
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCategoryTheme, SHARED_COLORS } from '@/config/categoryThemeConfig';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import userLoyaltyApi, { BrandLoyalty } from '@/services/userLoyaltyApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const TIER_CONFIG: Record<string, {
  bg: string; text: string; border: string; icon: string; next: string;
  gradientStart: string; gradientEnd: string;
}> = {
  Bronze: {
    bg: colors.tint.amberLight, text: colors.brand.amberDark, border: colors.warningScale[700], icon: '\uD83E\uDD49', next: 'Silver',
    gradientStart: '#FEFCE8', gradientEnd: colors.tint.amberLight,
  },
  Silver: {
    bg: colors.neutral[100], text: colors.neutral[700], border: colors.neutral[400], icon: '\uD83E\uDD48', next: 'Gold',
    gradientStart: colors.neutral[50], gradientEnd: colors.neutral[100],
  },
  Gold: {
    bg: colors.tint.amber, text: colors.brand.amberDark, border: colors.warningScale[400], icon: '\uD83E\uDD47', next: 'Platinum',
    gradientStart: colors.tint.amber, gradientEnd: colors.tint.amberLight,
  },
  Platinum: {
    bg: colors.tint.purple, text: '#5B21B6', border: colors.brand.purpleLight, icon: '\uD83D\uDC8E', next: '',
    gradientStart: colors.tint.purpleLight, gradientEnd: colors.tint.purple,
  },
};

function ElectronicsBrandsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = getCategoryTheme(slug || 'electronics');
  const [brands, setBrands] = useState<BrandLoyalty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBrands = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await userLoyaltyApi.getLoyalty(slug);
      if (res.success && res.data?.loyalty?.brandLoyalty) {
        setBrands(res.data.loyalty.brandLoyalty);
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await userLoyaltyApi.syncBrandLoyalty();
    } catch {}
    await fetchBrands();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const renderBrand = useCallback(({ item }: { item: BrandLoyalty }) => {
    const config = TIER_CONFIG[item.tier] || TIER_CONFIG.Bronze;
    const progressPercent = Math.min(item.progress, 100);
    const purchasesToNext = item.nextTierAt > 0 ? item.nextTierAt - item.purchaseCount : 0;

    return (
      <Pressable
        style={styles.brandCard}
        onPress={() => router.push(`/MainStorePage?storeId=${item.brandId}` as any)}
       
      >
        <LinearGradient
          colors={[config.gradientStart, config.gradientEnd]}
          style={styles.brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.brandHeader}>
            <View style={styles.brandLeft}>
              <Text style={styles.brandIcon}>{config.icon}</Text>
              <View>
                <Text style={styles.brandName}>{item.brandName}</Text>
                <Text style={styles.brandVisits}>{item.purchaseCount} purchases</Text>
              </View>
            </View>
            <View style={[styles.tierBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
              <Text style={[styles.tierText, { color: config.text }]}>{item.tier}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
                width: `${progressPercent}%`,
                backgroundColor: config.border,
              }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressCurrent}>{item.tier}</Text>
              {config.next ? (
                <Text style={styles.progressNext}>
                  {purchasesToNext > 0 ? `${purchasesToNext} purchases to ${config.next}` : config.next}
                </Text>
              ) : (
                <Text style={[styles.progressNext, { color: Colors.brand.purpleLight }]}>Max tier reached!</Text>
              )}
            </View>
          </View>

          {/* Tier benefits hint */}
          <View style={styles.benefitRow}>
            <Ionicons name="gift-outline" size={14} color={SHARED_COLORS.textSecondary} />
            <Text style={styles.benefitText}>
              {item.tier === 'Platinum' ? 'Enjoy exclusive platinum perks and early access to new launches'
                : item.tier === 'Gold' ? 'Enjoy gold member discounts and priority support'
                : item.tier === 'Silver' ? 'Earn bonus coins on every purchase'
                : 'Keep shopping to unlock rewards'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={SHARED_COLORS.textSecondary} />
          </View>
        </LinearGradient>
      </Pressable>
    );
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <CardGridSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={SHARED_COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Brand Loyalty</Text>
          <Text style={styles.headerSubtitle}>{brands.length} brands tracked</Text>
        </View>
      </View>

      {/* Tier legend */}
      <View style={styles.legend}>
        {Object.entries(TIER_CONFIG).map(([tier, cfg]) => (
          <View key={tier} style={styles.legendItem}>
            <Text style={styles.legendIcon}>{cfg.icon}</Text>
            <Text style={styles.legendText}>{tier}</Text>
          </View>
        ))}
      </View>

      <FlashList
        data={brands}
        keyExtractor={(item) => item.brandId}
        renderItem={renderBrand}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primaryColor]} />}
        estimatedItemSize={100}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="laptop-outline" size={48} color={SHARED_COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No brand loyalty yet</Text>
            <Text style={styles.emptySubtitle}>
              Shop at stores to start building brand loyalty tiers
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default, gap: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { ...Typography.h4, fontWeight: '700', color: Colors.text.primary },
  headerSubtitle: { ...Typography.bodySmall, color: Colors.text.tertiary },
  legend: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.md, paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendIcon: { ...Typography.bodyLarge },
  legendText: { ...Typography.bodySmall, color: Colors.text.tertiary, fontWeight: '500' },
  listContent: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: 120 },
  brandCard: {
    borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  brandGradient: { padding: Spacing.base },
  brandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  brandIcon: { ...Typography.h1 },
  brandName: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary },
  brandVisits: { ...Typography.bodySmall, color: Colors.text.tertiary },
  tierBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, borderWidth: 1 },
  tierText: { ...Typography.bodySmall, fontWeight: '700' },
  progressSection: { marginBottom: Spacing.md },
  progressBar: { height: 8, backgroundColor: 'rgba(229,231,235,0.6)', borderRadius: BorderRadius.xs, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: BorderRadius.xs },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressCurrent: { ...Typography.caption, fontWeight: '500', color: Colors.text.tertiary },
  progressNext: { ...Typography.caption, color: Colors.text.tertiary },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(229,231,235,0.6)',
  },
  benefitText: { flex: 1, fontSize: 12, color: colors.neutral[500] },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.neutral[900], marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.neutral[500], marginTop: 4, textAlign: 'center' },
});

export default withErrorBoundary(ElectronicsBrandsPage, 'MainCategorySlugLoyaltyBrands');
