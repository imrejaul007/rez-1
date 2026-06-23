/**
 * Coin Toggle Row
 *
 * Individual coin type row with toggle and amount selector
 *
 * Supports 3 coin types per Wallet design:
 * 1. Rez Coins (Mustard #ffcd57) - Universal, 30-day expiry, no cap
 * 2. Promo Coins (Mustard #ffcd57) - Limited-time, expiry countdown, 20% cap
 * 3. Branded Coins (Merchant color) - Store-specific, no expiry, no cap
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import CrossPlatformSlider from '@/components/common/CrossPlatformSlider';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';

export type CoinType = 'rez' | 'nuqta' | 'promo' | 'branded';

interface CoinToggleRowProps {
  type: CoinType;
  name: string;
  available: number;
  using: number;
  enabled: boolean;
  maxUsable: number;
  expiringToday?: boolean;
  expiresIn?: number | null; // Days until expiry
  storeName?: string;
  customColor?: string; // Custom color from API
  redemptionCap?: number | null; // Max % per bill (for promo coins)
  onToggle: (enabled: boolean) => void;
  onAmountChange: (amount: number) => void;
}

// Default coin styles matching Wallet design
// All colors must follow the palette: Nile Blue, Mustard, Linen, Peach, Lavender
const COIN_STYLES: Record<CoinType, { color: string; bgColor: string; gradientColors: string[]; icon: string; description: string }> = {
  rez: {
    color: colors.lightMustard, // Mustard
    bgColor: colors.linen, // Linen
    gradientColors: [colors.lightMustard, colors.lightPeach], // Mustard to Peach
    icon: 'diamond',
    description: 'Usable across all stores',
  },
  nuqta: {
    color: colors.lightMustard, // Mustard
    bgColor: colors.linen, // Linen
    gradientColors: [colors.lightMustard, colors.lightPeach], // Mustard to Peach
    icon: 'diamond',
    description: 'Usable across all stores',
  },
  promo: {
    color: colors.lightMustard, // Mustard
    bgColor: colors.linen, // Linen
    gradientColors: [colors.lightMustard, colors.lightPeach], // Mustard to Peach
    icon: 'flame',
    description: 'Limited-time campaign coins',
  },
  branded: {
    color: colors.nileBlue, // Nile Blue
    bgColor: colors.lavenderMist, // Lavender Mist
    gradientColors: [colors.nileBlue, colors.lavenderMist], // Nile Blue to Lavender
    icon: 'storefront',
    description: 'Store-specific rewards',
  },
};

export const CoinToggleRow: React.FC<CoinToggleRowProps> = ({
  type,
  name,
  available,
  using,
  enabled,
  maxUsable,
  expiringToday,
  expiresIn,
  storeName,
  customColor,
  redemptionCap,
  onToggle,
  onAmountChange,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const defaultStyle = COIN_STYLES[type] || COIN_STYLES.nuqta; // Fallback to nuqta style
  // Always use palette colors - ignore custom colors to maintain design consistency
  const style = {
    ...defaultStyle,
  };

  const [showSlider, setShowSlider] = useState(enabled && available > 0);

  const handleToggle = (value: boolean) => {
    onToggle(value);
    setShowSlider(value && available > 0);
    if (!value) {
      onAmountChange(0);
    } else if (value && using === 0) {
      // Auto-apply max when enabling
      onAmountChange(Math.min(available, maxUsable));
    }
  };

  const getSubtitle = () => {
    if (type === 'rez' || type === 'nuqta') return 'Usable across all stores';
    if (type === 'branded' && storeName) return `Usable only at ${storeName}`;
    if (type === 'promo' && redemptionCap) return `Max ${redemptionCap}% per bill`;
    return defaultStyle?.description || '';
  };

  // Expiry badge text
  const getExpiryBadge = () => {
    if (expiringToday) {
      return { text: 'Expiring Today!', urgent: true };
    }
    if (expiresIn !== undefined && expiresIn !== null && expiresIn <= 7) {
      return { text: `Expires in ${expiresIn} day${expiresIn !== 1 ? 's' : ''}`, urgent: expiresIn <= 3 };
    }
    return null;
  };

  const expiryBadge = getExpiryBadge();

  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        <View style={[styles.iconContainer, { backgroundColor: style.bgColor }]}>
          {(type === 'rez' || type === 'nuqta') ? (
            <CachedImage
              source={BRAND.COIN_IMAGE}
              style={styles.coinIcon}
              contentFit="contain"
              transition={200}
            />
          ) : type === 'promo' ? (
            <CachedImage
              source={require('@/assets/images/promo-coin.png')}
              style={styles.coinIcon}
              contentFit="contain"
              transition={200}
            />
          ) : type === 'branded' ? (
            <CachedImage
              source={require('@/assets/images/wasil-coin.png')}
              style={styles.coinIcon}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <Ionicons name={style.icon as any} size={20} color={style.color} />
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.coinName}>{name}</Text>
            {expiryBadge && (
              <View style={[
                styles.expiryBadge, 
                expiryBadge.urgent && styles.expiryBadgeUrgent
              ]}>
                <Ionicons
                  name={expiryBadge.urgent ? 'warning' : 'time'}
                  size={10}
                  color={expiryBadge.urgent ? colors.background.primary : colors.nuqta.nileBlue}
                />
                <Text style={[
                  styles.expiryText,
                  !expiryBadge.urgent && { color: colors.nuqta.nileBlue }
                ]}>{expiryBadge.text}</Text>
              </View>
            )}
          </View>
          <Text style={styles.balance}>Balance: {currencySymbol}{available}</Text>
          {getSubtitle() && (
            <Text style={styles.subtitle}>{getSubtitle()}</Text>
          )}
        </View>

        <View style={styles.toggleContainer}>
          {enabled && using > 0 && (
            <Text style={[styles.usingAmount, { color: style.color }]}>
              -{currencySymbol}{using}
            </Text>
          )}
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            trackColor={{ false: colors.neutral[200], true: style.color }}
            thumbColor={colors.background.primary}
            disabled={available === 0}
          />
        </View>
      </View>

      {/* Slider Section */}
      {showSlider && maxUsable > 0 && (
        <View style={styles.sliderContainer}>
          <View style={styles.sliderValueRow}>
            <Text style={styles.sliderMinValue}>{currencySymbol}0</Text>
            <Text style={[styles.sliderCurrentValue, { color: style.color }]}>
              {currencySymbol}{using}
            </Text>
            <Text style={styles.sliderMaxValue}>{currencySymbol}{maxUsable}</Text>
          </View>

          <CrossPlatformSlider
            value={using}
            onValueChange={onAmountChange}
            minimumValue={0}
            maximumValue={maxUsable}
            step={1}
            minimumTrackTintColor={style.color}
            maximumTrackTintColor={colors.neutral[200]}
            thumbTintColor={style.color}
          />

          <View style={styles.quickSelectRow}>
            <Pressable
              style={[styles.quickSelectButton, using === 0 && styles.quickSelectActive]}
              onPress={() => onAmountChange(0)}
            >
              <Text style={[styles.quickSelectText, using === 0 && styles.quickSelectTextActive]}>
                None
              </Text>
            </Pressable>
            <Pressable
              style={[styles.quickSelectButton, using === Math.floor(maxUsable / 2) && styles.quickSelectActive]}
              onPress={() => onAmountChange(Math.floor(maxUsable / 2))}
            >
              <Text style={[styles.quickSelectText, using === Math.floor(maxUsable / 2) && styles.quickSelectTextActive]}>
                Half
              </Text>
            </Pressable>
            <Pressable
              style={[styles.quickSelectButton, using === maxUsable && styles.quickSelectActive]}
              onPress={() => onAmountChange(maxUsable)}
            >
              <Text style={[styles.quickSelectText, using === maxUsable && styles.quickSelectTextActive]}>
                Max
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  coinIcon: {
    width: 24,
    height: 24,
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  coinName: {
    ...typography.button,
    color: colors.text.primary,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightMustard, // Mustard for normal expiry
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  expiryBadgeUrgent: {
    backgroundColor: colors.errorScale[500], // Red for urgent
  },
  expiryText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.background.primary,
  },
  balance: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  toggleContainer: {
    alignItems: 'flex-end',
  },
  usingAmount: {
    ...typography.bodySmall,
    fontWeight: '700',
    marginBottom: 4,
  },
  sliderContainer: {
    marginTop: spacing.md,
    paddingLeft: 56, // Align with text after icon
  },
  sliderValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sliderMinValue: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  sliderCurrentValue: {
    ...typography.h4,
    fontWeight: '700',
  },
  sliderMaxValue: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  quickSelectRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickSelectButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.nuqta.linen,
    borderWidth: 1,
    borderColor: colors.nuqta.peach,
  },
  quickSelectActive: {
    backgroundColor: colors.nuqta.mustard,
    borderColor: colors.nuqta.mustard,
  },
  quickSelectText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  quickSelectTextActive: {
    color: colors.nuqta.nileBlue,
  },
});

export default React.memo(CoinToggleRow);
