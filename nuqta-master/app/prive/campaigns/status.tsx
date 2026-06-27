/**
 * Prive Campaign Submission Status Page
 *
 * Visual progress tracker: Submitted -> Under Review -> Approved/Rejected
 * Auto-refreshes every 30s while status is 'pending'.
 * Shows submission details, earned amounts, and rejection reason if applicable.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import priveCampaignApi, { CampaignSubmission } from '@/services/priveCampaignApi';

const AUTO_REFRESH_INTERVAL = 30_000; // 30 seconds

type ProgressStep = 'submitted' | 'review' | 'result';

function getProgressSteps(status: string): { step: ProgressStep; label: string; active: boolean; completed: boolean }[] {
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const isPending = status === 'pending';
  const isDone = isApproved || isRejected;

  return [
    { step: 'submitted', label: 'Submitted', active: true, completed: true },
    { step: 'review', label: 'Under Review', active: isPending || isDone, completed: isDone },
    {
      step: 'result',
      label: isRejected ? 'Rejected' : 'Approved',
      active: isDone,
      completed: isDone,
    },
  ];
}

function getStepColor(active: boolean, completed: boolean, isRejected: boolean): string {
  if (!active) return PRIVE_COLORS.text.disabled;
  if (completed && isRejected) return PRIVE_COLORS.status.error;
  if (completed) return PRIVE_COLORS.status.success;
  return PRIVE_COLORS.status.warning;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function CampaignStatusPage() {
  const router = useRouter();
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [submission, setSubmission] = useState<CampaignSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!campaignId) return;
    try {
      if (!submission) setIsLoading(true);
      setError(null);
      const response = await priveCampaignApi.getSubmissionStatus(campaignId);
      if (response.success && response.data?.submission) {
        setSubmission(response.data.submission);
      } else {
        setError('No submission found');
      }
    } catch {
      setError('Failed to load status');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, submission]);

  // Initial fetch
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchStatus();
  }, [isAuthenticated, authLoading, campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh while pending
  useEffect(() => {
    if (submission?.status === 'pending') {
      refreshTimerRef.current = setInterval(() => {
        fetchStatus();
      }, AUTO_REFRESH_INTERVAL);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [submission?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={PRIVE_COLORS.gold.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !submission) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="document-text-outline" size={36} color={PRIVE_COLORS.text.tertiary} />
          </View>
          <Text style={styles.errorTitle}>{error || 'No submission found'}</Text>
          <Text style={styles.errorSubtitle}>
            You haven't submitted a post for this campaign yet.
          </Text>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Back to Campaigns</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isRejected = submission.status === 'rejected';
  const isApproved = submission.status === 'approved';
  const isPending = submission.status === 'pending';
  const steps = getProgressSteps(submission.status);

  const coinsEarned = submission.coinsEarned || 0;
  const cashbackAmount = typeof submission.cashbackIssued === 'number'
    ? submission.cashbackIssued
    : (submission.cashbackAmount ?? 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Visual Progress Tracker */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Submission Progress</Text>
          <View style={styles.progressRow}>
            {steps.map((s, i) => {
              const color = getStepColor(s.active, s.completed, isRejected && i === steps.length - 1);
              const iconName = !s.active
                ? 'ellipse-outline'
                : s.completed
                  ? (isRejected && i === steps.length - 1 ? 'close-circle' : 'checkmark-circle')
                  : 'time';

              return (
                <React.Fragment key={s.step}>
                  <View style={styles.stepItem}>
                    <Ionicons name={iconName as any} size={28} color={color} />
                    <Text style={[styles.stepLabel, { color }]}>{s.label}</Text>
                  </View>
                  {i < steps.length - 1 && (
                    <View
                      style={[
                        styles.stepLine,
                        { backgroundColor: s.completed ? color : PRIVE_COLORS.text.disabled },
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
          {isPending && (
            <View style={styles.pendingIndicator}>
              <ActivityIndicator size="small" color={PRIVE_COLORS.status.warning} />
              <Text style={styles.pendingText}>Auto-refreshing every 30s</Text>
            </View>
          )}
        </View>

        {/* Approved Rewards */}
        {isApproved && (coinsEarned > 0 || cashbackAmount > 0) && (
          <View style={styles.rewardCard}>
            <Text style={styles.rewardTitle}>Rewards Earned</Text>
            <View style={styles.rewardRow}>
              {coinsEarned > 0 && (
                <View style={styles.rewardItem}>
                  <Ionicons name="star" size={22} color={PRIVE_COLORS.gold.primary} />
                  <Text style={styles.rewardValue}>{coinsEarned}</Text>
                  <Text style={styles.rewardUnit}>coins</Text>
                </View>
              )}
              {cashbackAmount > 0 && (
                <View style={styles.rewardItem}>
                  <Ionicons name="cash-outline" size={22} color={PRIVE_COLORS.status.success} />
                  <Text style={styles.rewardValue}>{cashbackAmount.toFixed(2)}</Text>
                  <Text style={styles.rewardUnit}>cashback</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Rejection Details */}
        {isRejected && (
          <View style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Ionicons name="close-circle" size={20} color={PRIVE_COLORS.status.error} />
              <Text style={styles.rejectionTitle}>Submission Rejected</Text>
            </View>
            {submission.rejectionReason ? (
              <View style={styles.rejectionDetail}>
                <Text style={styles.rejectionLabel}>Reason</Text>
                <Text style={styles.rejectionText}>{submission.rejectionReason}</Text>
              </View>
            ) : null}
            {submission.reviewerNote ? (
              <View style={styles.rejectionDetail}>
                <Text style={styles.rejectionLabel}>Reviewer Note</Text>
                <Text style={styles.rejectionText}>{submission.reviewerNote}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Submission Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Submission Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Post URL</Text>
            <Pressable onPress={() => Linking.openURL(submission.postUrl)}>
              <Text style={styles.detailLink} numberOfLines={1}>{submission.postUrl}</Text>
            </Pressable>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Submitted</Text>
            <Text style={styles.detailValue}>{formatDate(submission.submittedAt)}</Text>
          </View>

          {submission.reviewedAt ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reviewed</Text>
              <Text style={styles.detailValue}>{formatDate(submission.reviewedAt)}</Text>
            </View>
          ) : null}

          {submission.orderId ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order ID</Text>
              <Text style={styles.detailValue}>{submission.orderId}</Text>
            </View>
          ) : null}

          {!isRejected && submission.reviewerNote ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reviewer Note</Text>
              <Text style={styles.detailValue}>{submission.reviewerNote}</Text>
            </View>
          ) : null}

          {submission.campaignTitle ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Campaign</Text>
              <Text style={styles.detailValue}>{submission.campaignTitle}</Text>
            </View>
          ) : null}
        </View>

        {/* Pending Info */}
        {isPending && (
          <View style={styles.infoCard}>
            <Ionicons name="hourglass-outline" size={20} color={PRIVE_COLORS.status.warning} />
            <Text style={styles.infoText}>
              Your submission is being reviewed. This usually takes 24-48 hours. We'll notify you once it's done.
            </Text>
          </View>
        )}

        {/* Back Button */}
        <Pressable
          style={styles.backBtn}
          onPress={() => router.push('/prive/campaigns')}
        >
          <Ionicons name="arrow-back" size={18} color={PRIVE_COLORS.gold.primary} />
          <Text style={styles.backBtnText}>Back to Campaigns</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.primary,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIVE_COLORS.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.lg,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
  },
  errorSubtitle: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    marginTop: PRIVE_SPACING.sm,
    textAlign: 'center',
  },
  scroll: {
    padding: PRIVE_SPACING.lg,
    paddingBottom: 120,
  },

  // Progress Tracker
  progressCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    width: 80,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  stepLine: {
    height: 2,
    flex: 1,
    borderRadius: 1,
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PRIVE_SPACING.sm,
    marginTop: PRIVE_SPACING.md,
  },
  pendingText: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
  },

  // Rewards
  rewardCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
  },
  rewardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.md,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: PRIVE_SPACING.xl,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: PRIVE_COLORS.text.primary,
  },
  rewardUnit: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
  },

  // Rejection
  rejectionCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
    marginBottom: PRIVE_SPACING.md,
  },
  rejectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIVE_COLORS.status.error,
  },
  rejectionDetail: {
    marginBottom: PRIVE_SPACING.sm,
  },
  rejectionLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: 2,
  },
  rejectionText: {
    fontSize: 14,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 20,
  },

  // Details
  detailsCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
    marginBottom: 14,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: PRIVE_COLORS.text.primary,
  },
  detailLink: {
    fontSize: 14,
    color: PRIVE_COLORS.gold.primary,
    textDecorationLine: 'underline',
  },

  // Info
  infoCard: {
    flexDirection: 'row',
    backgroundColor: PRIVE_COLORS.transparent.gold05,
    borderRadius: PRIVE_RADIUS.md,
    padding: PRIVE_SPACING.md,
    gap: PRIVE_SPACING.sm,
    alignItems: 'flex-start',
    marginBottom: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 18,
  },

  // Back Button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PRIVE_SPACING.sm,
    paddingVertical: 14,
    marginTop: PRIVE_SPACING.sm,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
});
