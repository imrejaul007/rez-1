import { withErrorBoundary } from '@/utils/withErrorBoundary';
// StoreActionButtons.tsx - Scan & Pay, Upload Bill, View Offers buttons
import React, {} from "react";
import {
  View,
  Pressable,
  StyleSheet} from "react-native";
import Animated, {
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows } from "@/constants/DesignSystem";

export interface StoreActionButtonsProps {
  storeId?: string;
  onScanPay?: () => void;
  onUploadBill?: () => void;
  onViewOffers?: () => void;
}

function StoreActionButtons({
  storeId,
  onScanPay,
  onUploadBill,
  onViewOffers }: StoreActionButtonsProps) {
  const router = useRouter();

  // Animation refs
  const scanPayScale = useSharedValue(1);
  const uploadBillScale = useSharedValue(1);
  const viewOffersScale = useSharedValue(1);

  const animateScale = (animValue: Animated.SharedValue<number>, toValue: number) => {
    animValue.value = withSpring(toValue);
  };

  const handleScanPay = () => {
    triggerImpact('Medium');
    if (onScanPay) {
      onScanPay();
    } else {
      router.push('/pay-in-store');
    }
  };

  const handleUploadBill = () => {
    triggerImpact('Light');
    if (onUploadBill) {
      onUploadBill();
    } else {
      router.push(storeId ? `/bill-upload?storeId=${storeId}` as any : '/bill-upload');
    }
  };

  const handleViewOffers = () => {
    triggerImpact('Light');
    if (onViewOffers) {
      onViewOffers();
    } else if (storeId) {
      router.push(`/store/${storeId}/offers` as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Primary Scan & Pay Button */}
      <Animated.View style={{ transform: [{ scale: scanPayScale }] }}>
        <Pressable
          style={styles.primaryButton}
         
          onPress={handleScanPay}
          onPressIn={() => animateScale(scanPayScale, 0.97)}
          onPressOut={() => animateScale(scanPayScale, 1)}
          accessibilityRole="button"
          accessibilityLabel="Scan and Pay"
        >
          <Ionicons name="qr-code-outline" size={20} color={colors.background.primary} />
          <ThemedText style={styles.primaryButtonText}>Scan & Pay</ThemedText>
        </Pressable>
      </Animated.View>

      {/* Secondary Buttons Row */}
      <View style={styles.secondaryRow}>
        {/* Upload Bill Button */}
        <Animated.View style={[styles.secondaryButtonWrapper, { transform: [{ scale: uploadBillScale }] }]}>
          <Pressable
            style={styles.secondaryButton}
           
            onPress={handleUploadBill}
            onPressIn={() => animateScale(uploadBillScale, 0.97)}
            onPressOut={() => animateScale(uploadBillScale, 1)}
            accessibilityRole="button"
            accessibilityLabel="Upload Bill"
          >
            <Ionicons name="camera-outline" size={18} color={Colors.text.primary} />
            <ThemedText style={styles.secondaryButtonText}>Upload Bill</ThemedText>
          </Pressable>
        </Animated.View>

        {/* View Offers Button */}
        <Animated.View style={[styles.secondaryButtonWrapper, { transform: [{ scale: viewOffersScale }] }]}>
          <Pressable
            style={styles.secondaryButton}
           
            onPress={handleViewOffers}
            onPressIn={() => animateScale(viewOffersScale, 0.97)}
            onPressOut={() => animateScale(viewOffersScale, 1)}
            accessibilityRole="button"
            accessibilityLabel="View Offers"
          >
            <Ionicons name="pricetag-outline" size={18} color={Colors.text.primary} />
            <ThemedText style={styles.secondaryButtonText}>View Offers</ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lightMustard,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: 8,
    ...Shadows.medium },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.background.primary },
  secondaryRow: {
    flexDirection: "row",
    gap: Spacing.sm },
  secondaryButtonWrapper: {
    flex: 1 },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    gap: 6 },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary } });

export default withErrorBoundary(StoreActionButtons, 'MainStoreSectionStoreActionButtons');
