import React from 'react';
import { View, Pressable, Switch, StyleSheet, Platform, Dimensions } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { BRAND } from '@/constants/brand';
import { PROMO_COIN_MAX_USAGE_PERCENTAGE } from '@/config/checkout.config';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface CoinSystem {
  nuqtaCoin: { available: number; used: number };
  promoCoin: { available: number; used: number };
  storePromoCoin: { available: number; used: number; storeName?: string };
}

interface CoinTogglesSectionProps {
  coinSystem: CoinSystem;
  totalWalletBalance: number;
  coinSectionExpanded: boolean;
  totalPayable: number;
  totalBeforeCoinDiscount?: number;
  currencySymbol: string;
  onToggleExpanded: () => void;
  onCoinToggle: (type: 'rez' | 'promo' | 'storePromo', value: boolean) => void;
  onCustomCoinAmount: (type: 'rez' | 'storePromo', amount: number) => void;
}

function CoinTogglesSection({
  coinSystem,
  totalWalletBalance,
  coinSectionExpanded,
  totalPayable,
  totalBeforeCoinDiscount,
  currencySymbol,
  onToggleExpanded,
  onCoinToggle,
  onCustomCoinAmount,
}: CoinTogglesSectionProps) {
  const maxRezCoin = Math.max(1, Math.min(
    coinSystem.nuqtaCoin.available,
    Math.floor(totalBeforeCoinDiscount || totalPayable || 0)
  ));

  const maxStorePromo = Math.max(1, Math.min(
    coinSystem.storePromoCoin.available,
    Math.floor((totalPayable || 0) * 0.3)
  ));

  const rezCoinPercent = (coinSystem.nuqtaCoin.used / maxRezCoin) * 100;
  const storePromoPercent = (coinSystem.storePromoCoin.used / maxStorePromo) * 100;

  return (
    <View style={styles.coinToggles}>
      {/* Collapsible Header */}
      <Pressable style={styles.coinSectionHeader} onPress={onToggleExpanded}>
        <View style={styles.coinSectionHeaderLeft}>
          <CachedImage
            source={BRAND.COIN_IMAGE}
            style={styles.coinIconMedium}
            contentFit="contain"
          />
          <View style={styles.coinSectionHeaderText}>
            <ThemedText style={styles.coinSectionTitle}>Use Your Coins</ThemedText>
            <ThemedText style={styles.coinSectionSubtitle}>
              {totalWalletBalance} coins available
            </ThemedText>
          </View>
        </View>
        <Ionicons
          name={coinSectionExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.neutral[500]}
        />
      </Pressable>

      {coinSectionExpanded && (
        <>
          {/* Rez Coin with Slider */}
          <View style={styles.coinSliderCard}>
            <LinearGradient
              colors={[colors.lightMustard, colors.nileBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coinSliderGradient}
            >
              <View style={styles.coinSliderHeader}>
                <View style={styles.coinHeaderLeft}>
                  <View style={styles.coinTitleRow}>
                    <CachedImage
                      source={BRAND.COIN_IMAGE}
                      style={styles.coinIconMedium}
                      contentFit="contain"
                    />
                    <ThemedText style={styles.coinTitleWhite}>{BRAND.COIN_NAME}</ThemedText>
                  </View>
                  <View style={styles.coinAvailableRow}>
                    <ThemedText style={styles.coinAvailableTextWhite}>
                      {coinSystem.nuqtaCoin.available} available
                    </ThemedText>
                  </View>
                </View>
                {coinSystem.nuqtaCoin.used > 0 && (
                  <View style={styles.coinUsedBadgeWhite}>
                    <ThemedText style={styles.coinUsedTextPurple}>
                      {coinSystem.nuqtaCoin.used}
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.sliderContainerEnhanced}>
                <input
                  type="range"
                  min="0"
                  max={maxRezCoin}
                  value={coinSystem.nuqtaCoin.used}
                  onChange={(e) => {
                    const amount = parseInt(e.target.value);
                    if (amount === 0) {
                      onCoinToggle('rez', false);
                    } else {
                      onCustomCoinAmount('rez', amount);
                    }
                  }}
                  onInput={(e: any) => {
                    const amount = parseInt(e.target.value);
                    if (amount === 0) {
                      onCoinToggle('rez', false);
                    } else {
                      onCustomCoinAmount('rez', amount);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '12px',
                    borderRadius: '6px',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    touchAction: 'none',
                    pointerEvents: 'auto',
                    background: `linear-gradient(to right, #FFFFFF 0%, #FFFFFF ${rezCoinPercent}%, rgba(255,255,255,0.3) ${rezCoinPercent}%, rgba(255,255,255,0.3) 100%)`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                />
              </View>

              <View style={styles.sliderLabels}>
                <ThemedText style={styles.sliderLabelTextWhite}>{currencySymbol}0</ThemedText>
                <ThemedText style={styles.sliderLabelTextWhite}>
                  {currencySymbol}{Math.min(
                    coinSystem.nuqtaCoin.available,
                    Math.floor(totalBeforeCoinDiscount || totalPayable || 0)
                  )}
                </ThemedText>
              </View>

              {coinSystem.nuqtaCoin.used > 0 && (
                <View style={styles.coinSavingContainerEnhanced}>
                  <View style={styles.savingBadge}>
                    <Ionicons name="gift" size={16} color={Colors.gold} />
                    <ThemedText style={styles.coinSavingTextEnhanced}>
                      You'll save {currencySymbol}{coinSystem.nuqtaCoin.used} on this order!
                    </ThemedText>
                  </View>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Promo Coin */}
          <View style={styles.coinToggleCard}>
            <View style={styles.coinToggleContent}>
              <View>
                <ThemedText style={styles.coinToggleTitle}>Promo coin</ThemedText>
                <ThemedText style={styles.coinToggleSubtitle}>
                  Promo coins can be applied for up to {PROMO_COIN_MAX_USAGE_PERCENTAGE}% off
                </ThemedText>
              </View>
              <View style={styles.coinToggleRight}>
                <Switch
                  value={coinSystem.promoCoin.used > 0}
                  onValueChange={(value) => onCoinToggle('promo', value)}
                  trackColor={{ false: Colors.border.default, true: Colors.gold }}
                  thumbColor={'white'}
                  accessibilityLabel="Use promo coins"
                  accessibilityRole="switch"
                  accessibilityHint={`Toggle to ${coinSystem.promoCoin.used > 0 ? 'disable' : 'enable'} promo coin discount. ${coinSystem.promoCoin.available} coins available`}
                  accessibilityState={{ checked: coinSystem.promoCoin.used > 0 }}
                />
                <ThemedText style={styles.promoCoinValue}>
                  {coinSystem.promoCoin.available}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Store Branded Coins with Slider */}
          {coinSystem.storePromoCoin.available > 0 && (
            <View style={styles.coinSliderCard}>
              <LinearGradient
                colors={[colors.nileBlue, colors.lavenderMist]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.coinSliderGradient}
              >
                <View style={styles.coinSliderHeader}>
                  <View style={styles.coinHeaderLeft}>
                    <View style={styles.coinTitleRow}>
                      <Ionicons name="storefront" size={20} color={Colors.gold} />
                      <ThemedText style={styles.coinTitleWhite}>
                        {coinSystem.storePromoCoin.storeName
                          ? `${coinSystem.storePromoCoin.storeName} Coins`
                          : 'Store Coins'}
                      </ThemedText>
                    </View>
                    <View style={styles.coinAvailableRow}>
                      <ThemedText style={styles.coinAvailableTextWhite}>
                        {coinSystem.storePromoCoin.available} available - Up to 30%
                      </ThemedText>
                    </View>
                  </View>
                  {coinSystem.storePromoCoin.used > 0 && (
                    <View style={styles.coinUsedBadgeWhite}>
                      <ThemedText style={styles.coinUsedTextGreen}>
                        {coinSystem.storePromoCoin.used}
                      </ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.sliderContainerEnhanced}>
                  <input
                    type="range"
                    min="0"
                    max={maxStorePromo}
                    value={coinSystem.storePromoCoin.used}
                    onChange={(e) => {
                      const amount = parseInt(e.target.value);
                      if (amount === 0) {
                        onCoinToggle('storePromo', false);
                      } else {
                        onCustomCoinAmount('storePromo', amount);
                      }
                    }}
                    onInput={(e: any) => {
                      const amount = parseInt(e.target.value);
                      if (amount === 0) {
                        onCoinToggle('storePromo', false);
                      } else {
                        onCustomCoinAmount('storePromo', amount);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '12px',
                      borderRadius: '6px',
                      outline: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      cursor: 'pointer',
                      touchAction: 'none',
                      pointerEvents: 'auto',
                      background: `linear-gradient(to right, #FFFFFF 0%, #FFFFFF ${storePromoPercent}%, rgba(255,255,255,0.3) ${storePromoPercent}%, rgba(255,255,255,0.3) 100%)`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  />
                </View>

                <View style={styles.sliderLabels}>
                  <ThemedText style={styles.sliderLabelTextWhite}>{currencySymbol}0</ThemedText>
                  <ThemedText style={styles.sliderLabelTextWhite}>
                    {currencySymbol}{Math.min(
                      coinSystem.storePromoCoin.available,
                      Math.floor((totalPayable || 0) * 0.3)
                    )}
                  </ThemedText>
                </View>

                {coinSystem.storePromoCoin.used > 0 && (
                  <View style={styles.coinSavingContainerEnhanced}>
                    <View style={styles.savingBadge}>
                      <Ionicons name="gift" size={16} color={Colors.gold} />
                      <ThemedText style={styles.coinSavingTextEnhanced}>
                        {coinSystem.storePromoCoin.storeName || 'Store'} exclusive: You'll save {currencySymbol}{coinSystem.storePromoCoin.used}!
                      </ThemedText>
                    </View>
                  </View>
                )}
              </LinearGradient>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  coinToggles: {
    gap: Spacing.md,
  },
  coinSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.successScale[200],
  },
  coinSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  coinSectionHeaderText: {
    gap: 2,
  },
  coinSectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  coinSectionSubtitle: {
    fontSize: 13,
    color: Colors.nileBlue,
    fontWeight: '500',
  },
  coinIconMedium: {
    width: 24,
    height: 24,
  },
  coinSliderCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  coinSliderGradient: {
    padding: 14,
    borderRadius: BorderRadius.md,
  },
  coinSliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  coinHeaderLeft: {
    flex: 1,
  },
  coinTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  coinTitleWhite: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: 0.3,
  },
  coinAvailableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  coinAvailableTextWhite: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  coinUsedBadgeWhite: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  coinUsedTextPurple: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.gold,
  },
  coinUsedTextGreen: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.gold,
  },
  sliderContainerEnhanced: {
    marginBottom: 10,
    paddingVertical: 6,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sliderLabelTextWhite: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  coinSavingContainerEnhanced: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  savingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  coinSavingTextEnhanced: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '600',
    flex: 1,
  },
  coinToggleCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  coinToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coinToggleTitle: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  coinToggleSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    maxWidth: width * 0.6,
  },
  coinToggleRight: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  promoCoinValue: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
});

export default React.memo(CoinTogglesSection);
