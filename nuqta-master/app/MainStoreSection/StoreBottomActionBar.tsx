import { withErrorBoundary } from '@/utils/withErrorBoundary';
// StoreBottomActionBar.tsx - Sticky bottom action bar
import React, {} from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform} from "react-native";
import Animated, {
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows } from "@/constants/DesignSystem";

export interface StoreBottomActionBarProps {
  storeId?: string;
  onScanPayEarn?: () => void;
  onWallet?: () => void;
  onOffers?: () => void;
}

function StoreBottomActionBar({
  storeId,
  onScanPayEarn,
  onWallet,
  onOffers }: StoreBottomActionBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Animation refs
  const scanPayScale = useSharedValue(1);
  const walletScale = useSharedValue(1);
  const offersScale = useSharedValue(1);

  const animateScale = (animValue: Animated.SharedValue<number>, toValue: number) => {
    animValue.value = withSpring(toValue);
  };

  const handleScanPayEarn = () => {
    triggerImpact('Medium');
    if (onScanPayEarn) {
      onScanPayEarn();
    } else {
      router.push('/pay-in-store');
    }
  };

  const handleWallet = () => {
    triggerImpact('Light');
    if (onWallet) {
      onWallet();
    } else {
      router.push('/wallet-screen');
    }
  };

  const handleOffers = () => {
    triggerImpact('Light');
    if (onOffers) {
      onOffers();
    } else {
      router.push({
        pathname: '/CardOffersPage',
        params: { storeId: storeId || '' }
      } as any);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.inner}>
        {/* Scan & Pay & Earn Button */}
        <Animated.View style={[styles.mainButtonWrapper, { transform: [{ scale: scanPayScale }] }]}>
          <Pressable
            style={styles.mainButton}
           
            onPress={handleScanPayEarn}
            onPressIn={() => animateScale(scanPayScale, 0.97)}
            onPressOut={() => animateScale(scanPayScale, 1)}
            accessibilityRole="button"
            accessibilityLabel="Scan Pay and Earn"
          >
            <Ionicons name="qr-code-outline" size={20} color={colors.background.primary} />
            <ThemedText style={styles.mainButtonText}>Scan & Pay & Earn</ThemedText>
          </Pressable>
        </Animated.View>

        {/* Wallet Button */}
        <Animated.View style={{ transform: [{ scale: walletScale }] }}>
          <Pressable
            style={styles.iconButton}
           
            onPress={handleWallet}
            onPressIn={() => animateScale(walletScale, 0.9)}
            onPressOut={() => animateScale(walletScale, 1)}
            accessibilityRole="button"
            accessibilityLabel="Wallet"
          >
            <Ionicons name="wallet-outline" size={24} color={Colors.text.primary} />
          </Pressable>
        </Animated.View>

        {/* Offers Button */}
        <Animated.View style={{ transform: [{ scale: offersScale }] }}>
          <Pressable
            style={styles.iconButton}
           
            onPress={handleOffers}
            onPressIn={() => animateScale(offersScale, 0.9)}
            onPressOut={() => animateScale(offersScale, 1)}
            accessibilityRole="button"
            accessibilityLabel="Offers"
          >
            <Ionicons name="pricetag" size={22} color={Colors.text.primary} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8 },
      android: {
        elevation: 10 } }) },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    gap: Spacing.sm },
  mainButtonWrapper: {
    flex: 1 },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lightMustard,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: 8,
    ...Shadows.medium },
  mainButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.background.primary },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    backgroundColor: colors.background.primary,
    justifyContent: "center",
    alignItems: "center" } });

export default withErrorBoundary(StoreBottomActionBar, 'MainStoreSectionStoreBottomActionBar');
