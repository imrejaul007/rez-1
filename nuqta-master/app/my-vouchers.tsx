// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// My Vouchers Page
// Shows user's owned vouchers and gift cards

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Share,
  Modal,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useNavigation } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import vouchersService from '@/services/realVouchersApi';
import realOffersApi from '@/services/realOffersApi';
import { useAuthUser, useIsAuthenticated, useAuthLoading, useCartState, useCartActions, useGetCurrencySymbol } from '@/stores/selectors';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { HeaderBackButton } from '@/components/navigation/SafeBackButton';
import QRCodeModal from '@/components/vouchers/QRCodeModal';
import OnlineRedemptionModal from '@/components/voucher/OnlineRedemptionModal';
import PartnerVouchersSection from '@/components/voucher/PartnerVouchersSection';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import logger from '@/utils/logger';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type VoucherStatus = 'all' | 'active' | 'used' | 'expired' | 'partner';

interface CouponMetadata {
  source?: string;
  isProductSpecific?: boolean;
  storeName?: string;
  storeId?: string;
  productName?: string | null;
  productId?: string | null;
  productImage?: string | null;
}

interface UserVoucher {
  id: string;
  code: string;
  brandName: string;
  brandLogo?: string;
  value: number;
  description: string;
  expiryDate: string;
  status: 'active' | 'used' | 'expired';
  usedAt?: string;
  category: string;
  restrictions?: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
    usageLimitPerUser?: number;
  };
  metadata?: CouponMetadata;
  // Type to differentiate between gift cards and cashback vouchers
  voucherType: 'gift_card' | 'cashback';
}

const MyVouchersPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const cartState = useCartState();
  const actions = useCartActions();
  const { goBack } = useSafeNavigation();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<VoucherStatus>('active');
  const [selectedVoucher, setSelectedVoucher] = useState<UserVoucher | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleBackPress = useCallback(() => {
    goBack('/account' as any);
  }, [goBack]);

  const fetchVouchers = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        setVouchers([]);
        setLoading(false);
        return;
      }

      const params: any = {
        page: pageNum,
        limit: 20
      };

      if (activeTab !== 'all' && activeTab !== 'partner') {
        params.status = activeTab;
      }

      // Fetch BOTH gift card vouchers AND offer redemptions
      const [vouchersResponse, redemptionsResponse] = await Promise.all([
        vouchersService.getUserVouchers(params).catch(() => ({ data: [] })),
        realOffersApi.getUserRedemptions(params).catch(() => ({ data: [] }))
      ]);

      logger.debug('[MY VOUCHERS] Vouchers response:', vouchersResponse);
      logger.debug('[MY VOUCHERS] Redemptions response:', redemptionsResponse);

      const allVouchers: UserVoucher[] = [];

      // 1. Map gift card vouchers
      const vouchersArray = vouchersResponse.data || [];
      if (vouchersArray.length > 0) {
        const mappedVouchers: UserVoucher[] = vouchersArray.map((voucher: any) => ({
          id: voucher._id || voucher.id,
          code: voucher.voucherCode,
          brandName: voucher.brand?.name || 'Unknown Brand',
          brandLogo: voucher.brand?.logo,
          value: voucher.denomination,
          description: voucher.brand?.description || `${currencySymbol}${voucher.denomination} voucher`,
          expiryDate: voucher.expiryDate,
          status: voucher.status,
          usedAt: voucher.usedAt,
          category: voucher.brand?.category || 'General',
          voucherType: 'gift_card' as const
        }));
        allVouchers.push(...mappedVouchers);
      }

      // 2. Map offer redemptions (cashback vouchers)
      const redemptionsArray = redemptionsResponse.data || [];
      logger.debug('[MY VOUCHERS] Redemptions array:', redemptionsArray);
      
      if (redemptionsArray.length > 0) {
        const mappedRedemptions: UserVoucher[] = redemptionsArray.map((redemption: any) => {
          const offerTitle = redemption.offer?.title || 'Cashback Offer';
          
          // Get cashback info - prefer percentage over fixed amount
          const cashbackPercentage = redemption.cashbackPercentage || 
                                    redemption.offer?.cashbackPercentage || 0;
          
          const usedAmount = redemption.usedAmount;
          
          // If used, show actual amount saved, otherwise show percentage
          let displayValue: number;
          let displayDescription: string;
          
          if (usedAmount) {
            displayValue = usedAmount;
            displayDescription = `Cashback saved - Used on order`;
          } else if (cashbackPercentage) {
            displayValue = cashbackPercentage;
            displayDescription = `Get ${cashbackPercentage}% cashback - Use during checkout`;
          } else {
            displayValue = 0;
            displayDescription = `Cashback voucher - Use during checkout`;
          }
          
          // Map redemption status to voucher status
          let voucherStatus: 'active' | 'used' | 'expired' = 'active';
          if (redemption.status === 'used') voucherStatus = 'used';
          else if (redemption.status === 'expired') voucherStatus = 'expired';
          
          return {
            id: redemption._id || redemption.id,
            code: redemption.redemptionCode,
            brandName: offerTitle,
            brandLogo: redemption.offer?.image,
            value: displayValue,
            description: displayDescription,
            expiryDate: redemption.expiryDate,
            status: voucherStatus,
            usedAt: redemption.usedAt,
            category: usedAmount ? 'Used' : `${cashbackPercentage}% Cashback`,
            restrictions: redemption.restrictions || redemption.offer?.restrictions,
            voucherType: 'cashback' as const
          };
        });
        logger.debug('[MY VOUCHERS] Mapped redemptions:', mappedRedemptions);
        allVouchers.push(...mappedRedemptions);
      }

      logger.debug('[MY VOUCHERS] Total vouchers:', allVouchers.length);
      if (append) {
        if (!isMounted()) return;
        setVouchers(prev => [...prev, ...allVouchers]);
      } else {
        if (!isMounted()) return;
        setVouchers(allVouchers);
      }
      if (!isMounted()) return;
      setPage(pageNum);
      if (!isMounted()) return;
      setHasMore(allVouchers.length >= 20);
    } catch (error) {
      logger.error('Error fetching vouchers:', error);
      if (!isMounted()) return;
      if (!append) setVouchers([]);
      if (!isMounted()) return;
      setHasMore(false);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [activeTab, authLoading, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchVouchers();
    }
  }, [fetchVouchers, authLoading, isAuthenticated]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVouchers(1, false);
  }, [fetchVouchers]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchVouchers(page + 1, true);
    }
  }, [loadingMore, hasMore, loading, page, fetchVouchers]);

  const filteredVouchers = useMemo(() => vouchers.filter((voucher) => {
    if (activeTab === 'all') return true;
    return voucher.status === activeTab;
  }), [vouchers, activeTab]);

  const handleCopyCode = useCallback(async (code: string) => {
    await Clipboard.setStringAsync(code);
    platformAlertSimple('Copied to Clipboard!', `Voucher code "${code}" has been copied to clipboard`);
  }, []);

  const handleApplyVoucher = useCallback(async (voucher: UserVoucher) => {
    // Check if cart has items first
    if (!cartState.items || cartState.items.length === 0) {
      platformAlertConfirm(
        'Cart is Empty',
        'Please add items to your cart before applying this voucher.',
        () => router.push('/(tabs)' as any),
        'Browse Products'
      );
      return;
    }

    try {
      // Validate the voucher code first
      const validationResult = await realOffersApi.validateRedemptionCode(voucher.code);

      if (!validationResult.success || !validationResult.data?.valid) {
        // Provide specific error message based on response
        const errorMessage = validationResult.message || validationResult.data?.message ||
          'This voucher cannot be applied. It may have expired or already been used.';
        platformAlertSimple(
          'Voucher Not Valid',
          errorMessage
        );
        return;
      }

      const { offer, redemption } = validationResult.data;
      const cashbackPercentage = offer?.cashbackPercentage || 0;
      const minOrderValue = offer?.restrictions?.minOrderValue || 0;
      const maxDiscount = offer?.restrictions?.maxDiscountAmount;

      // Calculate estimated cashback based on cart total
      const cartTotal = cartState.items.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      // Check minimum order value
      if (minOrderValue > 0 && cartTotal < minOrderValue) {
        platformAlertConfirm(
          'Minimum Order Required',
          `This voucher requires a minimum order of ${currencySymbol}${minOrderValue}. Your cart total is ${currencySymbol}${cartTotal.toFixed(2)}.`,
          () => router.push('/(tabs)' as any),
          'Continue Shopping'
        );
        return;
      }

      let estimatedCashback = Math.round(cartTotal * (cashbackPercentage / 100));
      if (maxDiscount && estimatedCashback > maxDiscount) {
        estimatedCashback = maxDiscount;
      }

      // Copy voucher code to clipboard
      if (!isMounted()) return;
      await Clipboard.setStringAsync(voucher.code);

      // Show confirmation with cashback details
      platformAlertConfirm(
        'Apply Voucher?',
        `${offer?.title || voucher.brandName}\n\n` +
        `Cashback: ${cashbackPercentage}%\n` +
        `Estimated Cashback: ${currencySymbol}${estimatedCashback}\n` +
        (maxDiscount ? `Max Cashback: ${currencySymbol}${maxDiscount}\n` : '') +
        `\nVoucher code copied to clipboard!`,
        () => router.push({
          pathname: '/cart' as any,
          params: { offerRedemptionCode: voucher.code }
        }),
        'Go to Checkout'
      );
    } catch (error) {
      logger.error('Error validating voucher:', error);
      // Fallback to old behavior - just copy code
      if (!isMounted()) return;
      await Clipboard.setStringAsync(voucher.code);
      platformAlertConfirm(
        'Voucher Code Copied!',
        `Voucher code "${voucher.code}" has been copied. Apply it at checkout.`,
        () => router.push('/cart' as any),
        'Go to Cart'
      );
    }
  }, [cartState.items, currencySymbol, router]);

  const handleShareVoucher = useCallback(async (voucher: UserVoucher) => {
    try {
      const message = `🎁 Check out this amazing voucher!\n\n` +
        `${voucher.brandName} - ${currencySymbol}${voucher.value}\n` +
        `Code: ${voucher.code}\n` +
        `Valid till: ${new Date(voucher.expiryDate).toLocaleDateString()}\n\n` +
        `Download REZ app to get exclusive vouchers and cashback!`;

      await Share.share({
        message,
        title: `${voucher.brandName} Voucher`
      });
    } catch (error) {
      logger.error('Error sharing voucher:', error);
    }
  }, [currencySymbol]);

  const handleUseVoucher = useCallback((voucher: UserVoucher) => {
    setSelectedVoucher(voucher);
    setShowQRModal(true);
  }, []);

  const handleUseOnline = useCallback((voucher: UserVoucher) => {
    // For cashback vouchers (RED-xxx), redirect to apply flow instead
    if (voucher.voucherType === 'cashback') {
      platformAlertConfirm(
        'Cashback Voucher',
        'This is a cashback voucher. To use it:\n\n' +
        '1. Add items to your cart\n' +
        '2. Go to checkout\n' +
        '3. Your cashback will be credited after purchase\n\n' +
        'Would you like to apply it now?',
        () => handleApplyVoucher(voucher),
        'Apply to Cart'
      );
      return;
    }

    // Show online redemption modal for gift cards
    setSelectedVoucher(voucher);
    setShowRedemptionModal(true);
  }, [handleApplyVoucher]);

  const handleMarkAsUsed = async (voucherId: string) => {
    try {
      // Find the voucher to determine its type
      const voucher = vouchers.find(v => v.id === voucherId);

      if (voucher?.voucherType === 'cashback') {
        // For cashback vouchers, use the offer redemption API
        // Note: This should rarely be called since cashback vouchers redirect to checkout
        await realOffersApi.markRedemptionAsUsed(voucherId, {
          orderAmount: 0, // External usage - no order amount tracked
          usageType: 'external'
        });
      } else {
        // For gift cards, use the voucher service API
        await vouchersService.useVoucher(voucherId, {
          usageLocation: 'online'
        });
      }

      // Refresh vouchers list
      await fetchVouchers();
    } catch (error) {
      logger.error('Error marking voucher as used:', error);
      throw error; // Re-throw to let modal handle error display
    }
  };

  const confirmUseVoucher = async () => {
    if (!selectedVoucher) return;

    try {
      await vouchersService.useVoucher(selectedVoucher.id, {});
      platformAlertSimple('Success!', 'Voucher has been redeemed successfully');
      if (!isMounted()) return;
      setShowQRModal(false);
      if (!isMounted()) return;
      setSelectedVoucher(null);
      fetchVouchers(); // Refresh vouchers list
    } catch (error) {
      logger.error('Error marking voucher as used:', error);
      platformAlertSimple('Error', 'Failed to redeem voucher. Please try again.');
    }
  };

  const renderVoucher = useCallback(({ item }: { item: UserVoucher }) => {
    const isExpired = item.status === 'expired';
    const isUsed = item.status === 'used';
    const isActive = item.status === 'active';

    return (
      <Pressable
        style={[styles.voucherCard, isExpired && styles.expiredCard]}

        disabled={!isActive}
      >
        <LinearGradient
          colors={isActive ? [Colors.warning, colors.brand.orange] : [Colors.border.default, Colors.text.tertiary]}
          style={styles.voucherGradient}
        >
          {/* Brand Section */}
          <View style={styles.brandSection}>
            {item.brandLogo && (item.brandLogo.startsWith('http://') || item.brandLogo.startsWith('https://')) ? (
              <CachedImage source={item.brandLogo} style={styles.brandLogo} />
            ) : (
              <View style={styles.brandLogoPlaceholder}>
                <Ionicons name="ticket" size={24} color={Colors.text.inverse} />
              </View>
            )}
            <View style={styles.brandInfo}>
              <Text style={styles.brandName}>{item.brandName}</Text>
              <Text style={styles.category}>{item.category}</Text>
            </View>
          </View>

          {/* Value Section */}
          <View style={styles.valueSection}>
            <Text style={styles.valueAmount}>
              {item.category?.includes('Cashback') && !item.usedAt ? `${item.value}%` : `${currencySymbol}${item.value}`}
            </Text>
            {isExpired && (
              <View style={styles.expiredBadge}>
                <Text style={styles.expiredText}>EXPIRED</Text>
              </View>
            )}
            {isUsed && (
              <View style={styles.usedBadge}>
                <Text style={styles.usedText}>USED</Text>
              </View>
            )}
          </View>

          {/* Code Section */}
          <View style={styles.codeSection}>
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Code:</Text>
              <Text style={styles.codeText}>{item.code}</Text>
            </View>
            <Pressable
              style={styles.copyButton}
              onPress={() => handleCopyCode(item.code)}
            >
              <Ionicons name="copy-outline" size={18} color={Colors.text.inverse} />
            </Pressable>
          </View>

          {/* Description */}
          <Text style={styles.description}>{item.description}</Text>

          {/* Coupon Applicability - Only for spin wheel coupons with metadata */}
          {item.metadata && item.metadata.storeName && (
            <View style={styles.applicabilityContainer}>
              <View style={styles.applicabilityHeader}>
                <Ionicons
                  name={item.metadata.isProductSpecific ? "cube-outline" : "storefront-outline"}
                  size={16}
                  color="rgba(255, 255, 255, 0.9)"
                />
                <Text style={styles.applicabilityTitle}>
                  {item.metadata.isProductSpecific ? 'Product-Specific Coupon' : 'Store-Wide Coupon'}
                </Text>
              </View>
              <Text style={styles.applicabilityText}>
                {item.metadata.isProductSpecific
                  ? `Valid only on ${item.metadata.productName} from ${item.metadata.storeName}`
                  : `Valid on any product from ${item.metadata.storeName}`}
              </Text>
            </View>
          )}

          {/* Terms & Conditions - Only for cashback offers */}
          {item.restrictions && (item.restrictions.minOrderValue || item.restrictions.maxDiscountAmount) && (
            <View style={styles.termsContainer}>
              <Text style={styles.termsTitle}>Terms & Conditions:</Text>
              {item.restrictions.minOrderValue && (
                <View style={styles.termItem}>
                  <Ionicons name="checkmark-circle" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.termText}>
                    Min. order: {currencySymbol}{item.restrictions.minOrderValue}
                  </Text>
                </View>
              )}
              {item.restrictions.maxDiscountAmount && (
                <View style={styles.termItem}>
                  <Ionicons name="checkmark-circle" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.termText}>
                    Max. discount: {currencySymbol}{item.restrictions.maxDiscountAmount}
                  </Text>
                </View>
              )}
              {item.restrictions.usageLimitPerUser && (
                <View style={styles.termItem}>
                  <Ionicons name="checkmark-circle" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.termText}>
                    Can be used {item.restrictions.usageLimitPerUser} time{item.restrictions.usageLimitPerUser > 1 ? 's' : ''} per user
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Expiry Date */}
          <Text style={styles.expiryDate}>
            Valid till: {new Date(item.expiryDate).toLocaleDateString()}
          </Text>

          {/* Action Buttons */}
          {isActive && (
            <View style={styles.actionButtonsContainer}>
              <View style={styles.actionButtons}>
                <Pressable
                  style={styles.applyButton}
                  onPress={() => handleApplyVoucher(item)}
                >
                  <Ionicons name="cart-outline" size={16} color={Colors.warning} />
                  <Text style={styles.applyButtonText}>Apply to Cart</Text>
                </Pressable>

                <Pressable
                  style={styles.shareButton}
                  onPress={() => handleShareVoucher(item)}
                >
                  <Ionicons name="share-social-outline" size={18} color={Colors.warning} />
                </Pressable>
              </View>

              <View style={styles.actionButtonsRow}>
                {item.voucherType === 'cashback' ? (
                  // Cashback vouchers - show checkout flow button
                  <Pressable
                    style={[styles.useVoucherButton, styles.useOnlineButton, { flex: 1 }]}
                    onPress={() => handleApplyVoucher(item)}
                  >
                    <Ionicons name="cart-outline" size={18} color={Colors.text.inverse} />
                    <Text style={styles.useVoucherButtonText}>Use at Checkout</Text>
                  </Pressable>
                ) : (
                  // Gift cards - show online redemption option
                  <Pressable
                    style={[styles.useVoucherButton, styles.useOnlineButton]}
                    onPress={() => handleUseOnline(item)}
                  >
                    <Ionicons name="globe-outline" size={18} color={Colors.text.inverse} />
                    <Text style={styles.useVoucherButtonText}>Use Online</Text>
                  </Pressable>
                )}

                <Pressable
                  style={styles.useVoucherButton}
                  onPress={() => handleUseVoucher(item)}
                >
                  <Ionicons name="qr-code-outline" size={18} color={Colors.text.inverse} />
                  <Text style={styles.useVoucherButtonText}>Use at Store</Text>
                </Pressable>
              </View>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    );
  }, [currencySymbol, handleCopyCode, handleApplyVoucher, handleShareVoucher, handleUseOnline, handleUseVoucher]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="ticket-outline" size={80} color={Colors.border.default} />
      <Text style={styles.emptyTitle}>No Vouchers Yet</Text>
      <Text style={styles.emptyText}>
        Purchase vouchers and they will appear here
      </Text>
      <Pressable
        style={styles.buyButton}
        onPress={() => router.push('/online-voucher' as any)}
      >
        <Ionicons name="add" size={20} color={Colors.text.inverse} />
        <Text style={styles.buyButtonText}>Buy Vouchers</Text>
      </Pressable>
    </View>
  );

  const tabs: { key: VoucherStatus; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'used', label: 'Used' },
    { key: 'expired', label: 'Expired' },
    { key: 'partner', label: 'Partner' },
  ];

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.warning} />
        <LinearGradient colors={[Colors.warning, colors.brand.orange]} style={styles.header}>
          <View style={styles.headerContent}>
            <HeaderBackButton
              onPress={handleBackPress}
              iconColor={Colors.background.primary}
              style={styles.backButton}
            />
            <Text style={styles.headerTitle}>My Vouchers</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.warning} />

      {/* Header */}
      <LinearGradient colors={[Colors.warning, colors.brand.orange]} style={styles.header}>
        <View style={styles.headerContent}>
          <HeaderBackButton
            onPress={handleBackPress}
            iconColor={Colors.background.primary}
            style={styles.backButton}
          />
          <Text style={styles.headerTitle}>My Vouchers</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/online-voucher' as any)}
          >
            <Ionicons name="add" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* Vouchers List or Partner Vouchers */}
      {activeTab === 'partner' ? (
        <PartnerVouchersSection
          onVoucherCopied={(code) => {
            logger.info('Partner voucher copied:', code);
          }}
          onApplyVoucher={(code) => {
            // Navigate to cart with voucher pre-applied
            router.push({
              pathname: '/cart',
              params: { voucherCode: code },
            } as any);
          }}
        />
      ) : (
        <FlashList
          data={filteredVouchers}
          renderItem={renderVoucher}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          estimatedItemSize={140}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: Spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.warning} />
              </View>
            ) : null
          }
        />
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        visible={showQRModal}
        voucher={
          selectedVoucher
            ? {
                id: selectedVoucher.id,
                code: selectedVoucher.code,
                brandName: selectedVoucher.brandName,
                brandLogo: selectedVoucher.brandLogo,
                value: selectedVoucher.value,
                description: selectedVoucher.description,
                expiryDate: selectedVoucher.expiryDate,
                userId: user?.id || '',
              }
            : null
        }
        onClose={() => {
          setShowQRModal(false);
          setSelectedVoucher(null);
        }}
        onMarkAsUsed={confirmUseVoucher}
      />

      {/* Online Redemption Modal */}
      <OnlineRedemptionModal
        visible={showRedemptionModal}
        voucher={
          selectedVoucher
            ? {
                _id: selectedVoucher.id,
                voucherCode: selectedVoucher.code,
                denomination: selectedVoucher.value,
                expiryDate: selectedVoucher.expiryDate,
                brand: {
                  name: selectedVoucher.brandName,
                  logo: selectedVoucher.brandLogo || '',
                  backgroundColor: Colors.background.secondary,
                  logoColor: '#000000',
                  websiteUrl: undefined, // Requires backend to include brand.websiteUrl in voucher response (GiftCard/Prive catalog brand schema)
                },
              }
            : null
        }
        onClose={() => {
          setShowRedemptionModal(false);
          setSelectedVoucher(null);
        }}
        onMarkAsUsed={handleMarkAsUsed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerRight: {
    width: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeTab: {
    backgroundColor: Colors.background.primary,
  },
  tabText: {
    ...Typography.body,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activeTabText: {
    color: Colors.warning,
  },
  listContainer: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  voucherCard: {
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  expiredCard: {
    opacity: 0.6,
  },
  voucherGradient: {
    padding: Spacing.base,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    resizeMode: 'contain',
  },
  brandLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  brandName: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  category: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  valueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  valueAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  expiredBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  expiredText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  usedBadge: {
    backgroundColor: Colors.text.tertiary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  usedText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  codeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeLabel: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: Spacing.sm,
  },
  codeText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: 1,
  },
  copyButton: {
    padding: Spacing.sm,
  },
  description: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.sm,
  },
  applicabilityContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 10,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  applicabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  applicabilityTitle: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  applicabilityText: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
  },
  termsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 10,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  termsTitle: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 6,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  termText: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  expiryDate: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: Spacing.md,
  },
  actionButtonsContainer: {
    gap: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  applyButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.warning,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  useVoucherButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warning,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  useOnlineButton: {
    backgroundColor: Colors.info,
  },
  useVoucherButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  buyButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(MyVouchersPage, 'MyVouchers');
