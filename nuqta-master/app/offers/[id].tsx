// @ts-nocheck
// Offer Detail Page
// Dynamic route for individual offer details with redemption

import React, { useState, useEffect } from 'react';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { View, ScrollView, StyleSheet, Pressable, Dimensions, ActivityIndicator, Share, Modal } from 'react-native';
import { DetailPageSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { ThemedText } from '@/components/ThemedText';
import realOffersApi, { Offer } from '@/services/realOffersApi';
import verificationService, { VerificationStatus } from '@/services/verificationApi';
import { useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import logger from '@/utils/logger';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

// Zone types that require verification
const ZONE_VERIFICATION_MAP: Record<string, string> = {
  student: 'student',
  corporate: 'corporate',
  defence: 'defence',
  healthcare: 'healthcare',
  senior: 'senior',
  teacher: 'teacher',
  government: 'government',
  differentlyAbled: 'differentlyAbled',
  'differently-abled': 'differentlyAbled', // Backend uses hyphenated version
  women: 'women',
  birthday: 'birthday',
  'first-time': 'first-time',
};

const { width: screenWidth } = Dimensions.get('window');

function OfferDetailPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [isAlreadyRedeemed, setIsAlreadyRedeemed] = useState(false);
  const [existingVoucherCode, setExistingVoucherCode] = useState('');
  const [imageError, setImageError] = useState(false);

  // Verification states
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [requiredZone, setRequiredZone] = useState<string | null>(null);

  useEffect(() => {
    loadOfferDetails(id as string);
  }, [id, isAuthenticated]);

  const loadOfferDetails = async (offerId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Track offer view
      await realOffersApi.trackOfferView(offerId);

      const response = await realOffersApi.getOfferById(offerId);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setOffer(response.data);
        if (!isMounted()) return;
        setIsLiked(response.data.engagement?.isLikedByUser || false);

        // Reset image error state when loading new offer
        if (!isMounted()) return;
        setImageError(false);

        // Check if offer requires verification
        const offerData = response.data;
        logger.log('📦 [OFFER DATA] Full offer:', JSON.stringify({
          category: offerData.category,
          exclusiveZone: (offerData as any).exclusiveZone,
          userTypeRestriction: offerData.restrictions?.userTypeRestriction,
          eligibilityRequirement: (offerData as any).eligibilityRequirement,
        }, null, 2));
        // Check multiple fields for zone restriction
        const exclusiveZone = (offerData as any).exclusiveZone;
        const userTypeRestriction = offerData.restrictions?.userTypeRestriction;
        const categoryZone = ZONE_VERIFICATION_MAP[offerData.category];

        // Determine the required zone (priority: exclusiveZone > userTypeRestriction > category)
        let zone: string | null = null;
        if (exclusiveZone && ZONE_VERIFICATION_MAP[exclusiveZone]) {
          zone = exclusiveZone;
        } else if (userTypeRestriction && userTypeRestriction !== 'all' && ZONE_VERIFICATION_MAP[userTypeRestriction]) {
          zone = userTypeRestriction;
        } else if (categoryZone) {
          zone = offerData.category;
        }

        logger.log('🔐 [VERIFICATION] Zone check:', { exclusiveZone, userTypeRestriction, category: offerData.category, determinedZone: zone });

        if (zone) {
          if (!isMounted()) return;
          setRequiresVerification(true);
          if (!isMounted()) return;
          setRequiredZone(zone);
          // Check user's verification status for this zone
          if (isAuthenticated) {
            await checkUserVerification(zone);
          }
        }

        // Check if already redeemed
        if (isAuthenticated) {
          checkRedemptionStatus(offerId);
        }
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Failed to load offer details');
      }
    } catch (error) {
      logger.error('Error loading offer details:', error);
      if (!isMounted()) return;
      setError('Failed to load offer details');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const checkUserVerification = async (zone: string) => {
    try {
      logger.log('🔐 [VERIFICATION] Checking verification for zone:', zone);
      const response = await verificationService.getZoneStatus(zone);
      if (response.success && response.data) {
        if (!isMounted()) return;
        setVerificationStatus(response.data);
        logger.log('📋 [VERIFICATION] Status:', response.data);
      }
    } catch (error) {
      logger.error('❌ [VERIFICATION] Error checking verification:', error);
    }
  };

  const checkRedemptionStatus = async (offerId: string) => {
    try {
      logger.log('🔍 [REDEMPTION CHECK] Checking status for offer:', offerId);
      const response = await realOffersApi.getUserRedemptions({ page: 1, limit: 50 });
      logger.log('📥 [REDEMPTION CHECK] API Response:', response);
      
      if (response.success && response.data) {
        // Handle both direct array and paginated response
        const redemptionsArray = Array.isArray(response.data) ? response.data : response.data?.data || [];
        logger.log('📋 [REDEMPTION CHECK] Redemptions found:', redemptionsArray.length);
        logger.log('📋 [REDEMPTION CHECK] All redemptions:', redemptionsArray.map((r: any) => ({
          offerId: r.offer?._id || r.offer?.id || r.offer,
          status: r.status,
          code: r.redemptionCode
        })));
        
        // Check for active or pending redemptions
        const redemption = redemptionsArray.find((r: any) => {
          const rOfferId = r.offer?._id || r.offer?.id || r.offer;
          const currentOfferId = offerId;
          
          // Normalize both IDs to strings for comparison
          const rOfferIdStr = String(rOfferId).replace(/['"]/g, '');
          const currentOfferIdStr = String(currentOfferId).replace(/['"]/g, '');
          
          const offerMatch = rOfferIdStr === currentOfferIdStr;
          const statusMatch = r.status === 'active' || r.status === 'pending';
          
          logger.log('🔎 [REDEMPTION CHECK] Comparing:', {
            rOfferId: rOfferIdStr,
            currentOfferId: currentOfferIdStr,
            match: offerMatch,
            status: r.status,
            statusMatch,
            finalMatch: offerMatch && statusMatch
          });
          
          return offerMatch && statusMatch;
        });
        
        if (redemption) {
          if (!isMounted()) return;
          setIsAlreadyRedeemed(true);
          const code = (redemption as any).redemptionCode || 'Check My Vouchers';
          if (!isMounted()) return;
          setExistingVoucherCode(code);
          logger.log('✅ [REDEMPTION CHECK] User already redeemed this offer!', {
            code,
            redemptionId: redemption._id,
            status: redemption.status
          });
        } else {
          // Make sure to reset if no active redemption found
          if (!isMounted()) return;
          setIsAlreadyRedeemed(false);
          if (!isMounted()) return;
          setExistingVoucherCode('');
          logger.log('ℹ️ [REDEMPTION CHECK] No active redemption found for offer:', offerId);
        }
      } else {
        logger.log('⚠️ [REDEMPTION CHECK] API response unsuccessful:', response);
        if (!isMounted()) return;
        setIsAlreadyRedeemed(false);
      }
    } catch (error) {
      logger.error('❌ [REDEMPTION CHECK] Error checking redemption status:', error);
      if (!isMounted()) return;
      setIsAlreadyRedeemed(false);
    }
  };

  const handleRedeem = async () => {
    logger.log('🎟️ [REDEEM] Button clicked');

    if (!isAuthenticated) {
      logger.log('⚠️ [REDEEM] User not authenticated');
      platformAlertConfirm(
        'Authentication Required',
        'Please sign in to redeem this offer',
        () => router.push('/sign-in'),
        'Sign In'
      );
      return;
    }

    if (!offer) {
      logger.log('❌ [REDEEM] No offer data');
      return;
    }

    // Check if verification is required but user is not verified
    if (requiresVerification && !verificationStatus?.verified) {
      logger.log('⚠️ [REDEEM] Verification required but user not verified');
      platformAlertConfirm(
        'Verification Required',
        `This offer is exclusive to verified ${requiredZone} users. Please complete your verification to access this offer.`,
        () => router.push({
          pathname: '/profile/verification',
          params: { zone: requiredZone }
        } as any),
        'Verify Now'
      );
      return;
    }

    logger.log('✅ [REDEEM] Showing confirmation dialog');
    setShowRedeemModal(true);
  };

  const confirmRedeem = async () => {
    try {
      setShowRedeemModal(false);
      setIsRedeeming(true);
      logger.log('📡 [REDEEM] Calling API for offer:', offer?._id);

      const response = await realOffersApi.redeemOffer(offer!._id);
      logger.log('📥 [REDEEM] API Response:', response);

      if (response.success && response.data) {
        const code = response.data.voucher?.voucherCode || 'Check My Vouchers';
        logger.log('✅ [REDEEM] Success! Voucher code:', code);
        
        if (!isMounted()) return;
        setVoucherCode(code);
        
        // Mark as redeemed and store the code
        if (!isMounted()) return;
        setIsAlreadyRedeemed(true);
        if (!isMounted()) return;
        setExistingVoucherCode(code);
        
        // Re-check redemption status to ensure it's saved
        if (offer?._id) {
          await checkRedemptionStatus(offer._id);
        }
        
        if (!isMounted()) return;
        setShowSuccessModal(true);
      } else {
        const errorMessage = response.message || response.error || 'Failed to redeem offer';
        logger.log('❌ [REDEEM] API returned error:', errorMessage);
        platformAlertSimple('Unable to Redeem', errorMessage);
      }
    } catch (error: any) {
      logger.error('❌ [REDEEM] Error:', error);
      platformAlertSimple('Error', error.message || 'Failed to redeem offer');
    } finally {
      if (!isMounted()) return;
      setIsRedeeming(false);
    }
  };

  const handleLike = async () => {
    if (!offer) return;

    try {
      const response = await realOffersApi.toggleOfferLike(offer._id);
      
      if (response.success && response.data) {
        if (!isMounted()) return;
        setIsLiked(response.data.isLiked);
        if (!isMounted()) return;
        setOffer(prev => prev ? {
          ...prev,
          engagement: {
            ...prev.engagement,
            likesCount: response.data!.likesCount,
            isLikedByUser: response.data!.isLiked
          }
        } : null);
      }
    } catch (error) {
      logger.error('Error toggling like:', error);
    }
  };

  const handleShare = async () => {
    if (!offer) return;

    try {
      await realOffersApi.shareOffer(offer._id);
      
      const savingsText = offer.restrictions?.maxDiscountAmount
        ? `Save up to ${currencySymbol}${offer.restrictions.maxDiscountAmount.toLocaleString()}`
        : offer.cashbackPercentage
          ? `Get ${offer.cashbackPercentage}% cashback`
          : offer.title;

      await Share.share({
        message: `${savingsText} at ${offer.store?.name || 'this store'}!\n\n${offer.title}\n\nSave with ${BRAND.APP_NAME}`,
        title: offer.title,
      });
    } catch (error) {
      logger.error('Error sharing offer:', error);
    }
  };

  const handleStorePress = () => {
    if (offer?.store?.id) {
      router.push(`/MainStorePage?storeId=${offer.store.id}` as any);
    }
  };

  const formatDate = (date: string | Date) => {
    try {
      const dateObj = new Date(date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - dateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'today';
      } else if (diffDays === 1) {
        return 'yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
      } else {
        const years = Math.floor(diffDays / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
      }
    } catch {
      return new Date(date).toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={Colors.text.primary} />
            </Pressable>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <DetailPageSkeleton />
        </View>
      </View>
    );
  }

  if (error || !offer) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={Colors.text.primary} />
            </Pressable>
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <ThemedText style={styles.errorText}>{error || 'Offer not found'}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => loadOfferDetails(id as string)}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  const isExpired = new Date(offer.validity.endDate) < new Date();
  const daysRemaining = Math.ceil((new Date(offer.validity.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Minimal Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={Colors.text.primary} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleLike}
              style={styles.headerButton}
              accessibilityLabel={isLiked ? "Remove from favorites" : "Add to favorites"}
              accessibilityRole="button"
              accessibilityHint={isLiked ? "Double tap to unlike this offer" : "Double tap to like this offer"}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={26}
                color={isLiked ? Colors.error : Colors.text.primary}
              />
            </Pressable>
            <Pressable
              onPress={handleShare}
              style={styles.headerButton}
              accessibilityLabel="Share offer"
              accessibilityRole="button"
              accessibilityHint="Double tap to share this offer"
            >
              <Ionicons name="share-social-outline" size={26} color={Colors.text.primary} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        bounces={true}
        scrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        alwaysBounceVertical={false}
      >
        {/* Offer Image */}
        <View style={styles.imageContainer}>
          {imageError || !offer.image ? (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={64} color="#ccc" />
              <ThemedText style={styles.placeholderText}>Offer Image</ThemedText>
            </View>
          ) : (
            <CachedImage
              source={{ uri: offer.image }}
              style={styles.offerImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => {
                logger.log('❌ [IMAGE] Failed to load image:', offer.image);
                setImageError(true);
              }}
              onLoad={() => {
                logger.log('✅ [IMAGE] Image loaded successfully:', offer.image);
                setImageError(false);
              }}
            />
          )}
          {offer.metadata?.flashSale?.isActive && (
            <View style={styles.flashSaleBadge}>
              <Ionicons name="flash" size={16} color="white" />
              <ThemedText style={styles.flashSaleText}>FLASH SALE</ThemedText>
            </View>
          )}
          {offer.metadata?.featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={16} color="white" />
              <ThemedText style={styles.featuredText}>FEATURED</ThemedText>
            </View>
          )}
        </View>

        {/* Offer Info */}
        <View style={styles.infoSection}>
          {/* Category & Zone Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.categoryBadge}>
              <ThemedText style={styles.categoryText}>{offer.category.toUpperCase()}</ThemedText>
            </View>
            {requiresVerification && (
              <View style={[
                styles.exclusiveBadge,
                verificationStatus?.verified && styles.exclusiveBadgeVerified
              ]}>
                <Ionicons
                  name={verificationStatus?.verified ? 'shield-checkmark' : 'shield'}
                  size={14}
                  color={verificationStatus?.verified ? Colors.success : Colors.nileBlue}
                />
                <ThemedText style={[
                  styles.exclusiveBadgeText,
                  verificationStatus?.verified && styles.exclusiveBadgeTextVerified
                ]}>
                  {requiredZone?.toUpperCase()} EXCLUSIVE
                </ThemedText>
              </View>
            )}
          </View>

          {/* Title */}
          <ThemedText style={styles.title}>{offer.title}</ThemedText>
          
          {/* Subtitle */}
          {offer.subtitle && (
            <ThemedText style={styles.subtitle}>{offer.subtitle}</ThemedText>
          )}

          {/* Cashback Banner */}
          <LinearGradient
            colors={[Colors.nileBlue, '#2d5a7b']}
            style={styles.cashbackBanner}
          >
            <Ionicons name="gift-outline" size={32} color="white" />
            <View style={styles.cashbackInfo}>
              <ThemedText style={styles.cashbackLabel}>GET CASHBACK</ThemedText>
              <ThemedText style={styles.cashbackPercentage}>{offer.cashbackPercentage}%</ThemedText>
            </View>
          </LinearGradient>

          {/* Verification Status Banner */}
          {requiresVerification && (
            <View style={[
              styles.verificationBanner,
              verificationStatus?.verified
                ? styles.verificationBannerVerified
                : verificationStatus?.status === 'pending'
                  ? styles.verificationBannerPending
                  : styles.verificationBannerRequired
            ]}>
              <Ionicons
                name={
                  verificationStatus?.verified
                    ? 'checkmark-circle'
                    : verificationStatus?.status === 'pending'
                      ? 'time'
                      : 'lock-closed'
                }
                size={24}
                color={
                  verificationStatus?.verified
                    ? Colors.success
                    : verificationStatus?.status === 'pending'
                      ? Colors.warning
                      : Colors.error
                }
              />
              <View style={styles.verificationBannerContent}>
                <ThemedText style={[
                  styles.verificationBannerTitle,
                  verificationStatus?.verified && styles.verificationBannerTitleVerified,
                  verificationStatus?.status === 'pending' && styles.verificationBannerTitlePending,
                ]}>
                  {verificationStatus?.verified
                    ? `${requiredZone?.charAt(0).toUpperCase()}${requiredZone?.slice(1)} Verified`
                    : verificationStatus?.status === 'pending'
                      ? 'Verification Pending'
                      : `${requiredZone?.charAt(0).toUpperCase()}${requiredZone?.slice(1)} Verification Required`}
                </ThemedText>
                <ThemedText style={styles.verificationBannerSubtitle}>
                  {verificationStatus?.verified
                    ? 'You can redeem this exclusive offer'
                    : verificationStatus?.status === 'pending'
                      ? 'Your verification is under review'
                      : 'Verify your status to unlock this offer'}
                </ThemedText>
              </View>
              {!verificationStatus?.verified && verificationStatus?.status !== 'pending' && (
                <Pressable
                  style={styles.verifyNowButton}
                  onPress={() => router.push({
                    pathname: '/profile/verification',
                    params: { zone: requiredZone }
                  } as any)}
                >
                  <ThemedText style={styles.verifyNowButtonText}>Verify</ThemedText>
                </Pressable>
              )}
            </View>
          )}

          {/* Store Info */}
          <Pressable
            style={styles.storeCard}
            onPress={handleStorePress}
            accessibilityLabel={`Store: ${offer.store.name}${offer.store.rating ? `. Rating ${offer.store.rating} stars` : ''}${offer.store.verified ? '. Verified store' : ''}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to view store details"
          >
            <View style={styles.storeLogoContainer}>
              {offer.store?.logo ? (
                <CachedImage source={{ uri: offer.store.logo }} style={styles.storeLogo} cachePolicy="memory-disk" />
              ) : (
                <View style={[styles.storeLogo, styles.storeLogoPlaceholder]}>
                  <Ionicons name="storefront-outline" size={24} color={Colors.nileBlue} />
                </View>
              )}
            </View>
            <View style={styles.storeInfo}>
              <ThemedText style={styles.storeName}>{offer.store.name}</ThemedText>
              {offer.store.rating && (
                <View style={styles.storeRating}>
                  <Ionicons name="star" size={14} color={colors.brand.goldBright} />
                  <ThemedText style={styles.ratingText}>{offer.store.rating.toFixed(1)}</ThemedText>
                </View>
              )}
            </View>
            {offer.store.verified && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            )}
            <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
          </Pressable>

          {/* Distance */}
          {offer.distance !== undefined && (
            <View style={styles.distanceCard}>
              <Ionicons name="location" size={20} color={Colors.nileBlue} />
              <ThemedText style={styles.distanceText}>
                {offer.distance.toFixed(1)} km away from you
              </ThemedText>
            </View>
          )}

          {/* Validity */}
          <View
            style={styles.validitySection}
            accessibilityLabel={`Validity: Valid until ${new Date(offer.validity.endDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}${isExpired ? '. This offer has expired' : daysRemaining > 0 ? `. ${daysRemaining} days remaining` : ''}`}
            accessibilityRole="text"
          >
            <View style={styles.validityHeader}>
              <Ionicons name="time-outline" size={20} color={isExpired ? Colors.error : Colors.success} />
              <ThemedText style={styles.validityTitle}>Validity</ThemedText>
            </View>
            <View style={styles.validityInfo}>
              <ThemedText style={styles.validityDate}>
                Valid until: {new Date(offer.validity.endDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </ThemedText>
              {!isExpired && daysRemaining > 0 && (
                <View style={[styles.daysRemainingBadge, daysRemaining <= 7 && styles.daysRemainingUrgent]}>
                  <ThemedText style={styles.daysRemainingText}>
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                  </ThemedText>
                </View>
              )}
              {isExpired && (
                <View style={styles.expiredBadge}>
                  <ThemedText style={styles.expiredText}>EXPIRED</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {offer.description && (
            <View style={styles.descriptionSection}>
              <ThemedText style={styles.sectionTitle}>Description</ThemedText>
              <ThemedText style={styles.description}>{offer.description}</ThemedText>
            </View>
          )}

          {/* Terms & Conditions */}
          {offer.restrictions && (
            <View style={styles.restrictionsSection}>
              <ThemedText style={styles.sectionTitle}>Terms & Conditions</ThemedText>
              {offer.restrictions.minOrderValue && (
                <View style={styles.restrictionItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={Colors.nileBlue} />
                  <ThemedText style={styles.restrictionText}>
                    Minimum order value: {currencySymbol}{offer.restrictions.minOrderValue}
                  </ThemedText>
                </View>
              )}
              {offer.restrictions.maxDiscountAmount && (
                <View style={styles.restrictionItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={Colors.nileBlue} />
                  <ThemedText style={styles.restrictionText}>
                    Maximum discount: {currencySymbol}{offer.restrictions.maxDiscountAmount}
                  </ThemedText>
                </View>
              )}
              {(offer.restrictions as any).usageLimitPerUser && (
                <View style={styles.restrictionItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={Colors.nileBlue} />
                  <ThemedText style={styles.restrictionText}>
                    Can be used {(offer.restrictions as any).usageLimitPerUser} time{(offer.restrictions as any).usageLimitPerUser > 1 ? 's' : ''} per user
                  </ThemedText>
                </View>
              )}
              {offer.restrictions.userTypeRestriction && offer.restrictions.userTypeRestriction !== 'all' && (
                <View style={styles.restrictionItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={Colors.nileBlue} />
                  <ThemedText style={styles.restrictionText}>
                    Only for {offer.restrictions.userTypeRestriction} users
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {/* Engagement Stats */}
          <View
            style={styles.engagementSection}
            accessibilityLabel={`Engagement: ${offer.engagement.likesCount} likes, ${offer.engagement.sharesCount} shares, ${offer.engagement.viewsCount} views`}
            accessibilityRole="text"
          >
            <View style={styles.engagementItem}>
              <Ionicons name="heart" size={20} color={Colors.error} />
              <ThemedText style={styles.engagementText}>{offer.engagement.likesCount} likes</ThemedText>
            </View>
            <View style={styles.engagementItem}>
              <Ionicons name="share-social" size={20} color={Colors.nileBlue} />
              <ThemedText style={styles.engagementText}>{offer.engagement.sharesCount} shares</ThemedText>
            </View>
            <View style={styles.engagementItem}>
              <Ionicons name="eye" size={20} color={Colors.text.tertiary} />
              <ThemedText style={styles.engagementText}>{offer.engagement.viewsCount} views</ThemedText>
            </View>
          </View>
        </View>
        
        {/* Extra spacing at bottom */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Action Button */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        {isAlreadyRedeemed ? (
          <View style={styles.redeemedContainer}>
            <View style={styles.redeemedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              <ThemedText style={styles.redeemedText}>Already Redeemed</ThemedText>
            </View>
            <ThemedText style={styles.voucherCodeSmall}>Code: {existingVoucherCode}</ThemedText>
            <Pressable
              style={styles.viewVouchersButton}
              onPress={() => router.push('/my-vouchers')}
              accessibilityLabel="View my vouchers"
              accessibilityRole="button"
              accessibilityHint="Double tap to view all your vouchers"
            >
              <ThemedText style={styles.viewVouchersButtonText}>View My Vouchers</ThemedText>
            </Pressable>
          </View>
        ) : requiresVerification && !verificationStatus?.verified ? (
          // Verification required but not verified
          <Pressable
            style={[
              styles.redeemButton,
              verificationStatus?.status === 'pending'
                ? styles.redeemButtonPending
                : styles.redeemButtonLocked
            ]}
            onPress={() => {
              if (verificationStatus?.status === 'pending') {
                platformAlertSimple(
                  'Verification Pending',
                  'Your verification is under review. You will be notified once approved.'
                );
              } else {
                router.push({
                  pathname: '/profile/verification',
                  params: { zone: requiredZone }
                } as any);
              }
            }}
            accessibilityLabel={verificationStatus?.status === 'pending' ? 'Verification pending' : 'Verify to unlock'}
            accessibilityRole="button"
          >
            <Ionicons
              name={verificationStatus?.status === 'pending' ? 'time' : 'lock-closed'}
              size={24}
              color="white"
            />
            <ThemedText style={styles.redeemButtonText}>
              {verificationStatus?.status === 'pending'
                ? 'Verification Under Review'
                : `Verify as ${requiredZone?.charAt(0).toUpperCase()}${requiredZone?.slice(1)} to Unlock`}
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.redeemButton, (isExpired || isRedeeming) && styles.redeemButtonDisabled]}
            onPress={handleRedeem}
            disabled={isExpired || isRedeeming}
            accessibilityLabel={isExpired ? 'Offer expired' : 'Redeem offer'}
            accessibilityRole="button"
            accessibilityHint={isExpired ? 'This offer has expired and cannot be redeemed' : 'Double tap to redeem this offer and get your voucher code'}
            accessibilityState={{ disabled: isExpired || isRedeeming }}
          >
            {isRedeeming ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="ticket-outline" size={24} color="white" />
                <ThemedText style={styles.redeemButtonText}>
                  {isExpired ? 'Offer Expired' : 'Redeem Offer'}
                </ThemedText>
              </>
            )}
          </Pressable>
        )}
      </SafeAreaView>

      {/* Redeem Confirmation Modal */}
      <Modal
        visible={showRedeemModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowRedeemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="ticket" size={48} color={Colors.nileBlue} />
            <ThemedText style={styles.modalTitle}>Redeem Offer</ThemedText>
            <ThemedText style={styles.modalMessage}>
              Do you want to redeem this offer?{'\n\n'}
              <ThemedText style={styles.modalOfferTitle}>{offer?.title}</ThemedText>{'\n\n'}
              Cashback: {offer?.cashbackPercentage}%
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowRedeemModal(false)}
              >
                <ThemedText style={styles.modalButtonTextCancel}>Cancel</ThemedText>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmRedeem}
              >
                <ThemedText style={styles.modalButtonTextConfirm}>Redeem</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
            </View>
            <ThemedText style={styles.modalTitle}>Success!</ThemedText>
            <ThemedText style={styles.modalMessage}>
              Offer redeemed successfully!
            </ThemedText>
            <View style={styles.voucherCodeContainer}>
              <ThemedText style={styles.voucherCodeLabel}>Voucher Code:</ThemedText>
              <Pressable
                style={styles.voucherCodeBox}
                onPress={async () => {
                  await Clipboard.setStringAsync(voucherCode);
                  platformAlertSimple('Copied!', 'Voucher code copied to clipboard');
                }}
               
                accessibilityLabel={`Voucher code: ${voucherCode}. Tap to copy`}
                accessibilityRole="button"
                accessibilityHint="Double tap to copy voucher code to clipboard"
              >
                <ThemedText style={styles.voucherCode}>{voucherCode}</ThemedText>
                <Ionicons name="copy-outline" size={20} color={Colors.nileBlue} style={{ marginLeft: 8 }} />
              </Pressable>
            </View>
            <ThemedText style={styles.voucherHint}>
              👆 Tap code to copy • Use during checkout
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowSuccessModal(false)}
              >
                <ThemedText style={styles.modalButtonTextCancel}>Close</ThemedText>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push('/my-vouchers');
                }}
              >
                <ThemedText style={styles.modalButtonTextConfirm}>View Vouchers</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'flex-start',
  },
  safeArea: {
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 120, // Small padding for scroll content
    flexGrow: 1,
  },
  bottomSpacing: {
    height: 200, // Space to ensure content is visible above bottom bar (accounts for absolute positioned bottomBar + tab nav)
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: Colors.background.secondary,
    position: 'relative',
  },
  offerImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: Spacing.sm,
    color: Colors.text.tertiary,
    ...Typography.body,
  },
  flashSaleBadge: {
    position: 'absolute',
    top: Spacing.base,
    left: Spacing.base,
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: Spacing.xs,
  },
  flashSaleText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  featuredBadge: {
    position: 'absolute',
    top: Spacing.base,
    right: Spacing.base,
    backgroundColor: Colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: Spacing.xs,
  },
  featuredText: {
    color: Colors.text.primary,
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  infoSection: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.lg,
    gap: Spacing.base,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.tint.pink,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  categoryText: {
    color: Colors.nileBlue,
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  exclusiveBadge: {
    backgroundColor: colors.tint.purple,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  exclusiveBadgeVerified: {
    backgroundColor: Colors.successScale[100],
  },
  exclusiveBadgeText: {
    color: Colors.nileBlue,
    ...Typography.caption,
    fontWeight: '700',
  },
  exclusiveBadgeTextVerified: {
    color: Colors.success,
  },
  title: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    marginTop: -Spacing.sm,
  },
  cashbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.base,
  },
  cashbackInfo: {
    flex: 1,
  },
  cashbackLabel: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '500',
    opacity: 0.9,
  },
  cashbackPercentage: {
    color: Colors.text.inverse,
    fontSize: 32,
    fontWeight: '700',
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  storeLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  storeLogo: {
    width: 48,
    height: 48,
  },
  storeLogoPlaceholder: {
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  storeName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  storeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  distanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: colors.tint.pink,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  distanceText: {
    ...Typography.body,
    color: Colors.nileBlue,
    fontWeight: '500',
  },
  validitySection: {
    padding: Spacing.base,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  validityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  validityTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  validityInfo: {
    gap: Spacing.sm,
  },
  validityDate: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  daysRemainingBadge: {
    backgroundColor: Colors.success,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  daysRemainingUrgent: {
    backgroundColor: Colors.warning,
  },
  daysRemainingText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  expiredBadge: {
    backgroundColor: Colors.error,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  expiredText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  descriptionSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  description: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 22,
  },
  restrictionsSection: {
    padding: Spacing.base,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  restrictionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  restrictionText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  engagementSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    paddingBottom: 90, // Extra padding to account for bottom navigation tab bar (60px tab + 30px safe area)
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    ...Shadows.strong,
  },
  redeemButton: {
    backgroundColor: Colors.nileBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  redeemButtonDisabled: {
    backgroundColor: Colors.border.default,
  },
  redeemButtonLocked: {
    backgroundColor: Colors.error,
  },
  redeemButtonPending: {
    backgroundColor: Colors.warning,
  },
  redeemButtonText: {
    color: Colors.text.inverse,
    ...Typography.h4,
  },
  redeemedContainer: {
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.md,
  },
  redeemedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  redeemedText: {
    color: Colors.success,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  voucherCodeSmall: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  viewVouchersButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    width: '100%',
    alignItems: 'center',
  },
  viewVouchersButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.base,
  },
  errorText: {
    ...Typography.bodyLarge,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: 30,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    ...Shadows.strong,
  },
  modalTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.md,
  },
  modalMessage: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  modalOfferTitle: {
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.background.secondary,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.nileBlue,
  },
  modalButtonTextCancel: {
    color: Colors.text.tertiary,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  successIcon: {
    marginBottom: Spacing.sm,
  },
  voucherCodeContainer: {
    width: '100%',
    marginTop: Spacing.lg,
    marginBottom: Spacing.base,
  },
  voucherCodeLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  voucherCodeBox: {
    backgroundColor: colors.tint.pink,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.nileBlue,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherCode: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.nileBlue,
    textAlign: 'center',
    letterSpacing: 2,
  },
  voucherHint: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  // Verification banner styles
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  verificationBannerRequired: {
    backgroundColor: Colors.errorScale[100],
    borderWidth: 1,
    borderColor: colors.errorScale[200],
  },
  verificationBannerPending: {
    backgroundColor: Colors.warningScale[50],
    borderWidth: 1,
    borderColor: colors.warningScale[200],
  },
  verificationBannerVerified: {
    backgroundColor: Colors.successScale[100],
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verificationBannerContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  verificationBannerTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.error,
  },
  verificationBannerTitlePending: {
    color: Colors.gold,
  },
  verificationBannerTitleVerified: {
    color: Colors.success,
  },
  verificationBannerSubtitle: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  verifyNowButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  verifyNowButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
});

export default withErrorBoundary(OfferDetailPage, 'OfferDetail');
