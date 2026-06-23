import { withErrorBoundary } from '@/utils/withErrorBoundary';
// TermsTransparencySection.tsx - Collapsible terms and transparency section
import React, { useState} from "react";
import {
  View,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from "@expo/vector-icons";
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  BorderRadius } from "@/constants/DesignSystem";
import { catchAndWarn } from '@/utils/catchAndReport';

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface TermsTransparencySectionProps {
  cashbackRules?: string;
  coinExpiry?: string;
  returnImpact?: string;
  supportEmail?: string;
}

function TermsTransparencySection({
  cashbackRules = "Cashback is credited within 24 hours of purchase. Valid on all payment methods.",
  coinExpiry = "Earned coins expire after 90 days. Branded coins expire as per store policy.",
  returnImpact = "Returns will deduct earned cashback and coins from your wallet.",
  supportEmail = "support@rez.app" }: TermsTransparencySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = useSharedValue(0);

  const toggleExpand = () => {
    triggerImpact('Light');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    rotateAnim.value = withTiming(isExpanded ? 0 : 1, { duration: 200 });

    setIsExpanded(!isExpanded);
  };

  const handleContactSupport = () => {
    triggerImpact('Light');
    try { Linking.openURL(`mailto:${supportEmail}`); } catch (e) { catchAndWarn(e, 'TermsTransparencySection/openURL'); }
  };

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotateAnim.value, [0, 1], [0, 180])}deg` }],
  }));

  return (
    <View style={styles.container}>
      {/* Header - Always Visible */}
      <Pressable
        style={styles.header}

        onPress={toggleExpand}
        accessibilityRole="button"
        accessibilityLabel={isExpanded ? "Collapse terms" : "Expand terms"}
      >
        <ThemedText style={styles.headerTitle}>Terms & Transparency</ThemedText>
        <Animated.View style={rotateStyle}>
          <Ionicons name="chevron-down" size={22} color={Colors.text.secondary} />
        </Animated.View>
      </Pressable>

      {/* Expandable Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Cashback Rules */}
          <View style={styles.termItem}>
            <ThemedText style={styles.termTitle}>Cashback rules</ThemedText>
            <ThemedText style={styles.termText}>{cashbackRules}</ThemedText>
          </View>

          {/* Coin Expiry */}
          <View style={styles.termItem}>
            <ThemedText style={styles.termTitle}>Coin expiry</ThemedText>
            <ThemedText style={styles.termText}>{coinExpiry}</ThemedText>
          </View>

          {/* Return Impact */}
          <View style={styles.termItem}>
            <ThemedText style={styles.termTitle}>Return impact</ThemedText>
            <ThemedText style={styles.termText}>{returnImpact}</ThemedText>
          </View>

          {/* Contact Support */}
          <View style={styles.termItem}>
            <ThemedText style={styles.termTitle}>Need help?</ThemedText>
            <Pressable onPress={handleContactSupport}>
              <ThemedText style={styles.supportLink}>Contact Support</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.sm,
    backgroundColor: colors.background.primary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    overflow: "hidden" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
    paddingTop: Spacing.md },
  termItem: {
    marginBottom: Spacing.md },
  termTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 4 },
  termText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18 },
  supportLink: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.lightMustard } });

export default withErrorBoundary(TermsTransparencySection, 'MainStoreSectionTermsTransparencySection');
