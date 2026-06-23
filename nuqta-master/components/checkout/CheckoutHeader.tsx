import React from 'react';
import { View, Pressable, StatusBar, StyleSheet, Platform } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { BRAND } from '@/constants/brand';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface CheckoutHeaderProps {
  totalPayable: number;
  redemptionBenefit: number;
  cashbackEarned: number;
  totalWalletBalance: number;
  currencySymbol: string;
  onBack: () => void;
}

function CheckoutHeader({
  totalPayable,
  redemptionBenefit,
  cashbackEarned,
  totalWalletBalance,
  currencySymbol,
  onBack,
}: CheckoutHeaderProps) {
  const finalAmount = Math.max(0, totalPayable - redemptionBenefit).toFixed(0);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />
      <LinearGradient
        colors={[colors.lightMustard, colors.nileBlue]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            accessibilityLabel="Go back to cart"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to shopping cart"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <ThemedText style={styles.headerTitle}>Checkout</ThemedText>

          <View style={styles.coinsDisplay}>
            <CachedImage
              source={BRAND.COIN_IMAGE}
              style={styles.coinIconSmall}
              contentFit="contain"
            />
            <ThemedText style={styles.coinsText}>{totalWalletBalance}</ThemedText>
          </View>
        </View>

        <View style={styles.amountContainer}>
          <ThemedText style={styles.amountText}>
            {currencySymbol}{finalAmount}
          </ThemedText>
          {cashbackEarned > 0 && (
            <View style={styles.cashbackBadge}>
              <ThemedText style={styles.cashbackText}>
                Earn {currencySymbol}{cashbackEarned} cashback
              </ThemedText>
            </View>
          )}
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 28,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
    padding: 0,
    position: 'relative',
    zIndex: 10,
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
    marginLeft: -40,
  },
  coinsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  coinsText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  coinIconSmall: {
    width: 16,
    height: 16,
  },
  amountContainer: {
    alignItems: 'center',
  },
  amountText: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: 10,
    letterSpacing: -1,
  },
  cashbackBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  cashbackText: {
    color: Colors.text.inverse,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default React.memo(CheckoutHeader);
