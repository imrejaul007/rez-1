// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Lock Deal Detail Page
 *
 * Shows full deal info, price breakdown, reward preview,
 * and "Lock This Deal" CTA that initiates the deposit payment.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import CoinIcon from '@/components/ui/CoinIcon';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import lockDealApi, { LockPriceDeal, UserLockDeal } from '@/services/lockDealApi';
import { DetailPageSkeleton } from '@/components/skeletons';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LockDealDetailPage: React.FC = () => {
  const isMounted = useIsMounted();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deal, setDeal] = useState<LockPriceDeal | null>(null);
  const [userLock, setUserLock] = useState<UserLockDeal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocking, setIsLocking] = useState(false);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (id) fetchDeal();
  }, [id, authLoading, isAuthenticated]);

  const fetchDeal = async () => {
    try {
      setIsLoading(true);
      const response = await lockDealApi.getDealById(id!);
      if (response?.data) {
        if (!isMounted()) return;
        setDeal(response.data.deal);
        if (!isMounted()) return;
        setUserLock(response.data.userLock);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load deal details');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'INR': return '\u20B9';
      case 'AED': return 'AED ';
      case 'USD': return '$';
      default: return '\u20B9';
    }
  };

  const getDaysRemaining = (validUntil: string) => {
    const diff = new Date(validUntil).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleLockDeal = async () => {
    if (!deal) return;

    const currSymbol = getCurrencySymbol(deal.currency);
    const confirmed = await platformAlertConfirm(
      'Lock This Deal?',
      `You'll pay ${currSymbol}${deal.depositAmount} (${deal.depositPercent}%) as deposit.\n\nRemaining ${currSymbol}${deal.balanceAmount} to be paid on pickup.\n\nYou'll earn ${deal.lockReward.amount * deal.earningsMultiplier} coins immediately!`
    );

    if (!confirmed) return;

    try {
      if (!isMounted()) return;
      setIsLocking(true);
      const response = await lockDealApi.initiateLock(deal._id);

      if (response?.data) {
        // Navigate to payment page with clientSecret
        router.push({
          pathname: '/lock-deals/lock-payment' as any,
          params: {
            dealId: deal._id,
            clientSecret: response.data.clientSecret,
            paymentIntentId: response.data.paymentIntentId,
            dealTitle: deal.title,
            depositAmount: deal.depositAmount.toString(),
            currency: deal.currency,
            storeName: deal.storeName,
          },
        });
      }
    } catch (error: any) {
      platformAlertSimple('Error', error?.message || 'Failed to initiate lock. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLocking(false);
    }
  };

  const handleViewMyLock = () => {
    if (userLock) {
      router.push(`/lock-deals/my-locks` as any);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
          </Pressable>
          <Text style={styles.headerTitle}>Deal Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <DetailPageSkeleton />
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
          </Pressable>
          <Text style={styles.headerTitle}>Deal Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.text.tertiary} />
          <Text style={styles.emptyText}>This deal is no longer available.</Text>
        </View>
      </View>
    );
  }

  const currSymbol = getCurrencySymbol(deal.currency);
  const discount = deal.originalPrice > 0
    ? Math.round(((deal.originalPrice - deal.lockedPrice) / deal.originalPrice) * 100)
    : 0;
  const lockReward = deal.lockReward.amount * deal.earningsMultiplier;
  const pickupReward = deal.pickupReward.amount * deal.earningsMultiplier;
  const totalReward = lockReward + pickupReward;
  const daysLeft = getDaysRemaining(deal.validUntil);
  const storeName = typeof deal.store === 'object' ? deal.store.name : deal.storeName;
  const storeAddress = typeof deal.store === 'object' ? deal.store.address : '';
  const isSoldOut = deal.maxLocks > 0 && deal.currentLocks >= deal.maxLocks;
  const isExpired = new Date(deal.validUntil) < new Date();
  const canLock = !isSoldOut && !isExpired && deal.isActive && !userLock;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Deal Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Deal Image */}
        <CachedImage source={deal.image} style={styles.dealImage} contentFit="cover" />

        {/* Badges overlay */}
        <View style={styles.badgesOverlay}>
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
          {deal.earningsMultiplier > 1 && (
            <View style={styles.multiplierBadge}>
              <Ionicons name="flash" size={12} color={Colors.background.primary} />
              <Text style={styles.multiplierText}>{deal.earningsMultiplier}x Earnings</Text>
            </View>
          )}
        </View>

        {/* Deal Title & Store */}
        <View style={styles.titleSection}>
          <Text style={styles.dealTitle}>{deal.title}</Text>
          <View style={styles.storeRow}>
            <Ionicons name="storefront-outline" size={14} color={Colors.text.tertiary} />
            <Text style={styles.storeText}>{storeName}</Text>
          </View>
          {storeAddress ? (
            <View style={styles.storeRow}>
              <Ionicons name="location-outline" size={14} color={Colors.text.tertiary} />
              <Text style={styles.storeText}>{storeAddress}</Text>
            </View>
          ) : null}
          {daysLeft > 0 && daysLeft <= 7 && (
            <View style={styles.urgencyRow}>
              <Ionicons name="time" size={14} color={Colors.error} />
              <Text style={styles.urgencyText}>Only {daysLeft} day{daysLeft !== 1 ? 's' : ''} left!</Text>
            </View>
          )}
        </View>

        {/* Price Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Breakdown</Text>

          <View style={styles.priceMainRow}>
            <View>
              <Text style={styles.priceLabel}>Locked Price</Text>
              <Text style={styles.priceValue}>{currSymbol}{deal.lockedPrice}</Text>
            </View>
            <View style={styles.priceOriginal}>
              <Text style={styles.priceLabel}>Original Price</Text>
              <Text style={styles.priceStrike}>{currSymbol}{deal.originalPrice}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.breakdownLabel}>Deposit ({deal.depositPercent}%)</Text>
            </View>
            <Text style={styles.breakdownValue}>{currSymbol}{deal.depositAmount}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: Colors.info }]} />
              <Text style={styles.breakdownLabel}>Balance on Pickup</Text>
            </View>
            <Text style={styles.breakdownValue}>{currSymbol}{deal.balanceAmount}</Text>
          </View>

          {deal.maxLocks > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Available Slots</Text>
                <Text style={[styles.breakdownValue, isSoldOut && { color: Colors.error }]}>
                  {isSoldOut ? 'Sold Out' : `${deal.maxLocks - deal.currentLocks} / ${deal.maxLocks}`}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Rewards Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Rewards</Text>

          <View style={styles.rewardRow}>
            <View style={[styles.rewardIcon, { backgroundColor: Colors.successScale[50] }]}>
              <Ionicons name="lock-closed" size={16} color={Colors.success} />
            </View>
            <View style={styles.rewardTextContainer}>
              <Text style={styles.rewardTitle}>On Lock (Deposit)</Text>
              <Text style={styles.rewardSubtitle}>Credited instantly when you lock</Text>
            </View>
            <View style={styles.rewardAmount}>
              <CoinIcon size={14} />
              <Text style={styles.rewardCoins}>{lockReward}</Text>
            </View>
          </View>

          <View style={styles.rewardRow}>
            <View style={[styles.rewardIcon, { backgroundColor: Colors.warningScale[50] }]}>
              <Ionicons name="bag-check" size={16} color={Colors.warning} />
            </View>
            <View style={styles.rewardTextContainer}>
              <Text style={styles.rewardTitle}>On Pickup</Text>
              <Text style={styles.rewardSubtitle}>Credited when you collect the item</Text>
            </View>
            <View style={styles.rewardAmount}>
              <CoinIcon size={14} />
              <Text style={styles.rewardCoins}>{pickupReward}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRewardRow}>
            <Text style={styles.totalRewardLabel}>Total Potential Reward</Text>
            <View style={styles.rewardAmount}>
              <CoinIcon size={16} />
              <Text style={styles.totalRewardCoins}>{totalReward}</Text>
            </View>
          </View>

          {deal.earningsMultiplier > 1 && (
            <View style={styles.multiplierNote}>
              <Ionicons name="flash" size={14} color={Colors.warning} />
              <Text style={styles.multiplierNoteText}>
                {deal.earningsMultiplier}x earnings multiplier applied!
                (Base: {deal.lockReward.amount} + {deal.pickupReward.amount} = {deal.lockReward.amount + deal.pickupReward.amount} coins)
              </Text>
            </View>
          )}
        </View>

        {/* How It Works */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How It Works</Text>

          {[
            { step: 1, icon: 'lock-closed' as const, title: 'Lock the Deal', desc: `Pay ${deal.depositPercent}% deposit (${currSymbol}${deal.depositAmount}) to lock the price` },
            { step: 2, icon: 'flash' as const, title: 'Earn Lock Reward', desc: `Get ${lockReward} coins instantly!` },
            { step: 3, icon: 'storefront' as const, title: 'Visit & Pay Balance', desc: `Pay remaining ${currSymbol}${deal.balanceAmount} at the store within ${deal.pickupWindowDays} days` },
            { step: 4, icon: 'gift' as const, title: 'Pickup & Earn More', desc: `Get ${pickupReward} more coins on pickup!` },
          ].map((item, index) => (
            <View key={item.step} style={styles.stepRow}>
              <View style={styles.stepNumberContainer}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{item.step}</Text>
                </View>
                {index < 3 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepContent}>
                <Ionicons name={item.icon} size={16} color={Colors.nileBlue} />
                <View style={styles.stepText}>
                  <Text style={styles.stepTitle}>{item.title}</Text>
                  <Text style={styles.stepDesc}>{item.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Description */}
        {deal.description && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About This Deal</Text>
            <Text style={styles.descriptionText}>{deal.description}</Text>
          </View>
        )}

        {/* Terms */}
        {deal.terms && deal.terms.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Terms & Conditions</Text>
            {deal.terms.map((term, i) => (
              <View key={i} style={styles.termRow}>
                <Text style={styles.termBullet}>•</Text>
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Pickup window info */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.infoText}>
              Pickup within {deal.pickupWindowDays} days after locking
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.infoText}>
              Full deposit refund if you cancel before pickup
            </Text>
          </View>
        </View>

        {/* Bottom spacer for CTA */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.ctaContainer}>
        {userLock ? (
          <Pressable style={styles.viewLockButton} onPress={handleViewMyLock}>
            <Ionicons name="lock-open" size={18} color={Colors.nileBlue} />
            <Text style={styles.viewLockText}>View My Lock</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.lockButton, !canLock && styles.lockButtonDisabled]}
            onPress={handleLockDeal}
            disabled={!canLock || isLocking}
          >
            {isLocking ? (
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color={Colors.text.inverse} />
                <Text style={styles.lockButtonText}>
                  {isSoldOut ? 'Sold Out' : isExpired ? 'Deal Expired' : `Lock for ${currSymbol}${deal.depositAmount}`}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  paddingBottom: 120, },

  // Deal Image
  dealImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.65,
  },
  badgesOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 118 : 78,
    left: 16,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  discountBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  discountText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  multiplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  multiplierText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },

  // Title Section
  titleSection: {
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
  },
  dealTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
    lineHeight: 26,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  storeText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    flex: 1,
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  urgencyText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.error,
  },

  // Cards
  card: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardTitle: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 14,
  },

  // Price Breakdown
  priceMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  priceLabel: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '800',
    color: Colors.nileBlue,
  },
  priceOriginal: {
    alignItems: 'flex-end',
  },
  priceStrike: {
    fontSize: Typography.h4.fontSize,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.default,
    marginVertical: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  breakdownValue: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  // Rewards
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: Spacing.md,
  },
  rewardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTextContainer: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  rewardSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  rewardAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rewardCoins: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.success,
  },
  totalRewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRewardLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  totalRewardCoins: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '800',
    color: Colors.success,
  },
  multiplierNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 10,
    backgroundColor: Colors.warningScale[50],
    borderRadius: BorderRadius.sm,
  },
  multiplierNoteText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.warning,
    flex: 1,
  },

  // How It Works
  stepRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  stepNumberContainer: {
    alignItems: 'center',
    width: 28,
    marginRight: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.nileBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  stepLine: {
    width: 2,
    height: 32,
    backgroundColor: Colors.border.default,
    marginTop: Spacing.xs,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
    paddingBottom: Spacing.base,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  stepDesc: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginTop: 2,
    lineHeight: 18,
  },

  // Description
  descriptionText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    lineHeight: 22,
  },

  // Terms
  termRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingRight: Spacing.sm,
  },
  termBullet: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    marginRight: Spacing.sm,
    lineHeight: 20,
  },
  termText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    flex: 1,
    lineHeight: 20,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 10,
  },
  infoText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    flex: 1,
  },

  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  lockButtonDisabled: {
    backgroundColor: Colors.text.tertiary,
  },
  lockButtonText: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  viewLockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  viewLockText: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
});

export default withErrorBoundary(LockDealDetailPage, 'LockDealsId');
