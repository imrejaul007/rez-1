import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Vouchers History Page
 * Shows user's voucher history and active vouchers
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CardGridSkeleton } from '@/components/skeletons';
import { Ionicons } from '@expo/vector-icons';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { Colors } from '@/constants/DesignSystem';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertConfirm, platformAlertSimple } from '@/utils/platformAlert';
import priveApi, { Voucher } from '@/services/priveApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type FilterStatus = 'all' | 'active' | 'used' | 'expired';

const VOUCHER_ICONS: Record<string, string> = {
  gift_card: '🎁',
  bill_pay: '🧾',
  experience: '✨',
  charity: '💝',
};

const STATUS_COLORS: Record<string, string> = {
  active: colors.brand.emerald,
  used: '#9E9E9E',
  expired: '#F44336',
  cancelled: '#FF9800',
};

function VouchersScreen() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [activeCount, setActiveCount] = useState(0);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchVouchers = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else if (pageNum === 1) {
        setIsLoading(true);
      }
      setError(null);

      const params: { page: number; limit: number; status?: string } = {
        page: pageNum,
        limit: 15,
      };

      if (filter !== 'all') {
        params.status = filter;
      }

      const response = await priveApi.getVouchers(params);

      if (response.success && response.data) {
        const { vouchers: newVouchers, stats, pagination } = response.data;

        if (pageNum === 1) {
          if (!isMounted()) return;
          setVouchers(newVouchers);
        } else {
          if (!isMounted()) return;
          setVouchers(prev => [...prev, ...newVouchers]);
        }

        if (!isMounted()) return;
        setActiveCount(stats.active);
        if (!isMounted()) return;
        setHasMore(pagination.page < pagination.pages);
        if (!isMounted()) return;
        setPage(pageNum);
      } else {
        if (!isMounted()) return;
        setError('Failed to load vouchers');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load vouchers');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [filter]);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchVouchers(1);
  }, [fetchVouchers]);

  const handleRefresh = () => {
    fetchVouchers(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchVouchers(page + 1);
    }
  };

  const handleFilterChange = (newFilter: FilterStatus) => {
    setFilter(newFilter);
    setPage(1);
    setVouchers([]);
  };

  const handleVoucherPress = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setShowDetailModal(true);
  };

  const getVoucherIcon = (type: string): string => {
    return VOUCHER_ICONS[type] || '🎫';
  };

  const getStatusColor = (status: string): string => {
    return STATUS_COLORS[status] || PRIVE_COLORS.text.tertiary;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PRIVE_COLORS.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>My Vouchers</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Active Count */}
        <View style={styles.activeBar}>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>{activeCount} Active Voucher{activeCount !== 1 ? 's' : ''}</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'active', 'used', 'expired'] as FilterStatus[]).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => handleFilterChange(f)}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading && !isRefreshing ? (
          <CardGridSkeleton />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchVouchers(1)}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={PRIVE_COLORS.gold.primary}
              />
            }
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isNearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
              if (isNearEnd && hasMore && !isLoading) {
                handleLoadMore();
              }
            }}
            scrollEventThrottle={400}
          >
            {vouchers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎫</Text>
                <Text style={styles.emptyText}>
                  {filter === 'all' ? 'No vouchers yet' :
                   filter === 'active' ? 'No active vouchers' :
                   filter === 'used' ? 'No used vouchers yet' :
                   'No expired vouchers'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {filter === 'all'
                    ? 'Earn Privé coins to unlock exclusive redemptions'
                    : filter === 'active'
                    ? 'No active vouchers — your active ones will appear here'
                    : filter === 'used'
                    ? 'Vouchers you redeem will show here once used'
                    : 'No expired vouchers to display'}
                </Text>
                {filter === 'all' && (
                  <Pressable
                    style={styles.redeemCta}
                    onPress={() => router.push('/prive/earnings' as any)}
                  >
                    <Text style={styles.redeemCtaText}>Start Earning</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                {vouchers.map((voucher) => (
                  <Pressable
                    key={voucher.id}
                    style={styles.voucherCard}
                    onPress={() => handleVoucherPress(voucher)}
                  >
                    <View style={styles.voucherIcon}>
                      <Text style={styles.voucherEmoji}>{getVoucherIcon(voucher.type)}</Text>
                    </View>
                    <View style={styles.voucherInfo}>
                      <View style={styles.voucherHeader}>
                        <Text style={styles.voucherCategory}>
                          {voucher.category || voucher.type.replace('_', ' ')}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(voucher.status) }]}>
                          <Text style={styles.statusText}>{voucher.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.voucherValue}>{currencySymbol} {voucher.value}</Text>
                      <View style={styles.voucherMeta}>
                        <Text style={styles.voucherCode}>{voucher.code}</Text>
                        {voucher.status === 'active' && voucher.expiresIn && (
                          <Text style={[
                            styles.voucherExpiry,
                            voucher.expiresIn.includes('hour') && { color: PRIVE_COLORS.status.error },
                          ]}>Expires in {voucher.expiresIn}</Text>
                        )}
                        {voucher.status === 'used' && voucher.usedAt && (
                          <Text style={styles.voucherUsed}>Used on {formatDate(voucher.usedAt)}</Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={PRIVE_COLORS.text.tertiary} />
                  </Pressable>
                ))}

                {hasMore && (
                  <Pressable style={styles.loadMoreButton} onPress={handleLoadMore}>
                    <Text style={styles.loadMoreText}>Load More</Text>
                  </Pressable>
                )}
              </>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        )}

        {/* Voucher Detail Modal */}
        <Modal
          visible={showDetailModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Pressable
                style={styles.modalClose}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close" size={24} color={PRIVE_COLORS.text.primary} />
              </Pressable>

              {selectedVoucher && (
                <>
                  <View style={styles.modalIcon}>
                    <Text style={styles.modalEmoji}>{getVoucherIcon(selectedVoucher.type)}</Text>
                  </View>

                  <Text style={styles.modalCategory}>
                    {selectedVoucher.category || selectedVoucher.type.replace('_', ' ')}
                  </Text>

                  <View style={styles.codeBox}>
                    <Text style={styles.codeLabel}>Voucher Code</Text>
                    <Text style={styles.codeValue}>{selectedVoucher.code}</Text>
                  </View>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Value</Text>
                      <Text style={styles.detailValue}>{currencySymbol} {selectedVoucher.value}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: getStatusColor(selectedVoucher.status) }]}>
                        {selectedVoucher.status}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Coins Used</Text>
                      <Text style={styles.detailValue}>{selectedVoucher.coinAmount}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Created</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedVoucher.createdAt)}</Text>
                    </View>
                  </View>

                  {selectedVoucher.status === 'active' && selectedVoucher.expiresIn && (
                    <View style={styles.expiryBanner}>
                      <Ionicons name="time-outline" size={16} color={PRIVE_COLORS.status.warning} />
                      <Text style={styles.expiryBannerText}>
                        Expires in {selectedVoucher.expiresIn}
                      </Text>
                    </View>
                  )}

                  {selectedVoucher.howToUse && (
                    <View style={styles.instructionsBox}>
                      <Text style={styles.instructionsTitle}>How to Use</Text>
                      <Text style={styles.instructionsText}>{selectedVoucher.howToUse}</Text>
                    </View>
                  )}

                  {selectedVoucher.terms && selectedVoucher.terms.length > 0 && (
                    <View style={styles.termsBox}>
                      <Text style={styles.termsTitle}>Terms & Conditions</Text>
                      {selectedVoucher.terms.map((term, i) => (
                        <View key={i} style={styles.termRow}>
                          <Text style={styles.termBullet}>•</Text>
                          <Text style={styles.termText}>{term}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.modalActions}>
                    <Pressable
                      style={styles.copyCodeButton}
                      onPress={async () => {
                        await Clipboard.setStringAsync(selectedVoucher.code);
                        platformAlertSimple('Copied', 'Voucher code copied to clipboard');
                      }}
                    >
                      <Ionicons name="copy-outline" size={18} color={PRIVE_COLORS.gold.primary} />
                      <Text style={styles.copyCodeText}>Copy Code</Text>
                    </Pressable>

                    {selectedVoucher.status === 'active' && (
                      <Pressable
                        style={styles.markUsedButton}
                        onPress={() => {
                          platformAlertConfirm(
                            'Mark as Used',
                            'Are you sure you want to mark this voucher as used? This cannot be undone.',
                            async () => {
                              const prevVouchers = [...vouchers];
                              const prevActiveCount = activeCount;
                              // Optimistic update
                              const usedAt = new Date().toISOString();
                              setSelectedVoucher({ ...selectedVoucher, status: 'used', usedAt });
                              setVouchers(prev => prev.map(v =>
                                v.id === selectedVoucher.id ? { ...v, status: 'used' as const, usedAt } : v
                              ));
                              setActiveCount(prev => Math.max(0, prev - 1));
                              try {
                                const response = await priveApi.markVoucherUsed(selectedVoucher.id);
                                if (response.success) {
                                  platformAlertSimple('Done', 'Voucher marked as used');
                                } else {
                                  // Revert on failure
                                  if (!isMounted()) return;
                                  setVouchers(prevVouchers);
                                  if (!isMounted()) return;
                                  setActiveCount(prevActiveCount);
                                  if (!isMounted()) return;
                                  setSelectedVoucher(selectedVoucher);
                                  platformAlertSimple('Error', 'Failed to mark voucher as used');
                                }
                              } catch {
                                // Revert on error
                                if (!isMounted()) return;
                                setVouchers(prevVouchers);
                                if (!isMounted()) return;
                                setActiveCount(prevActiveCount);
                                if (!isMounted()) return;
                                setSelectedVoucher(selectedVoucher);
                                platformAlertSimple('Error', 'Failed to mark voucher as used');
                              }
                            }
                          );
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color={Colors.text.inverse} />
                        <Text style={styles.markUsedText}>Mark as Used</Text>
                      </Pressable>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  activeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: PRIVE_SPACING.sm,
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    gap: PRIVE_SPACING.sm,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.emerald,
  },
  activeText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.md,
    gap: PRIVE_SPACING.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: PRIVE_SPACING.sm,
    paddingHorizontal: PRIVE_SPACING.md,
    borderRadius: PRIVE_RADIUS.md,
    backgroundColor: PRIVE_COLORS.transparent.white08,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: PRIVE_COLORS.gold.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: PRIVE_COLORS.text.tertiary,
  },
  filterTabTextActive: {
    color: PRIVE_COLORS.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: PRIVE_SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: PRIVE_SPACING.md,
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PRIVE_SPACING.xl,
  },
  errorText: {
    fontSize: 14,
    color: PRIVE_COLORS.status.error,
    textAlign: 'center',
    marginBottom: PRIVE_SPACING.lg,
  },
  retryButton: {
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: PRIVE_RADIUS.lg,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.background.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.xxl * 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: PRIVE_SPACING.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: PRIVE_SPACING.xl,
  },
  redeemCta: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    paddingHorizontal: PRIVE_SPACING.xxl,
    paddingVertical: PRIVE_SPACING.md,
    borderRadius: PRIVE_RADIUS.lg,
  },
  redeemCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.background.primary,
  },
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginTop: PRIVE_SPACING.md,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  voucherIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: PRIVE_SPACING.md,
  },
  voucherEmoji: {
    fontSize: 22,
  },
  voucherInfo: {
    flex: 1,
  },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  voucherCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: PRIVE_SPACING.sm,
    paddingVertical: 2,
    borderRadius: PRIVE_RADIUS.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.inverse,
    textTransform: 'uppercase',
  },
  voucherValue: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
    marginBottom: 4,
  },
  voucherMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.md,
  },
  voucherCode: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    fontFamily: 'monospace',
  },
  voucherExpiry: {
    fontSize: 11,
    color: PRIVE_COLORS.status.warning,
  },
  voucherUsed: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.xl,
  },
  loadMoreText: {
    fontSize: 14,
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderTopLeftRadius: PRIVE_RADIUS.xxl,
    borderTopRightRadius: PRIVE_RADIUS.xxl,
    padding: PRIVE_SPACING.xl,
    maxHeight: '85%',
  },
  modalClose: {
    position: 'absolute',
    top: PRIVE_SPACING.lg,
    right: PRIVE_SPACING.lg,
    zIndex: 10,
    padding: PRIVE_SPACING.sm,
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: PRIVE_SPACING.lg,
    marginTop: PRIVE_SPACING.md,
  },
  modalEmoji: {
    fontSize: 32,
  },
  modalCategory: {
    fontSize: 20,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: PRIVE_SPACING.xl,
    textTransform: 'capitalize',
  },
  codeBox: {
    backgroundColor: PRIVE_COLORS.background.primary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.xl,
  },
  codeLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: PRIVE_SPACING.xs,
  },
  codeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary,
    letterSpacing: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: PRIVE_SPACING.lg,
  },
  detailItem: {
    width: '50%',
    paddingVertical: PRIVE_SPACING.md,
  },
  detailLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderRadius: PRIVE_RADIUS.md,
    padding: PRIVE_SPACING.md,
    gap: PRIVE_SPACING.sm,
    marginBottom: PRIVE_SPACING.lg,
  },
  expiryBannerText: {
    fontSize: 13,
    color: PRIVE_COLORS.status.warning,
    fontWeight: '500',
  },
  instructionsBox: {
    backgroundColor: PRIVE_COLORS.transparent.white08,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.lg,
  },
  instructionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
  },
  instructionsText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 20,
  },
  termsBox: {
    backgroundColor: PRIVE_COLORS.transparent.white08,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.xl,
  },
  termsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
  },
  termRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  termBullet: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginRight: PRIVE_SPACING.sm,
  },
  termText: {
    flex: 1,
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: PRIVE_SPACING.md,
    marginTop: PRIVE_SPACING.md,
    marginBottom: PRIVE_SPACING.xl,
  },
  copyCodeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PRIVE_SPACING.sm,
    paddingVertical: PRIVE_SPACING.md,
    borderRadius: PRIVE_RADIUS.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.gold.primary,
  },
  copyCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  markUsedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PRIVE_SPACING.sm,
    paddingVertical: PRIVE_SPACING.md,
    borderRadius: PRIVE_RADIUS.lg,
    backgroundColor: PRIVE_COLORS.gold.primary,
  },
  markUsedText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.background.primary,
  },
});

export default withErrorBoundary(VouchersScreen, 'PriveVouchers');
