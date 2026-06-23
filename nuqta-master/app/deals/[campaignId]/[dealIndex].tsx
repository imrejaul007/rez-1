// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Deal Detail Page - Premium Individual Deal View
 * Route: /deals/[campaignId]/[dealIndex]
 * Enhanced with comprehensive details and premium UI
 */

import { colors } from '@/constants/theme';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Share,
  Dimensions,
  Modal,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { campaignsApi, Campaign, CampaignDeal } from '@/services/campaignsApi';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import CoinIcon from '@/components/ui/CoinIcon';
import { useIsAuthenticated } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useGetCurrencySymbol as useGetCurrencySymbolFromStore } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  white: Colors.background.primary,
  navy: Colors.nileBlue,
  navyLight: '#1A365D',
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray300: Colors.border.default,
  gray400: Colors.text.tertiary,
  gray600: Colors.text.tertiary,
  gray800: Colors.text.primary,
  green50: Colors.successScale[50],
  green100: Colors.successScale[100],
  green500: Colors.success,
  green600: Colors.success,
  emerald500: Colors.success,
  amber50: Colors.warningScale[50],
  amber100: Colors.warningScale[100],
  amber500: Colors.warning,
  amber600: Colors.warning,
  blue50: Colors.infoScale[50],
  blue100: Colors.infoScale[100],
  blue500: Colors.info,
  purple50: '#FAF5FF',
  purple100: colors.tint.pink,
  purple500: Colors.brand.purpleLight,
  pink500: colors.brand.pink,
  red50: Colors.errorScale[50],
  red100: Colors.errorScale[100],
  red500: Colors.error,
  cyan500: colors.brand.cyan,
  gold: Colors.gold,
  goldDark: '#B8860B',
};

const FALLBACK_DEAL_IMAGE = undefined;

const DealDetailPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const isAuthenticated = useIsAuthenticated();
  const getRegionCurrencySymbol = useGetCurrencySymbolFromStore();
  const regionCurrencySymbol = getRegionCurrencySymbol();
  const campaignId = params.campaignId as string;
  const dealIndex = parseInt(params.dealIndex as string, 10);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [deal, setDeal] = useState<CampaignDeal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Track if user has already redeemed this deal
  const [alreadyRedeemed, setAlreadyRedeemed] = useState(false);
  const [existingRedemptionCode, setExistingRedemptionCode] = useState<string | null>(null);

  // Success modal state (for web compatibility - Alert.alert doesn't work on web)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    title: string;
    message: string;
    redemptionCode?: string;
    showViewDeals?: boolean;
    showVisitStore?: boolean;
    storeId?: string | null;
  } | null>(null);

  useEffect(() => {
    if (campaignId && !isNaN(dealIndex)) {
      fetchDealDetails();
    } else {
      setError('Invalid deal information');
      setIsLoading(false);
    }
  }, [campaignId, dealIndex]);

  useEffect(() => {
    if (deal && campaign) {
      apiClient.post('/campaigns/deals/track', {
        campaignId: campaign._id || campaignId,
        dealIndex,
        action: 'view',
      }).catch(() => { /* silently handle */ });
    }
  }, [deal, campaign, campaignId, dealIndex]);

  // Check if user has already redeemed this deal
  useEffect(() => {
    const checkRedemptionStatus = async () => {
      if (!isAuthenticated || !campaign) return;

      try {
        // Fetch user's redemptions and check if this deal is already redeemed
        const response = await apiClient.get<{
          redemptions: Array<{
            code: string;
            campaignId?: string;
            dealIndex?: number;
            status: string;
            campaignSnapshot?: { title?: string };
          }>;
        }>('/campaigns/my-redemptions', { limit: 100 });

        if (response.success && response.data?.redemptions) {
          // Find if this specific deal is already redeemed
          const existingRedemption = response.data.redemptions.find(r =>
            (r.campaignId === campaign.campaignId || r.campaignSnapshot?.title === campaign.title) &&
            r.dealIndex === dealIndex &&
            (r.status === 'active' || r.status === 'used')
          );

          if (existingRedemption) {
            if (!isMounted()) return;
            setAlreadyRedeemed(true);
            if (!isMounted()) return;
            setExistingRedemptionCode(existingRedemption.code);
          }
        }
      } catch (err) {
        // silently handle
      }
    };

    checkRedemptionStatus();
  }, [isAuthenticated, campaign, dealIndex]);

  const fetchDealDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await campaignsApi.getCampaignById(campaignId);

      if (response.success && response.data) {
        const campaignData = response.data;
        if (!isMounted()) return;
        setCampaign(campaignData);

        if (campaignData.deals && campaignData.deals[dealIndex]) {
          const dealData = campaignData.deals[dealIndex];
          const transformedDeal = {
            ...dealData,
            storeId: dealData.storeId
              ? (typeof dealData.storeId === 'string' ? dealData.storeId : String(dealData.storeId))
              : undefined,
          };
          if (!isMounted()) return;
          setDeal(transformedDeal);
        } else {
          if (!isMounted()) return;
          setError('Deal not found');
        }
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Campaign not found');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load deal');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  // Check if deal is paid - ONLY use price field (backend determines paid by price > 0)
  const isPaidDeal = deal && ((deal as any).price || 0) > 0;
  const dealPrice = deal ? ((deal as any).price || 0) : 0;
  const dealCurrency = deal ? ((deal as any).currency || 'INR') : 'INR';

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'AED': return 'AED ';
      case 'USD': return '$';
      case 'INR':
      default: return regionCurrencySymbol;
    }
  };

  const handleRedeem = async () => {
    if (!deal || !campaign) return;

    const now = new Date();
    const endTime = new Date(campaign.endTime);
    if (endTime < now) {
      platformAlertSimple('Campaign Ended', 'Sorry, this campaign has ended.');
      return;
    }

    const startTime = new Date(campaign.startTime);
    if (startTime > now) {
      platformAlertSimple('Coming Soon', `This campaign starts on ${startTime.toLocaleDateString()}.`);
      return;
    }

    if (!isAuthenticated) {
      platformAlertConfirm('Sign In Required', 'Please sign in to redeem this deal', () => router.push('/sign-in' as any), 'Sign In');
      return;
    }

    // Check if deal is sold out
    if ((deal as any).isSoldOut) {
      platformAlertSimple('Sold Out', 'This deal is no longer available.');
      return;
    }

    setIsRedeeming(true);
    try {

      // Get success/cancel URLs for Stripe (for paid deals)
      const baseUrl = 'https://rez.app'; // Replace with your app's deep link URL
      const successUrl = `${baseUrl}/payment-success?campaignId=${campaignId}&dealIndex=${dealIndex}`;
      const cancelUrl = `${baseUrl}/payment-cancel?campaignId=${campaignId}&dealIndex=${dealIndex}`;

      // Use the unified redeem endpoint that handles both free and paid deals
      const response = await apiClient.post<{
        success: boolean;
        type?: 'free' | 'paid';
        // Free deal response
        redemption?: {
          id: string;
          code: string;
          status: string;
          expiresAt: string;
          dealSnapshot: any;
          campaignSnapshot: any;
        };
        // Paid deal response (Stripe checkout)
        checkoutUrl?: string;
        sessionId?: string;
        redemptionId?: string;
        amount?: number;
        currency?: string;
        message: string;
      }>(`/campaigns/${campaign.campaignId || campaignId}/deals/${dealIndex}/redeem`, {
        successUrl,
        cancelUrl,
      });


      // Check if API call failed
      if (!response.success) {
        const errorMsg = response.error || response.message || 'Unable to redeem this deal.';

        // Check for "already redeemed" error
        if (errorMsg.toLowerCase().includes('already redeemed') || errorMsg.toLowerCase().includes('already purchased')) {
          if (!isMounted()) return;
          setSuccessModalData({
            title: 'Already Redeemed',
            message: 'You have already redeemed this deal.',
            showViewDeals: true,
          });
        } else {
          if (!isMounted()) return;
          setSuccessModalData({
            title: 'Redemption Failed',
            message: errorMsg,
          });
        }
        if (!isMounted()) return;
        setShowSuccessModal(true);
        return;
      }

      const storeId = deal.storeId ? (typeof deal.storeId === 'string' ? deal.storeId : String(deal.storeId)) : null;

      // Helper to navigate to MainStorePage
      const goToStore = (redemptionCode?: string) => {
        router.push({
          pathname: '/MainStorePage',
          params: {
            storeId: storeId!,
            storeData: JSON.stringify({
              id: storeId,
              name: deal.store || 'Store',
              title: deal.store || 'Store',
              image: deal.image || '',
              logo: deal.image || '',
              cashback: deal.cashback ? parseInt(deal.cashback.replace(/[^0-9]/g, '')) || 0 : 0,
              description: campaign?.description || `Visit ${deal.store} to redeem your deal!`,
              rating: 4.5,
              ratingCount: 100,
              tags: [campaign?.type || 'deals'],
            }),
            storeType: 'dynamic',
            ...(redemptionCode ? { redemptionCode } : {}),
          },
        } as any);
      };

      // Handle paid deal - redirect to Stripe checkout
      if (response.data?.type === 'paid' && response.data?.checkoutUrl) {
        router.push({
          pathname: '/deal-payment' as any,
          params: {
            checkoutUrl: response.data.checkoutUrl,
            sessionId: response.data.sessionId,
            redemptionId: response.data.redemptionId,
            amount: response.data.amount,
            currency: response.data.currency || dealCurrency,
            campaignId: campaign._id || campaignId,
            campaignSlug: campaign.campaignId,
            dealIndex: dealIndex.toString(),
            dealStore: deal.store || 'Deal',
            dealImage: deal.image || '',
          },
        } as any);
        return;
      }

      // Handle free deal redemption
      if (response.data?.redemption) {
        const redemptionCode = response.data.redemption.code;

        // Show success modal (works on both web and native)
        if (!isMounted()) return;
        setSuccessModalData({
          title: 'Deal Redeemed!',
          message: storeId
            ? `Visit ${deal.store || 'the store'} to use this deal.`
            : 'Your deal has been saved successfully.',
          redemptionCode,
          showViewDeals: true,
          showVisitStore: !!storeId,
          storeId,
        });
        if (!isMounted()) return;
        setShowSuccessModal(true);
      } else {
        // Response was successful but no redemption data - shouldn't happen normally
        if (!isMounted()) return;
        setSuccessModalData({
          title: 'Redemption Issue',
          message: 'Something unexpected happened. Please check My Deals or try again.',
          showViewDeals: true,
        });
        if (!isMounted()) return;
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      // Handle "already redeemed" error
      if (error.message?.includes('already redeemed') || error.message?.includes('already purchased')) {
        if (!isMounted()) return;
        setSuccessModalData({
          title: 'Already Redeemed',
          message: 'You have already redeemed this deal. Check My Deals.',
          showViewDeals: true,
        });
        if (!isMounted()) return;
        setShowSuccessModal(true);
      } else {
        // Use native Alert for errors on mobile, modal for web
        if (Platform.OS === 'web') {
          if (!isMounted()) return;
          setSuccessModalData({
            title: 'Redemption Failed',
            message: error.message || 'Please try again.',
          });
          if (!isMounted()) return;
          setShowSuccessModal(true);
        } else {
          platformAlertSimple('Redemption Failed', error.message || 'Please try again.');
        }
      }
    } finally {
      if (!isMounted()) return;
      setIsRedeeming(false);
    }
  };

  // Handle paid deal purchase (kept for backward compatibility, but now redirects to handleRedeem)
  const handlePurchase = async () => {
    // The unified redeem endpoint now handles both free and paid deals
    // Just call handleRedeem which will detect it's a paid deal and redirect to Stripe
    handleRedeem();
  };

  const handleLike = async () => {
    if (!deal || !isAuthenticated) return;
    try {
      setIsLiked(!isLiked);
      await apiClient.post('/campaigns/deals/track', { campaignId: campaign?._id || campaignId, dealIndex, action: 'like' });
    } catch (error) {
      if (!isMounted()) return;
      setIsLiked(!isLiked);
    }
  };

  const handleShare = async () => {
    if (!deal || !campaign) return;
    try {
      const shareMessage = `Check out this amazing deal!\n\n${deal.store || 'Store'}\n${campaign.title}\n\n${deal.cashback || deal.coins || deal.bonus || deal.drop || 'Special Offer'}`;
      await Share.share({ message: shareMessage, title: `${deal.store} - ${campaign.title}` });
      if (isAuthenticated) {
        await apiClient.post('/campaigns/deals/track', { campaignId: campaign._id || campaignId, dealIndex, action: 'share' });
      }
    } catch (error) {
      // silently handle
    }
  };

  const handleVisitStore = () => {
    if (!deal) return;
    const storeId = deal.storeId ? (typeof deal.storeId === 'string' ? deal.storeId : String(deal.storeId)) : null;
    if (storeId) {
      // Navigate to MainStorePage with store data
      // Include as much info as we have from the deal
      router.push({
        pathname: '/MainStorePage',
        params: {
          storeId: storeId,
          storeData: JSON.stringify({
            id: storeId,
            name: deal.store || 'Store',
            title: deal.store || 'Store',
            image: deal.image || '',
            logo: deal.image || '',
            cashback: deal.cashback ? parseInt(deal.cashback.replace(/[^0-9]/g, '')) || 0 : 0,
            description: campaign?.description || `Visit ${deal.store} to redeem your deal!`,
            rating: 4.5,
            ratingCount: 100,
            tags: [campaign?.type || 'deals'],
          }),
          storeType: 'dynamic',
        },
      } as any);
    } else {
      platformAlertSimple('Store Information', 'Store details are not available for this deal.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const getHoursRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const hours = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60));
    return Math.max(0, hours % 24);
  };

  const getDealValueInfo = () => {
    if (!deal) return null;
    if (deal.cashback) return { type: 'Cashback', value: deal.cashback, icon: 'cash-outline', color: COLORS.green500, bgColor: COLORS.green50 };
    if (deal.coins) return { type: 'Coins', value: deal.coins, icon: 'diamond-outline', color: COLORS.amber500, bgColor: COLORS.amber50 };
    if (deal.bonus) return { type: 'Bonus', value: deal.bonus, icon: 'gift-outline', color: COLORS.purple500, bgColor: COLORS.purple50 };
    if (deal.drop) return { type: 'Drop', value: deal.drop, icon: 'flash-outline', color: COLORS.pink500, bgColor: COLORS.red50 };
    if (deal.discount) return { type: 'Discount', value: deal.discount, icon: 'pricetag-outline', color: COLORS.blue500, bgColor: COLORS.blue50 };
    return null;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.green500} />
          <Text style={styles.loadingText}>Loading deal...</Text>
        </View>
      </View>
    );
  }

  if (error || !deal || !campaign) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.errorCard}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.red500} />
          </View>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error || 'Deal not found'}</Text>
          <Pressable style={styles.errorButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={18} color={COLORS.white} />
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const storeId = deal.storeId ? (typeof deal.storeId === 'string' ? deal.storeId : String(deal.storeId)) : null;
  const daysRemaining = getDaysRemaining(campaign.endTime);
  const hoursRemaining = getHoursRemaining(campaign.endTime);
  const dealValueInfo = getDealValueInfo();
  const isExpiringSoon = daysRemaining <= 3;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Premium Hero Section */}
        <View style={styles.heroSection}>
          <CachedImage source={deal.image || FALLBACK_DEAL_IMAGE} style={styles.heroImage} contentFit="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']} style={styles.heroOverlay} />

          {/* Status Badge */}
          {isExpiringSoon && !isPaidDeal && (
            <View style={styles.urgentBadge}>
              <Ionicons name="flame" size={14} color={COLORS.white} />
              <Text style={styles.urgentBadgeText}>Ending Soon!</Text>
            </View>
          )}

          {/* Paid Deal Badge */}
          {isPaidDeal && (
            <View style={[styles.urgentBadge, styles.paidBadge]}>
              <Ionicons name="pricetag" size={14} color={COLORS.white} />
              <Text style={styles.urgentBadgeText}>
                {(deal as any)?.isSoldOut ? 'SOLD OUT' : `${getCurrencySymbol(dealCurrency)}${dealPrice}`}
              </Text>
            </View>
          )}

          {/* Navigation */}
          <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </Pressable>

          <View style={styles.headerActions}>
            <Pressable style={styles.actionBtn} onPress={handleLike}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? COLORS.red500 : COLORS.white} />
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color={COLORS.white} />
            </Pressable>
          </View>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.storeBadge}>
              <Ionicons name="storefront" size={12} color={COLORS.white} />
              <Text style={styles.storeBadgeText}>{deal.store || 'Featured Store'}</Text>
            </View>
            <Text style={styles.heroTitle}>{campaign.title}</Text>
            {campaign.subtitle && <Text style={styles.heroSubtitle}>{campaign.subtitle}</Text>}
          </View>
        </View>

        {/* Premium Value Card */}
        {dealValueInfo && (
          <View style={styles.valueCardContainer}>
            <LinearGradient
              colors={[COLORS.navy, COLORS.navyLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.valueCard}
            >
              <View style={styles.valueCardInner}>
                <View style={[styles.valueIconBg, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Ionicons name={dealValueInfo.icon as any} size={28} color={COLORS.gold} />
                </View>
                <View style={styles.valueTextContainer}>
                  <Text style={styles.valueType}>{dealValueInfo.type}</Text>
                  <Text style={styles.valueAmount}>{dealValueInfo.value}</Text>
                </View>
                <View style={styles.valueDivider} />
                <View style={styles.savingsInfo}>
                  <Text style={styles.savingsLabel}>Your Savings</Text>
                  <View style={styles.savingsRow}>
                    <Ionicons name="trending-up" size={16} color={COLORS.green500} />
                    <Text style={styles.savingsAmount}>
                      {deal.cashback || deal.discount || `${deal.coins || deal.bonus || deal.drop} value`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Decorative Elements */}
              <View style={styles.cardDecor1} />
              <View style={styles.cardDecor2} />
            </LinearGradient>
          </View>
        )}

        {/* Countdown Timer */}
        <View style={styles.countdownSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIcon}>
              <Ionicons name="time-outline" size={18} color={COLORS.amber500} />
            </View>
            <Text style={styles.sectionHeaderTitle}>Offer Expires In</Text>
          </View>
          <View style={styles.countdownGrid}>
            <View style={[styles.countdownItem, isExpiringSoon && styles.countdownItemUrgent]}>
              <Text style={[styles.countdownNumber, isExpiringSoon && styles.countdownNumberUrgent]}>{daysRemaining}</Text>
              <Text style={styles.countdownLabel}>Days</Text>
            </View>
            <View style={styles.countdownSeparator}><Text style={styles.countdownColon}>:</Text></View>
            <View style={[styles.countdownItem, isExpiringSoon && styles.countdownItemUrgent]}>
              <Text style={[styles.countdownNumber, isExpiringSoon && styles.countdownNumberUrgent]}>{hoursRemaining}</Text>
              <Text style={styles.countdownLabel}>Hours</Text>
            </View>
            <View style={styles.countdownSeparator}><Text style={styles.countdownColon}>:</Text></View>
            <View style={[styles.countdownItem, isExpiringSoon && styles.countdownItemUrgent]}>
              <Text style={[styles.countdownNumber, isExpiringSoon && styles.countdownNumberUrgent]}>00</Text>
              <Text style={styles.countdownLabel}>Mins</Text>
            </View>
          </View>
        </View>

        {/* How to Redeem Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.green50 }]}>
              <Ionicons name="checkmark-done-outline" size={18} color={COLORS.green500} />
            </View>
            <Text style={styles.sectionHeaderTitle}>How to Redeem</Text>
          </View>
          <View style={styles.stepsContainer}>
            {[
              { step: 1, title: 'Tap "Redeem Deal"', desc: 'Click the button below to activate your offer', icon: 'finger-print-outline' },
              { step: 2, title: 'Get Your Code', desc: 'Receive a unique redemption code instantly', icon: 'qr-code-outline' },
              { step: 3, title: 'Visit Store', desc: 'Show the code at checkout to claim your reward', icon: 'storefront-outline' },
            ].map((item, idx) => (
              <View key={idx} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <LinearGradient colors={[COLORS.green500, COLORS.emerald500]} style={styles.stepNumberGradient}>
                    <Text style={styles.stepNumberText}>{item.step}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.stepContent}>
                  <View style={styles.stepIconContainer}>
                    <Ionicons name={item.icon as any} size={20} color={COLORS.navy} />
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepTitle}>{item.title}</Text>
                    <Text style={styles.stepDesc}>{item.desc}</Text>
                  </View>
                </View>
                {idx < 2 && <View style={styles.stepConnector} />}
              </View>
            ))}
          </View>
        </View>

        {/* Deal Highlights */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.purple50 }]}>
              <Ionicons name="sparkles-outline" size={18} color={COLORS.purple500} />
            </View>
            <Text style={styles.sectionHeaderTitle}>Deal Highlights</Text>
          </View>
          <View style={styles.highlightsGrid}>
            {[
              { icon: 'shield-checkmark-outline', label: 'Verified Offer', color: COLORS.green500 },
              { icon: 'flash-outline', label: 'Instant Activation', color: COLORS.amber500 },
              { icon: 'infinite-outline', label: 'Unlimited Usage', color: COLORS.blue500 },
              { icon: 'wallet-outline', label: 'Easy Redemption', color: COLORS.purple500 },
            ].map((item, idx) => (
              <View key={idx} style={styles.highlightItem}>
                <View style={[styles.highlightIcon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={styles.highlightLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* About This Deal */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.blue50 }]}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.blue500} />
            </View>
            <Text style={styles.sectionHeaderTitle}>About This Deal</Text>
          </View>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              {campaign.description || `Get amazing savings at ${deal.store || 'this store'}! This exclusive deal is part of the ${campaign.title} campaign. Don't miss this limited-time opportunity to save on your purchase.`}
            </Text>
          </View>
        </View>

        {/* Validity Period */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.amber50 }]}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.amber500} />
            </View>
            <Text style={styles.sectionHeaderTitle}>Validity Period</Text>
          </View>
          <View style={styles.validityCard}>
            <View style={styles.validityRow}>
              <View style={styles.validityItem}>
                <View style={[styles.validityIconBg, { backgroundColor: COLORS.green100 }]}>
                  <Ionicons name="play-circle" size={20} color={COLORS.green500} />
                </View>
                <View>
                  <Text style={styles.validityLabel}>Starts</Text>
                  <Text style={styles.validityValue}>{formatDate(campaign.startTime)}</Text>
                </View>
              </View>
              <View style={styles.validityArrow}>
                <Ionicons name="arrow-forward" size={20} color={COLORS.gray300} />
              </View>
              <View style={styles.validityItem}>
                <View style={[styles.validityIconBg, { backgroundColor: COLORS.red100 }]}>
                  <Ionicons name="stop-circle" size={20} color={COLORS.red500} />
                </View>
                <View>
                  <Text style={styles.validityLabel}>Ends</Text>
                  <Text style={styles.validityValue}>{formatDate(campaign.endTime)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Offer Details */}
        {(campaign.minOrderValue || campaign.maxBenefit) && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.purple50 }]}>
                <Ionicons name="receipt-outline" size={18} color={COLORS.purple500} />
              </View>
              <Text style={styles.sectionHeaderTitle}>Offer Details</Text>
            </View>
            <View style={styles.detailsGrid}>
              {campaign.minOrderValue && (
                <View style={styles.detailCard}>
                  <Ionicons name="cart-outline" size={24} color={COLORS.blue500} />
                  <Text style={styles.detailValue}>{regionCurrencySymbol}{campaign.minOrderValue}</Text>
                  <Text style={styles.detailLabel}>Minimum Order</Text>
                </View>
              )}
              {campaign.maxBenefit && (
                <View style={styles.detailCard}>
                  <Ionicons name="trending-up-outline" size={24} color={COLORS.green500} />
                  <Text style={styles.detailValue}>{regionCurrencySymbol}{campaign.maxBenefit}</Text>
                  <Text style={styles.detailLabel}>Max Benefit</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Terms & Conditions */}
        {campaign.terms && campaign.terms.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.gray100 }]}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.gray600} />
              </View>
              <Text style={styles.sectionHeaderTitle}>Terms & Conditions</Text>
            </View>
            <View style={styles.termsCard}>
              {campaign.terms.map((term, idx) => (
                <View key={idx} style={styles.termRow}>
                  <View style={styles.termBullet}>
                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                  </View>
                  <Text style={styles.termText}>{term}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Store Info Card */}
        {storeId && deal.store && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.cyan500 + '20' }]}>
                <Ionicons name="storefront-outline" size={18} color={COLORS.cyan500} />
              </View>
              <Text style={styles.sectionHeaderTitle}>Redeem At</Text>
            </View>
            <Pressable style={styles.storeCard} onPress={handleVisitStore}>
              <View style={styles.storeInfo}>
                <View style={styles.storeAvatar}>
                  <Ionicons name="storefront" size={24} color={COLORS.navy} />
                </View>
                <View style={styles.storeDetails}>
                  <Text style={styles.storeName}>{deal.store}</Text>
                  <Text style={styles.storeSubtext}>Tap to view store details</Text>
                </View>
              </View>
              <View style={styles.storeArrow}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </View>
            </Pressable>
          </View>
        )}

        {/* Bottom Spacing - accounts for fixed CTA + tab bar */}
        <View style={{ height: Platform.OS === 'ios' ? 180 : 160 }} />
      </ScrollView>

      {/* Fixed CTA Section */}
      <View style={styles.ctaContainer}>
        <LinearGradient colors={['transparent', COLORS.white, COLORS.white]} style={styles.ctaGradient}>
          {/* Already Redeemed Info */}
          {alreadyRedeemed && existingRedemptionCode && (
            <View style={styles.alreadyRedeemedInfo}>
              <View style={styles.alreadyRedeemedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.green500} />
                <Text style={styles.alreadyRedeemedText}>Already Redeemed</Text>
              </View>
              <Text style={styles.existingCodeText}>Code: {existingRedemptionCode}</Text>
            </View>
          )}

          {/* Price display for paid deals (only if not already redeemed) */}
          {isPaidDeal && !alreadyRedeemed && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Deal Price</Text>
              <Text style={styles.priceValue}>{getCurrencySymbol(dealCurrency)}{dealPrice}</Text>
            </View>
          )}
          <View style={styles.ctaContent}>
            <Pressable
              style={[
                styles.redeemButton,
                (isRedeeming || isPurchasing) && styles.redeemButtonDisabled,
                (deal as any)?.isSoldOut && styles.redeemButtonSoldOut,
                alreadyRedeemed && styles.redeemButtonRedeemed,
              ]}
              onPress={
                alreadyRedeemed
                  ? () => router.push('/my-deals' as any)
                  : isPaidDeal
                  ? handlePurchase
                  : handleRedeem
              }
              disabled={isRedeeming || isPurchasing || (deal as any)?.isSoldOut}
             
            >
              <LinearGradient
                colors={
                  (deal as any)?.isSoldOut
                    ? [COLORS.gray400, COLORS.gray400]
                    : (isRedeeming || isPurchasing)
                    ? [COLORS.gray400, COLORS.gray400]
                    : alreadyRedeemed
                    ? [COLORS.blue500, colors.brand.blue]
                    : isPaidDeal
                    ? [COLORS.amber500, COLORS.amber600]
                    : [COLORS.green500, COLORS.emerald500]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.redeemButtonGradient}
              >
                {(isRedeeming || isPurchasing) ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (deal as any)?.isSoldOut ? (
                  <>
                    <Ionicons name="close-circle" size={22} color={COLORS.white} />
                    <Text style={styles.redeemButtonText}>Sold Out</Text>
                  </>
                ) : alreadyRedeemed ? (
                  <>
                    <Ionicons name="gift" size={22} color={COLORS.white} />
                    <Text style={styles.redeemButtonText}>View My Deals</Text>
                  </>
                ) : isPaidDeal ? (
                  <>
                    <Ionicons name="cart" size={22} color={COLORS.white} />
                    <Text style={styles.redeemButtonText}>Buy Deal • {getCurrencySymbol(dealCurrency)}{dealPrice}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="gift" size={22} color={COLORS.white} />
                    <Text style={styles.redeemButtonText}>Redeem Deal</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
            {storeId && (
              <Pressable style={styles.visitButton} onPress={handleVisitStore}>
                <Ionicons name="storefront-outline" size={22} color={alreadyRedeemed ? COLORS.blue500 : isPaidDeal ? COLORS.amber500 : COLORS.green500} />
              </Pressable>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Success Modal - Works on both web and native */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Success Icon */}
            <View style={styles.modalIconContainer}>
              <LinearGradient
                colors={[COLORS.green500, COLORS.emerald500]}
                style={styles.modalIconGradient}
              >
                <Ionicons name="checkmark" size={40} color={COLORS.white} />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>{successModalData?.title}</Text>

            {/* Redemption Code */}
            {successModalData?.redemptionCode && (
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Your Redemption Code</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{successModalData.redemptionCode}</Text>
                </View>
              </View>
            )}

            {/* Message */}
            <Text style={styles.modalMessage}>{successModalData?.message}</Text>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              {successModalData?.showViewDeals && (
                <Pressable
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push('/my-deals' as any);
                  }}
                >
                  <LinearGradient
                    colors={[COLORS.green500, COLORS.emerald500]}
                    style={styles.modalPrimaryBtnGradient}
                  >
                    <Ionicons name="gift-outline" size={18} color={COLORS.white} />
                    <Text style={styles.modalPrimaryBtnText}>View My Deals</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {successModalData?.showVisitStore && successModalData.storeId && (
                <Pressable
                  style={styles.modalSecondaryBtn}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push({
                      pathname: '/MainStorePage',
                      params: {
                        storeId: successModalData.storeId!,
                        storeData: JSON.stringify({
                          id: successModalData.storeId,
                          name: deal?.store || 'Store',
                          title: deal?.store || 'Store',
                          image: deal?.image || '',
                        }),
                        storeType: 'dynamic',
                        redemptionCode: successModalData.redemptionCode,
                      },
                    } as any);
                  }}
                >
                  <Ionicons name="storefront-outline" size={18} color={COLORS.green500} />
                  <Text style={styles.modalSecondaryBtnText}>Visit Store</Text>
                </Pressable>
              )}

              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    backgroundColor: COLORS.white,
    padding: Spacing['3xl'],
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    ...Shadows.strong,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.body,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: COLORS.white,
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    ...Shadows.strong,
    maxWidth: 320,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: COLORS.red50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  errorTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  errorButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Hero Section
  heroSection: {
    height: 320,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  urgentBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : Spacing.base,
    left: '50%',
    transform: [{ translateX: -60 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.red500,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: 6,
  },
  urgentBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: COLORS.white,
  },
  paidBadge: {
    backgroundColor: COLORS.amber500,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : Spacing.base,
    left: Spacing.base,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : Spacing.base,
    right: Spacing.base,
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  storeBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.white,
  },
  heroTitle: {
    ...Typography.h1,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },

  // Value Card
  valueCardContainer: {
    paddingHorizontal: Spacing.base,
    marginTop: -50,
    marginBottom: Spacing.base,
  },
  valueCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  valueCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueIconBg: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueTextContainer: {
    marginLeft: Spacing.base,
    flex: 1,
  },
  valueType: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  valueAmount: {
    ...Typography.h1,
    fontWeight: '800',
    color: COLORS.gold,
    marginTop: 2,
  },
  valueDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: Spacing.base,
  },
  savingsInfo: {
    alignItems: 'flex-end',
  },
  savingsLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  savingsAmount: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.green500,
  },
  cardDecor1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardDecor2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  // Countdown
  countdownSection: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.subtle,
  },
  countdownGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  countdownItem: {
    backgroundColor: COLORS.gray50,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    minWidth: 70,
  },
  countdownItemUrgent: {
    backgroundColor: COLORS.red50,
  },
  countdownNumber: {
    ...Typography.h1,
    fontWeight: '800',
    color: COLORS.navy,
  },
  countdownNumberUrgent: {
    color: COLORS.red500,
  },
  countdownLabel: {
    ...Typography.caption,
    color: COLORS.gray600,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  countdownSeparator: {
    paddingHorizontal: Spacing.sm,
  },
  countdownColon: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.gray300,
  },

  // Sections
  section: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.subtle,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  sectionHeaderTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
  },

  // Steps
  stepsContainer: {
    gap: 0,
  },
  stepItem: {
    position: 'relative',
  },
  stepNumber: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1,
  },
  stepNumberGradient: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 40,
    paddingBottom: Spacing.lg,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: COLORS.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 2,
  },
  stepDesc: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
    lineHeight: 18,
  },
  stepConnector: {
    position: 'absolute',
    left: 13,
    top: 28,
    width: 2,
    height: 52,
    backgroundColor: COLORS.gray200,
  },

  // Highlights
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  highlightItem: {
    width: (SCREEN_WIDTH - 72) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.gray50,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.navy,
    flex: 1,
  },

  // About
  aboutCard: {
    backgroundColor: COLORS.gray50,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  aboutText: {
    ...Typography.body,
    color: COLORS.gray600,
    lineHeight: 22,
  },

  // Validity
  validityCard: {
    backgroundColor: COLORS.gray50,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  validityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  validityIconBg: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validityLabel: {
    ...Typography.caption,
    color: COLORS.gray600,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  validityValue: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: 2,
  },
  validityArrow: {
    paddingHorizontal: Spacing.md,
  },

  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  detailCard: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  detailValue: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  detailLabel: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
    fontWeight: '500',
  },

  // Terms
  termsCard: {
    gap: Spacing.md,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  termBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.green500,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  termText: {
    flex: 1,
    ...Typography.body,
    color: COLORS.gray600,
    lineHeight: 20,
  },

  // Store Card
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  storeAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.subtle,
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 2,
  },
  storeSubtext: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
  },
  storeArrow: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 85 : 70, // Account for tab bar
    left: 0,
    right: 0,
  },
  ctaGradient: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  priceLabel: {
    ...Typography.body,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  priceValue: {
    ...Typography.h2,
    fontWeight: '800',
    color: COLORS.amber600,
  },
  ctaContent: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  redeemButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.green500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  redeemButtonDisabled: {
    shadowOpacity: 0,
  },
  redeemButtonSoldOut: {
    shadowOpacity: 0,
  },
  redeemButtonRedeemed: {
    shadowColor: COLORS.blue500,
  },
  alreadyRedeemedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  alreadyRedeemedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: Spacing.xs,
  },
  alreadyRedeemedText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.green600,
  },
  existingCodeText: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.navy,
    letterSpacing: 1,
  },
  redeemButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: 10,
  },
  redeemButtonText: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.white,
  },
  visitButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.green500,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['2xl'],
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...Shadows.strong,
  },
  modalIconContainer: {
    marginBottom: Spacing.lg,
  },
  modalIconGradient: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.base,
    textAlign: 'center',
  },
  codeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  codeLabel: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeBox: {
    backgroundColor: COLORS.green50,
    borderWidth: 2,
    borderColor: COLORS.green500,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
  },
  codeText: {
    ...Typography.h1,
    fontWeight: '800',
    color: COLORS.green600,
    letterSpacing: 3,
  },
  modalMessage: {
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    width: '100%',
    gap: Spacing.md,
  },
  modalPrimaryBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  modalPrimaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  modalPrimaryBtnText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: COLORS.green500,
    gap: 8,
  },
  modalSecondaryBtnText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.green500,
  },
  modalCloseBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    ...Typography.body,
    color: COLORS.gray600,
  },
});

export default withErrorBoundary(DealDetailPage, 'DealsCampaignIdDealIndex');
