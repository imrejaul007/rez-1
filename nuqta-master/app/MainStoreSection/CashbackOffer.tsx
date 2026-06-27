// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, {} from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  GestureResponderEvent} from "react-native";
import Animated, {
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  Typography,
  IconSize,
  Timing } from "@/constants/DesignSystem";

interface CashbackOfferProps {
  percentage?: string;        // e.g. "10%" or "10"
  title?: string;             // e.g. "Cash back"
  showIcon?: boolean;
  onPress?: (e: GestureResponderEvent) => void;
  compact?: boolean;          // slightly smaller footprint
}

function CashbackOffer({
  percentage = "10%",
  title = "Cash back",
  showIcon = true,
  onPress,
  compact = false }: CashbackOfferProps) {
  const { width } = Dimensions.get("window");
  const isSmallScreen = width < 360 || compact;

  // Animation ref for micro-interactions
  const scaleAnim = useSharedValue(1);

  // ensure percentage always ends with % (allow "10" or "10%")
  const pct = percentage.toString().trim().endsWith("%")
    ? percentage.toString().trim()
    : `${percentage}%`;

  // Handlers with haptic feedback & animations
  const handlePressIn = () => {
    triggerImpact('Light');
    scaleAnim.value = withSpring(0.96, { ...Timing.springBouncy });
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1, { ...Timing.springBouncy });
  };

  const handlePress = (e: GestureResponderEvent) => {
    triggerImpact('Medium');
    if (onPress) onPress(e);
  };

  const Container: React.ComponentType<any> = onPress ? Pressable : View;

  const content = (
    <View style={[styles.card, isSmallScreen && styles.cardCompact]}>
      {showIcon && (
        <View style={[styles.iconWrap, isSmallScreen && styles.iconWrapCompact]}>
          <View style={styles.iconBg}>
            <Ionicons name="cash-outline" size={IconSize.sm} color={Colors.primary[700]} />
          </View>
        </View>
      )}

      <View style={styles.textWrap}>
        <ThemedText style={[styles.title, isSmallScreen && styles.titleCompact]}>
          {title}{" "}
          <ThemedText style={[styles.percentage, isSmallScreen && styles.percentageCompact]}>
            {pct}
          </ThemedText>
        </ThemedText>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Animated.View
        style={[
          styles.wrapper,
          isSmallScreen && styles.wrapperCompact,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Container
         
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={[onPress && styles.pressable]}
          accessibilityRole="button"
          accessibilityLabel={`${title} ${pct} offer`}
          accessibilityHint="Double tap to view cashback details"
        >
          {content}
        </Container>
      </Animated.View>
    );
  }

  return (
    <View
      style={[styles.wrapper, isSmallScreen && styles.wrapperCompact]}
      accessibilityRole="text"
      accessibilityLabel={`${title} ${pct} offer`}
    >
      {content}
    </View>
  );
}

/* ===========================
   Styles — Modern Design System
   =========================== */
const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "transparent" },
  wrapperCompact: {
    // shrink outer spacing for tighter layouts
  },
  pressable: {
    overflow: "hidden",
    borderRadius: BorderRadius.md },

  // Modern Card with Purple Tint
  card: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: Colors.background.purpleLight,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary[100],
    ...Shadows.purpleSubtle },

  cardCompact: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: 10,
    borderRadius: 10 },

  // Modern Icon Container
  iconWrap: {
    marginRight: 10,
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center" },

  iconWrapCompact: {
    width: 30,
    height: 30,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.sm },

  iconBg: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary[50],
    justifyContent: "center",
    alignItems: "center" },

  textWrap: {
    flex: 1,
    minWidth: 0 },

  // Modern Typography
  title: {
    ...Typography.body,
    fontWeight: "600",
    color: Colors.gray[600] },

  titleCompact: {
    fontSize: 13 },

  percentage: {
    color: Colors.primary[700],
    fontWeight: "800",
    ...Typography.body },

  percentageCompact: {
    fontSize: 13 } });

export default withErrorBoundary(CashbackOffer, 'MainStoreSectionCashbackOffer');
