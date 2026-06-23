import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Refund Initiated Page
// Refund status and tracking

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface RefundStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  timestamp?: string;
}

interface RefundDetails {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  refundMethod: string;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  expectedDate: string;
  createdAt: string;
  steps: RefundStep[];
}

/** Map backend Refund document fields to UI-friendly RefundDetails */
function mapRefundResponse(raw: any): RefundDetails {
  const status = raw.status as RefundDetails['status'];

  // Build timeline steps from backend date fields
  const steps: RefundStep[] = [];

  // Step 1: Refund Requested (always completed if refund exists)
  steps.push({
    id: '1',
    title: 'Refund Requested',
    description: 'Your refund request has been received',
    status: 'completed',
    timestamp: raw.requestedAt || raw.createdAt,
  });

  // Step 2: Under Review — completed once status moves past pending
  const pastPending = ['processing', 'completed', 'failed', 'cancelled'].includes(status);
  steps.push({
    id: '2',
    title: 'Under Review',
    description: 'Our team is reviewing your request',
    status: pastPending ? 'completed' : (status === 'pending' ? 'current' : 'pending'),
    timestamp: pastPending ? (raw.processedAt || raw.requestedAt) : undefined,
  });

  // Step 3: Processing
  const pastProcessing = ['completed', 'failed'].includes(status);
  steps.push({
    id: '3',
    title: 'Processing',
    description: 'Refund is being processed',
    status: pastProcessing ? 'completed' : (status === 'processing' ? 'current' : 'pending'),
    timestamp: status === 'processing' || pastProcessing ? (raw.processedAt || undefined) : undefined,
  });

  // Step 4: Completed / Failed
  if (status === 'failed') {
    steps.push({
      id: '4',
      title: 'Failed',
      description: raw.failureReason || 'Refund could not be processed',
      status: 'current',
      timestamp: raw.failedAt || undefined,
    });
  } else {
    steps.push({
      id: '4',
      title: 'Completed',
      description: 'Refund credited to your account',
      status: status === 'completed' ? 'completed' : 'pending',
      timestamp: status === 'completed' ? (raw.completedAt || raw.actualArrival || undefined) : undefined,
    });
  }

  // Payment method label
  const methodLabels: Record<string, string> = {
    razorpay: 'Original Payment Method (Razorpay)',
    stripe: 'Original Payment Method (Card)',
    wallet: 'Rez Wallet',
    cod: 'Rez Wallet (COD Refund)',
  };

  const orderId = typeof raw.order === 'object' ? raw.order._id : raw.order;
  const orderNumber = raw.orderNumber || (typeof raw.order === 'object' ? raw.order.orderNumber : '') || '';

  return {
    id: raw._id,
    orderId: orderId,
    orderNumber: orderNumber,
    amount: raw.refundAmount,
    refundMethod: methodLabels[raw.paymentMethod] || raw.paymentMethod,
    reason: raw.refundReason,
    status,
    expectedDate: raw.estimatedArrival || raw.createdAt,
    createdAt: raw.createdAt,
    steps,
  };
}

function RefundInitiatedPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const getCurrencySymbol = useGetCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const currencySymbol = getCurrencySymbol();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refund, setRefund] = useState<RefundDetails | null>(null);

  const refundId = params.refundId as string | undefined;
  const orderId = params.orderId as string | undefined;

  const fetchRefund = useCallback(async () => {
    if (!refundId && !orderId) {
      setError('No refund or order ID provided');
      setLoading(false);
      return;
    }

    try {
      setError(null);

      if (refundId) {
        // Fetch specific refund by ID
        const response = await apiClient.get<any>(`/orders/refunds/${refundId}`);
        if (response.success && response.data) {
          setRefund(mapRefundResponse(response.data));
        } else {
          if (!isMounted()) return;
          setError('Refund not found');
        }
      } else if (orderId) {
        // Fetch refunds for this order, pick the latest one
        const response = await apiClient.get<any>(`/orders/refunds?page=1&limit=1`);
        if (response.success && response.data?.refunds?.length > 0) {
          // Find a refund matching this order, or use first one
          const match = response.data.refunds.find(
            (r: any) => (typeof r.order === 'object' ? r.order._id : r.order) === orderId
          ) || response.data.refunds[0];
          setRefund(mapRefundResponse(match));
        } else {
          if (!isMounted()) return;
          setError('No refunds found');
        }
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Failed to load refund details');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [refundId, orderId]);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchRefund();
  }, [fetchRefund, authLoading, isAuthenticated]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRefund();
    if (!isMounted()) return;
    setRefreshing(false);
  }, [fetchRefund]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.success;
      case 'approved':
      case 'processing': return Colors.primary[600];
      case 'failed': return Colors.error;
      default: return Colors.gray[400];
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'processing': return 'In Progress';
      case 'approved': return 'Approved';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Refund Status</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centeredState}>
          <View style={styles.loadingIconWrapper}>
            <Ionicons name="receipt-outline" size={36} color={Colors.primary[600]} />
          </View>
          <ActivityIndicator size="large" color={Colors.primary[600]} style={{ marginTop: Spacing.md }} />
          <ThemedText style={styles.centeredStateText}>Loading refund details...</ThemedText>
        </View>
      ) : error || !refund ? (
        <View style={styles.centeredState}>
          <View style={[styles.loadingIconWrapper, { backgroundColor: Colors.error + '15' }]}>
            <Ionicons name="alert-circle-outline" size={36} color={Colors.error} />
          </View>
          <ThemedText style={styles.centeredStateTitle}>{error || 'Refund not found'}</ThemedText>
          <ThemedText style={styles.centeredStateText}>
            We could not load your refund details. Please try again.
          </ThemedText>
          <Pressable style={styles.retryButton} onPress={fetchRefund}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, { backgroundColor: getStatusColor(refund.status) + '20' }]}>
            <Ionicons
              name={refund.status === 'completed' ? 'checkmark-circle' : refund.status === 'failed' ? 'close-circle' : 'time'}
              size={48}
              color={getStatusColor(refund.status)}
            />
          </View>
          <ThemedText style={styles.statusTitle}>
            {refund.status === 'completed' ? 'Refund Completed!' : refund.status === 'failed' ? 'Refund Failed' : 'Refund In Progress'}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(refund.status) + '20' }]}>
            <ThemedText style={[styles.statusBadgeText, { color: getStatusColor(refund.status) }]}>
              {getStatusLabel(refund.status)}
            </ThemedText>
          </View>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountRow}>
            <ThemedText style={styles.amountLabel}>Refund Amount</ThemedText>
            <ThemedText style={styles.amountValue}>{currencySymbol}{refund.amount.toLocaleString()}</ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.amountRow}>
            <ThemedText style={styles.amountLabel}>Expected by</ThemedText>
            <ThemedText style={styles.amountDate}>{formatDate(refund.expectedDate)}</ThemedText>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <ThemedText style={styles.sectionTitle}>Refund Timeline</ThemedText>
          <View style={styles.timeline}>
            {refund.steps.map((step, index) => (
              <View key={step.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    step.status === 'completed' && styles.timelineDotCompleted,
                    step.status === 'current' && styles.timelineDotCurrent,
                  ]}>
                    {step.status === 'completed' && (
                      <Ionicons name="checkmark" size={12} color={colors.background.primary} />
                    )}
                  </View>
                  {index < refund.steps.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      (step.status === 'completed' || step.status === 'current') && styles.timelineLineCompleted,
                    ]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <ThemedText style={[
                    styles.timelineTitle,
                    step.status === 'pending' && styles.timelineTitlePending,
                  ]}>
                    {step.title}
                  </ThemedText>
                  <ThemedText style={styles.timelineDescription}>
                    {step.description}
                  </ThemedText>
                  {step.timestamp && (
                    <ThemedText style={styles.timelineTime}>
                      {formatDate(step.timestamp)} at {formatTime(step.timestamp)}
                    </ThemedText>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <ThemedText style={styles.sectionTitle}>Refund Details</ThemedText>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Refund ID</ThemedText>
            <ThemedText style={styles.detailValue}>{refund.id}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Order</ThemedText>
            <Pressable onPress={() => router.push(`/orders/${refund.orderId}` as any)}>
              <ThemedText style={[styles.detailValue, styles.detailLink]}>
                {refund.orderNumber || refund.orderId}
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Refund To</ThemedText>
            <ThemedText style={styles.detailValue}>{refund.refundMethod}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Reason</ThemedText>
            <ThemedText style={styles.detailValue}>{refund.reason}</ThemedText>
          </View>
        </View>

        {/* Help Card */}
        <View style={styles.helpCard}>
          <Ionicons name="help-circle-outline" size={24} color={Colors.info} />
          <View style={styles.helpContent}>
            <ThemedText style={styles.helpTitle}>Need Help?</ThemedText>
            <ThemedText style={styles.helpText}>
              If your refund is delayed or you have questions, our support team is here to help.
            </ThemedText>
          </View>
          <Pressable
            style={styles.helpButton}
            onPress={() => router.push('/support' as any)}
          >
            <ThemedText style={styles.helpButtonText}>Contact Support</ThemedText>
          </Pressable>
        </View>

        {/* Note */}
        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.text.tertiary} />
          <ThemedText style={styles.noteText}>
            Refunds typically take 5-7 business days to reflect in your account. Bank processing times may vary.
          </ThemedText>
        </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  statusCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadows.subtle,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  statusBadgeText: {
    ...Typography.label,
  },
  amountCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  amountLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  amountValue: {
    ...Typography.h2,
    color: Colors.success,
  },
  amountDate: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.sm,
  },
  timelineSection: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  timeline: {
    paddingLeft: Spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: Colors.success,
  },
  timelineDotCurrent: {
    backgroundColor: Colors.primary[600],
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.gray[200],
    marginTop: Spacing.xs,
  },
  timelineLineCompleted: {
    backgroundColor: Colors.success,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  timelineTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  timelineTitlePending: {
    color: Colors.text.tertiary,
  },
  timelineDescription: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  timelineTime: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  detailsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    flex: 1,
  },
  detailValue: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 2,
    textAlign: 'right',
  },
  detailLink: {
    color: Colors.primary[600],
    textDecorationLine: 'underline',
  },
  helpCard: {
    backgroundColor: Colors.info + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    gap: Spacing.md,
    alignItems: 'center',
  },
  helpContent: {
    alignItems: 'center',
  },
  helpTitle: {
    ...Typography.label,
    color: Colors.info,
    marginBottom: Spacing.xs,
  },
  helpText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  helpButton: {
    backgroundColor: Colors.info,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  helpButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  noteText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    flex: 1,
    lineHeight: 18,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary[600] + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredStateTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  centeredStateText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
});

export default withErrorBoundary(RefundInitiatedPage, 'PaymentsRefundInitiated');
