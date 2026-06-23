// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import disputeApi from '@/services/disputeApi';
import { platformAlert } from '@/utils/platformAlert';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const REASONS = [
  { key: 'item_not_received', label: 'Item Not Received', icon: 'cube-outline' },
  { key: 'wrong_item', label: 'Wrong Item', icon: 'swap-horizontal-outline' },
  { key: 'damaged_item', label: 'Damaged Item', icon: 'warning-outline' },
  { key: 'quality_issue', label: 'Quality Issue', icon: 'star-half-outline' },
  { key: 'unauthorized_charge', label: 'Unauthorized Charge', icon: 'lock-closed-outline' },
  { key: 'double_charge', label: 'Double Charge', icon: 'copy-outline' },
  { key: 'service_not_rendered', label: 'Service Not Rendered', icon: 'close-circle-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
] as const;

function CreateDisputeScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{
    targetType?: string;
    targetId?: string;
    orderRef?: string;
    addEvidence?: string;
    disputeId?: string;
  }>();

  const isAddingEvidence = params.addEvidence === 'true' && params.disputeId;

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated) {
      platformAlert('Error', 'Please log in to submit a dispute');
      return;
    }

    if (isAddingEvidence) {
      // Adding evidence to existing dispute
      if (!description.trim()) {
        platformAlert('Error', 'Please describe the evidence');
        return;
      }

      setSubmitting(true);
      try {
        const response = await disputeApi.addEvidence(params.disputeId!, description.trim(), []);
        if (response.success) {
          platformAlert('Success', 'Evidence added successfully');
          router.canGoBack() ? router.back() : router.replace('/(tabs)');
        } else {
          platformAlert('Error', (response as any).message || 'Failed to add evidence');
        }
      } catch (err: any) {
        platformAlert('Error', err.message || 'Failed to add evidence');
      } finally {
        if (!isMounted()) return;
        setSubmitting(false);
      }
      return;
    }

    // Creating new dispute
    if (!reason) {
      platformAlert('Error', 'Please select a reason');
      return;
    }
    if (!description.trim()) {
      platformAlert('Error', 'Please describe the issue');
      return;
    }
    if (!params.targetType || !params.targetId) {
      platformAlert('Error', 'Missing order information. Please try again from the order page.');
      return;
    }

    if (!isMounted()) return;
    setSubmitting(true);
    try {
      const response = await disputeApi.createDispute({
        targetType: params.targetType as 'order',
        targetId: params.targetId,
        reason: reason as any,
        description: description.trim(),
        evidence: description.trim() ? {
          description: description.trim(),
          attachments: [],
        } : undefined,
      });

      if (response.success) {
        platformAlert('Success', 'Your dispute has been submitted. We\'ll review it within 72 hours.');
        router.replace('/disputes');
      } else {
        platformAlert('Error', (response as any).message || 'Failed to submit dispute');
      }
    } catch (err: any) {
      platformAlert('Error', err.message || 'Failed to submit dispute');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  }, [isAuthenticated, reason, description, params, isAddingEvidence]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <Text style={styles.pageTitle}>
        {isAddingEvidence ? 'Add Evidence' : 'Raise a Dispute'}
      </Text>

      {params.orderRef && (
        <View style={styles.orderRefCard}>
          <Ionicons name="receipt-outline" size={16} color={colors.brand.purple} />
          <Text style={styles.orderRefText}>Order: {params.orderRef}</Text>
        </View>
      )}

      {/* Reason Picker — only for new disputes */}
      {!isAddingEvidence && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's the issue?</Text>
          <View style={styles.reasonGrid}>
            {REASONS.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[styles.reasonChip, reason === r.key && styles.reasonChipActive]}
                onPress={() => setReason(r.key)}
              >
                <Ionicons
                  name={r.icon as any}
                  size={18}
                  color={reason === r.key ? colors.text.inverse : colors.neutral[500]}
                />
                <Text style={[styles.reasonText, reason === r.key && styles.reasonTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isAddingEvidence ? 'Describe the evidence' : 'Describe the issue'}
        </Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder={isAddingEvidence
            ? 'Provide details about this evidence...'
            : 'Please provide details about the issue...'
          }
          multiline
          maxLength={1000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length}/1000</Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name={isAddingEvidence ? 'attach-outline' : 'shield-checkmark-outline'} size={18} color="#fff" />
            <Text style={styles.submitBtnText}>
              {isAddingEvidence ? 'Submit Evidence' : 'Submit Dispute'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {!isAddingEvidence && (
        <Text style={styles.disclaimer}>
          Disputes are typically resolved within 72 hours. If not resolved by then,
          small disputes are auto-refunded and larger ones are escalated to senior review.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.tint.coolGray, padding: spacing.base },
  pageTitle: { ...typography.h2, color: colors.text.primary, marginBottom: spacing.base },

  orderRefCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.tint.purpleLight, borderRadius: 10, padding: spacing.md, marginBottom: spacing.base,
    borderWidth: 1, borderColor: colors.tint.purple,
  },
  orderRefText: { ...typography.label, color: colors.brand.purple },

  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 10 },

  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary, borderWidth: 1, borderColor: colors.border.default,
  },
  reasonChipActive: { backgroundColor: colors.brand.purple, borderColor: colors.brand.purple },
  reasonText: { ...typography.body, color: colors.neutral[700] },
  reasonTextActive: { color: colors.text.inverse, fontWeight: '600' },

  textArea: {
    backgroundColor: colors.background.primary, borderRadius: borderRadius.md, padding: 14,
    fontSize: 14, minHeight: 120, borderWidth: 1, borderColor: colors.border.default,
    color: colors.text.primary, lineHeight: 20,
  },
  charCount: { fontSize: 11, color: colors.neutral[400], textAlign: 'right', marginTop: spacing.xs },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.brand.purple, borderRadius: borderRadius.md,
    paddingVertical: 14, marginBottom: spacing.md,
  },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: colors.text.inverse },

  disclaimer: { ...typography.bodySmall, color: colors.neutral[400], textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },
});

export default withErrorBoundary(CreateDisputeScreen, 'DisputesCreate');
