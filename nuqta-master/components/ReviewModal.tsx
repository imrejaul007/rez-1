// ReviewModal.tsx - Premium Glassmorphism Design
// Reviews & Ratings Modal - Green & Gold Theme

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import StarRating from '@/components/StarRating';
import RatingBreakdown from '@/components/RatingBreakdown';
import ReviewActionButton from '@/components/ReviewActionButton';
import ReviewTabs from '@/components/ReviewTabs';
import ReviewCard from '@/components/ReviewCard';
import UGCGrid from '@/components/UGCGrid';
import { ReviewModalProps, TabType } from '@/types/reviews';
import { colors } from '@/constants/theme';

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
};

function ReviewModal({
  visible,
  onClose,
  storeName,
  storeId,
  averageRating,
  totalReviews,
  ratingBreakdown,
  reviews,
  onWriteReview,
  onLikeReview,
  onReportReview,
  onHelpfulReview,
  ugcContent = [],
  ugcLoading = false,
}: ReviewModalProps) {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [activeTab, setActiveTab] = useState<TabType>('reviews');

  // Log props when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Modal is visible - any side effects can be added here if needed
    }
  }, [visible, storeName, storeId, averageRating, totalReviews, ratingBreakdown, reviews, ugcContent, ugcLoading]);

  const slideAnim = useSharedValue(screenData.height);
  const fadeAnim = useSharedValue(0);
  const resizeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        setScreenData(window);
        if (!visible) slideAnim.value = window.height;
      }, 100);
    });

    return () => {
      subscription?.remove();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, [slideAnim, visible]);

  const styles = useMemo(() => createStyles(screenData), [screenData]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 300 });
      slideAnim.value = withSpring(0, { damping: 12, stiffness: 100 });
    } else {
      fadeAnim.value = withTiming(0, { duration: 200 });
      slideAnim.value = withTiming(screenData.height, { duration: 250 });
    }
  }, [visible, screenData.height]);

  const blurContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const modalSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const handleTabChange = useCallback((tab: TabType) => setActiveTab(tab), []);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Reviews and ratings dialog"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View style={[styles.blurContainer, blurContainerStyle]}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={60} tint="dark" style={styles.blur} />
            ) : (
              <View style={[styles.blur, styles.androidBlur]} />
            )}
          </Animated.View>

          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                modalSlideStyle,
              ]}
            >
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
    </Modal>
  );

  function renderModalContent() {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.modalContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Glass Highlight */}
        <View style={styles.glassHighlight} />

        {/* Handle Bar */}
        <View style={styles.handleBar} />

        {/* Close Button */}
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close reviews and ratings"
          accessibilityRole="button"
          accessibilityHint="Double tap to close this dialog"
        >
          <View style={styles.closeButtonInner}>
            <Ionicons name="close" size={18} color={COLORS.textPrimary} />
          </View>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Reviews & Ratings</ThemedText>
          <ThemedText style={styles.storeName}>{storeName}</ThemedText>
        </View>

        {/* Rating Summary - Glass Card */}
        <View style={styles.ratingSummaryCard}>
          <View style={styles.ratingSummaryGlass}>
            <View style={styles.averageRatingContainer}>
              <ThemedText style={styles.averageRatingNumber}>
                {averageRating.toFixed(1)}
              </ThemedText>
              <ThemedText style={styles.outOfFive}> / 5</ThemedText>
            </View>
            <View style={styles.starsContainer}>
              <StarRating rating={averageRating} size="large" showHalf={true} />
            </View>
            <ThemedText style={styles.totalReviewsText}>
              Based on {totalReviews.toLocaleString()} reviews
            </ThemedText>
          </View>
        </View>

        {/* Rating Breakdown - Glass Card */}
        <View style={styles.breakdownSection}>
          <View style={styles.glassCard}>
            <RatingBreakdown
              ratingBreakdown={ratingBreakdown}
              totalReviews={totalReviews}
            />
          </View>
        </View>

        {/* Action Section - Already Reviewed Banner */}
        <View style={styles.actionSection}>
          {!onWriteReview ? (
            <View style={styles.alreadyReviewedBanner}>
              <View style={styles.alreadyReviewedContent}>
                <View style={styles.alreadyReviewedIconContainer}>
                  <Ionicons name="star" size={20} color={COLORS.gold} />
                </View>
                <ThemedText style={styles.alreadyReviewedText}>
                  You have already reviewed this store
                </ThemedText>
                <Pressable style={styles.editReviewButton}>
                  <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.writeReviewButton} onPress={onWriteReview}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.writeReviewGradient}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.white} />
                <ThemedText style={styles.writeReviewText}>Write a Review</ThemedText>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Tabs - Glass Style */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
            onPress={() => handleTabChange('reviews')}
          >
            {activeTab === 'reviews' ? (
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.tabGradient}
              >
                <ThemedText style={styles.tabTextActive}>Reviews ({totalReviews})</ThemedText>
              </LinearGradient>
            ) : (
              <ThemedText style={styles.tabText}>Reviews ({totalReviews})</ThemedText>
            )}
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'ugc' && styles.tabActive]}
            onPress={() => handleTabChange('ugc')}
          >
            {activeTab === 'ugc' ? (
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.tabGradient}
              >
                <ThemedText style={styles.tabTextActive}>UGC Content</ThemedText>
              </LinearGradient>
            ) : (
              <ThemedText style={styles.tabText}>UGC Content</ThemedText>
            )}
          </Pressable>
        </View>

        {/* Content */}
        {activeTab === 'reviews' ? (
          <View style={styles.reviewListContainer}>
            {reviews.length === 0 ? (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.emptyIconContainer}
                >
                  <Ionicons name="chatbubble-outline" size={32} color={COLORS.white} />
                </LinearGradient>
                <ThemedText style={styles.emptyStateTitle}>No reviews yet</ThemedText>
                <ThemedText style={styles.emptyStateText}>
                  Be the first to review this store!
                </ThemedText>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCardWrapper}>
                  <ReviewCard
                    review={review}
                    onLike={onLikeReview ? () => onLikeReview(review.id) : undefined}
                    onReport={onReportReview ? () => onReportReview(review.id) : undefined}
                    onHelpful={onHelpfulReview ? () => onHelpfulReview(review.id) : undefined}
                  />
                </View>
              ))
            )}
          </View>
        ) : (
          ugcLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <ThemedText style={styles.loadingText}>Loading UGC content...</ThemedText>
            </View>
          ) : ugcContent.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={[COLORS.gold, COLORS.goldDark]}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="images-outline" size={32} color={COLORS.navy} />
              </LinearGradient>
              <ThemedText style={styles.emptyStateTitle}>No content yet</ThemedText>
              <ThemedText style={styles.emptyStateText}>
                User-generated content will appear here.
              </ThemedText>
            </View>
          ) : (
            <UGCGrid
              ugcContent={ugcContent}
              onContentPress={() => {}}
              onLikeContent={() => {}}
            />
          )
        )}
      </ScrollView>
    );
  }
}

const createStyles = (screenData: { width: number; height: number }) => {
  const isTabletOrDesktop = screenData.width > 768;
  const modalWidth = isTabletOrDesktop ? Math.min(screenData.width * 0.9, 900) : '100%';
  const modalHeight = isTabletOrDesktop ? Math.min(screenData.height * 0.85, 800) : '85%';

  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: isTabletOrDesktop ? 'center' : 'flex-end',
      alignItems: 'center',
    },
    blurContainer: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
    },
    blur: {
      flex: 1,
    },
    androidBlur: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
      width: modalWidth,
      maxHeight: modalHeight,
      borderRadius: 24,
      overflow: 'hidden',
    },
    modal: {
      flex: 1,
      borderWidth: 1,
      borderColor: GLASS.lightBorder,
      borderRadius: 24,
    },
    modalAndroid: {
      backgroundColor: GLASS.frostedBg,
    },
    scrollView: {
      flex: 1,
    },
    modalContent: {
      padding: 20,
      paddingBottom: 40,
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
      marginVertical: 10,
    },
    closeButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
    },
    closeButtonInner: {
      backgroundColor: GLASS.lightBg,
      borderRadius: 20,
      width: 36,
      height: 36,
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
      alignItems: 'center',
      marginBottom: 20,
      marginTop: 10,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: COLORS.textPrimary,
      letterSpacing: -0.3,
    },
    storeName: {
      fontSize: 15,
      color: COLORS.primary,
      fontWeight: '600',
      marginTop: 4,
    },
    ratingSummaryCard: {
      marginBottom: 20,
    },
    ratingSummaryGlass: {
      alignItems: 'center',
      padding: 24,
      backgroundColor: GLASS.tintedGreenBg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: GLASS.tintedGreenBorder,
      ...Platform.select({
        ios: {
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    averageRatingContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    averageRatingNumber: {
      fontSize: 48,
      fontWeight: '800',
      color: COLORS.textPrimary,
      letterSpacing: -1,
    },
    outOfFive: {
      fontSize: 20,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },
    starsContainer: {
      marginVertical: 12,
    },
    totalReviewsText: {
      fontSize: 14,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },
    breakdownSection: {
      marginBottom: 20,
    },
    glassCard: {
      backgroundColor: GLASS.lightBg,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: GLASS.lightBorder,
      ...Platform.select({
        ios: {
          shadowColor: COLORS.navy,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    actionSection: {
      marginBottom: 20,
    },
    alreadyReviewedBanner: {
      backgroundColor: GLASS.tintedGoldBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: GLASS.tintedGoldBorder,
      overflow: 'hidden',
    },
    alreadyReviewedContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    alreadyReviewedIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 200, 87, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    alreadyReviewedText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textPrimary,
    },
    editReviewButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: GLASS.lightBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: GLASS.tintedGreenBorder,
    },
    writeReviewButton: {
      borderRadius: 14,
      overflow: 'hidden',
    },
    writeReviewGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 8,
    },
    writeReviewText: {
      fontSize: 15,
      fontWeight: '700',
      color: COLORS.white,
    },
    tabsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    tab: {
      flex: 1,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: GLASS.lightBg,
      borderWidth: 1,
      borderColor: GLASS.lightBorder,
    },
    tabActive: {
      borderColor: COLORS.primary,
    },
    tabGradient: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textSecondary,
      textAlign: 'center',
      paddingVertical: 12,
    },
    tabTextActive: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.white,
    },
    reviewListContainer: {
      gap: 12,
    },
    reviewCardWrapper: {
      backgroundColor: GLASS.lightBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: GLASS.lightBorder,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: COLORS.navy,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    emptyState: {
      padding: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: COLORS.textPrimary,
      marginBottom: 8,
    },
    emptyStateText: {
      fontSize: 14,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingContainer: {
      padding: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },
  });
};

export default React.memo(ReviewModal);
