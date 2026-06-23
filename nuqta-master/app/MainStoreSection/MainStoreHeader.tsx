import { withErrorBoundary } from '@/utils/withErrorBoundary';
// MainStoreHeader.tsx - Redesigned for new MainStorePage UI
import React, {} from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  StatusBar,
  Share } from "react-native";
import Animated, {
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import ReZCoin from "@/components/homepage/ReZCoin";
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius } from "@/constants/DesignSystem";
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

export interface MainStoreHeaderProps {
  storeName?: string;
  storeCategory?: string;
  onBack?: () => void;
  onFavoritePress?: () => void;
  isFavorited?: boolean;
  showBack?: boolean;
  userCoins?: number;
  storeId?: string;
}

function MainStoreHeader({
  storeName = "Store",
  storeCategory = "Store",
  onBack,
  onFavoritePress,
  isFavorited = false,
  showBack = true,
  userCoins = 0,
  storeId }: MainStoreHeaderProps) {
  const router = useRouter();
  const { width, height } = Dimensions.get("window");
  const isSmall = width < 360;
  const topPadding =
    Platform.OS === "ios" ? (height >= 812 ? 50 : 24) : Platform.OS === "web" ? 8 : StatusBar.currentHeight ?? 24;

  // Animation refs
  const backButtonScaleAnim = useSharedValue(1);
  const favoriteScaleAnim = useSharedValue(1);
  const shareScaleAnim = useSharedValue(1);

  // Handlers with haptic feedback
  const handleBack = () => {
    triggerImpact('Medium');
    if (onBack) onBack();
    else router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleFavoritePress = () => {
    triggerImpact('Light');
    if (onFavoritePress) onFavoritePress();
  };

  const handleSharePress = async () => {
    triggerImpact('Light');
    try {
      await Share.share({
        message: `Check out ${storeName} on ${BRAND.APP_NAME}! Get amazing cashback and rewards.`,
        title: storeName });
    } catch (error) {
    }
  };

  const handleCoinPress = () => {
    triggerImpact('Light');
    if (Platform.OS === 'ios') {
      setTimeout(() => router.push('/coins'), 50);
    } else {
      router.push('/coins');
    }
  };

  // Animation handlers
  const animateScale = (animValue: Animated.SharedValue<number>, toValue: number) => {
    animValue.value = withSpring(toValue);
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      <View style={styles.inner}>
        {/* Back Button */}
        {showBack && (
          <Animated.View
            style={[
              styles.backButtonWrapper,
              { transform: [{ scale: backButtonScaleAnim }] },
            ]}
          >
            <Pressable
             
              onPress={handleBack}
              onPressIn={() => animateScale(backButtonScaleAnim, 0.9)}
              onPressOut={() => animateScale(backButtonScaleAnim, 1)}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={22} color={colors.nileBlue} />
            </Pressable>
          </Animated.View>
        )}

        {/* Title & Subtitle */}
        <View style={styles.titleContainer}>
          <ThemedText style={[styles.title, isSmall && styles.titleSmall]} numberOfLines={1}>
            {storeName}
          </ThemedText>
          {storeCategory && (
            <ThemedText style={[styles.subtitle, isSmall && styles.subtitleSmall]} numberOfLines={1}>
              {storeCategory}
            </ThemedText>
          )}
        </View>

        {/* Right Actions */}
        <View style={styles.rightActions}>
          {/* Favorite Button */}
          <Animated.View style={{ transform: [{ scale: favoriteScaleAnim }] }}>
            <Pressable
             
              onPress={handleFavoritePress}
              onPressIn={() => animateScale(favoriteScaleAnim, 0.9)}
              onPressOut={() => animateScale(favoriteScaleAnim, 1)}
              accessibilityRole="button"
              accessibilityLabel={isFavorited ? "Remove from favorites" : "Add to favorites"}
              style={[styles.actionButton, isFavorited && styles.actionButtonActive]}
            >
              <Ionicons
                name={isFavorited ? "heart" : "heart-outline"}
                size={20}
                color={isFavorited ? colors.background.primary : colors.neutral[500]}
              />
            </Pressable>
          </Animated.View>

          {/* Share Button */}
          <Animated.View style={{ transform: [{ scale: shareScaleAnim }] }}>
            <Pressable
             
              onPress={handleSharePress}
              onPressIn={() => animateScale(shareScaleAnim, 0.9)}
              onPressOut={() => animateScale(shareScaleAnim, 1)}
              accessibilityRole="button"
              accessibilityLabel="Share store"
              style={styles.actionButton}
            >
              <Ionicons name="share-outline" size={20} color={colors.neutral[500]} />
            </Pressable>
          </Animated.View>

          {/* Coin Display */}
          <Pressable
           
            onPress={handleCoinPress}
            style={styles.coinButton}
          >
            <View style={styles.coinIcon}>
              <ThemedText style={styles.coinEmoji}>🪙</ThemedText>
            </View>
            <ThemedText style={styles.coinText}>{userCoins}</ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: colors.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3 },
      android: {
        elevation: 2 },
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' } }) },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60 },
  backButtonWrapper: {
    marginRight: 8 },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: colors.neutral[100] },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 4 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.nileBlue,
    letterSpacing: -0.3 },
  titleSmall: {
    fontSize: 16 },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
    fontWeight: "500" },
  subtitleSmall: {
    fontSize: 11 },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8 },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: colors.neutral[100] },
  actionButtonActive: {
    backgroundColor: "#FF4757" },
  coinButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6 },
  coinIcon: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center" },
  coinEmoji: {
    fontSize: 14 },
  coinText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.background.primary } });

export default withErrorBoundary(MainStoreHeader, 'MainStoreSectionMainStoreHeader');
