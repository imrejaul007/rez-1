import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Split Bill with Friends
// Multi-step: Enter amount -> Add friends (search) -> Choose split method -> Review & Send
// Shows existing splits at bottom

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import CachedImage from '@/components/ui/CachedImage';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import { useRezBalance, useRefreshWallet, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';
import walletApi from '@/services/walletApi';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { generateIdempotencyKey } from '@/utils/idempotencyKey';
import { handleWalletError } from '@/utils/walletErrorHandler';
import { BRAND } from '@/constants/brand';

type Step = 'amount' | 'friends' | 'split' | 'review' | 'status';

interface Participant {
  id?: string;
  phone: string;
  name?: string;
  avatar?: string;
  amount: number;
  status?: 'pending' | 'accepted' | 'paid' | 'declined';
  paidAt?: string;
}

interface SearchRecipient {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
}

interface ExistingSplit {
  _id: string;
  totalAmount: number;
  splitType: 'equal' | 'custom';
  participants: Array<{ name?: string; phone: string; amount: number; status: string }>;
  note?: string;
  status: string;
  createdAt: string;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

function BillSplitPage() {
  const router = useRouter();
  const nuqtaBalance = useRezBalance();
  const refreshWallet = useRefreshWallet();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const isMounted = useIsMounted();

  const [step, setStep] = useState<Step>('amount');
  const [totalAmount, setTotalAmount] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [billSplitData, setBillSplitData] = useState<any>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey('billsplit'));
  const submittingRef = useRef(false);

  // Search recipients state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchRecipient[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual input fallback
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Existing splits
  const [existingSplits, setExistingSplits] = useState<ExistingSplit[]>([]);
  const [splitsLoading, setSplitsLoading] = useState(false);
  const [splitsPage, setSplitsPage] = useState(1);
  const [splitsHasMore, setSplitsHasMore] = useState(false);
  const [splitsLoadingMore, setSplitsLoadingMore] = useState(false);

  // Auth guard
  if (authLoading || !isAuthenticated) return null;

  const numTotal = Number(totalAmount) || 0;
  const participantCount = participants.length + 1; // +1 for initiator
  const equalShare = participantCount > 1 ? Math.round((numTotal / participantCount) * 100) / 100 : 0;

  // Fetch search results (reuse recipients endpoint from transfer)
  const fetchSearchResults = useCallback(async (search?: string) => {
    if (!search || search.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await walletApi.getRecentRecipients(search);
      if (!isMounted()) return;
      const list = res.data?.recipients || [];
      setSearchResults(list.map((r: any) => ({
        id: r._id || r.id,
        name: r.fullName || r.name || r.phoneNumber || r.phone || 'User',
        phone: r.phoneNumber || r.phone || '',
        avatar: r.avatar,
      })));
    } catch {
      if (isMounted()) setSearchResults([]);
    } finally {
      if (isMounted()) setSearchLoading(false);
    }
  }, [isMounted]);

  // Fetch recent recipients on step enter
  useEffect(() => {
    if (step === 'friends') {
      fetchSearchResults('');
      // Load recent by default
      walletApi.getRecentRecipients().then(res => {
        if (!isMounted()) return;
        const list = res.data?.recipients || [];
        setSearchResults(list.map((r: any) => ({
          id: r._id || r.id,
          name: r.fullName || r.name || r.phoneNumber || r.phone || 'User',
          phone: r.phoneNumber || r.phone || '',
          avatar: r.avatar,
        })));
      }).catch(() => {});
    }
  }, [step]);

  // Debounced search
  useEffect(() => {
    if (step !== 'friends') return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!searchQuery) {
      // Load recent on empty search
      walletApi.getRecentRecipients().then(res => {
        if (!isMounted()) return;
        const list = res.data?.recipients || [];
        setSearchResults(list.map((r: any) => ({
          id: r._id || r.id,
          name: r.fullName || r.name || r.phoneNumber || r.phone || 'User',
          phone: r.phoneNumber || r.phone || '',
          avatar: r.avatar,
        })));
      }).catch(() => {});
      return;
    }
    searchTimeout.current = setTimeout(() => {
      fetchSearchResults(searchQuery);
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, step, fetchSearchResults, isMounted]);

  // Fetch existing splits
  const fetchExistingSplits = useCallback(async (page = 1, append = false) => {
    if (page === 1) setSplitsLoading(true);
    else setSplitsLoadingMore(true);
    try {
      const res = await walletApi.listBillSplits(page, 10);
      if (!isMounted()) return;
      const data = res.data as any;
      const items = data?.splits || data?.billSplits || (Array.isArray(data) ? data : []);
      setExistingSplits(prev => append ? [...prev, ...items] : items);
      const pagination = data?.pagination;
      setSplitsHasMore(pagination?.hasNextPage ?? (items.length >= 10));
      setSplitsPage(page);
    } catch {
      if (isMounted() && !append) setExistingSplits([]);
    } finally {
      if (isMounted()) {
        setSplitsLoading(false);
        setSplitsLoadingMore(false);
      }
    }
  }, [isMounted]);

  useEffect(() => {
    fetchExistingSplits();
  }, [fetchExistingSplits]);

  // Recalculate equal shares when total or participants change
  useEffect(() => {
    if (splitType === 'equal' && participants.length > 0) {
      const newShare = participantCount > 1 ? Math.round((numTotal / participantCount) * 100) / 100 : 0;
      setParticipants(prev => prev.map(p => ({ ...p, amount: newShare })));
    }
  }, [numTotal, participants.length, splitType]);

  const handleAddFromSearch = (recipient: SearchRecipient) => {
    if (participants.some(p => p.id === recipient.id || p.phone === recipient.phone)) {
      platformAlertSimple('Duplicate', 'This person is already added.');
      return;
    }
    if (participants.length >= 10) {
      platformAlertSimple('Limit Reached', 'Maximum 10 participants allowed.');
      return;
    }
    const amount = splitType === 'equal' ? equalShare : 0;
    setParticipants(prev => [...prev, {
      id: recipient.id,
      phone: recipient.phone,
      name: recipient.name,
      avatar: recipient.avatar,
      amount,
    }]);
    setSearchQuery('');
  };

  const handleAddManualParticipant = () => {
    const phone = phoneInput.trim();
    if (!phone) {
      platformAlertSimple('Missing Phone', 'Please enter a phone number.');
      return;
    }
    if (participants.some(p => p.phone === phone)) {
      platformAlertSimple('Duplicate', 'This phone number is already added.');
      return;
    }
    if (participants.length >= 10) {
      platformAlertSimple('Limit Reached', 'Maximum 10 participants allowed.');
      return;
    }
    const amount = splitType === 'equal' ? equalShare : 0;
    setParticipants(prev => [...prev, { phone, name: nameInput.trim() || undefined, amount }]);
    setPhoneInput('');
    setNameInput('');
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(prev => prev.filter((_, i) => i !== index));
  };

  const handleCustomAmountChange = (index: number, value: string) => {
    const num = Number(value.replace(/[^0-9.]/g, '')) || 0;
    setParticipants(prev => prev.map((p, i) => i === index ? { ...p, amount: num } : p));
  };

  const customTotal = participants.reduce((sum, p) => sum + p.amount, 0);
  const initiatorShare = splitType === 'equal' ? equalShare : Math.max(0, numTotal - customTotal);
  const canProceedFromFriends = participants.length >= 1;
  const canProceedFromSplit = splitType === 'equal' ? true : (customTotal > 0 && customTotal <= numTotal);

  const handleSendSplitRequest = () => {
    if (submittingRef.current) return;
    platformAlertConfirm(
      'Send Split Request',
      `Split ${BRAND.CURRENCY_CODE} ${numTotal.toLocaleString()} among ${participantCount} people?`,
      () => executeSplit(),
      'Send',
      'Cancel',
    );
  };

  const executeSplit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const participantData = participants.map(p => ({
        userId: p.id,
        phone: p.phone,
        name: p.name,
        share: splitType === 'equal' ? undefined : p.amount,
      }));

      const res = await walletApi.createBillSplit({
        totalAmount: numTotal,
        splitType,
        participants: participantData.map(pd => ({
          phone: pd.phone,
          name: pd.name,
          amount: pd.share,
        })),
        note: note.trim() || undefined,
        idempotencyKey,
      });

      if (!isMounted()) return;
      if (res.success && res.data) {
        const splitData = (res.data as any).billSplit || res.data;
        setBillSplitData(splitData);
        setIdempotencyKey(generateIdempotencyKey('billsplit'));
        setStep('status');
        fetchExistingSplits(); // Refresh list
      } else {
        platformAlertSimple('Failed', res.message || 'Failed to create bill split.');
        setIdempotencyKey(generateIdempotencyKey('billsplit'));
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setIdempotencyKey(generateIdempotencyKey('billsplit'));
      handleWalletError(error, 'Bill Split Failed');
    } finally {
      if (isMounted()) setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleShareReminder = async () => {
    try {
      await Share.share({
        message: `Hey! You owe ${BRAND.CURRENCY_CODE} ${equalShare.toLocaleString()} for our bill split${note ? ` ("${note}")` : ''}. Please pay via ${BRAND.APP_NAME}!`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleDone = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleBack = () => {
    switch (step) {
      case 'friends': setStep('amount'); break;
      case 'split': setStep('friends'); break;
      case 'review': setStep('split'); break;
      case 'status': handleDone(); break;
      default: router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  };

  const getHeaderTitle = () => {
    switch (step) {
      case 'amount': return 'Split Bill';
      case 'friends': return 'Add Friends';
      case 'split': return 'Split Method';
      case 'review': return 'Review & Send';
      case 'status': return 'Split Status';
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

  const getSplitStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.success;
      case 'cancelled': return Colors.error;
      default: return Colors.warning;
    }
  };

  // ── Step 1: Amount ──
  const renderAmountStep = () => (
    <>
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Total Bill Amount</ThemedText>
        <View style={styles.amountInputContainer}>
          <ThemedText style={styles.currencySymbol}>{BRAND.CURRENCY_CODE}</ThemedText>
          <TextInput
            style={styles.amountInput}
            value={totalAmount}
            onChangeText={text => setTotalAmount(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.text.tertiary}
            autoFocus
          />
        </View>
      </View>

      <View style={styles.quickAmounts}>
        {QUICK_AMOUNTS.map(amt => (
          <Pressable
            key={amt}
            style={[
              styles.quickAmountButton,
              totalAmount === amt.toString() && styles.quickAmountButtonSelected,
            ]}
            onPress={() => setTotalAmount(amt.toString())}
          >
            <ThemedText style={[
              styles.quickAmountText,
              totalAmount === amt.toString() && styles.quickAmountTextSelected,
            ]}>
              {amt.toLocaleString()}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.primaryButton, numTotal <= 0 && styles.buttonDisabled]}
        onPress={() => numTotal > 0 && setStep('friends')}
        disabled={numTotal <= 0}
      >
        <ThemedText style={styles.primaryButtonText}>Next</ThemedText>
        <Ionicons name="arrow-forward" size={18} color={Colors.text.inverse} />
      </Pressable>

      {/* Existing Splits */}
      {existingSplits.length > 0 && (
        <View style={[styles.section, { marginTop: Spacing.lg }]}>
          <ThemedText style={styles.sectionTitle}>Recent Splits</ThemedText>
          {splitsLoading ? (
            <ActivityIndicator color={Colors.primary[600]} style={{ marginVertical: Spacing.lg }} />
          ) : (
            existingSplits.map(split => (
              <View key={split._id} style={styles.existingSplitCard}>
                <View style={styles.existingSplitTop}>
                  <View style={styles.existingSplitInfo}>
                    <ThemedText style={styles.existingSplitAmount}>
                      {BRAND.CURRENCY_CODE} {split.totalAmount?.toLocaleString() || '0'}
                    </ThemedText>
                    <ThemedText style={styles.existingSplitMeta}>
                      {split.participants?.length || 0} people
                      {split.note ? ` - ${split.note}` : ''}
                    </ThemedText>
                  </View>
                  <View style={styles.existingSplitRight}>
                    <View style={[styles.splitStatusBadge, { backgroundColor: getSplitStatusColor(split.status) + '20' }]}>
                      <ThemedText style={[styles.splitStatusText, { color: getSplitStatusColor(split.status) }]}>
                        {split.status === 'completed' ? 'Done' : split.status === 'cancelled' ? 'Cancelled' : 'Active'}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.existingSplitDate}>
                      {formatDate(split.createdAt)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))
          )}
          {splitsHasMore && (
            <Pressable
              style={styles.loadMoreButton}
              onPress={() => fetchExistingSplits(splitsPage + 1, true)}
              disabled={splitsLoadingMore}
            >
              {splitsLoadingMore ? (
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

  // ── Step 2: Add Friends (with search) ──
  const renderFriendsStep = () => (
    <>
      <View style={styles.totalBadge}>
        <ThemedText style={styles.totalBadgeText}>
          Total: {BRAND.CURRENCY_CODE} {numTotal.toLocaleString()}
        </ThemedText>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends by name or phone"
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

      {/* Search Results */}
      {searchLoading ? (
        <ActivityIndicator color={Colors.primary[600]} style={{ marginVertical: Spacing.md }} />
      ) : searchResults.length > 0 ? (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {searchQuery ? 'Results' : 'Recent'}
          </ThemedText>
          {searchResults
            .filter(r => !participants.some(p => p.phone === r.phone || p.id === r.id))
            .slice(0, 5)
            .map(recipient => (
              <Pressable
                key={recipient.id}
                style={styles.searchResultCard}
                onPress={() => handleAddFromSearch(recipient)}
              >
                {recipient.avatar ? (
                  <CachedImage source={{ uri: recipient.avatar }} style={styles.searchAvatarImage} />
                ) : (
                  <View style={styles.participantAvatar}>
                    <ThemedText style={styles.avatarText}>
                      {(recipient.name || '?').charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.searchResultInfo}>
                  <ThemedText style={styles.searchResultName}>{recipient.name}</ThemedText>
                  {recipient.phone ? (
                    <ThemedText style={styles.participantPhone}>{recipient.phone}</ThemedText>
                  ) : null}
                </View>
                <Ionicons name="add-circle" size={24} color={Colors.nileBlue} />
              </Pressable>
            ))}
        </View>
      ) : searchQuery.length >= 2 ? (
        <View style={styles.emptySearch}>
          <ThemedText style={styles.emptySearchText}>No users found</ThemedText>
        </View>
      ) : null}

      {/* Manual add toggle */}
      <Pressable
        style={styles.manualAddToggle}
        onPress={() => setShowManualInput(!showManualInput)}
      >
        <Ionicons name={showManualInput ? 'chevron-up' : 'add'} size={18} color={Colors.nileBlue} />
        <ThemedText style={styles.manualAddText}>
          {showManualInput ? 'Hide manual input' : 'Add by phone number'}
        </ThemedText>
      </Pressable>

      {showManualInput && (
        <View style={styles.section}>
          <View style={styles.addFriendRow}>
            <View style={styles.addFriendInputs}>
              <TextInput
                style={styles.friendInput}
                value={phoneInput}
                onChangeText={setPhoneInput}
                placeholder="Phone number"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[styles.friendInput, { marginTop: 8 }]}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Name (optional)"
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>
            <Pressable style={styles.addButton} onPress={handleAddManualParticipant}>
              <Ionicons name="add" size={22} color={Colors.text.inverse} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Added Participants */}
      {participants.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Added ({participants.length})
          </ThemedText>
          {participants.map((p, idx) => (
            <View key={idx} style={styles.participantCard}>
              {p.avatar ? (
                <CachedImage source={{ uri: p.avatar }} style={styles.searchAvatarImage} />
              ) : (
                <View style={styles.participantAvatar}>
                  <ThemedText style={styles.avatarText}>
                    {(p.name || p.phone).charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <View style={styles.participantInfo}>
                {p.name ? (
                  <ThemedText style={styles.participantName}>{p.name}</ThemedText>
                ) : null}
                <ThemedText style={styles.participantPhone}>{p.phone}</ThemedText>
              </View>
              <Pressable style={styles.removeButton} onPress={() => handleRemoveParticipant(idx)}>
                <Ionicons name="close-circle" size={22} color={Colors.error} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={[styles.primaryButton, !canProceedFromFriends && styles.buttonDisabled]}
        onPress={() => canProceedFromFriends && setStep('split')}
        disabled={!canProceedFromFriends}
      >
        <ThemedText style={styles.primaryButtonText}>Next</ThemedText>
        <Ionicons name="arrow-forward" size={18} color={Colors.text.inverse} />
      </Pressable>
    </>
  );

  // ── Step 3: Split Method ──
  const renderSplitStep = () => (
    <>
      <View style={styles.totalBadge}>
        <ThemedText style={styles.totalBadgeText}>
          Total: {BRAND.CURRENCY_CODE} {numTotal.toLocaleString()}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Split Type</ThemedText>
        <View style={styles.splitTypeRow}>
          <Pressable
            style={[styles.splitTypeButton, splitType === 'equal' && styles.splitTypeActive]}
            onPress={() => setSplitType('equal')}
          >
            <Ionicons
              name="git-compare"
              size={20}
              color={splitType === 'equal' ? Colors.text.inverse : Colors.nileBlue}
            />
            <ThemedText style={[
              styles.splitTypeText,
              splitType === 'equal' && styles.splitTypeTextActive,
            ]}>
              Equal Split
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.splitTypeButton, splitType === 'custom' && styles.splitTypeActive]}
            onPress={() => setSplitType('custom')}
          >
            <Ionicons
              name="options"
              size={20}
              color={splitType === 'custom' ? Colors.text.inverse : Colors.nileBlue}
            />
            <ThemedText style={[
              styles.splitTypeText,
              splitType === 'custom' && styles.splitTypeTextActive,
            ]}>
              Custom Split
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Breakdown</ThemedText>

        {/* Initiator's share */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.participantAvatar, { backgroundColor: Colors.nileBlue + '20' }]}>
              <Ionicons name="person" size={16} color={Colors.nileBlue} />
            </View>
            <ThemedText style={styles.breakdownName}>You (Initiator)</ThemedText>
          </View>
          <ThemedText style={styles.breakdownAmount}>
            {BRAND.CURRENCY_CODE} {initiatorShare.toLocaleString()}
          </ThemedText>
        </View>

        {/* Participants */}
        {participants.map((p, idx) => (
          <View key={idx} style={styles.breakdownCard}>
            <View style={styles.breakdownLeft}>
              {p.avatar ? (
                <CachedImage source={{ uri: p.avatar }} style={styles.searchAvatarImage} />
              ) : (
                <View style={styles.participantAvatar}>
                  <ThemedText style={styles.avatarText}>
                    {(p.name || p.phone).charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <ThemedText style={styles.breakdownName} numberOfLines={1}>
                {p.name || p.phone}
              </ThemedText>
            </View>
            {splitType === 'custom' ? (
              <View style={styles.customAmountInput}>
                <ThemedText style={styles.customCurrency}>{BRAND.CURRENCY_CODE}</ThemedText>
                <TextInput
                  style={styles.customInput}
                  value={p.amount > 0 ? String(p.amount) : ''}
                  onChangeText={v => handleCustomAmountChange(idx, v)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>
            ) : (
              <ThemedText style={styles.breakdownAmount}>
                {BRAND.CURRENCY_CODE} {equalShare.toLocaleString()}
              </ThemedText>
            )}
          </View>
        ))}

        {splitType === 'custom' && (
          <View style={[
            styles.totalSummaryRow,
            customTotal > numTotal && styles.totalSummaryError,
          ]}>
            <ThemedText style={styles.totalSummaryLabel}>Participant Total</ThemedText>
            <ThemedText style={[
              styles.totalSummaryValue,
              customTotal > numTotal && { color: Colors.error },
            ]}>
              {BRAND.CURRENCY_CODE} {customTotal.toLocaleString()} / {numTotal.toLocaleString()}
            </ThemedText>
          </View>
        )}
      </View>

      <Pressable
        style={[styles.primaryButton, !canProceedFromSplit && styles.buttonDisabled]}
        onPress={() => canProceedFromSplit && setStep('review')}
        disabled={!canProceedFromSplit}
      >
        <ThemedText style={styles.primaryButtonText}>Review</ThemedText>
        <Ionicons name="arrow-forward" size={18} color={Colors.text.inverse} />
      </Pressable>
    </>
  );

  // ── Step 4: Review & Send ──
  const renderReviewStep = () => (
    <>
      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <ThemedText style={styles.reviewLabel}>Total Amount</ThemedText>
          <ThemedText style={styles.reviewValue}>
            {BRAND.CURRENCY_CODE} {numTotal.toLocaleString()}
          </ThemedText>
        </View>
        <View style={styles.divider} />
        <View style={styles.reviewRow}>
          <ThemedText style={styles.reviewLabel}>Split Type</ThemedText>
          <ThemedText style={styles.reviewValue}>
            {splitType === 'equal' ? 'Equal' : 'Custom'}
          </ThemedText>
        </View>
        <View style={styles.divider} />
        <View style={styles.reviewRow}>
          <ThemedText style={styles.reviewLabel}>Your Share</ThemedText>
          <ThemedText style={styles.reviewValue}>
            {BRAND.CURRENCY_CODE} {initiatorShare.toLocaleString()}
          </ThemedText>
        </View>
        <View style={styles.divider} />
        <View style={styles.reviewRow}>
          <ThemedText style={styles.reviewLabel}>Participants</ThemedText>
          <ThemedText style={styles.reviewValue}>{participants.length}</ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Split Breakdown</ThemedText>
        {participants.map((p, idx) => (
          <View key={idx} style={styles.breakdownCard}>
            <View style={styles.breakdownLeft}>
              {p.avatar ? (
                <CachedImage source={{ uri: p.avatar }} style={styles.searchAvatarImage} />
              ) : (
                <View style={styles.participantAvatar}>
                  <ThemedText style={styles.avatarText}>
                    {(p.name || p.phone).charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <View>
                {p.name ? (
                  <ThemedText style={styles.breakdownName}>{p.name}</ThemedText>
                ) : null}
                <ThemedText style={styles.participantPhone}>{p.phone}</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.breakdownAmount}>
              {BRAND.CURRENCY_CODE} {p.amount.toLocaleString()}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Note (optional)</ThemedText>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Dinner at Mario's, group outing, etc."
          placeholderTextColor={Colors.text.tertiary}
          multiline
        />
      </View>

      <Pressable
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSendSplitRequest}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.text.inverse} />
        ) : (
          <>
            <Ionicons name="paper-plane" size={18} color={Colors.text.inverse} />
            <ThemedText style={styles.primaryButtonText}>Send Split Request</ThemedText>
          </>
        )}
      </Pressable>
    </>
  );

  // ── Step 5: Status ──
  const renderStatusStep = () => {
    const splitParticipants = billSplitData?.participants || [];
    const paidCount = splitParticipants.filter((p: any) => p.status === 'paid').length;
    const totalParticipants = splitParticipants.length;

    return (
      <>
        <View style={styles.statusHeader}>
          <View style={styles.statusIconContainer}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          </View>
          <ThemedText style={styles.statusTitle}>Split Request Sent!</ThemedText>
          <ThemedText style={styles.statusSubtitle}>
            {BRAND.CURRENCY_CODE} {numTotal.toLocaleString()} split among {participantCount} people
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Payment Status ({paidCount}/{totalParticipants} paid)
          </ThemedText>
          {splitParticipants.map((p: any, idx: number) => (
            <View key={idx} style={styles.statusCard}>
              <View style={styles.breakdownLeft}>
                <View style={[
                  styles.statusDot,
                  p.status === 'paid' && styles.statusDotPaid,
                  p.status === 'declined' && styles.statusDotDeclined,
                ]} />
                <View>
                  {p.name ? (
                    <ThemedText style={styles.breakdownName}>{p.name}</ThemedText>
                  ) : null}
                  <ThemedText style={styles.participantPhone}>{p.phone}</ThemedText>
                </View>
              </View>
              <View style={styles.statusRight}>
                <ThemedText style={styles.breakdownAmount}>
                  {BRAND.CURRENCY_CODE} {p.amount?.toLocaleString() || '0'}
                </ThemedText>
                <View style={[
                  styles.splitStatusBadge,
                  p.status === 'paid' && { backgroundColor: Colors.success + '20' },
                  p.status === 'declined' && { backgroundColor: Colors.error + '20' },
                  (!p.status || p.status === 'pending') && { backgroundColor: Colors.warning + '20' },
                ]}>
                  <ThemedText style={[
                    styles.splitStatusText,
                    p.status === 'paid' && { color: Colors.success },
                    p.status === 'declined' && { color: Colors.error },
                    (!p.status || p.status === 'pending') && { color: Colors.warning },
                  ]}>
                    {p.status === 'paid' ? 'Paid' : p.status === 'declined' ? 'Declined' : 'Pending'}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>

        <Pressable style={styles.shareReminderButton} onPress={handleShareReminder}>
          <Ionicons name="share-outline" size={18} color={Colors.nileBlue} />
          <ThemedText style={styles.shareReminderText}>Send Reminder</ThemedText>
        </Pressable>

        <Pressable style={styles.primaryButton} onPress={handleDone}>
          <ThemedText style={styles.primaryButtonText}>Done</ThemedText>
        </Pressable>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      <LinearGradient colors={Gradients.nileBlue} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>{getHeaderTitle()}</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {step !== 'status' && (
          <View style={styles.stepIndicator}>
            {(['amount', 'friends', 'split', 'review'] as Step[]).map((s, idx) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  (['amount', 'friends', 'split', 'review'] as Step[]).indexOf(step) >= idx && styles.stepDotActive,
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
        >
          {step === 'amount' && renderAmountStep()}
          {step === 'friends' && renderFriendsStep()}
          {step === 'split' && renderSplitStep()}
          {step === 'review' && renderReviewStep()}
          {step === 'status' && renderStatusStep()}
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
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  searchAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  emptySearchText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },

  // Manual add
  manualAddToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  manualAddText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },

  // Amount step
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
    marginBottom: Spacing.lg,
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

  // Total badge
  totalBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.nileBlue + '15',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  totalBadgeText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
  },

  // Add friend manual
  addFriendRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  addFriendInputs: {
    flex: 1,
  },
  friendInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: Colors.text.primary,
    ...Shadows.subtle,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },

  // Participant cards
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  participantPhone: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  removeButton: {
    padding: 4,
  },

  // Split type
  splitTypeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  splitTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: Colors.nileBlue + '30',
    ...Shadows.subtle,
  },
  splitTypeActive: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
  },
  splitTypeText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  splitTypeTextActive: {
    color: Colors.text.inverse,
  },

  // Breakdown
  breakdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  breakdownName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  breakdownAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  customAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 100,
  },
  customCurrency: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginRight: 4,
  },
  customInput: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    minWidth: 50,
    textAlign: 'right',
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingHorizontal: 4,
  },
  totalSummaryError: {},
  totalSummaryLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  totalSummaryValue: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
  },

  // Review
  reviewCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  reviewLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  reviewValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray[100],
  },
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

  // Status
  statusHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statusIconContainer: {
    marginBottom: Spacing.base,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  statusSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.warning,
  },
  statusDotPaid: {
    backgroundColor: Colors.success,
  },
  statusDotDeclined: {
    backgroundColor: Colors.error,
  },
  statusRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  shareReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondary[50],
    marginBottom: Spacing.base,
    alignSelf: 'center',
  },
  shareReminderText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },

  // Existing splits
  existingSplitCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  existingSplitTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  existingSplitInfo: {
    flex: 1,
  },
  existingSplitAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  existingSplitMeta: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  existingSplitRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  existingSplitDate: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  splitStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  splitStatusText: {
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

export default withErrorBoundary(BillSplitPage, 'BillSplit');
