/**
 * Prive Campaigns Listing Page
 *
 * Shows active social cashback campaigns with filter chips and pagination.
 * Uses Prive dark theme, Zustand auth selectors, FlatList with onEndReached.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import priveCampaignApi, { PriveCampaign } from '@/services/priveCampaignApi';

const FILTERS = ['Available', 'Joined', 'Completed'] as const;
type FilterType = typeof FILTERS[number];

/** Resolve merchant name from either flat or nested shape */
function getMerchantName(c: PriveCampaign): string {
  return c.merchantName || c.merchantId?.name || 'Merchant';
}

/** Resolve merchant logo from either flat or nested shape */
function getMerchantLogo(c: PriveCampaign): string | undefined {
  return c.merchantLogo || c.merchantId?.logo;
}

export default function CampaignsListPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [campaigns, setCampaigns] = useState<PriveCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('Available');
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1 && !append) setIsLoading(true);
      setError(null);

      const response = await priveCampaignApi.getCampaigns({ page: pageNum, limit: 20 });

      if (!response.success) {
        throw new Error('Failed to fetch campaigns');
      }

      const data = response.data;
      const newCampaigns = data?.campaigns || [];

      if (append) {
        setCampaigns(prev => [...prev, ...newCampaigns]);
      } else {
        setCampaigns(newCampaigns);
      }

      setHasMore(data?.pagination?.hasMore || false);
      setPage(pageNum);
    } catch {
      setError('Failed to load campaigns');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchCampaigns(1);
  }, [isAuthenticated, authLoading, fetchCampaigns]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchCampaigns(1);
  }, [fetchCampaigns]);

  const onEndReached = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    fetchCampaigns(page + 1, true);
  }, [isLoadingMore, hasMore, page, fetchCampaigns]);

  const handleFilterChange = useCallback((f: FilterType) => {
    setActiveFilter(f);
  }, []);

  // Client-side filter on the fetched data
  const filteredCampaigns = campaigns.filter(c => {
    const status = c.userStatus;
    if (activeFilter === 'Available') return status === 'eligible' || !status;
    if (activeFilter === 'Joined') return status === 'joined' || status === 'submitted';
    if (activeFilter === 'Completed') return status === 'approved' || status === 'rejected';
    return true;
  });

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'eligible': return PRIVE_COLORS.status.success;
      case 'joined': return PRIVE_COLORS.status.info;
      case 'submitted': return PRIVE_COLORS.status.warning;
      case 'approved': return PRIVE_COLORS.status.success;
      case 'rejected': return PRIVE_COLORS.status.error;
      case 'slots_full':
      case 'expired':
      case 'tier_insufficient':
        return PRIVE_COLORS.text.tertiary;
      default: return PRIVE_COLORS.text.tertiary;
    }
  };

  const getStatusLabel = (status?: string): string => {
    switch (status) {
      case 'eligible': return 'Open';
      case 'joined': return 'Joined';
      case 'submitted': return 'Submitted';
      case 'approved': return 'Completed';
      case 'rejected': return 'Rejected';
      case 'slots_full': return 'Full';
      case 'expired': return 'Expired';
      case 'tier_insufficient': return 'Locked';
      default: return 'Open';
    }
  };

  const renderCampaignCard = useCallback(({ item }: { item: PriveCampaign }) => {
    const logo = getMerchantLogo(item);
    const name = getMerchantName(item);
    const statusColor = getStatusColor(item.userStatus);
    const statusLabel = getStatusLabel(item.userStatus);
    const cashback = item.reward.cashbackPercent ?? item.reward.cashbackMax ?? 0;

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/prive/campaigns/${item._id}`)}
      >
        <View style={styles.cardHeader}>
          {logo ? (
            <CachedImage
              source={{ uri: logo }}
              style={styles.merchantLogo}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.merchantLogo, styles.merchantLogoFallback]}>
              <Ionicons name="storefront-outline" size={18} color={PRIVE_COLORS.text.tertiary} />
            </View>
          )}
          <View style={styles.cardHeaderText}>
            <Text style={styles.merchantName} numberOfLines={1}>{name}</Text>
            <Text style={styles.campaignTitle} numberOfLines={2}>{item.title}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.rewardRow}>
            <Ionicons name="star" size={14} color={PRIVE_COLORS.gold.primary} />
            <Text style={styles.rewardValue}>
              {item.reward.coinAmount} coins
              {cashback > 0 ? ` + ${cashback}% cashback` : ''}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>{item.slotsRemaining} slots left</Text>
            <Text style={styles.metaDot}>{'\u2022'}</Text>
            <Text style={styles.metaItem}>{item.minPriveTier} tier</Text>
            <Text style={styles.metaDot}>{'\u2022'}</Text>
            <Text style={styles.metaItem}>{item.taskType.replace(/_/g, ' ')}</Text>
          </View>
        </View>
      </Pressable>
    );
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={PRIVE_COLORS.gold.primary} />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        {FILTERS.map(f => (
          <Pressable
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => handleFilterChange(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={PRIVE_COLORS.status.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchCampaigns(1)}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredCampaigns}
          keyExtractor={item => item._id}
          renderItem={renderCampaignCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={PRIVE_COLORS.gold.primary}
              colors={[PRIVE_COLORS.gold.primary]}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: PRIVE_SPACING.lg }}
                color={PRIVE_COLORS.gold.primary}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="megaphone-outline" size={36} color={PRIVE_COLORS.gold.muted} />
              </View>
              <Text style={styles.emptyTitle}>No campaigns found</Text>
              <Text style={styles.emptyText}>
                {activeFilter === 'Available'
                  ? 'Check back soon for new social cashback campaigns!'
                  : `No ${activeFilter.toLowerCase()} campaigns yet.`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: PRIVE_SPACING.lg,
    paddingVertical: PRIVE_SPACING.md,
    gap: PRIVE_SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: PRIVE_COLORS.background.elevated,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  filterChipActive: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderColor: PRIVE_COLORS.gold.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIVE_COLORS.text.secondary,
  },
  filterTextActive: {
    color: PRIVE_COLORS.text.inverse,
  },
  listContent: {
    paddingHorizontal: PRIVE_SPACING.lg,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: 14,
    marginBottom: PRIVE_SPACING.md,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  merchantLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIVE_COLORS.background.elevated,
  },
  merchantLogoFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 10,
  },
  merchantName: {
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
    fontWeight: '500',
  },
  campaignTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  cardBody: {},
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rewardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.light,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    textTransform: 'capitalize',
  },
  metaDot: {
    fontSize: 11,
    color: PRIVE_COLORS.text.disabled,
    marginHorizontal: 6,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: PRIVE_SPACING.md,
  },
  loadingText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: PRIVE_SPACING.md,
  },
  errorText: {
    fontSize: 14,
    color: PRIVE_COLORS.status.error,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: PRIVE_RADIUS.sm,
  },
  retryText: {
    color: PRIVE_COLORS.text.inverse,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIVE_COLORS.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
    marginTop: PRIVE_SPACING.lg,
  },
  emptyText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    marginTop: PRIVE_SPACING.sm,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
