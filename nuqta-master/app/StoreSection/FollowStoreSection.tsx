import { withErrorBoundary } from '@/utils/withErrorBoundary';
// FollowStoreSection.tsx
// Premium Glassmorphism "Follow Store" section
// Inspired by Apple's Liquid Glass design

import React, { useState, useEffect} from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { triggerImpact, triggerNotification } from "@/utils/haptics";
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import wishlistApi from '@/services/wishlistApi';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Premium Design Tokens from TASK.md - Mustard & Gold Theme
const GLASS = {
  // Light Glass (Primary - for cards)
  lightBg: 'rgba(255, 255, 255, 0.7)',
  lightBorder: 'rgba(255, 255, 255, 0.4)',
  lightHighlight: 'rgba(255, 255, 255, 0.6)',

  // Frosted Glass (for overlays)
  frostedBg: 'rgba(255, 255, 255, 0.85)',
  frostedBorder: 'rgba(255, 255, 255, 0.5)',

  // Tinted Glass (mustard tint) - Default state
  tintedGreenBg: 'rgba(255, 205, 87, 0.08)',
  tintedGreenBorder: 'rgba(255, 205, 87, 0.2)',

  // Gold tinted glass for following state
  tintedGoldBg: 'rgba(255, 200, 87, 0.12)',
  tintedGoldBorder: 'rgba(255, 200, 87, 0.35)' };


interface FollowStoreSectionProps {
  storeData?: {
    id?: string;
    _id?: string;
    name?: string;
    title?: string;
    image?: string;
    logo?: string;
    category?: string;
    cashback?: number;
    discount?: number;
  } | null;
  isFollowingProp?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

function FollowStoreSection({
  storeData,
  isFollowingProp,
  onFollowChange }: FollowStoreSectionProps) {
  const isMounted = useIsMounted();
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();

  const [isFollowing, setIsFollowing] = useState(isFollowingProp ?? false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(isFollowingProp === undefined);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Sync with parent prop
  useEffect(() => {
    if (isFollowingProp !== undefined) {
      setIsFollowing(isFollowingProp);
      setIsCheckingStatus(false);
    }
  }, [isFollowingProp]);

  // Animation refs
  const heartScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const pulseAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0.3);
  const toggleAnim = useSharedValue(0);

  const glowAnimStyle = useAnimatedStyle(() => ({ opacity: glowAnim.value }));
  const iconScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isFollowing ? heartScale.value * pulseAnim.value : heartScale.value }],
  }));
  const buttonScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));
  const toggleKnobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(toggleAnim.value, [0, 1], [2, 24]) }],
  }));

  const storeId = storeData?.id || storeData?._id;
  const storeName = storeData?.name || storeData?.title || 'this store';

  // Animate toggle position
  useEffect(() => {
    toggleAnim.value = withSpring(notificationsEnabled ? 1 : 0, { damping: 8, stiffness: 100 });
  }, [notificationsEnabled]);

  // Pulse animation for following state
  useEffect(() => {
    if (isFollowing) {
      pulseAnim.value = withRepeat(withSequence(
          withTiming(1.08, { duration: 1200 }),
          withTiming(1, { duration: 1200 })
        ), -1);
    }
  }, [isFollowing]);

  // Glow pulse animation — only run when following
  useEffect(() => {
    if (!isFollowing) {
      glowAnim.value = 0.3;
      return;
    }
    glowAnim.value = withRepeat(withSequence(
        withTiming(0.6, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 }),
      ), -1);
  }, [isFollowing]);

  // Check follow status on mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!storeId || !isAuthenticated) {
        setIsCheckingStatus(false);
        return;
      }

      try {
        const response = await wishlistApi.checkWishlistStatus('store', storeId);
        if (response.success && response.data?.inWishlist) {
          setIsFollowing(true);
        }
      } catch (error) {
      } finally {
        if (!isMounted()) return;
        setIsCheckingStatus(false);
      }
    };

    checkFollowStatus();
  }, [storeId, isAuthenticated]);

  // Heart animation
  const animateHeart = () => {
    heartScale.value = withSequence(
      withTiming(1.3, { duration: 120 }),
      withSpring(1, { damping: 4, stiffness: 120 }),
    );
  };

  // Button press animation
  const animateButton = (toValue: number) => {
    buttonScale.value = withSpring(toValue, { damping: 8, stiffness: 120 });
  };

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      showAlert(
        'Sign In Required',
        'Please sign in to follow stores and get updates on their offers.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/sign-in') },
        ],
        'info'
      );
      return;
    }

    if (!storeId) {
      showAlert('Error', 'Store information not available', undefined, 'error');
      return;
    }

    triggerImpact('Medium');

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    onFollowChange?.(!wasFollowing);
    setIsLoading(true);

    try {
      if (wasFollowing) {
        const response = await wishlistApi.removeFromWishlist('store', storeId);
        if (response.success) {
          triggerNotification('Success');
          animateHeart();
        } else {
          throw new Error(response.message || 'Failed to unfollow');
        }
      } else {
        const response = await wishlistApi.addToWishlist({
          itemType: 'store',
          itemId: storeId,
          notes: `Following ${storeName}`,
          priority: 'medium' });

        if (response.success) {
          triggerNotification('Success');
          animateHeart();
          showAlert(
            'Store Followed!',
            `You're now following ${storeName}. You'll see their latest offers in your feed.`,
            undefined,
            'success'
          );
        } else {
          throw new Error(response.message || 'Failed to follow');
        }
      }
    } catch (error) {
      if (!isMounted()) return;
      setIsFollowing(wasFollowing);
      onFollowChange?.(wasFollowing);
      triggerNotification('Error');
      showAlert('Error', 'Something went wrong. Please try again.', undefined, 'error');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleNotificationToggle = () => {
    if (!isFollowing) {
      showAlert('Follow First', 'Please follow the store first to enable notifications.', undefined, 'warning');
      return;
    }

    triggerImpact('Light');
    setNotificationsEnabled(!notificationsEnabled);
  };

  if (isCheckingStatus) {
    return (
      <View style={styles.container}>
        <View style={styles.glassCard}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.gold} />
            <ThemedText style={styles.loadingText}>Checking status...</ThemedText>
          </View>
        </View>
      </View>
    );
  }

  // Glass card content renderer (supports both web and native)
  const renderGlassContent = () => (
    <>
      {/* Inner highlight for glass effect */}
      <View style={styles.glassHighlight} />

      <Pressable
       
        style={styles.cardContent}
        onPress={handleFollowToggle}
        onPressIn={() => animateButton(0.97)}
        onPressOut={() => animateButton(1)}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={isFollowing ? `Unfollow ${storeName}` : `Follow ${storeName}`}
        accessibilityState={{ selected: isFollowing }}
      >
        {/* Left: Animated Heart Icon with Glow */}
        <View style={styles.iconWrapper}>
          {/* Glow effect behind icon */}
          {isFollowing && (
            <Animated.View
              style={[styles.iconGlow, glowAnimStyle, { backgroundColor: Colors.gold }]}
            />
          )}

          <Animated.View
            style={[
              styles.iconContainer,
              isFollowing ? styles.iconContainerFollowing : styles.iconContainerDefault,
              useAnimatedStyle(() => ({
                transform: [
                  { scale: heartScale.value * (isFollowing ? pulseAnim.value : 1) }
                ]
              }))
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? Colors.nileBlue : Colors.gold} />
            ) : (
              <Ionicons
                name={isFollowing ? 'heart' : 'heart-outline'}
                size={28}
                color={isFollowing ? Colors.nileBlue : Colors.gold}
              />
            )}
          </Animated.View>
        </View>

        {/* Center: Text Content */}
        <View style={styles.textContainer}>
          <ThemedText style={[styles.title, isFollowing && styles.titleFollowing]}>
            {isFollowing ? 'Following' : 'Follow Store'}
          </ThemedText>
          <ThemedText style={styles.subtitle} numberOfLines={1}>
            {isFollowing
              ? `You're following ${storeName}`
              : 'Get exclusive offers & updates'}
          </ThemedText>
        </View>

        {/* Right: Action Badge */}
        <View style={[
          styles.actionBadge,
          isFollowing ? styles.actionBadgeFollowing : styles.actionBadgeDefault
        ]}>
          <Ionicons
            name={isFollowing ? 'checkmark' : 'add'}
            size={20}
            color={isFollowing ? Colors.nileBlue : Colors.gold}
          />
        </View>
      </Pressable>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Main Follow Card - Glass Effect */}
      <Animated.View style={[styles.cardWrapper, buttonScaleStyle]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={60}
            tint="light"
            style={[
              styles.glassCard,
              isFollowing ? styles.glassCardFollowing : styles.glassCardDefault
            ]}
          >
            {renderGlassContent()}
          </BlurView>
        ) : (
          <View
            style={[
              styles.glassCard,
              styles.glassCardAndroid,
              isFollowing ? styles.glassCardFollowing : styles.glassCardDefault
            ]}
          >
            {renderGlassContent()}
          </View>
        )}
      </Animated.View>

      {/* Notification Toggle Card - Glass Effect */}
      {isFollowing && (
        <Animated.View style={styles.notificationWrapper}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={50} tint="light" style={styles.notificationCard}>
              {renderNotificationContent()}
            </BlurView>
          ) : (
            <View style={[styles.notificationCard, styles.notificationCardAndroid]}>
              {renderNotificationContent()}
            </View>
          )}
        </Animated.View>
      )}

      {/* Benefits Section - Glass Cards */}
      {!isFollowing && (
        <View style={styles.benefitsSection}>
          <ThemedText style={styles.benefitsTitle}>Why Follow?</ThemedText>
          <View style={styles.benefitsGrid}>
            {[
              { icon: 'flash', label: 'Early Access', colors: [colors.linen, colors.lightMustard], iconColor: colors.nileBlue },
              { icon: 'pricetag', label: 'Exclusive Deals', colors: [colors.lavenderMist, '#b8d4ed'], iconColor: colors.nileBlue },
              { icon: 'gift', label: 'Special Rewards', colors: [colors.lightPeach, colors.brand.sand], iconColor: colors.nileBlue },
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitCard}>
                <LinearGradient
                  colors={benefit.colors as [string, string]}
                  style={styles.benefitIconBg}
                >
                  <Ionicons name={benefit.icon as any} size={18} color={benefit.iconColor} />
                </LinearGradient>
                <ThemedText style={styles.benefitText}>{benefit.label}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // Notification content renderer
  function renderNotificationContent() {
    return (
      <>
        <View style={styles.notificationHighlight} />
        <Pressable
          style={styles.notificationRow}
          onPress={handleNotificationToggle}
         
          accessibilityRole="switch"
          accessibilityLabel="Deal notifications"
          accessibilityState={{ checked: notificationsEnabled }}
        >
          <View style={styles.notificationLeft}>
            <View style={[
              styles.notificationIconBg,
              notificationsEnabled && styles.notificationIconBgActive
            ]}>
              <Ionicons
                name={notificationsEnabled ? 'notifications' : 'notifications-outline'}
                size={20}
                color={notificationsEnabled ? Colors.background.primary : Colors.text.secondary}
              />
            </View>
            <View style={styles.notificationTextContainer}>
              <ThemedText style={styles.notificationTitle}>Deal Notifications</ThemedText>
              <ThemedText style={styles.notificationSubtitle}>
                Get notified about new offers
              </ThemedText>
            </View>
          </View>

          {/* Premium Glass Toggle Switch */}
          <View style={[styles.toggle, notificationsEnabled && styles.toggleActive]}>
            <Animated.View
              style={[
                styles.toggleKnob,
                toggleKnobStyle,
                notificationsEnabled && styles.toggleKnobActive
              ]}
            >
              {notificationsEnabled && (
                <Ionicons name="checkmark" size={12} color={Colors.success} />
              )}
            </Animated.View>
          </View>
        </Pressable>
      </>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base },

  // Card Wrapper with shadow
  cardWrapper: {
    borderRadius: BorderRadius['2xl'],
    ...Platform.select({
      ios: {
        shadowColor: Colors.nileBlue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24 },
      android: {
        elevation: 8 },
      web: {
        boxShadow: '0 8px 32px rgba(11, 34, 64, 0.12)' } }) },

  // Glass Card Base
  glassCard: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.lightBorder },

  glassCardAndroid: {
    backgroundColor: GLASS.lightBg },

  glassCardDefault: {
    borderColor: GLASS.tintedGreenBorder },

  glassCardFollowing: {
    borderColor: GLASS.tintedGoldBorder },

  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: GLASS.lightHighlight },

  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md },

  loadingText: {
    ...Typography.body,
    color: Colors.text.secondary },

  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg },

  // Icon Styles
  iconWrapper: {
    position: 'relative',
    marginRight: Spacing.base },

  iconGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 36,
    opacity: 0.3 },

  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2 },

  iconContainerDefault: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    borderColor: 'rgba(255, 205, 87, 0.25)' },

  iconContainerFollowing: {
    backgroundColor: Colors.gold,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12 },
      android: {
        elevation: 6 } }) },

  // Text Styles
  textContainer: {
    flex: 1,
    marginRight: Spacing.md },

  title: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    letterSpacing: -0.3 },

  titleFollowing: {
    color: Colors.warning },

  subtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontWeight: '500' },

  // Action Badge
  actionBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2 },

  actionBadgeDefault: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    borderColor: 'rgba(255, 205, 87, 0.25)' },

  actionBadgeFollowing: {
    backgroundColor: Colors.gold,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8 },
      android: {
        elevation: 4 } }) },

  // Notification Card
  notificationWrapper: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    ...Platform.select({
      ios: {
        shadowColor: Colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16 },
      android: {
        elevation: 4 },
      web: {
        boxShadow: '0 4px 20px rgba(11, 34, 64, 0.08)' } }) },

  notificationCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.lightBorder },

  notificationCardAndroid: {
    backgroundColor: GLASS.frostedBg },

  notificationHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: GLASS.lightHighlight },

  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base },

  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1 },

  notificationIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)' },

  notificationIconBgActive: {
    backgroundColor: Colors.success,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8 },
      android: {
        elevation: 4 } }) },

  notificationTextContainer: {
    flex: 1 },

  notificationTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2 },

  notificationSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary },

  // Premium Glass Toggle Switch
  toggle: {
    width: 54,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
    justifyContent: 'center' },

  toggleActive: {
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
    borderColor: 'rgba(255, 205, 87, 0.3)' },

  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4 },
      android: {
        elevation: 3 } }) },

  toggleKnobActive: {
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: Colors.success },

  // Benefits Section
  benefitsSection: {
    marginTop: Spacing.lg },

  benefitsTitle: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8 },

  benefitsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10 },

  benefitCard: {
    flex: 1,
    backgroundColor: GLASS.frostedBg,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GLASS.lightBorder,
    ...Platform.select({
      ios: {
        shadowColor: Colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10 },
      android: {
        elevation: 2 },
      web: {
        boxShadow: '0 2px 12px rgba(11, 34, 64, 0.06)' } }) },

  benefitIconBg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10 },

  benefitText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center' } });

export default withErrorBoundary(FollowStoreSection, 'StoreSectionFollowStoreSection');
