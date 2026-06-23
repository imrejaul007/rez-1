/**
 * CoinDropsSection Component
 *
 * Big Coin Drops - Limited time multipliers
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { CountdownTimer } from '../common/CountdownTimer';
import { CoinDrop } from '@/types/offers.types';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface CoinDropsSectionProps {
  coinDrops: CoinDrop[];
  onViewAll?: () => void;
}

export const CoinDropsSection: React.FC<CoinDropsSectionProps> = ({
  coinDrops,
  onViewAll,
}) => {
  const router = useRouter();
  const { theme, isDark } = useOffersTheme();

  if (coinDrops.length === 0) return null;

  const handleCoinDropPress = (coinDrop: CoinDrop) => {
    router.push(`/MainStorePage?storeId=${coinDrop.id}`);
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.lg,
    },
    card: {
      width: 160,
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255, 200, 87, 0.4)' : Colors.gold,
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    multiplierBanner: {
      backgroundColor: Colors.gold,
      paddingVertical: 8,
      alignItems: 'center',
    },
    multiplierText: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.background.primary,
      letterSpacing: 1,
    },
    multiplierSubtext: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.background.primary,
      opacity: 0.9,
    },
    content: {
      padding: Spacing.md,
      alignItems: 'center',
    },
    logoContainer: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: colors.background.primary,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: Colors.gold,
      ...Shadows.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    logo: {
      width: 44,
      height: 44,
    },
    logoPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: Colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      color: colors.background.primary,
      fontSize: 22,
      fontWeight: '700',
    },
    storeName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: 2,
    },
    category: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    cashbackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    normalCashback: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
      textDecorationLine: 'line-through',
    },
    arrow: {
      marginHorizontal: 6,
    },
    boostedCashback: {
      fontSize: 16,
      fontWeight: '800',
      color: Colors.gold,
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : colors.errorScale[100],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    timerIcon: {
      marginRight: 4,
    },
  });

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Big Coin Drops"
        subtitle="Limited time multipliers"
        icon="rocket"
        iconColor={Colors.gold}
        showViewAll={coinDrops.length > 3}
        onViewAll={onViewAll}
      />
      <HorizontalScrollSection>
        {coinDrops.map((coinDrop) => (
          <Pressable
            key={coinDrop.id}
            style={styles.card}
            onPress={() => handleCoinDropPress(coinDrop)}
           
          >
            <View style={styles.multiplierBanner}>
              <Text style={styles.multiplierText}>{coinDrop.multiplier}X</Text>
              <Text style={styles.multiplierSubtext}>COINS</Text>
            </View>

            <View style={styles.content}>
              <View style={styles.logoContainer}>
                {coinDrop.storeLogo ? (
                  <CachedImage
                    source={{ uri: coinDrop.storeLogo }}
                    style={styles.logo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoText}>
                      {coinDrop.storeName.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.storeName} numberOfLines={1}>
                {coinDrop.storeName}
              </Text>
              <Text style={styles.category}>{coinDrop.category}</Text>

              <View style={styles.cashbackRow}>
                <Text style={styles.normalCashback}>{coinDrop.normalCashback}%</Text>
                <Ionicons
                  name="arrow-forward"
                  size={12}
                  color={theme.colors.text.tertiary}
                  style={styles.arrow}
                />
                <Text style={styles.boostedCashback}>{coinDrop.boostedCashback}%</Text>
              </View>

              <View style={styles.timerContainer}>
                <Ionicons
                  name="time"
                  size={12}
                  color={colors.error}
                  style={styles.timerIcon}
                />
                <CountdownTimer endTime={coinDrop.endTime} size="small" showIcon={false} />
              </View>
            </View>
          </Pressable>
        ))}
      </HorizontalScrollSection>
    </View>
  );
};

export default React.memo(CoinDropsSection);
