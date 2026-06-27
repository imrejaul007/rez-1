// @ts-nocheck
// Section4.tsx - Premium Glassmorphism Design
// Card Offers Section - Green & Gold Theme

import React, { useState, useEffect, memo} from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { type ImageSource } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from "expo-linear-gradient";
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import discountsApi, { Discount } from "@/services/discountsApi";
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Premium Glass Design Tokens - Mustard & Gold Theme
const GLASS = {
  lightBg: 'rgba(255, 255, 255, 0.8)',
  lightBorder: 'rgba(255, 255, 255, 0.5)',
  lightHighlight: 'rgba(255, 255, 255, 0.9)',
  frostedBg: 'rgba(255, 255, 255, 0.92)',
  tintedGreenBg: 'rgba(255, 205, 87, 0.08)',
  tintedGreenBorder: 'rgba(255, 205, 87, 0.2)',
  tintedGoldBg: 'rgba(255, 200, 87, 0.12)',
  tintedGoldBorder: 'rgba(255, 200, 87, 0.35)' };


interface Section4Props {
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  cardImageUri?: string | ImageSource;
  productPrice?: number;
  storeId?: string;
  testID?: string;
  onPress?: () => void;
}

const DEFAULT_CARD_IMAGE = require('@/assets/images/card.jpg');

export default memo(function Section4({
  title: initialTitle = "Upto 10% card offers",
  subtitle: initialSubtitle = "On 3 card & payment offers",
  icon = "card-outline",
  cardImageUri = DEFAULT_CARD_IMAGE,
  productPrice = 1000,
  storeId,
  testID,
  onPress }: Section4Props) {
  const isMounted = useIsMounted();
  const [loading, setLoading] = useState<boolean>(true);
  const [errored, setErrored] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [cardOffers, setCardOffers] = useState<Discount[]>([]);
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);

  // Animation refs
  const cardScale = useSharedValue(1);

  const animatePress = (toValue: number) => {
    cardScale.value = withSpring(toValue, { damping: 8, stiffness: 100 });
  };

  const handlePress = () => {
    if (!onPress) return;
    triggerImpact('Light');
    onPress();
  };

  useEffect(() => {
    fetchCardOffers();
  }, [productPrice, storeId]);

  const fetchCardOffers = async () => {
    try {
      setLoading(true);

      const response = await discountsApi.getCardOffers({
        storeId,
        orderValue: productPrice,
        page: 1,
        limit: 10 });

      if (response.success && response.data?.discounts && response.data.discounts.length > 0) {
        if (!isMounted()) return;
        setCardOffers(response.data.discounts);

        const bestOffer = response.data.discounts[0];
        const maxDiscount = bestOffer.type === 'percentage' ? bestOffer.value : null;

        if (maxDiscount) {
          if (!isMounted()) return;
          setTitle(`Upto ${maxDiscount}% card offers`);
        }

        const offersCount = response.data.discounts.length;
        if (!isMounted()) return;
        setSubtitle(`On ${offersCount} card & payment offer${offersCount > 1 ? 's' : ''}`);
      } else {
        if (!isMounted()) return;
        setTitle(initialTitle);
        if (!isMounted()) return;
        setSubtitle(initialSubtitle);
        if (!isMounted()) return;
        setCardOffers([]);
      }
    } catch (error) {
      if (!isMounted()) return;
      setTitle(initialTitle);
      if (!isMounted()) return;
      setSubtitle(initialSubtitle);
      if (!isMounted()) return;
      setCardOffers([]);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const resolvedSource: ImageSource =
    typeof cardImageUri === "string" ? { uri: cardImageUri } : (cardImageUri as ImageSource);

  const CardWrapper = onPress ? Pressable : View;
  const cardWrapperProps = onPress
    ? {
        onPress: handlePress,
        onPressIn: () => animatePress(0.97),
        onPressOut: () => animatePress(1) }
    : {};

  return (
    <View style={styles.container} testID={testID}>
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale: cardScale }] }]}>
        {/* Glass Card */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={50} tint="light" style={styles.card}>
            <CardWrapper
              style={styles.cardContent}
              accessibilityLabel={`${title}. ${subtitle}`}
              accessibilityRole={onPress ? "button" : "summary"}
              accessibilityHint={onPress ? "Double tap to view offer details" : undefined}
              {...cardWrapperProps}
            >
              {renderContent()}
            </CardWrapper>
          </BlurView>
        ) : (
          <View style={[styles.card, styles.cardAndroid]}>
            <CardWrapper
              style={styles.cardContent}
              accessibilityLabel={`${title}. ${subtitle}`}
              accessibilityRole={onPress ? "button" : "summary"}
              accessibilityHint={onPress ? "Double tap to view offer details" : undefined}
              {...cardWrapperProps}
            >
              {renderContent()}
            </CardWrapper>
          </View>
        )}
      </Animated.View>

      {/* Divider */}
      <View style={styles.divider} />
    </View>
  );

  function renderContent() {
    return (
      <>
        {/* Glass Highlight */}
        <View style={styles.glassHighlight} />

        {/* Left Icon */}
        <LinearGradient
          colors={[Colors.gold, Colors.warning]}
          style={styles.iconContainer}
        >
          <Ionicons name={icon} size={24} color={Colors.nileBlue} />
        </LinearGradient>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
        </View>

        {/* Right Card/Coupon Visual */}
        <View style={styles.rightContainer}>
          <View style={styles.couponWrapper}>
            {imageLoading && !errored && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color={Colors.text.inverse} />
              </View>
            )}

            {!errored ? (
              <CachedImage
                source={resolvedSource}
                style={styles.couponImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setErrored(true);
                  setImageLoading(false);
                }}
                accessibilityLabel="card-offer-image"
              />
            ) : (
              <LinearGradient
                colors={[Colors.gold, Colors.nileBlue]}
                style={styles.fallback}
              >
                <ThemedText style={styles.fallbackPercent}>%</ThemedText>
              </LinearGradient>
            )}

            {/* Percentage Badge */}
            <View style={styles.couponBadge}>
              <ThemedText style={styles.couponBadgeText}>%</ThemedText>
            </View>
          </View>
        </View>
      </>
    );
  }
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm },

  cardWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12 },
      android: {
        elevation: 6 } }),
    borderWidth: 1,
    borderColor: Colors.border.default },

  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden' },

  cardAndroid: {
    backgroundColor: Colors.background.primary },

  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14 },

  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0 },

  // Icon Container
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6 },
      android: {
        elevation: 4 } }) },

  // Text Container
  textContainer: {
    flex: 1,
    justifyContent: "center" },

  title: {
    ...Typography.body,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 3,
    lineHeight: 20 },

  subtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    lineHeight: 18,
    fontWeight: '500' },

  // Right Coupon Visual
  rightContainer: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.xs },

  couponWrapper: {
    width: 60,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "6deg" }],
    overflow: "hidden",
    backgroundColor: Colors.background.secondary,
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 2, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8 },
      android: {
        elevation: 5 } }),
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)' },

  couponImage: {
    width: "100%",
    height: "100%" },

  loaderContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gold },

  fallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center" },

  fallbackPercent: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: "800" },

  // Badge
  couponBadge: {
    position: "absolute",
    right: -6,
    top: 2,
    width: 26,
    height: 26,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-6deg" }],
    borderWidth: 2,
    borderColor: colors.lightMustard,
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4 },
      android: {
        elevation: 4 } }) },

  couponBadgeText: {
    color: Colors.gold,
    fontWeight: "800",
    ...Typography.bodySmall },

  // Divider
  divider: {
    marginTop: Spacing.md,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.border.default } });
