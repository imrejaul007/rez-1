// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import disputeApi, { Dispute } from '@/services/disputeApi';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlert } from '@/utils/platformAlert';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import ScreenSkeleton from '@/components/common/ScreenSkeleton';
import ScreenError from '@/components/common/ScreenError';
import { useIsMounted } from '@/hooks/useIsMounted';

const STATUS_COLORS: Record<string, string> = {
  open: colors.error,
  under_review: colors.warningScale[400],
  escalated: colors.brand.purpleLight,
  resolved_refund: colors.successScale[400],
  resolved_reject: colors.brand.blue,
  auto_resolved: colors.brand.indigo,
  closed: colors.neutral[500],
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under Review',
  escalated: 'Escalated',
  resolved_refund: 'Refunded',
  resolved_reject: 'Rejected',
  auto_resolved: 'Auto-Resolved',
  closed: 'Closed',
};

const REASON_LABELS: Record<string, string> = {
  item_not_received: 'Item Not Received',
  wrong_item: 'Wrong Item',
  damaged_item: 'Damaged Item',
  quality_issue: 'Quality Issue',
  unauthorized_charge: 'Unauthorized Charge',
  double_charge: 'Double Charge',
  service_not_rendered: 'Service Not Rendered',
  other: 'Other',
};

function DisputeDetailScreen() {
  const isMounted = useIsMounted();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, authLoading } = useAuth();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || authLoading || !isAuthenticated) return;
    loadDispute();
  }, [id, isAuthenticated, authLoading]);

  const loadDispute = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await disputeApi.getDispute(id!);
      if (response.success && response.data) {
        setDispute(response.data as any);
      } else {
        if (!isMounted()) return;
        setError('Dispute not found');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Failed to load dispute');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  if (loading) return <ScreenSkeleton variant="detail" />;
  if (error || !dispute) {
    return (
      <ScreenError
        error={error || 'Dispute not found'}
        onRetry={loadDispute}
        onSecondaryAction={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
      />
    );
  }

  const statusColor = STATUS_COLORS[dispute.status] || colors.neutral[500];
  const isOpen = ['open', 'under_review', 'escalated'].includes(dispute.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.disputeNumber}>{dispute.disputeNumber}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {STATUS_LABELS[dispute.status] || dispute.status}
          </Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <InfoRow label="Reason" value={REASON_LABELS[dispute.reason] || dispute.reason} />
        <InfoRow label="Amount" value={`${dispute.amount} coins`} />
        <InfoRow label="Order" value={dispute.targetRef} />
        <InfoRow label="Created" value={new Date(dispute.createdAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })} />
        <InfoRow label="Auto-Resolve By" value={new Date(dispute.autoResolveAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })} />
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.descText}>{dispute.description}</Text>
      </View>

      {/* Evidence */}
      {dispute.evidence.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evidence ({dispute.evidence.length})</Text>
          {dispute.evidence.map((e, i) => (
            <View key={i} style={styles.evidenceItem}>
              <Text style={styles.evidenceType}>
                {e.submitterType === 'user' ? 'You' : e.submitterType} — {new Date(e.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.evidenceDesc}>{e.description}</Text>
              {e.attachments.length > 0 && (
                <View style={styles.attachmentRow}>
                  {e.attachments.map((url, j) => (
                    <CachedImage key={j} source={{ uri: url }} style={styles.attachmentThumb} />
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Merchant Response */}
      {dispute.merchantResponse && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Merchant Response</Text>
          <View style={styles.merchantCard}>
            <Text style={styles.descText}>{dispute.merchantResponse.response}</Text>
            {dispute.merchantResponse.attachments.length > 0 && (
              <View style={styles.attachmentRow}>
                {dispute.merchantResponse.attachments.map((url, j) => (
                  <CachedImage key={j} source={{ uri: url }} style={styles.attachmentThumb} />
                ))}
              </View>
            )}
            <Text style={styles.dateText}>
              {new Date(dispute.merchantResponse.respondedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      )}

      {/* Resolution */}
      {dispute.resolution && (
        <View style={[styles.section, styles.resolutionCard, {
          backgroundColor: dispute.resolution.decision === 'reject' ? colors.errorScale[100] : colors.successScale[100],
        }]}>
          <Text style={styles.sectionTitle}>Resolution</Text>
          <InfoRow label="Decision" value={dispute.resolution.decision.replace(/_/g, ' ').toUpperCase()} />
          <InfoRow label="Amount" value={`${dispute.resolution.amount} coins`} />
          <InfoRow label="Reason" value={dispute.resolution.reason} />
          <InfoRow label="Resolved" value={new Date(dispute.resolution.resolvedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })} />
        </View>
      )}

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        {dispute.timeline.map((t, i) => (
          <View key={i} style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: i === 0 ? colors.brand.purple : colors.neutral[300] }]} />
            {i < dispute.timeline.length - 1 && <View style={styles.timelineLine} />}
            <View style={styles.timelineContent}>
              <Text style={styles.timelineAction}>{t.action.replace(/_/g, ' ')}</Text>
              {t.details && <Text style={styles.timelineDetails}>{t.details}</Text>}
              <Text style={styles.timelineTime}>
                {t.performerType} — {new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Add Evidence Button */}
      {isOpen && (
        <TouchableOpacity
          style={styles.addEvidenceBtn}
          onPress={() => router.push(`/disputes/create?addEvidence=true&disputeId=${dispute._id}`)}
        >
          <Ionicons name="attach-outline" size={18} color="#fff" />
          <Text style={styles.addEvidenceBtnText}>Add Evidence</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.tint.coolGray, padding: spacing.base },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.tint.coolGray, gap: spacing.sm },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.base },
  disputeNumber: { ...typography.h4, color: colors.text.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.md },
  badgeText: { ...typography.labelSmall },

  infoCard: {
    backgroundColor: colors.background.primary, borderRadius: 14, padding: 14, marginBottom: spacing.base,
    ...shadows.subtle,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border.light },
  infoLabel: { ...typography.body, color: colors.neutral[500] },
  infoValue: { ...typography.label, color: colors.text.primary, maxWidth: '55%', textAlign: 'right' },

  section: { marginBottom: spacing.base },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
  descText: { ...typography.body, color: colors.neutral[500], lineHeight: 20 },
  dateText: { fontSize: 11, color: colors.neutral[400], marginTop: spacing.xs },

  evidenceItem: {
    backgroundColor: colors.background.primary, borderRadius: 10, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border.light,
  },
  evidenceType: { fontSize: 11, color: colors.neutral[400], marginBottom: spacing.xs, textTransform: 'capitalize' },
  evidenceDesc: { ...typography.body, color: colors.neutral[700] },
  attachmentRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  attachmentThumb: { width: 60, height: 60, borderRadius: borderRadius.sm, backgroundColor: colors.border.light },

  merchantCard: { backgroundColor: colors.tint.orange, borderRadius: 10, padding: spacing.md, borderWidth: 1, borderColor: colors.warningScale[200] },

  resolutionCard: { borderRadius: 14, padding: 14 },

  timelineItem: { flexDirection: 'row', marginBottom: spacing.xs, minHeight: 40 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, marginRight: spacing.md, zIndex: 1 },
  timelineLine: {
    position: 'absolute', left: 4, top: 14, bottom: -4, width: 2, backgroundColor: colors.border.default,
  },
  timelineContent: { flex: 1, paddingBottom: spacing.md },
  timelineAction: { ...typography.label, color: colors.text.primary, textTransform: 'capitalize' },
  timelineDetails: { ...typography.bodySmall, color: colors.neutral[500], marginTop: 2 },
  timelineTime: { fontSize: 11, color: colors.neutral[400], marginTop: 2, textTransform: 'capitalize' },

  addEvidenceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.brand.purple, borderRadius: borderRadius.md,
    paddingVertical: 14, marginTop: spacing.sm,
  },
  addEvidenceBtnText: { fontSize: 15, fontWeight: '600', color: colors.text.inverse },
});

export default withErrorBoundary(DisputeDetailScreen, 'DisputesId');
