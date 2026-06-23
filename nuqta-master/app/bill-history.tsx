// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Bill History Page
// View all uploaded bills with their verification status and cashback details

import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertConfirm } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { billUploadService } from '@/services/billUploadService';
import { TransactionListSkeleton } from '@/components/skeletons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Bill {
  _id: string;
  billImage: {
    url: string;
    thumbnailUrl?: string;
  };
  merchant: {
    _id: string;
    name: string;
    logo?: string;
  };
  amount: number;
  billDate: string;
  billNumber?: string;
  verificationStatus: 'pending' | 'processing' | 'approved' | 'rejected';
  rejectionReason?: string;
  resubmissionCount?: number;
  cashbackAmount?: number;
  cashbackStatus?: 'pending' | 'credited' | 'failed';
  createdAt: string;
  extractedData?: {
    merchantName?: string;
    amount?: number;
    date?: string;
  };
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

function BillHistoryPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const navigation = useNavigation();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Hide the default navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Safe navigation function for web compatibility
  const handleGoBack = () => {
    try {
      if (navigation && navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else if (router && router.push) {
        // Navigate to home if can't go back
        router.push('/');
      } else {
        // Final fallback - replace current route with home
        router.replace('/');
      }
    } catch (error) {
      // If all else fails, navigate to home

      if (router) {
        router.replace('/');
      }
    }
  };

  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load bills on mount and when filter changes
  useEffect(() => {
    loadBills(1, false);
  }, [activeFilter]);

  // Stats (computed from all-filter first load)
  const [stats, setStats] = useState({ total: 0, pending: 0, totalCashback: 0 });

  // Load bills from API with pagination
  const loadBills = async (pageNum: number, append: boolean) => {
    try {
      if (pageNum === 1) setIsLoading(true);
      else setLoadingMore(true);

      const params: any = { page: pageNum, limit: 20 };
      if (activeFilter !== 'all') params.status = activeFilter;

      const response = await billUploadService.getBillHistory(params);

      if (response.success && response.data) {
        const data = response.data as any;
        const newBills = Array.isArray(data) ? data : (data.bills || []);
        if (append) {
          setBills(prev => [...prev, ...newBills]);
        } else {
          if (!isMounted()) return;
          setBills(newBills);
        }
        if (!isMounted()) return;
        setPage(pageNum);
        const pagination = data?.pagination;
        if (!isMounted()) return;
        setHasMore(pagination ? (pagination.page < pagination.pages) : newBills.length >= 20);

        // Update stats from response if available, or compute from first page
        if (data?.stats) {
          if (!isMounted()) return;
          setStats(data.stats);
        } else if (pageNum === 1 && activeFilter === 'all') {
          const total = pagination?.total || newBills.length;
          const pending = newBills.filter((b: Bill) =>
            b.verificationStatus === 'pending' || b.verificationStatus === 'processing'
          ).length;
          const totalCashback = newBills
            .filter((b: Bill) => b.verificationStatus === 'approved' && b.cashbackAmount)
            .reduce((sum: number, b: Bill) => sum + (b.cashbackAmount || 0), 0);
          if (!isMounted()) return;
          setStats({ total, pending, totalCashback });
        }
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  };

  // Refresh bills
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadBills(1, false);
  }, [activeFilter]);

  // Load more bills
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !isLoading) {
      loadBills(page + 1, true);
    }
  }, [loadingMore, hasMore, isLoading, page, activeFilter]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return Colors.success;
      case 'rejected':
        return Colors.error;
      case 'processing':
        return Colors.warning;
      case 'pending':
      default:
        return Colors.text.tertiary;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'processing':
        return 'hourglass';
      case 'pending':
      default:
        return 'time';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  // Handle bill detail view
  const viewBillDetail = (bill: Bill) => {
    setSelectedBill(bill);
    setShowDetailModal(true);
  };

  // Resubmit rejected bill
  const resubmitBill = async (billId: string) => {
    platformAlertConfirm(
      'Resubmit Bill',
      'Would you like to upload a new photo for this bill?',
      () => {
        setShowDetailModal(false);
        router?.push && router.push('/bill-upload');
      },
      'Upload New Photo'
    );
  };

  // Use stats from state (computed on first load or from backend)

  // Render filter buttons
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.filterButton,
              activeFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => { setPage(1); setHasMore(true); setActiveFilter(filter); }}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === filter && styles.filterButtonTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  // Render bill card
  const renderBillCard = useCallback(({ item: bill }: { item: Bill }) => (
    <Pressable
      style={styles.billCard}
      onPress={() => viewBillDetail(bill)}
    >
      <CachedImage
        source={bill.billImage.thumbnailUrl || bill.billImage.url}
        style={styles.billThumbnail}
      />

      <View style={styles.billInfo}>
        <View style={styles.billHeader}>
          <Text style={styles.merchantName}>{bill.merchant.name}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(bill.verificationStatus) + '20' },
            ]}
          >
            <Ionicons
              name={getStatusIcon(bill.verificationStatus)}
              size={14}
              color={getStatusColor(bill.verificationStatus)}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(bill.verificationStatus) },
              ]}
            >
              {bill.verificationStatus.charAt(0).toUpperCase() + bill.verificationStatus.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.billDetails}>
          <View style={styles.billDetailRow}>
            <Text style={styles.billDetailLabel}>Amount:</Text>
            <Text style={styles.billDetailValue}>{formatCurrency(bill.amount)}</Text>
          </View>
          <View style={styles.billDetailRow}>
            <Text style={styles.billDetailLabel}>Date:</Text>
            <Text style={styles.billDetailValue}>{formatDate(bill.billDate)}</Text>
          </View>
          {bill.billNumber && (
            <View style={styles.billDetailRow}>
              <Text style={styles.billDetailLabel}>Bill #:</Text>
              <Text style={styles.billDetailValue}>{bill.billNumber}</Text>
            </View>
          )}
        </View>

        {bill.verificationStatus === 'approved' && bill.cashbackAmount && (
          <View style={styles.cashbackContainer}>
            <Ionicons name="gift" size={16} color={colors.successScale[400]} />
            <Text style={styles.cashbackText}>
              Cashback: {formatCurrency(bill.cashbackAmount)}
            </Text>
            {bill.cashbackStatus === 'credited' && (
              <View style={styles.creditedBadge}>
                <Text style={styles.creditedText}>Credited</Text>
              </View>
            )}
          </View>
        )}

        {bill.verificationStatus === 'rejected' && bill.rejectionReason && (
          <View style={styles.rejectionContainer}>
            <Text style={styles.rejectionReason}>{bill.rejectionReason}</Text>
            {bill.resubmissionCount !== undefined && bill.resubmissionCount > 0 && (
              <Text style={styles.resubmissionCounter}>
                Resubmitted: {bill.resubmissionCount}/3 times
                {bill.resubmissionCount < 3 && ` • ${3 - bill.resubmissionCount} attempt${3 - bill.resubmissionCount === 1 ? '' : 's'} remaining`}
              </Text>
            )}
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
    </Pressable>
  ), []);

  // Render list footer (loading more indicator)
  const renderListFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#FF6B35" />
      </View>
    );
  }, [loadingMore]);

  // Render detail modal
  const renderDetailModal = () => {
    if (!selectedBill) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bill Details</Text>
              <Pressable onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.tertiary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Bill Image */}
              <CachedImage
                source={selectedBill.billImage.url}
                style={styles.fullBillImage}
                contentFit="contain"
              />

              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Status</Text>
                <View
                  style={[
                    styles.statusBadgeLarge,
                    { backgroundColor: getStatusColor(selectedBill.verificationStatus) + '20' },
                  ]}
                >
                  <Ionicons
                    name={getStatusIcon(selectedBill.verificationStatus)}
                    size={24}
                    color={getStatusColor(selectedBill.verificationStatus)}
                  />
                  <Text
                    style={[
                      styles.statusTextLarge,
                      { color: getStatusColor(selectedBill.verificationStatus) },
                    ]}
                  >
                    {selectedBill.verificationStatus.charAt(0).toUpperCase() +
                     selectedBill.verificationStatus.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Bill Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Bill Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Merchant:</Text>
                  <Text style={styles.detailValue}>{selectedBill.merchant.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedBill.amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bill Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedBill.billDate)}</Text>
                </View>
                {selectedBill.billNumber && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bill Number:</Text>
                    <Text style={styles.detailValue}>{selectedBill.billNumber}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Uploaded:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedBill.createdAt)}</Text>
                </View>
              </View>

              {/* Cashback Information */}
              {selectedBill.verificationStatus === 'approved' && selectedBill.cashbackAmount && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Cashback</Text>
                  <View style={styles.cashbackDetailContainer}>
                    <Ionicons name="gift" size={32} color={colors.successScale[400]} />
                    <Text style={styles.cashbackDetailAmount}>
                      {formatCurrency(selectedBill.cashbackAmount)}
                    </Text>
                    <Text style={styles.cashbackDetailStatus}>
                      {selectedBill.cashbackStatus === 'credited' ? 'Credited to Wallet' : 'Processing'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Rejection Reason */}
              {selectedBill.verificationStatus === 'rejected' && selectedBill.rejectionReason && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Rejection Reason</Text>
                  <View style={styles.rejectionDetailContainer}>
                    <Ionicons name="alert-circle" size={24} color={colors.error} />
                    <Text style={styles.rejectionDetailText}>
                      {selectedBill.rejectionReason}
                    </Text>
                  </View>
                  {selectedBill.resubmissionCount !== undefined && selectedBill.resubmissionCount > 0 && (
                    <View style={styles.resubmissionDetailContainer}>
                      <Text style={styles.resubmissionDetailText}>
                        Resubmitted: {selectedBill.resubmissionCount}/3 times
                      </Text>
                      {selectedBill.resubmissionCount < 3 ? (
                        <Text style={styles.resubmissionDetailSubtext}>
                          You have {3 - selectedBill.resubmissionCount} attempt{3 - selectedBill.resubmissionCount === 1 ? '' : 's'} remaining
                        </Text>
                      ) : (
                        <Text style={styles.resubmissionLimitText}>
                          Maximum resubmission limit reached
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Extracted Data (if available) */}
              {selectedBill.extractedData && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Extracted Data (OCR)</Text>
                  {selectedBill.extractedData.merchantName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Detected Merchant:</Text>
                      <Text style={styles.detailValue}>{selectedBill.extractedData.merchantName}</Text>
                    </View>
                  )}
                  {selectedBill.extractedData.amount && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Detected Amount:</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(selectedBill.extractedData.amount)}
                      </Text>
                    </View>
                  )}
                  {selectedBill.extractedData.date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Detected Date:</Text>
                      <Text style={styles.detailValue}>{selectedBill.extractedData.date}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              {selectedBill.verificationStatus === 'rejected' && (
                <Pressable
                  style={styles.resubmitButton}
                  onPress={() => resubmitBill(selectedBill._id)}
                >
                  <Ionicons name="refresh" size={20} color={Colors.text.inverse} />
                  <Text style={styles.resubmitButtonText}>Resubmit Bill</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={80} color={Colors.border.default} />
      <Text style={styles.emptyStateTitle}>No Bills Yet</Text>
      <Text style={styles.emptyStateText}>
        Upload your bills to start earning cashback on offline purchases
      </Text>
      <Pressable
        style={styles.uploadButton}
        onPress={() => router?.push && router.push('/bill-upload')}
      >
        <Ionicons name="add" size={20} color={Colors.text.inverse} />
        <Text style={styles.uploadButtonText}>Upload Bill</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Bill History</Text>
        <Pressable onPress={() => router?.push && router.push('/bill-upload')}>
          <Ionicons name="add-circle" size={24} color="#FF6B35" />
        </Pressable>
      </View>

      {/* Stats */}
      {!isLoading && stats.total > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Bills</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warningScale[400] }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.successScale[400] }]}>
              {formatCurrency(stats.totalCashback)}
            </Text>
            <Text style={styles.statLabel}>Cashback Earned</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      {!isLoading && (stats.total > 0 || bills.length > 0) && renderFilters()}

      {/* Bill List */}
      {isLoading ? (
        <TransactionListSkeleton />
      ) : bills.length === 0 ? (
        activeFilter === 'all' ? (
          renderEmptyState()
        ) : (
          <View style={styles.emptyFilterState}>
            <Text style={styles.emptyFilterText}>No {activeFilter} bills found</Text>
          </View>
        )
      ) : (
        <FlashList
          data={bills}
          renderItem={renderBillCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B35"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          estimatedItemSize={100}
          ListFooterComponent={renderListFooter}
        />
      )}

      {/* Detail Modal */}
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  filtersContainer: {
    padding: Spacing.base,
    paddingTop: 0,
  },
  filterButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  filterButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  filterButtonText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.background.primary,
  },
  billList: {
    flex: 1,
  },
  billCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    gap: Spacing.md,
  },
  billThumbnail: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  billInfo: {
    flex: 1,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  merchantName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  billDetails: {
    gap: Spacing.xs,
  },
  billDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billDetailLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  billDetailValue: {
    ...Typography.bodySmall,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  cashbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: colors.tint.greenLight,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  cashbackText: {
    flex: 1,
    ...Typography.bodySmall,
    color: colors.successScale[400],
    fontWeight: '600',
  },
  creditedBadge: {
    backgroundColor: colors.successScale[400],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creditedText: {
    ...Typography.caption,
    color: Colors.background.primary,
    fontWeight: '600',
  },
  rejectionContainer: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: colors.errorScale[50],
    borderRadius: BorderRadius.sm,
  },
  rejectionReason: {
    ...Typography.bodySmall,
    color: Colors.error,
  },
  resubmissionCounter: {
    fontSize: 11,
    color: colors.error,
    marginTop: Spacing.xs,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  emptyStateTitle: {
    ...Typography.h3,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
  },
  uploadButtonText: {
    color: Colors.background.primary,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  emptyFilterState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyFilterText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalBody: {
    flex: 1,
  },
  fullBillImage: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.background.secondary,
  },
  detailSection: {
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  detailSectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  statusTextLarge: {
    ...Typography.h4,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  detailValue: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  cashbackDetailContainer: {
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: colors.tint.greenLight,
    borderRadius: BorderRadius.md,
  },
  cashbackDetailAmount: {
    ...Typography.h1,
    fontWeight: '700',
    color: colors.successScale[400],
    marginVertical: Spacing.sm,
  },
  cashbackDetailStatus: {
    ...Typography.body,
    color: colors.successScale[400],
  },
  rejectionDetailContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.base,
    backgroundColor: colors.errorScale[50],
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  rejectionDetailText: {
    flex: 1,
    ...Typography.body,
    color: Colors.error,
    lineHeight: 20,
  },
  resubmissionDetailContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#FEF9F2',
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warningScale[400],
  },
  resubmissionDetailText: {
    ...Typography.body,
    color: colors.warningScale[700],
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  resubmissionDetailSubtext: {
    ...Typography.bodySmall,
    color: colors.brand.amberDark,
  },
  resubmissionLimitText: {
    ...Typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
  resubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    padding: Spacing.base,
    margin: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  resubmitButtonText: {
    color: Colors.background.primary,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
});

export default withErrorBoundary(BillHistoryPage, 'BillHistory');
