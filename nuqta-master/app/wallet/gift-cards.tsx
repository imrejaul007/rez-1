// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Gift Cards Page
// Buy and manage gift cards

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
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useGetCurrencySymbol } from '@/stores/selectors';
import walletApi from '@/services/walletApi';
import * as Clipboard from 'expo-clipboard';
import { platformAlert, platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { generateIdempotencyKey } from '@/utils/idempotencyKey';
import { handleWalletError } from '@/utils/walletErrorHandler';
import { CardGridSkeleton } from '@/components/skeletons';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface GiftCard {
  _id: string;
  name: string;
  logo?: string;
  color: string;
  cashbackPercentage: number;
  denominations: number[];
  category: string;
  description?: string;
}

interface MyGiftCard {
  _id: string;
  giftCard: {
    name: string;
    logo?: string;
    color?: string;
    category?: string;
  };
  amount: number;
  balance: number;
  code: string;
  expiresAt: string;
  status: 'active' | 'partially_used' | 'fully_used' | 'expired';
}

const DEFAULT_CATEGORIES = ['All'];

function GiftCardsPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [activeTab, setActiveTab] = useState<'buy' | 'my'>('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey('gift-card'));
  const submittingRef = useRef(false);

  // API-driven state
  const [catalogCards, setCatalogCards] = useState<GiftCard[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [myGiftCards, setMyGiftCards] = useState<MyGiftCard[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [myCardsLoading, setMyCardsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setError(null);
    try {
      const params: { category?: string; search?: string } = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const response = await walletApi.getGiftCardCatalog(params);
      const data = response?.data;
      if (mountedRef.current) {
        setCatalogCards(data?.giftCards ?? []);
        if (data?.categories?.length) {
          setCategories(['All', ...data.categories]);
        }
      }
    } catch (err: any) {
      if (mountedRef.current) setError('Failed to load gift cards. Pull down to retry.');
    } finally {
      if (mountedRef.current) setCatalogLoading(false);
    }
  }, [selectedCategory, debouncedSearch]);

  const fetchMyGiftCards = useCallback(async () => {
    setMyCardsLoading(true);
    try {
      const response = await walletApi.getMyGiftCards();
      if (mountedRef.current) setMyGiftCards(response?.data?.giftCards ?? []);
    } catch (err: any) {
      if (mountedRef.current) setMyGiftCards([]);
    } finally {
      if (mountedRef.current) setMyCardsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    if (activeTab === 'my') {
      fetchMyGiftCards();
    }
  }, [activeTab, fetchMyGiftCards]);

  const filteredCards = catalogCards;

  const handleBuyGiftCard = async () => {
    if (!selectedCard || !amount) return;
    if (submittingRef.current) return;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || !selectedCard.denominations.includes(numAmount)) return;

    const confirmed = await platformAlertConfirm(
      'Confirm Purchase',
      `Buy ${selectedCard.name} gift card for ${currencySymbol}${numAmount} ${BRAND.CURRENCY_CODE}?`
    );
    if (!confirmed) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      await walletApi.purchaseGiftCard({
        giftCardId: selectedCard._id,
        amount: numAmount,
        idempotencyKey,
      });
      if (mountedRef.current) {
        setIdempotencyKey(generateIdempotencyKey('gift-card'));
        platformAlert('Success', 'Gift card purchased successfully!');
        setSelectedCard(null);
        setAmount('');
        setActiveTab('my');
      }
    } catch (err: any) {
      if (mountedRef.current) handleWalletError(err, 'Purchase Failed');
    } finally {
      if (mountedRef.current) setLoading(false);
      submittingRef.current = false;
    }
  };

  const renderGiftCard = useCallback(({ item }: { item: GiftCard }) => {
    const denoms = item.denominations || [];
    const minD = denoms.length > 0 ? Math.min(...denoms) : 0;
    const maxD = denoms.length > 0 ? Math.max(...denoms) : 0;
    return (
      <Pressable
        style={styles.giftCard}
        onPress={() => setSelectedCard(item)}
      >
        <View style={[styles.giftCardLogo, item.color ? { backgroundColor: item.color + '15' } : undefined]}>
          <ThemedText style={styles.giftCardEmoji}>{item.logo || '🎁'}</ThemedText>
        </View>
        <View style={styles.giftCardInfo}>
          <ThemedText style={styles.giftCardBrand}>{item.name}</ThemedText>
          {item.cashbackPercentage > 0 && (
            <ThemedText style={styles.giftCardCashback}>
              Get {item.cashbackPercentage}% cashback
            </ThemedText>
          )}
          <ThemedText style={styles.giftCardRange}>
            {minD === maxD ? `${currencySymbol}${minD}` : `${currencySymbol}${minD} - ${currencySymbol}${maxD}`}
          </ThemedText>
        </View>
        <View style={styles.buyButton}>
          <ThemedText style={styles.buyButtonText}>Buy</ThemedText>
        </View>
      </Pressable>
    );
  }, [currencySymbol]);

  const renderMyGiftCard = useCallback(({ item }: { item: MyGiftCard }) => {
    const isUsed = item.status === 'fully_used' || item.status === 'expired';
    const brandName = item.giftCard?.name || 'Gift Card';
    const statusLabel = item.status === 'partially_used' ? 'Partial' : item.status === 'fully_used' ? 'Used' : item.status === 'expired' ? 'Expired' : '';
    return (
      <View style={[styles.myGiftCard, isUsed && styles.myGiftCardUsed]}>
        <View style={styles.myGiftCardHeader}>
          <ThemedText style={styles.myGiftCardBrand}>{brandName}</ThemedText>
          {statusLabel ? (
            <View style={styles.usedBadge}>
              <ThemedText style={styles.usedBadgeText}>{statusLabel}</ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText style={styles.myGiftCardAmount}>
          {currencySymbol}{item.balance ?? item.amount}
          {item.balance < item.amount && (
            <ThemedText style={styles.myGiftCardOriginal}> / {currencySymbol}{item.amount}</ThemedText>
          )}
        </ThemedText>
        <View style={styles.myGiftCardCode}>
          <ThemedText style={styles.codeText}>{item.code}</ThemedText>
          {!isUsed && (
            <Pressable
              style={styles.copyButton}
              onPress={async () => {
                try {
                  const response = await walletApi.revealGiftCardCode(item._id);
                  if ((response as any)?.requiresReAuth) {
                    platformAlertSimple('Verification Required', 'Please verify your identity via OTP to reveal the gift card code.');
                    return;
                  }
                  const fullCode = response?.data?.code || item.code;
                  await Clipboard.setStringAsync(fullCode);
                  platformAlertSimple('Copied', 'Gift card code copied to clipboard');
                } catch (err: any) {
                  if (err?.requiresReAuth || err?.response?.data?.requiresReAuth) {
                    platformAlertSimple('Verification Required', 'Please verify your identity via OTP to reveal the gift card code.');
                    return;
                  }
                  await Clipboard.setStringAsync(item.code);
                  platformAlertSimple('Copied', 'Masked code copied');
                }
              }}
            >
              <Ionicons name="copy-outline" size={16} color={Colors.primary[600]} />
            </Pressable>
          )}
        </View>
        <ThemedText style={styles.myGiftCardExpiry}>
          Expires: {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'N/A'}
        </ThemedText>
      </View>
    );
  }, [currencySymbol]);

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
          <ThemedText style={styles.headerTitle}>Gift Cards</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 'buy' && styles.tabActive]}
            onPress={() => setActiveTab('buy')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'buy' && styles.tabTextActive]}>
              Buy Gift Cards
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'my' && styles.tabActive]}
            onPress={() => setActiveTab('my')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
              My Gift Cards
            </ThemedText>
          </Pressable>
        </View>
      </LinearGradient>

      {activeTab === 'buy' ? (
        <View style={styles.content}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search brands"
              placeholderTextColor={Colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map(category => (
              <Pressable
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <ThemedText style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}>
                  {category}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          {/* Popular Brands */}
          <ThemedText style={styles.sectionTitle}>Popular Brands</ThemedText>
          {catalogLoading ? (
            <CardGridSkeleton />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={40} color={Colors.text.tertiary} />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <Pressable style={styles.retryButton} onPress={fetchCatalog}>
                <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
              </Pressable>
            </View>
          ) : (
            <FlashList
              data={filteredCards}
              renderItem={renderGiftCard}
              keyExtractor={item => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyText}>No gift cards found</ThemedText>
                </View>
              }
              estimatedItemSize={120}
            />
          )}
        </View>
      ) : (
        <View style={styles.content}>
          {myCardsLoading ? (
            <CardGridSkeleton />
          ) : myGiftCards.length > 0 ? (
            <FlashList
              data={myGiftCards}
              renderItem={renderMyGiftCard}
              keyExtractor={item => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              estimatedItemSize={120}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={64} color={Colors.gray[300]} />
              <ThemedText style={styles.emptyTitle}>No Gift Cards Yet</ThemedText>
              <ThemedText style={styles.emptyText}>
                Buy gift cards to see them here
              </ThemedText>
              <Pressable
                style={styles.emptyButton}
                onPress={() => setActiveTab('buy')}
              >
                <ThemedText style={styles.emptyButtonText}>Browse Gift Cards</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Purchase Modal */}
      {selectedCard && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable
              style={styles.modalClose}
              onPress={() => setSelectedCard(null)}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </Pressable>

            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalEmoji}>{selectedCard.logo || '🎁'}</ThemedText>
              <ThemedText style={styles.modalBrand}>{selectedCard.name}</ThemedText>
              {selectedCard.cashbackPercentage > 0 && (
                <View style={styles.cashbackBadge}>
                  <ThemedText style={styles.cashbackText}>
                    {selectedCard.cashbackPercentage}% Cashback
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.modalBody}>
              <ThemedText style={styles.modalLabel}>Select Amount</ThemedText>
              <View style={styles.denominationGrid}>
                {selectedCard.denominations.map((denom) => (
                  <Pressable
                    key={denom}
                    style={[
                      styles.denominationChip,
                      Number(amount) === denom && styles.denominationChipActive,
                    ]}
                    onPress={() => setAmount(String(denom))}
                  >
                    <ThemedText style={[
                      styles.denominationText,
                      Number(amount) === denom && styles.denominationTextActive,
                    ]}>
                      {currencySymbol}{denom}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {amount && selectedCard.cashbackPercentage > 0 && selectedCard.denominations.includes(Number(amount)) && (
                <View style={styles.cashbackPreview}>
                  <ThemedText style={styles.cashbackPreviewText}>
                    You'll earn {Math.floor(Number(amount) * selectedCard.cashbackPercentage / 100)} {BRAND.CURRENCY_CODE} cashback
                  </ThemedText>
                </View>
              )}
            </View>

            <Pressable
              style={[
                styles.purchaseButton,
                (!amount || !selectedCard.denominations.includes(Number(amount))) && styles.purchaseButtonDisabled,
              ]}
              onPress={handleBuyGiftCard}
              disabled={!amount || !selectedCard.denominations.includes(Number(amount)) || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background.primary} />
              ) : (
                <ThemedText style={styles.purchaseButtonText}>Buy Now</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
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
    paddingBottom: Spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
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
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.background.primary,
  },
  tabText: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.8)',
  },
  tabTextActive: {
    color: Colors.primary[600],
  },
  content: {
    flex: 1,
    padding: Spacing.base,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.subtle,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
  },
  categoriesScroll: {
    marginBottom: Spacing.md,
    marginHorizontal: -Spacing.base,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  categoryChip: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    ...Shadows.subtle,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary[600],
  },
  categoryText: {
    ...Typography.label,
    color: Colors.text.secondary,
  },
  categoryTextActive: {
    color: colors.background.primary,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
  giftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  giftCardLogo: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftCardEmoji: {
    fontSize: 28,
  },
  giftCardInfo: {
    flex: 1,
  },
  giftCardBrand: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  giftCardCashback: {
    ...Typography.bodySmall,
    color: Colors.success,
  },
  giftCardRange: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  buyButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  buyButtonText: {
    ...Typography.labelSmall,
    color: colors.background.primary,
  },
  myGiftCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  myGiftCardUsed: {
    opacity: 0.6,
  },
  myGiftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  myGiftCardBrand: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  usedBadge: {
    backgroundColor: Colors.gray[200],
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  usedBadgeText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  myGiftCardAmount: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  myGiftCardOriginal: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '400',
  },
  myGiftCardCode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  codeText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    padding: Spacing.xs,
  },
  myGiftCardExpiry: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  emptyButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing['3xl'] : Spacing.lg,
  },
  modalClose: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  modalBrand: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  cashbackBadge: {
    backgroundColor: Colors.success + '20',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  cashbackText: {
    ...Typography.labelSmall,
    color: Colors.success,
  },
  modalBody: {
    marginBottom: Spacing.lg,
  },
  modalLabel: {
    ...Typography.label,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  denominationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  denominationChip: {
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  denominationChipActive: {
    backgroundColor: Colors.primary[600] + '15',
    borderColor: Colors.primary[600],
  },
  denominationText: {
    ...Typography.label,
    color: Colors.text.secondary,
  },
  denominationTextActive: {
    color: Colors.primary[600],
    fontWeight: '700',
  },
  cashbackPreview: {
    backgroundColor: Colors.success + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  cashbackPreviewText: {
    ...Typography.label,
    color: Colors.success,
  },
  purchaseButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  purchaseButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
});

export default withErrorBoundary(GiftCardsPage, 'WalletGiftCards');
