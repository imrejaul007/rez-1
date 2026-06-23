import { withErrorBoundary } from '@/utils/withErrorBoundary';
// RewardsFooterBanner.tsx - Premium glassy footer banner
import React from "react";
import {
  View,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/DesignSystem";
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

export interface RewardsFooterBannerProps {
  message?: string;
  subMessage?: string;
}

function RewardsFooterBanner({
  message = "This store rewards you for shopping smarter",
  subMessage = `— only on ${BRAND.APP_NAME}.`,
}: RewardsFooterBannerProps) {
  return (
    <LinearGradient
      colors={[colors.lightMustard, colors.brand.goldRich, '#D4A83D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Inner glow effect */}
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glassOverlay}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Trophy Icon with glow */}
        <View style={styles.iconContainer}>
          <View style={styles.iconGlow} />
          <View style={styles.iconCircle}>
            <Ionicons name="trophy" size={22} color={colors.brand.goldWarm} />
          </View>
        </View>

        {/* Message */}
        <ThemedText style={styles.message}>{message}</ThemedText>
        <View style={styles.subMessageContainer}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.subMessage}>{subMessage}</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        {/* Decorative sparkles */}
        <Ionicons name="sparkles" size={12} color="rgba(255,200,87,0.5)" style={styles.sparkleLeft} />
        <Ionicons name="sparkles" size={12} color="rgba(255,200,87,0.5)" style={styles.sparkleRight} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.lg,
    paddingBottom: 100, // Extra padding for bottom action bar
    position: 'relative',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  iconGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 40,
    backgroundColor: 'rgba(255,200,87,0.25)',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,200,87,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background.primary,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  dividerLine: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  subMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sparkleLeft: {
    position: 'absolute',
    top: 8,
    left: 24,
  },
  sparkleRight: {
    position: 'absolute',
    top: 16,
    right: 28,
  },
});

export default withErrorBoundary(RewardsFooterBanner, 'MainStoreSectionRewardsFooterBanner');
