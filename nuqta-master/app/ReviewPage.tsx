import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useReviewState } from '@/hooks/useReviewState';
import { CashbackEarning } from '@/types/review.types';
import { useCashbackModal } from '@/hooks/useCashbackModal';
import CashbackModal from '@/components/CashbackModal';
import walletApi from '@/services/walletApi';
import storesApi from '@/services/storesApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

function ReviewPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Get product data from params
  const productId = params.productId as string || '';
  const productTitle = params.productTitle as string || 'Product';
  const productImage = params.productImage as string;
  const productPrice = params.productPrice as string || '0';
  const cashbackPercentage = params.cashbackPercentage as string || '10';
  const productCashbackAmount = params.cashbackAmount as string || '0';
  const storeId = params.storeId as string || '';
  const fromPrive = params.fromPrive as string || '';
  const fromStore = params.fromStore as string || '';
  const reviewBonusCoinsParam = params.reviewBonusCoins as string || '5';

  // Auto-detect store review: explicit flag OR storeId present without productId
  const isStoreReview = fromStore === 'true' || (!!storeId && !productId);

  // Store details — from params or fetched from API
  const [storeName, setStoreName] = useState(params.storeName as string || '');
  const [storeLogo, setStoreLogo] = useState(params.storeLogo as string || '');
  const [loadingStore, setLoadingStore] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // Fetch store details if we have storeId but no store name
  useEffect(() => {
    if (isStoreReview && storeId && !storeName) {
      setLoadingStore(true);
      storesApi.getStoreById(storeId).then((res) => {
        if (mountedRef.current && res.success && res.data) {
          const store = res.data as any;
          setStoreName(store.name || 'Store');
          setStoreLogo(store.logo || '');
        }
      }).catch(() => {}).finally(() => { if (mountedRef.current) setLoadingStore(false); });
    }
  }, [storeId, isStoreReview]);
  const {
    reviewText,
    setReviewText,
    rating,
    setRating,
    isSubmitting,
    submitReview,
  } = useReviewState();

  const {
    isVisible: isModalVisible,
    cashbackAmount,
    showModal,
    hideModal,
  } = useCashbackModal();

  // State for recent cashback from real API
  const [recentCashback, setRecentCashback] = useState<CashbackEarning[]>([]);
  const [loadingCashback, setLoadingCashback] = useState(true);

  // Fetch recent cashback transactions
  useEffect(() => {
    fetchRecentCashback();
  }, []);

  const fetchRecentCashback = async () => {

    setLoadingCashback(true);

    try {
      const response = await walletApi.getTransactions({
        category: 'review_reward',
        type: 'credit',
        page: 1,
        limit: 5,
      });

      if (response.success && response.data?.transactions) {
        // Map wallet transactions to CashbackEarning format
        const cashbackData: CashbackEarning[] = response.data.transactions.map((txn: any) => ({
          id: txn._id || txn.id,
          userId: txn.user?._id || txn.user?.id || txn.userId,
          userName: txn.user?.profile?.name || txn.metadata?.userName || 'User',
          userAvatar: (txn.user?.profile?.avatar && !txn.user.profile.avatar.includes('ui-avatars.com')) ? txn.user.profile.avatar : undefined,
          amount: txn.amount || 0,
          productId: txn.metadata?.productId || '',
          reviewId: txn.metadata?.reviewId || '',
          createdAt: new Date(txn.createdAt),
          status: 'credited' as const,
        }));

        if (mountedRef.current) setRecentCashback(cashbackData);

      } else {
        if (mountedRef.current) setRecentCashback([]);
      }
    } catch (error: any) {
      if (mountedRef.current) setRecentCashback([]);
    } finally {
      if (mountedRef.current) setLoadingCashback(false);
    }
  };

  const handleBackPress = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleSubmitReview = async () => {
    const targetId = isStoreReview ? storeId : productId;
    if (!targetId) {
      platformAlertSimple('Error', isStoreReview ? 'Store information not available' : 'Product information not available');
      return;
    }

    await submitReview(
      targetId,
      (cashbackAmount) => {
        showModal(Number(productCashbackAmount) || Number(reviewBonusCoinsParam) || cashbackAmount);
      },
      (errorMsg) => {
        platformAlertSimple('Error', errorMsg);
      },
    );
  };

  const handleModalClose = () => {
    hideModal();
    if (isStoreReview) {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    } else if (fromPrive === 'true') {
      router.replace('/prive/review-earn');
    } else {
      router.replace('/');
    }
  };

  const renderStarRating = () => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={28}
              color={star <= rating ? colors.brand.goldBright : Colors.border.default}
            />
          </Pressable>
        ))}
      </View>
    );
  };

  const renderRecentCashback = () => {
    return (
      <View style={styles.recentCashbackSection}>
        <ThemedText style={styles.recentCashbackTitle}>
          Recent cashback
        </ThemedText>
        {loadingCashback ? (
          <View style={styles.cashbackLoading}>
            <ActivityIndicator size="small" color={Colors.brand.purpleLight} />
            <Text style={styles.loadingText}>Loading recent rewards...</Text>
          </View>
        ) : recentCashback.length > 0 ? (
          recentCashback.map((item) => (
            <View key={item.id} style={styles.cashbackItem}>
              <CachedImage source={item.userAvatar} style={styles.userAvatar} />
              <View>
                <Text style={styles.userName}>{item.userName} earned</Text>
                <Text style={styles.amountText}>{currencySymbol}{item.amount.toFixed(2)}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noCashback}>
            <Ionicons name="gift-outline" size={32} color={Colors.text.tertiary} />
            <Text style={styles.noCashbackText}>No recent cashback yet</Text>
            <Text style={styles.noCashbackSubtext}>Be the first to earn rewards!</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>
            {isStoreReview ? `Review ${storeName || 'Store'}` : 'Write a Review'}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {/* Product/Store Image */}
        <View style={styles.productImageContainer}>
          {isStoreReview ? (
            <>
              {loadingStore ? (
                <View style={styles.storeIconContainer}>
                  <ActivityIndicator size="small" color={colors.brand.green} />
                </View>
              ) : storeLogo ? (
                <CachedImage
                  source={storeLogo}
                  style={styles.storeLogoImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.storeIconContainer}>
                  <Ionicons name="storefront" size={48} color={colors.brand.green} />
                </View>
              )}
              <Text style={styles.productTitle}>{loadingStore ? 'Loading...' : (storeName || 'Store')}</Text>
            </>
          ) : (
            <>
              <CachedImage
                source={productImage}
                style={styles.productImage}
                contentFit="cover"
              />
              <Text style={styles.productTitle}>{productTitle}</Text>
            </>
          )}
        </View>

        {/* Cashback Section */}
        <View style={styles.cashbackSection}>
          <ThemedText style={styles.cashbackText}>
            {isStoreReview ? (
              <>
                <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 18, height: 18 }} />{' '}
                Earn <Text style={{ fontWeight: '700' }}>{reviewBonusCoinsParam} {BRAND.COIN_NAME}</Text> by
                reviewing {storeName || 'this store'}!
              </>
            ) : fromPrive === 'true' ? (
              <>
                <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 18, height: 18 }} />{' '}
                Earn <Text style={{ fontWeight: '700' }}>{productCashbackAmount} {BRAND.COIN_NAME}</Text> by
                leaving a review!
              </>
            ) : (
              <>
                {'💰 '}Earn <Text style={{ fontWeight: '700' }}>{cashbackPercentage}% cashback</Text> by
                leaving a review for this product!
              </>
            )}
          </ThemedText>

          {/* Review Card */}
          <View style={styles.reviewCard}>
            <ThemedText style={styles.reviewCardTitle}>
              Share your thoughts
            </ThemedText>

            {/* Star Rating */}
            {renderStarRating()}

            {/* Review Input */}
            <View style={styles.reviewInputContainer}>
              <Ionicons
                name="create-outline"
                size={20}
                color={colors.brand.purpleDeep}
                style={styles.writeIcon}
              />
            <TextInput
  style={{
    flex: 1,
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 20,
    outlineStyle: 'none', // Web only
  } as any}
  placeholder="Write your experience here..."
  placeholderTextColor={colors.neutral[400]}
  multiline
  numberOfLines={3}
  value={reviewText}
  onChangeText={setReviewText}
  textAlignVertical="top"
  underlineColorAndroid="transparent"
/>

            </View>

            {/* Submit Button */}
            <Pressable
              style={[
                styles.submitButton,
                (!reviewText.trim() || isSubmitting) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitReview}
              disabled={!reviewText.trim() || isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting
                  ? 'Submitting...'
                  : isStoreReview
                    ? `Submit for ${reviewBonusCoinsParam} ${BRAND.COIN_NAME}`
                    : fromPrive === 'true'
                      ? `Submit for ${productCashbackAmount} ${BRAND.COIN_NAME}`
                      : `Submit & get ${cashbackPercentage}% cashback`}
              </Text>
            </Pressable>
            {(isStoreReview || fromPrive === 'true') && (
              <Text style={{ ...Typography.bodySmall, color: Colors.text.tertiary, textAlign: 'center', marginTop: Spacing.sm }}>
                Coins awarded after merchant approval
              </Text>
            )}
          </View>
        </View>

        {/* Recent Cashback */}
        {renderRecentCashback()}
      </ScrollView>

      {/* Cashback Celebration Modal */}
      <CashbackModal
        visible={isModalVisible}
        onClose={handleModalClose}
        cashbackAmount={cashbackAmount}
      />
    </ThemedView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background.secondary,
  },
  backButton: {
    padding: Spacing.sm,
    borderRadius: 50,
    backgroundColor: Colors.background.secondary,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  productImageContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  productImage: {
    width: 180,
    height: 220,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: Spacing.md,
  },
  storeLogoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: Colors.border.default,
  },
  storeIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.successScale[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: colors.successScale[200],
  },
  productTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  cashbackSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  cashbackText: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  reviewCard: {
    backgroundColor: colors.tint.purpleLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: Colors.brand.purpleLight,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  reviewCardTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: 6,
  },
  starButton: {
    padding: 6,
  },
  reviewInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    minHeight: 90,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  writeIcon: {
    marginRight: Spacing.md,
    marginTop: Spacing.xs,
  },
  reviewInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 20,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}), // Web: removes focus outline
  },
  submitButton: {
    backgroundColor: Colors.brand.purpleLight,
    borderRadius: 30,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    shadowColor: Colors.brand.purpleLight,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.border.default,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  recentCashbackSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  recentCashbackTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  cashbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
  },
  userName: {
    ...Typography.body,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  amountText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  cashbackLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    marginLeft: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  noCashback: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noCashbackText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  noCashbackSubtext: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
});

export default withErrorBoundary(ReviewPage, 'ReviewPage');
