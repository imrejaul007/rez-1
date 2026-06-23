import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Create Support Ticket Page
// Form to submit a new support ticket

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
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import supportService from '@/services/supportApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, Gradients, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const CATEGORIES = [
  { id: 'payment', label: 'Cashback Not Received', icon: 'wallet-outline' },
  { id: 'payment', label: 'Wrong Cashback Amount', icon: 'calculator-outline', subject: 'Wrong cashback amount' },
  { id: 'order', label: 'Visit Not Counted', icon: 'location-outline', subject: 'Visit not counted' },
  { id: 'product', label: 'Merchant Denied Offer', icon: 'storefront-outline', subject: 'Merchant denied offer' },
  { id: 'refund', label: 'Refund Not Processed', icon: 'return-down-back-outline' },
  { id: 'account', label: 'Wallet Balance Issue', icon: 'cash-outline', subject: 'Wallet balance issue' },
  { id: 'account', label: 'Referral Reward Missing', icon: 'people-outline', subject: 'Referral reward missing' },
  { id: 'technical', label: 'App Technical Problem', icon: 'bug-outline' },
  { id: 'delivery', label: 'Delivery Issue', icon: 'bicycle-outline' },
  { id: 'other', label: 'Other', icon: 'help-circle-outline' },
] as const;

/** Self-resolution tips shown before ticket creation — reduces ticket volume */
const SELF_RESOLUTION_TIPS: Record<string, string> = {
  'Cashback Not Received': 'Cashback is credited within 2 hours after bill verification. If your transaction was recent, please wait a bit longer.',
  'Wrong Cashback Amount': 'Cashback is calculated based on the eligible bill amount after excluding taxes and delivery charges. Check your transaction details.',
  'Visit Not Counted': 'Visit rewards are updated after cashback verification. This usually takes up to 4 hours.',
  'Refund Not Processed': 'Refunds are processed within 24 hours. Your wallet balance will be updated automatically.',
  'Referral Reward Missing': 'Referral rewards are credited once your friend completes their first verified transaction.',
  'Wallet Balance Issue': 'Your wallet balance syncs every few minutes. Try pulling down to refresh your wallet screen.',
  'App Technical Problem': 'Try closing and reopening the app, or updating to the latest version from the app store.',
};

const PRIORITIES = [
  { id: 'low', label: 'Low', color: Colors.success, icon: 'arrow-down' },
  { id: 'medium', label: 'Medium', color: Colors.warning, icon: 'remove' },
  { id: 'high', label: 'High', color: '#E65100', icon: 'arrow-up' },
] as const;

function generateIdempotencyKey(): string {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function CreateTicketPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    subject?: string;
    relatedOrderId?: string;
  }>();

  const [subject, setSubject] = useState(params.subject || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(params.category || null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selfResolutionDismissed, setSelfResolutionDismissed] = useState(false);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());
  const isMounted = useIsMounted();

  const selfResolutionTip = selectedLabel ? SELF_RESOLUTION_TIPS[selectedLabel] : null;
  const showSelfResolution = selfResolutionTip && !selfResolutionDismissed;

  const isValid = subject.trim().length >= 5 && selectedCategory && message.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      const response = await supportService.createTicket({
        subject: subject.trim(),
        category: selectedCategory as any,
        priority: selectedPriority as any,
        message: message.trim(),
        idempotencyKey,
        ...(params.relatedOrderId ? {
          relatedEntity: { type: 'order' as const, id: params.relatedOrderId },
        } : {}),
      });

      if (response.success && response.data?.ticket) {
        platformAlertSimple('Success', 'Your support ticket has been created.');
        router.replace(`/support/ticket/${response.data.ticket._id}` as any);
      } else {
        platformAlertSimple('Error', 'Failed to create ticket. Please try again.');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent />

        {/* Header */}
        <LinearGradient colors={Gradients.nileBlue} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>New Ticket</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Subject */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Subject *</ThemedText>
            <TextInput
              style={styles.textInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief description of your issue"
              placeholderTextColor={Colors.gray[400]}
              maxLength={200}
            />
            <ThemedText style={styles.charCount}>{subject.length}/200</ThemedText>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Category *</ThemedText>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === cat.id && styles.categoryCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setSelectedLabel(cat.label);
                    setSelfResolutionDismissed(false);
                    if ('subject' in cat && cat.subject) {
                      setSubject(cat.subject as string);
                    } else if (!subject) {
                      setSubject(cat.label);
                    }
                  }}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={22}
                    color={selectedCategory === cat.id ? Colors.secondary[600] : Colors.gray[500]}
                  />
                  <ThemedText
                    style={[
                      styles.categoryLabel,
                      selectedCategory === cat.id && styles.categoryLabelSelected,
                    ]}
                  >
                    {cat.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Self-Resolution Tip — reduces ticket volume */}
          {showSelfResolution && (
            <View style={styles.selfResolutionCard}>
              <View style={styles.selfResolutionHeader}>
                <Ionicons name="information-circle" size={20} color="#2563EB" />
                <ThemedText style={styles.selfResolutionTitle}>Before you create a ticket</ThemedText>
              </View>
              <ThemedText style={styles.selfResolutionText}>{selfResolutionTip}</ThemedText>
              <View style={styles.selfResolutionActions}>
                <Pressable style={styles.selfResWaitBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
                  <ThemedText style={styles.selfResWaitText}>Wait</ThemedText>
                </Pressable>
                <Pressable style={styles.selfResRaiseBtn} onPress={() => setSelfResolutionDismissed(true)}>
                  <ThemedText style={styles.selfResRaiseText}>Raise Ticket</ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          {/* Priority */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Priority</ThemedText>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(pri => (
                <Pressable
                  key={pri.id}
                  style={[
                    styles.priorityCard,
                    selectedPriority === pri.id && { borderColor: pri.color, backgroundColor: `${pri.color}10` },
                  ]}
                  onPress={() => setSelectedPriority(pri.id)}
                >
                  <Ionicons
                    name={pri.icon as any}
                    size={18}
                    color={selectedPriority === pri.id ? pri.color : Colors.gray[400]}
                  />
                  <ThemedText
                    style={[
                      styles.priorityLabel,
                      selectedPriority === pri.id && { color: pri.color, fontWeight: '600' },
                    ]}
                  >
                    {pri.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Message */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Describe your issue *</ThemedText>
            <TextInput
              style={styles.textArea}
              value={message}
              onChangeText={setMessage}
              placeholder="Please provide details about your issue. Include any relevant order IDs, screenshots, or error messages..."
              placeholderTextColor={Colors.gray[400]}
              multiline
              maxLength={5000}
              textAlignVertical="top"
            />
            <ThemedText style={styles.charCount}>{message.length}/5000</ThemedText>
          </View>

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
                <ThemedText style={styles.submitButtonText}>Submit Ticket</ThemedText>
              </>
            )}
          </Pressable>

          {/* Help Text */}
          <View style={styles.helpCard}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
            <ThemedText style={styles.helpText}>
              Our team typically responds within 24 hours. For urgent issues, please select "High" priority.
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
  selfResolutionCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  selfResolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  selfResolutionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
  },
  selfResolutionText: {
    fontSize: 13,
    color: '#1E3A5F',
    lineHeight: 20,
    marginBottom: 14,
  },
  selfResolutionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  selfResWaitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  selfResWaitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  selfResRaiseBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  selfResRaiseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
  textInput: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text?.primary || colors.deepNavy,
    ...Shadows.subtle,
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
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
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
  categoryCardSelected: {
    borderColor: Colors.secondary[600],
    backgroundColor: Colors.secondary[50] || '#f0f7ff',
  },
  categoryLabel: {
    fontSize: 11,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: Colors.secondary[600],
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.subtle,
  },
  priorityLabel: {
    fontSize: 13,
    color: Colors.gray[500],
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
});

export default withErrorBoundary(CreateTicketPage, 'SupportCreateTicket');
