import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import supportService from '@/services/supportApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const ISSUE_TYPES = [
  { id: 'defective', label: 'Defective Product', icon: 'warning-outline' },
  { id: 'not_working', label: 'Not Working', icon: 'close-circle-outline' },
  { id: 'damaged', label: 'Damaged', icon: 'hammer-outline' },
  { id: 'warranty_claim', label: 'Warranty Claim', icon: 'shield-checkmark-outline' },
  { id: 'replacement', label: 'Replacement', icon: 'swap-horizontal-outline' },
  { id: 'installation', label: 'Installation Help', icon: 'construct-outline' },
  { id: 'maintenance', label: 'Maintenance', icon: 'build-outline' },
  { id: 'other', label: 'Other', icon: 'help-circle-outline' },
] as const;

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function ServiceRequestPage() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const isMounted = useIsMounted();

  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const isValid = selectedIssueType && description.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;

    const issueLabel = ISSUE_TYPES.find(t => t.id === selectedIssueType)?.label || selectedIssueType;

    setSubmitting(true);
    try {
      const response = await supportService.createTicket({
        subject: `Product Service Request: ${issueLabel}`,
        category: 'product',
        message: description.trim(),
        priority: 'medium',
        idempotencyKey,
        ...(productId ? {
          relatedEntity: { type: 'product' as const, id: productId },
        } : {}),
        tags: ['product_service', selectedIssueType || ''],
      });

      if (!isMounted()) return;

      if (response.success && response.data?.ticket) {
        setTicketNumber(response.data.ticket.ticketNumber);
        setSubmitted(true);
      } else {
        platformAlertSimple('Error', 'Failed to create service request. Please try again.');
      }
    } catch {
      if (!isMounted()) return;
      platformAlertSimple('Error', 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Success state
  if (submitted) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" translucent />
          <LinearGradient colors={['#1a3a52', '#2d5a7b']} style={styles.header}>
            <View style={styles.headerContent}>
              <Pressable style={styles.backButton} onPress={handleGoBack}>
                <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
              </Pressable>
              <ThemedText style={styles.headerTitle}>Service Request</ThemedText>
              <View style={styles.placeholder} />
            </View>
          </LinearGradient>

          <View style={styles.successContainer}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
            </View>
            <ThemedText style={styles.successTitle}>Request Submitted</ThemedText>
            <ThemedText style={styles.successSubtitle}>
              Your service request has been created successfully.
              {ticketNumber ? ` Ticket #${ticketNumber}` : ''}
            </ThemedText>
            <ThemedText style={styles.successHint}>
              Our team will review your request and get back to you within 24 hours.
            </ThemedText>

            <Pressable style={styles.submitButton} onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={20} color={colors.background.primary} />
              <ThemedText style={styles.submitButtonText}>Back to Product</ThemedText>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent />

        {/* Header */}
        <LinearGradient colors={['#1a3a52', '#2d5a7b']} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Service Request</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Issue Type */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Issue Type *</ThemedText>
            <View style={styles.issueGrid}>
              {ISSUE_TYPES.map(issue => (
                <Pressable
                  key={issue.id}
                  style={[
                    styles.issueCard,
                    selectedIssueType === issue.id && styles.issueCardSelected,
                  ]}
                  onPress={() => setSelectedIssueType(issue.id)}
                >
                  <Ionicons
                    name={issue.icon as any}
                    size={22}
                    color={selectedIssueType === issue.id ? Colors.secondary[600] : Colors.gray[500]}
                  />
                  <ThemedText
                    style={[
                      styles.issueLabel,
                      selectedIssueType === issue.id && styles.issueLabelSelected,
                    ]}
                  >
                    {issue.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Describe the issue *</ThemedText>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Please describe the issue in detail. Include when the problem started, any error messages, and steps to reproduce..."
              placeholderTextColor={Colors.gray[400]}
              multiline
              maxLength={3000}
              textAlignVertical="top"
            />
            <ThemedText style={styles.charCount}>{description.length}/3000</ThemedText>
          </View>

          {/* Product ID info */}
          {productId && (
            <View style={styles.infoCard}>
              <Ionicons name="cube-outline" size={18} color={Colors.info} />
              <ThemedText style={styles.infoText}>
                This request is linked to product ID: {productId}
              </ThemedText>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background.primary} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color={colors.background.primary} />
                <ThemedText style={styles.submitButtonText}>Submit Request</ThemedText>
              </>
            )}
          </Pressable>

          {/* Help Text */}
          <View style={styles.helpCard}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
            <ThemedText style={styles.helpText}>
              Our support team typically responds within 24 hours. For urgent issues, you can also reach us through live chat.
            </ThemedText>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
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
    padding: 16,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  issueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  issueCard: {
    width: '23%',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.subtle,
  },
  issueCardSelected: {
    borderColor: Colors.secondary[600],
    backgroundColor: Colors.secondary[50] || '#f0f7ff',
  },
  issueLabel: {
    fontSize: 11,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  issueLabelSelected: {
    color: Colors.secondary[600],
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text?.primary || colors.deepNavy,
    minHeight: 140,
    ...Shadows.subtle,
  },
  charCount: {
    fontSize: 11,
    color: Colors.gray[400],
    textAlign: 'right',
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${Colors.info}15`,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 12,
    color: Colors.gray[600],
    flex: 1,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary[600],
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${Colors.info}15`,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  helpText: {
    fontSize: 12,
    color: Colors.gray[600],
    flex: 1,
    lineHeight: 18,
  },
  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.success}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  successHint: {
    fontSize: 13,
    color: Colors.gray[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
});

export default withErrorBoundary(ServiceRequestPage, 'ServiceRequest');
