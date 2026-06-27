import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Smart Spend — Privé Curated Marketplace
 *
 * Admin-curated premium stores and products with enhanced Privé coin earning.
 * Taps through to existing store/product pages with Smart Spend source tracking.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { PriveSkeletonBlock } from '@/components/prive/PriveSkeletonBlock';
import priveApi, { SmartSpendItem, SmartSpendSection } from '@/services/priveApi';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - PRIVE_SPACING.lg * 2 - PRIVE_SPACING.md) / 2;

function SmartSpendScreen() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  // State
  const [items, setItems] = useState<SmartSpendItem[]>([]);
  const [sections, setSections] = useState<SmartSpendSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isMounted = useIsMounted();

  // Fetch catalog
  const fetchCatalog = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      if (pageNum === 1 && !refresh) setIsLoading(true);
      if (pageNum > 1) setIsLoadingMore(true);
      setError(null);

      const params: any = { page: pageNum, limit: 20 };
      if (selectedSection !== 'All') {
        params.section = selectedSection;
      }

      const response = await priveApi.getSmartSpendCatalog(params);

      if (response.success && response.data) {
        const newItems = response.data.items || [];
        if (pageNum === 1) {
          setItems(newItems);
        } else {
          if (!isMounted()) return;
          setItems(prev => {
            const existingIds = new Set(prev.map(i => i._id));
            const unique = newItems.filter(i => !existingIds.has(i._id));
            return [...prev, ...unique];
          });
        }

        if (pageNum === 1 && response.data.sections) {
          if (!isMounted()) return;
          setSections(response.data.sections);
        }

        const pagination = response.data.pagination;
        if (!isMounted()) return;
        setHasMore(pageNum < (pagination?.totalPages || 1));
        if (!isMounted()) return;
        setPage(pageNum);
      } else {
        if (pageNum === 1) setError('Failed to load Smart Spend catalog');
      }
    } catch (err) {
      if (pageNum === 1) setError('Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
      if (!isMounted()) return;
      setIsLoadingMore(false);
    }
  }, [selectedSection]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchCatalog(1);
  }, [selectedSection, isAuthenticated, authLoading]);

  const handleRefresh = useCallback(() => {
    fetchCatalog(1, true);
  }, [fetchCatalog]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchCatalog(page + 1);
    }
  }, [isLoadingMore, hasMore, page, fetchCatalog]);

  // Section filter change
  const handleSectionChange = useCallback((section: string) => {
    setSelectedSection(section);
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, []);

  // Navigate to store/product
  const handleItemPress = useCallback((item: SmartSpendItem) => {
    // Track click analytics
    priveApi.trackSmartSpendClick(item._id).catch(() => {});

    if (item.itemType === 'store' && item.store?.slug) {
      router.push(`/explore/stores/${item.store.slug}?source=smart_spend&ssId=${item._id}` as any);
    } else if (item.itemType === 'product' && item.product?.store?.slug) {
      router.push(`/explore/stores/${item.product.store.slug}?source=smart_spend&ssId=${item._id}` as any);
    }
  }, [router]);

  // Featured item (first featured item)
  const featuredItem = useMemo(() => items.find(i => i.isFeatured), [items]);
  const gridItems = useMemo(() => items.filter(i => i !== featuredItem), [items, featuredItem]);

  // Section tabs
  const allSections = useMemo(() => {
    const tabs: { label: string; count?: number }[] = [{ label: 'All' }];
    sections.forEach(s => tabs.push({ label: s.label, count: s.count }));
    return tabs;
  }, [sections]);

  // Skeleton loading
  if (isLoading && items.length === 0) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Section tabs skeleton */}
          <View style={styles.sectionTabs}>
            {[1, 2, 3].map(i => (
              <PriveSkeletonBlock key={i} width={80} height={32} borderRadius={PRIVE_RADIUS.full} style={{ marginRight: PRIVE_SPACING.sm }} />
            ))}
          </View>
          {/* Featured skeleton */}
          <PriveSkeletonBlock width="100%" height={180} borderRadius={PRIVE_RADIUS.lg} style={{ marginBottom: PRIVE_SPACING.lg }} />
          {/* Grid skeleton */}
          <View style={styles.grid}>
            {[1, 2, 3, 4].map(i => (
              <PriveSkeletonBlock key={i} width={CARD_WIDTH} height={200} borderRadius={PRIVE_RADIUS.lg} style={{ marginBottom: PRIVE_SPACING.md }} />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Error state
  if (error && items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={PRIVE_COLORS.text.tertiary} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchCatalog(1)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={PRIVE_COLORS.gold.primary}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Section Tabs */}
        {allSections.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sectionTabs}
            contentContainerStyle={styles.sectionTabsContent}
          >
            {allSections.map(tab => (
              <Pressable
                key={tab.label}
                style={[
                  styles.sectionTab,
                  selectedSection === tab.label && styles.sectionTabActive,
                ]}
                onPress={() => handleSectionChange(tab.label)}
              >
                <Text style={[
                  styles.sectionTabText,
                  selectedSection === tab.label && styles.sectionTabTextActive,
                ]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Featured Banner */}
        {featuredItem && (
          <Pressable
            style={styles.featuredCard}
            onPress={() => handleItemPress(featuredItem)}
           
          >
            {featuredItem.bannerImage ? (
              <CachedImage source={featuredItem.bannerImage} style={styles.featuredImage} />
            ) : (
              <View style={styles.featuredImagePlaceholder}>
                <Ionicons name="star" size={32} color={PRIVE_COLORS.gold.primary} />
              </View>
            )}
            <View style={styles.featuredOverlay}>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>
                  {featuredItem.badgeText || 'Featured'}
                </Text>
              </View>
              <Text style={styles.featuredTitle} numberOfLines={1}>
                {featuredItem.displayTitle || getItemName(featuredItem)}
              </Text>
              <Text style={styles.featuredSubtitle} numberOfLines={1}>
                {featuredItem.displayDescription || getItemSubtitle(featuredItem)}
              </Text>
              <View style={styles.coinBadge}>
                <Text style={styles.coinBadgeText}>{featuredItem.coinDisplayText}</Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* Items Grid */}
        {gridItems.length > 0 ? (
          <View style={styles.grid}>
            {gridItems.map(item => (
              <Pressable
                key={item._id}
                style={styles.itemCard}
                onPress={() => handleItemPress(item)}
               
              >
                {/* Image */}
                <View style={styles.itemImageContainer}>
                  {getItemImage(item) ? (
                    <CachedImage source={getItemImage(item)!} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons
                        name={item.itemType === 'store' ? 'storefront-outline' : 'cube-outline'}
                        size={28}
                        color={PRIVE_COLORS.text.tertiary}
                      />
                    </View>
                  )}
                  {/* Coin badge */}
                  <View style={styles.itemCoinBadge}>
                    <Text style={styles.itemCoinBadgeText}>{item.coinDisplayText}</Text>
                  </View>
                  {item.badgeText && (
                    <View style={styles.itemBadge}>
                      <Text style={styles.itemBadgeText}>{item.badgeText}</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.displayTitle || getItemName(item)}
                  </Text>
                  {item.itemType === 'store' && item.store && (
                    <View style={styles.itemMeta}>
                      {item.store.rating?.average > 0 && (
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={12} color={PRIVE_COLORS.gold.primary} />
                          <Text style={styles.ratingText}>{item.store.rating.average.toFixed(1)}</Text>
                        </View>
                      )}
                      {item.store.location?.city && (
                        <Text style={styles.metaText} numberOfLines={1}>{item.store.location.city}</Text>
                      )}
                      {item.store.isVerified && (
                        <Ionicons name="checkmark-circle" size={14} color={PRIVE_COLORS.status.success} />
                      )}
                    </View>
                  )}
                  {item.itemType === 'product' && item.product && (
                    <View style={styles.itemMeta}>
                      <Text style={styles.priceText}>
                        {item.product.pricing?.selling != null
                          ? `AED ${item.product.pricing.selling}`
                          : ''}
                      </Text>
                      {item.product.store?.name && (
                        <Text style={styles.metaText} numberOfLines={1}>
                          {item.product.store.name}
                        </Text>
                      )}
                    </View>
                  )}
                  {item.sectionLabel && (
                    <Text style={styles.sectionLabelText} numberOfLines={1}>{item.sectionLabel}</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          !isLoading && items.length === 0 && !featuredItem && (
            <View style={styles.emptyState}>
              <Ionicons name="diamond-outline" size={48} color={PRIVE_COLORS.gold.muted} />
              <Text style={styles.emptyTitle}>Premium Selections Coming Soon</Text>
              <Text style={styles.emptySubtitle}>
                Curated stores and products with enhanced Privé coin earning will appear here.
              </Text>
            </View>
          )
        )}

        {/* Load more indicator */}
        {isLoadingMore && (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={PRIVE_COLORS.gold.primary} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getItemName(item: SmartSpendItem): string {
  if (item.itemType === 'store') return item.store?.name || 'Store';
  return item.product?.name || 'Product';
}

function getItemSubtitle(item: SmartSpendItem): string {
  if (item.itemType === 'store') {
    const parts: string[] = [];
    if (item.store?.location?.city) parts.push(item.store.location.city);
    if (item.store?.tags?.length) parts.push(item.store.tags.slice(0, 2).join(', '));
    return parts.join(' · ') || 'Premium store';
  }
  return item.product?.store?.name || 'Premium product';
}

function getItemImage(item: SmartSpendItem): string | null {
  if (item.bannerImage) return item.bannerImage;
  if (item.itemType === 'store') return item.store?.logo || null;
  if (item.itemType === 'product' && item.product?.images?.length) return item.product.images[0];
  return null;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.primary,
  },
  scrollContent: {
    padding: PRIVE_SPACING.lg,
    paddingBottom: 120,
  },

  // Section Tabs
  sectionTabs: {
    marginBottom: PRIVE_SPACING.lg,
  },
  sectionTabsContent: {
    flexDirection: 'row',
    gap: PRIVE_SPACING.sm,
  },
  sectionTab: {
    paddingHorizontal: PRIVE_SPACING.lg,
    paddingVertical: PRIVE_SPACING.sm,
    borderRadius: PRIVE_RADIUS.full,
    backgroundColor: PRIVE_COLORS.transparent.white08,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  sectionTabActive: {
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    borderColor: PRIVE_COLORS.gold.primary,
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: PRIVE_COLORS.text.secondary,
  },
  sectionTabTextActive: {
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '600',
  },

  // Featured Card
  featuredCard: {
    borderRadius: PRIVE_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
  },
  featuredImage: {
    width: '100%',
    height: 180,
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: PRIVE_COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: PRIVE_SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: PRIVE_COLORS.gold.primary,
    paddingHorizontal: PRIVE_SPACING.sm,
    paddingVertical: 2,
    borderRadius: PRIVE_RADIUS.sm,
    marginBottom: PRIVE_SPACING.xs,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIVE_COLORS.text.inverse,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
    marginBottom: 2,
  },
  featuredSubtitle: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    marginBottom: PRIVE_SPACING.sm,
  },
  coinBadge: {
    alignSelf: 'flex-start',
    backgroundColor: PRIVE_COLORS.transparent.gold20,
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: 4,
    borderRadius: PRIVE_RADIUS.full,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.gold.primary,
  },
  coinBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCard: {
    width: CARD_WIDTH,
    borderRadius: PRIVE_RADIUS.lg,
    backgroundColor: PRIVE_COLORS.background.card,
    marginBottom: PRIVE_SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  itemImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: PRIVE_COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCoinBadge: {
    position: 'absolute',
    bottom: PRIVE_SPACING.xs,
    left: PRIVE_SPACING.xs,
    backgroundColor: PRIVE_COLORS.gold.primary,
    paddingHorizontal: PRIVE_SPACING.sm,
    paddingVertical: 2,
    borderRadius: PRIVE_RADIUS.sm,
  },
  itemCoinBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIVE_COLORS.text.inverse,
  },
  itemBadge: {
    position: 'absolute',
    top: PRIVE_SPACING.xs,
    right: PRIVE_SPACING.xs,
    backgroundColor: PRIVE_COLORS.transparent.gold20,
    paddingHorizontal: PRIVE_SPACING.sm,
    paddingVertical: 2,
    borderRadius: PRIVE_RADIUS.sm,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.gold.primary,
  },
  itemBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  itemInfo: {
    padding: PRIVE_SPACING.md,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.xs,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.xs,
    flexWrap: 'wrap',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: PRIVE_COLORS.gold.primary,
  },
  metaText: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    flex: 1,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  sectionLabelText: {
    fontSize: 11,
    color: PRIVE_COLORS.gold.muted,
    marginTop: PRIVE_SPACING.xs,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.xxxl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginTop: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: PRIVE_COLORS.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: PRIVE_SPACING.xxl,
  },
  errorText: {
    fontSize: 15,
    color: PRIVE_COLORS.text.secondary,
    marginTop: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.lg,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: PRIVE_SPACING.xxl,
    paddingVertical: PRIVE_SPACING.md,
    borderRadius: PRIVE_RADIUS.full,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.gold.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },

  // Loading more
  loadingMore: {
    paddingVertical: PRIVE_SPACING.lg,
    alignItems: 'center',
  },
});

export default withErrorBoundary(SmartSpendScreen, 'PriveSmartSpend');
