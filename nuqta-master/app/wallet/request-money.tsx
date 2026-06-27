import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Request Money from Friend
// Multi-step: Search recipient -> Enter amount -> Success + pending requests list

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import CachedImage from '@/components/ui/CachedImage';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';
import walletApi from '@/services/walletApi';
import apiClient from '@/services/apiClient';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { BRAND } from '@/constants/brand';

type Step = 'recipient' | 'amount' | 'success';

interface Recipient {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
}

interface MoneyRequest {
  _id: string;
  recipientId: string;
  recipientName?: string;
  recipientAvatar?: string;
  amount: number;
  note?: string;
  status: 'pending' | 'paid' | 'declined' | 'cancelled';
  createdAt: string;
}

function RequestMoneyPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const isMounted = useIsMounted();

  const [step, setStep] = useState<Step>('recipient');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsHasMore, setRequestsHasMore] = useState(false);
  const [requestsLoadingMore, setRequestsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth guard
  if (authLoading || !isAuthenticated) return null;

  // Fetch recipients (recent + search)
  const fetchRecipients = useCallback(async (search?: string) => {
    setRecipientsLoading(true);
    try {
      const res = await walletApi.getRecentRecipients(search || undefined);
      if (!isMounted()) return;
      const list = res.data?.recipients || [];
      setRecipients(list.map((r: any) => ({
        id: r._id || r.id,
        name: r.fullName || r.name || r.phoneNumber || r.phone || 'User',
        phone: r.phoneNumber || r.phone || '',
        avatar: r.avatar,
      })));
    } catch {
      if (isMounted()) setRecipients([]);
    } finally {
      if (isMounted()) setRecipientsLoading(false);
    }
  }, [isMounted]);

  // Fetch pending money requests
  const fetchRequests = useCallback(async (page = 1, append = false) => {
    if (page === 1) setRequestsLoading(true);
    else setRequestsLoadingMore(true);
    try {
      const res = await apiClient.get<{
        requests: MoneyRequest[];
        pagination: { totalPages: number; hasNextPage: boolean };
      }>(`/wallet/money-requests?page=${page}&limit=10`);
      if (!isMounted()) return;
      const data = res.data;
      const items = data?.requests || [];
      setRequests(prev => append ? [...prev, ...items] : items);
      setRequestsHasMore(data?.pagination?.hasNextPage ?? false);
      setRequestsPage(page);
    } catch {
      if (isMounted() && !append) setRequests([]);
    } finally {
      if (isMounted()) {
        setRequestsLoading(false);
        setRequestsLoadingMore(false);
      }
    }
  }, [isMounted]);

  // Initial load
  useEffect(() => {
    fetchRecipients();
    fetchRequests();
  }, [fetchRecipients, fetchRequests]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchRecipients(searchQuery);
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, fetchRecipients]);

  const handleSelectRecipient = (recipient: Recipient) => {
    setSelectedRecipient(recipient);
    setStep('amount');
  };

  const numAmount = Number(amount) || 0;
  const isAmountValid = numAmount > 0;

  const handleSendRequest = () => {
    if (!selectedRecipient || !isAmountValid) return;

    platformAlertConfirm(
      'Send Request',
      `Request ${numAmount.toLocaleString()} ${BRAND.CURRENCY_CODE} from ${selectedRecipient.name}?`,
      () => executeRequest(),
      'Send',
      'Cancel',
    );
  };

  const executeRequest = async () => {
    if (!selectedRecipient) return;
    setLoading(true);
    try {
      const res = await apiClient.post<{ request: MoneyRequest }>('/wallet/money-requests', {
        recipientId: selectedRecipient.id,
        amount: numAmount,
        note: note.trim() || undefined,
      });
      if (!isMounted()) return;
      if (res.success && res.data) {
        setCreatedRequestId(res.data.request?._id || '');
        setStep('success');
        fetchRequests(); // Refresh list
      } else {
        platformAlertSimple('Failed', res.message || 'Failed to send money request.');
      }
    } catch (error: any) {
      if (!isMounted()) return;
      platformAlertSimple('Error', error?.message || 'Something went wrong.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequests(1, false);
    setRefreshing(false);
  };

  const handleBack = () => {
    switch (step) {
      case 'amount': setStep('recipient'); break;
      case 'success':
        setStep('recipient');
        setSelectedRecipient(null);
        setAmount('');
        setNote('');
        break;
      default:
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  };

  const handleDone = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Colors.success;
      case 'declined': return Colors.error;
      case 'cancelled': return Colors.text.tertiary;
      default: return Colors.warning;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'declined': return 'Declined';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // ── Step 1: Search Recipient ──
  const renderRecipientStep = () => (
    <>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by phone or name"
          placeholderTextColor={Colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>
          {searchQuery ? 'Results' : 'Recent'}
        </ThemedText>
        {recipientsLoading ? (
          <ActivityIndicator color={Colors.primary[600]} style={{ marginVertical: Spacing.lg }} />
        ) : recipients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={Colors.text.tertiary} />
            <ThemedText style={styles.emptyText}>
              {searchQuery ? 'No users found' : 'No recent contacts'}
            </ThemedText>
          </View>
        ) : (
          recipients.map(recipient => (
            <Pressable
              key={recipient.id}
              style={styles.recipientCard}
              onPress={() => handleSelectRecipient(recipient)}
            >
              {recipient.avatar ? (
                <CachedImage source={{ uri: recipient.avatar }} style={styles.recipientAvatarImage} />
              ) : (
                <View style={styles.recipientAvatar}>
                  <ThemedText style={styles.avatarText}>
                    {(recipient.name || '?').charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <View style={styles.recipientInfo}>
                <ThemedText style={styles.recipientName}>{recipient.name}</ThemedText>
                {recipient.phone ? (
                  <ThemedText style={styles.recipientPhone}>{recipient.phone}</ThemedText>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </Pressable>
          ))
        )}
      </View>

      {/* Pending Requests List */}
      {requests.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Your Requests</ThemedText>
          {requestsLoading ? (
            <ActivityIndicator color={Colors.primary[600]} style={{ marginVertical: Spacing.lg }} />
          ) : (
            requests.map(req => (
              <View key={req._id} style={styles.requestCard}>
                <View style={styles.requestAvatar}>
                  <ThemedText style={styles.avatarText}>
                    {(req.recipientName || '?').charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.requestInfo}>
                  <ThemedText style={styles.requestName}>
                    {req.recipientName || 'User'}
                  </ThemedText>
                  <ThemedText style={styles.requestDate}>
                    {formatDate(req.createdAt)}
                    {req.note ? ` - ${req.note}` : ''}
                  </ThemedText>
                </View>
                <View style={styles.requestRight}>
                  <ThemedText style={styles.requestAmount}>
                    {BRAND.CURRENCY_CODE} {req.amount.toLocaleString()}
                  </ThemedText>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) + '20' }]}>
                    <ThemedText style={[styles.statusBadgeText, { color: getStatusColor(req.status) }]}>
                      {getStatusLabel(req.status)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))
          )}
          {requestsHasMore && (
            <Pressable
              style={styles.loadMoreButton}
              onPress={() => fetchRequests(requestsPage + 1, true)}
              disabled={requestsLoadingMore}
            >
              {requestsLoadingMore ? (
                <ActivityIndicator color={Colors.nileBlue} size="small" />
              ) : (
                <ThemedText style={styles.loadMoreText}>Load More</ThemedText>
              )}
            </Pressable>
          )}
        </View>
      )}
    </>
  );

  // ── Step 2: Enter Amount ──
  const renderAmountStep = () => (
    <>
      <View style={styles.selectedRecipient}>
        {selectedRecipient?.avatar ? (
          <CachedImage source={{ uri: selectedRecipient.avatar }} style={styles.recipientAvatarLargeImage} />
        ) : (
          <View style={styles.recipientAvatarLarge}>
            <ThemedText style={styles.avatarTextLarge}>
              {(selectedRecipient?.name || '?').charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
        <ThemedText style={styles.selectedName}>{selectedRecipient?.name}</ThemedText>
        {selectedRecipient?.phone ? (
          <ThemedText style={styles.selectedPhone}>{selectedRecipient.phone}</ThemedText>
        ) : null}
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Request Amount</ThemedText>
        <View style={styles.amountInputContainer}>
          <ThemedText style={styles.currencySymbol}>{BRAND.CURRENCY_CODE}</ThemedText>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={text => setAmount(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.text.tertiary}
            autoFocus
          />
        </View>
      </View>

      {/* Quick Amounts */}
      <View style={styles.quickAmounts}>
        {[100, 250, 500, 1000].map(qa => (
          <Pressable
            key={qa}
            style={[
              styles.quickAmountButton,
              amount === qa.toString() && styles.quickAmountButtonSelected,
            ]}
            onPress={() => setAmount(qa.toString())}
          >
            <ThemedText style={[
              styles.quickAmountText,
              amount === qa.toString() && styles.quickAmountTextSelected,
            ]}>
              {qa}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Note */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Add a note (optional)</ThemedText>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="For last night's dinner..."
          placeholderTextColor={Colors.text.tertiary}
          multiline
        />
      </View>

      <Pressable
        style={[styles.primaryButton, !isAmountValid && styles.buttonDisabled]}
        onPress={handleSendRequest}
        disabled={!isAmountValid || loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.text.inverse} />
        ) : (
          <>
            <Ionicons name="paper-plane" size={18} color={Colors.text.inverse} />
            <ThemedText style={styles.primaryButtonText}>
              Request {numAmount > 0 ? `${numAmount.toLocaleString()} ${BRAND.CURRENCY_CODE}` : ''}
            </ThemedText>
          </>
        )}
      </Pressable>
    </>
  );

  // ── Step 3: Success ──
  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
      </View>
      <ThemedText style={styles.successTitle}>Request Sent!</ThemedText>
      <ThemedText style={styles.successSubtitle}>
        You requested {numAmount.toLocaleString()} {BRAND.CURRENCY_CODE} from {selectedRecipient?.name}
      </ThemedText>
      {note ? (
        <ThemedText style={styles.successNote}>"{note}"</ThemedText>
      ) : null}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={Colors.nileBlue} />
        <ThemedText style={styles.infoText}>
          Your friend will receive a notification. Once they approve, the coins will be transferred to your wallet.
        </ThemedText>
      </View>

      <Pressable style={styles.primaryButton} onPress={handleDone}>
        <ThemedText style={styles.primaryButtonText}>Done</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      <LinearGradient colors={Gradients.nileBlue} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>
            {step === 'success' ? 'Request Sent' : 'Request Money'}
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        {step !== 'success' && (
          <View style={styles.stepIndicator}>
            {(['recipient', 'amount'] as Step[]).map((s, idx) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  (['recipient', 'amount'] as Step[]).indexOf(step) >= idx && styles.stepDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            step === 'recipient' ? (
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            ) : undefined
          }
        >
          {step === 'recipient' && renderRecipientStep()}
          {step === 'amount' && renderAmountStep()}
          {step === 'success' && renderSuccessStep()}
        </ScrollView>
      </KeyboardAvoidingView>
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
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.md,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },

  // Sections
  section: {
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },

  // Recipients
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  recipientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  recipientPhone: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },

  // Selected recipient (step 2)
  selectedRecipient: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  recipientAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  recipientAvatarLargeImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: Spacing.sm,
  },
  avatarTextLarge: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  selectedName: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  selectedPhone: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },

  // Amount input
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.subtle,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginRight: Spacing.sm,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text.primary,
    minWidth: 80,
    textAlign: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
  },
  quickAmountButtonSelected: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
  },
  quickAmountText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  quickAmountTextSelected: {
    color: Colors.text.inverse,
  },

  // Note
  noteInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 72,
    textAlignVertical: 'top',
    ...Shadows.subtle,
  },

  // Requests list
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  requestDate: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  requestRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  requestAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  loadMoreText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },

  // Success
  successContainer: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
  },
  successIconContainer: {
    marginBottom: Spacing.base,
  },
  successTitle: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  successSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successNote: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.nileBlue + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  infoText: {
    flex: 1,
    ...Typography.caption,
    color: Colors.text.secondary,
    lineHeight: 18,
  },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  primaryButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(RequestMoneyPage, 'RequestMoney');
