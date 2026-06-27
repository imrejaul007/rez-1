// @ts-nocheck
// WalkInDealsModal.tsx - Premium Glassmorphism Design
// Walk-in Deals Modal - Green & Gold Theme

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Text,
  ScrollView,
  Platform
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Deal, DealModalProps } from '@/types/deals';
import DealDetailsModal from '@/components/DealDetailsModal';
import DealList from '@/components/DealList';
import realOffersApi from '@/services/realOffersApi';
import DealsListSkeleton from '@/components/skeletons/DealsListSkeleton';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Premium Glass Design Tokens - Green & Gold Theme
const GLASS = {
  lightBg: 'rgba(255, 255, 255, 0.85)',
  lightBorder: 'rgba(255, 255, 255, 0.5)',
  lightHighlight: 'rgba(255, 255, 255, 0.9)',
  frostedBg: 'rgba(255, 255, 255, 0.92)',
  tintedGreenBg: 'rgba(255, 205, 87, 0.08)',
  tintedGreenBorder: 'rgba(255, 205, 87, 0.2)',
  tintedGoldBg: 'rgba(255, 200, 87, 0.12)',
  tintedGoldBorder: 'rgba(255, 200, 87, 0.35)',
};

const COLORS = {
  primary: colors.lightMustard,
  primaryDark: colors.nileBlue,
  gold: colors.brand.goldWarm,
  goldDark: '#E5A500',
  navy: colors.brand.navyDark,
  textPrimary: colors.neutral[800],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  surface: '#F7FAFC',
  error: colors.error,
};

function WalkInDealsModal({ visible, onClose, deals = [], storeId }: DealModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDealForDetails, setSelectedDealForDetails] = useState<Deal | null>(null);
  const isMounted = useIsMounted();

  // API state management
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);
  const [apiDeals, setApiDeals] = useState<any[]>([]);
  const [dealCount, setDealCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'walk_in' | 'online' | 'combo' | 'cashback' | 'flash_sale'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'discount' | 'expiry' | 'newest'>('priority');

  const slideAnim = useSharedValue(screenData.height);
  const fadeAnim = useSharedValue(0);
  const fadeAnimStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));
  const slideAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideAnim.value }] }));
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        setScreenData(window);
        if (!visible) {
          slideAnim.value = window.height;
        }
      }, 100);
    });

    return () => {
      subscription?.remove();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, [slideAnim, visible]);

  // Fetch deals from API when modal opens or storeId changes
  useEffect(() => {
    if (visible && storeId) {
      fetchStoreDeals();
    }
  }, [visible, storeId, filterType, sortBy]);

  const fetchStoreDeals = useCallback(async () => {
    if (!storeId) return;

    try {
      setIsLoadingDeals(true);
      setError(null);

      const response = await realOffersApi.getStoreOffers(storeId, {
        type: filterType,
        active: true,
        sortBy: sortBy,
        limit: 20
      });

      if (response.success && response.data) {
        const fetchedDeals = response.data.deals || [];
        // Transform API deals to match Deal interface
        const transformedDeals = fetchedDeals.map((deal: any) => {
          // Determine discount type and value
          let discountType: 'percentage' | 'fixed' = 'percentage';
          let discountValue = 0;

          if (deal.type === 'cashback') {
            discountType = 'percentage';
            discountValue = deal.cashbackPercentage || 0;
          } else if (deal.type === 'discount' || deal.type === 'walk_in') {
            if (deal.originalPrice && deal.discountedPrice) {
              const discountAmount = deal.originalPrice - deal.discountedPrice;
              discountValue = Math.round((discountAmount / deal.originalPrice) * 100);
              discountType = 'percentage';
            } else if (deal.cashbackPercentage) {
              discountValue = deal.cashbackPercentage;
              discountType = 'percentage';
            } else {
              discountValue = 0;
            }
          } else {
            discountValue = deal.cashbackPercentage || 0;
          }

          // Generate badge text based on deal type and values
          let badgeText = '';
          if (deal.originalPrice && deal.discountedPrice) {
            const discountAmount = deal.originalPrice - deal.discountedPrice;
            const discountPercent = Math.round((discountAmount / deal.originalPrice) * 100);
            badgeText = `${discountPercent}% OFF`;
          } else if (deal.cashbackPercentage > 0) {
            badgeText = `${deal.cashbackPercentage}% Cashback`;
          } else if (discountValue > 0) {
            badgeText = `${discountValue}% OFF`;
          } else {
            badgeText = 'Special Deal';
          }

          // Map category to DealCategory
          const categoryMap: Record<string, string> = {
            'mega': 'instant-discount',
            'student': 'first-time',
            'new_arrival': 'instant-discount',
            'trending': 'instant-discount',
            'food': 'instant-discount',
            'fashion': 'instant-discount',
            'electronics': 'instant-discount',
            'general': 'instant-discount',
          };
          const mappedCategory = categoryMap[deal.category] || 'instant-discount';

          // Build terms array from restrictions and other fields
          const terms: string[] = [];
          if (deal.restrictions?.minOrderValue) {
            terms.push(`Minimum order: ${currencySymbol}${deal.restrictions.minOrderValue}`);
          }
          if (deal.restrictions?.maxDiscountAmount) {
            terms.push(`Max discount: ${currencySymbol}${deal.restrictions.maxDiscountAmount}`);
          }
          if (deal.restrictions?.usageLimitPerUser) {
            terms.push(`Limit: ${deal.restrictions.usageLimitPerUser} per user`);
          }
          if (deal.restrictions?.usageLimit) {
            terms.push(`Total limit: ${deal.restrictions.usageLimit} uses`);
          }
          if (deal.restrictions?.applicableOn && Array.isArray(deal.restrictions.applicableOn) && deal.restrictions.applicableOn.length > 0) {
            terms.push(`Applicable on: ${deal.restrictions.applicableOn.join(', ')}`);
          }
          if (deal.description) {
            if (terms.length === 0) {
              terms.push(deal.description);
            }
          }

          // Determine badge color based on deal type - using green/gold theme
          let badgeBgColor = GLASS.tintedGreenBg;
          let badgeTextColor = COLORS.primary;
          if (deal.metadata?.featured || deal.type === 'mega') {
            badgeBgColor = GLASS.tintedGoldBg;
            badgeTextColor = COLORS.goldDark;
          } else if (deal.type === 'cashback') {
            badgeBgColor = GLASS.tintedGreenBg;
            badgeTextColor = COLORS.primary;
          } else if (deal.type === 'walk_in') {
            badgeBgColor = GLASS.tintedGreenBg;
            badgeTextColor = COLORS.primaryDark;
          }

          return {
            id: deal._id || deal.id,
            title: deal.title,
            discountType,
            discountValue,
            minimumBill: deal.restrictions?.minOrderValue || deal.minPurchase || 0,
            maxDiscount: deal.restrictions?.maxDiscountAmount || deal.maxDiscount,
            isOfflineOnly: deal.type === 'walk_in',
            terms: terms.length > 0 ? terms : (deal.restrictions?.applicableOn || []),
            isActive: deal.validity?.isActive !== false && new Date(deal.validity?.endDate || deal.validUntil || Date.now()) > new Date(),
            validUntil: new Date(deal.validity?.endDate || deal.validUntil || Date.now()),
            category: mappedCategory as any,
            description: deal.description || deal.subtitle || '',
            priority: deal.metadata?.priority || deal.priority || 1,
            usageLimit: deal.restrictions?.usageLimit || deal.usageLimit,
            usageCount: deal.usageCount || 0,
            applicableProducts: deal.restrictions?.applicableOn || deal.applicableProducts || [],
            badge: deal.badge || {
              text: badgeText,
              backgroundColor: badgeBgColor,
              textColor: badgeTextColor
            },
            image: deal.image,
            subtitle: deal.subtitle,
            originalPrice: deal.originalPrice,
            discountedPrice: deal.discountedPrice,
            featured: deal.metadata?.featured || false,
          };
        });

        if (!isMounted()) return;
        setApiDeals(transformedDeals);
        setDealCount(response.data.totalCount || transformedDeals.length);
      } else {
        setError(response.message || 'Failed to load deals');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Unable to load deals. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoadingDeals(false);
    }
  }, [storeId, filterType, sortBy]);

  // Use API deals if available, otherwise fallback to passed deals
  const activeDeals = apiDeals.length > 0 ? apiDeals : deals;
  const styles = useMemo(() => createStyles(screenData), [screenData]);

  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 200 });
      slideAnim.value = withSpring(0, { tension: 100, friction: 8 });
    } else {
      fadeAnim.value = withTiming(0, { duration: 150 });
      slideAnim.value = withTiming(screenData.height, { duration: 200 });
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleBackdropPress = () => onClose();
  const handleModalPress = (event: any) => event.stopPropagation();

  const handleAddDeal = (dealId: string) =>
    setSelectedDeals(prev => (prev.includes(dealId) ? prev : [...prev, dealId]));
  const handleRemoveDeal = (dealId: string) =>
    setSelectedDeals(prev => prev.filter(id => id !== dealId));

  const handleMoreDetails = (dealId: string) => {
    const deal = activeDeals.find(d => d.id === dealId);
    if (deal) {
      setSelectedDealForDetails(deal);
      setShowDetailsModal(true);
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedDealForDetails(null);
  };

  const handleRefreshDeals = useCallback(async () => {
    await fetchStoreDeals();
  }, [fetchStoreDeals]);

  const handleFilterChange = useCallback((type: typeof filterType) => {
    setFilterType(type);
  }, []);

  const handleSortChange = useCallback((sort: typeof sortBy) => {
    setSortBy(sort);
  }, []);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Walk-in deals dialog"
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <Animated.View style={[styles.blurContainer, fadeAnimStyle]}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={60} tint="dark" style={styles.blur} />
            ) : (
              <View style={[styles.blur, styles.androidBlur]} />
            )}
          </Animated.View>

          <TouchableWithoutFeedback onPress={handleModalPress}>
            <Animated.View style={[styles.modalContainer, slideAnimStyle]}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={80} tint="light" style={styles.modal}>
                  {renderModalContent()}
                </BlurView>
              ) : (
                <View style={[styles.modal, styles.modalAndroid]}>
                  {renderModalContent()}
                </View>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      <DealDetailsModal
        visible={showDetailsModal}
        onClose={handleCloseDetailsModal}
        deal={selectedDealForDetails}
      />
    </Modal>
  );

  function renderModalContent() {
    return (
      <>
        {/* Glass Highlight */}
        <View style={styles.glassHighlight} />

        {/* Handle Bar */}
        <View style={styles.handleBar} />

        {/* Close Button */}
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close walk-in deals"
          accessibilityRole="button"
          accessibilityHint="Double tap to close this dialog"
        >
          <View style={styles.closeButtonInner}>
            <Ionicons name="close" size={18} color={COLORS.textPrimary} />
          </View>
        </Pressable>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.headerIconContainer}
              >
                <Ionicons name="pricetag" size={22} color={COLORS.white} />
              </LinearGradient>
              <View style={styles.headerTextContainer}>
                <ThemedText style={styles.headerTitle}>Walk-in Deals</ThemedText>
                <ThemedText style={styles.headerSubtitle}>
                  {dealCount > 0 ? `${dealCount} deals available` : 'Available offers for this store'}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              {renderFilterTab('all', 'All')}
              {renderFilterTab('walk_in', 'Walk-in')}
              {renderFilterTab('online', 'Online')}
              {renderFilterTab('cashback', 'Cashback')}
            </ScrollView>
          </View>

          {/* Secondary Filter Row */}
          <View style={styles.secondaryFilters}>
            <Text style={styles.dealsAvailableText}>
              {activeDeals.length} deals available
            </Text>
            <View style={styles.filterActions}>
              <Pressable style={styles.glassFilterButton}>
                <Ionicons name="funnel-outline" size={16} color={COLORS.primary} />
                <Text style={styles.filterButtonText}>Filter</Text>
              </Pressable>
              <Pressable style={styles.glassFilterButton}>
                <Ionicons name="swap-vertical-outline" size={16} color={COLORS.primary} />
                <Text style={styles.filterButtonText}>Sort: Prio...</Text>
              </Pressable>
            </View>
          </View>

          {/* Type Filter Chips */}
          <View style={styles.typeChipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeChipsContent}>
              {renderTypeChip('all', 'All', true)}
              {renderTypeChip('instant', 'Instant', false)}
              {renderTypeChip('cashback', 'Cashback', false)}
              {renderTypeChip('bogo', 'BOGO', false)}
              {renderTypeChip('vip', 'VIP', false)}
            </ScrollView>
          </View>

          {/* Error State */}
          {error && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              </View>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={handleRefreshDeals}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.retryButtonGradient}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {/* Empty State */}
          {!isLoadingDeals && !error && activeDeals.length === 0 && (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="gift-outline" size={48} color={COLORS.white} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No deals available right now</Text>
              <Text style={styles.emptySubtitle}>Check back later for exciting offers!</Text>
            </View>
          )}

          {/* Deals List */}
          {!error && activeDeals.length > 0 && (
            <View style={styles.listContainer}>
              <DealList
                deals={activeDeals}
                selectedDeals={selectedDeals}
                onAddDeal={handleAddDeal}
                onRemoveDeal={handleRemoveDeal}
                onMoreDetails={handleMoreDetails}
                isLoading={isLoadingDeals}
                onRefresh={handleRefreshDeals}
                showFilters={true}
              />
            </View>
          )}

          {/* Loading Skeleton */}
          {isLoadingDeals && activeDeals.length === 0 && (
            <View style={styles.listContainer}>
              <DealsListSkeleton count={4} />
            </View>
          )}
        </ScrollView>
      </>
    );
  }

  function renderFilterTab(type: typeof filterType, label: string) {
    const isActive = filterType === type;
    return (
      <Pressable
        style={[styles.filterTab, isActive && styles.filterTabActive]}
        onPress={() => handleFilterChange(type)}
      >
        {isActive ? (
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.filterTabGradient}
          >
            <Text style={styles.filterTabTextActive}>{label}</Text>
          </LinearGradient>
        ) : (
          <Text style={styles.filterTabText}>{label}</Text>
        )}
      </Pressable>
    );
  }

  function renderTypeChip(type: string, label: string, isActive: boolean) {
    return (
      <Pressable style={[styles.typeChip, isActive && styles.typeChipActive]}>
        {isActive ? (
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.typeChipGradient}
          >
            <Text style={styles.typeChipTextActive}>{label}</Text>
          </LinearGradient>
        ) : (
          <Text style={styles.typeChipText}>{label}</Text>
        )}
      </Pressable>
    );
  }
}

const createStyles = (screenData: { width: number; height: number }) => {
  const isSmallScreen = screenData.width < 375;
  const isTabletOrLarge = screenData.width >= 768;
  const isLandscape = screenData.width > screenData.height;

  const modalPadding = isSmallScreen ? 12 : isTabletOrLarge ? 24 : 20;
  const horizontalPadding = isSmallScreen ? 8 : isTabletOrLarge ? 0 : 16;
  const maxModalHeight = isLandscape ? '95%' : isTabletOrLarge ? '85%' : '90%';

  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    blurContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    blur: { flex: 1 },
    androidBlur: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: horizontalPadding,
      paddingBottom: isSmallScreen ? 8 : 0,
      width: '100%',
    },
    modal: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      width: '100%',
      maxHeight: maxModalHeight,
      minHeight: isSmallScreen ? 300 : 400,
      borderWidth: 1,
      borderColor: GLASS.lightBorder,
      borderBottomWidth: 0,
      overflow: 'hidden',
    },
    modalAndroid: {
      backgroundColor: GLASS.frostedBg,
    },
    glassHighlight: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: GLASS.lightHighlight,
    },
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: 'rgba(0, 0, 0, 0.15)',
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 8,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: modalPadding,
      paddingTop: 8,
      paddingBottom: isSmallScreen ? modalPadding + 40 : modalPadding + 50,
    },
    closeButton: {
      position: 'absolute',
      top: modalPadding + 4,
      right: modalPadding + 4,
      zIndex: 10,
    },
    closeButtonInner: {
      backgroundColor: GLASS.lightBg,
      borderRadius: 20,
      width: isSmallScreen ? 36 : 40,
      height: isSmallScreen ? 36 : 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: GLASS.lightBorder,
      ...Platform.select({
        ios: {
          shadowColor: COLORS.navy,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    header: {
      marginTop: isSmallScreen ? 8 : 12,
      marginBottom: isSmallScreen ? 20 : 24,
      paddingHorizontal: isSmallScreen ? 8 : 12,
      zIndex: 1,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: isSmallScreen ? 40 : 48,
    },
    headerIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      ...Platform.select({
        ios: {
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    headerTextContainer: {
      flex: 1,
      alignItems: 'flex-start',
    },
    headerTitle: {
      fontSize: isSmallScreen ? 22 : isTabletOrLarge ? 28 : 24,
      fontWeight: '700',
      color: COLORS.textPrimary,
      marginBottom: 4,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: isSmallScreen ? 13 : isTabletOrLarge ? 15 : 14,
      color: COLORS.textSecondary,
      lineHeight: isSmallScreen ? 18 : 20,
    },
    filterContainer: {
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    },
    filterScrollContent: {
      paddingHorizontal: isSmallScreen ? 8 : 12,
      gap: 10,
      alignItems: 'center',
    },
    filterTab: {
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: GLASS.lightBg,
      borderWidth: 1,
      borderColor: GLASS.lightBorder,
    },
    filterTabActive: {
      borderColor: COLORS.primary,
    },
    filterTabGradient: {
      paddingHorizontal: isSmallScreen ? 14 : 18,
      paddingVertical: 10,
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterTabText: {
      fontSize: isSmallScreen ? 12 : 13,
      fontWeight: '600',
      color: COLORS.textSecondary,
      letterSpacing: 0.2,
      paddingHorizontal: isSmallScreen ? 14 : 18,
      paddingVertical: 10,
    },
    filterTabTextActive: {
      color: COLORS.white,
      fontWeight: '700',
      fontSize: isSmallScreen ? 12 : 13,
    },
    secondaryFilters: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    dealsAvailableText: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textPrimary,
    },
    filterActions: {
      flexDirection: 'row',
      gap: 10,
    },
    glassFilterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: GLASS.lightBg,
      borderWidth: 1,
      borderColor: GLASS.tintedGreenBorder,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    filterButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.primary,
    },
    typeChipsContainer: {
      marginBottom: 16,
    },
    typeChipsContent: {
      paddingHorizontal: 4,
      gap: 8,
    },
    typeChip: {
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: GLASS.lightBg,
      borderWidth: 1,
      borderColor: GLASS.lightBorder,
    },
    typeChipActive: {
      borderColor: COLORS.primary,
    },
    typeChipGradient: {
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    typeChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.textSecondary,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    typeChipTextActive: {
      color: COLORS.white,
      fontWeight: '700',
      fontSize: 12,
    },
    listContainer: { flex: 1, marginTop: 0, paddingTop: 8 },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      padding: 16,
      borderRadius: 16,
      marginHorizontal: 12,
      marginVertical: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    errorIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      color: COLORS.error,
      fontWeight: '500',
    },
    retryButton: {
      borderRadius: 8,
      overflow: 'hidden',
    },
    retryButtonGradient: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    retryButtonText: {
      color: COLORS.white,
      fontSize: 13,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
      paddingHorizontal: 32,
    },
    emptyIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      ...Platform.select({
        ios: {
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: COLORS.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    emptySubtitle: {
      fontSize: 15,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 14,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },
  });
};

export default React.memo(WalkInDealsModal);
