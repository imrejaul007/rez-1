/**
 * WalletReminderBanner Component
 * Banner showing user's coin balance and expiring coins reminder
 * Adapted from Rez_v-2-main wallet reminder pattern
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { loyaltyData } from '@/data/categoryDummyData';
import CoinIcon from '@/components/ui/CoinIcon';
import { colors } from '@/constants/theme';

interface WalletReminderBannerProps {
  availableCoins?: number;
  expiringCoins?: number;
  expiryDays?: number;
  onPress?: () => void;
}

const WalletReminderBanner: React.FC<WalletReminderBannerProps> = ({
  availableCoins = loyaltyData.coins.available,
  expiringCoins = loyaltyData.coins.expiring,
  expiryDays = loyaltyData.coins.expiryDays,
  onPress,
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/wallet' as any);
    }
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
     
      accessibilityLabel="View your wallet"
      accessibilityRole="button"
    >
      <LinearGradient
        colors={[colors.warningScale[400], colors.warningScale[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Coin Icon */}
          <View style={styles.coinIconContainer}>
            <CoinIcon size={28} />
          </View>

          {/* Balance Info */}
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>{availableCoins.toLocaleString()} Coins</Text>
            <Text style={styles.usageHint}>Use up to 20% on your next order</Text>
          </View>

          {/* Expiry Warning */}
          {expiringCoins > 0 && (
            <View style={styles.expiryBadge}>
              <Ionicons name="time-outline" size={12} color={colors.background.primary} />
              <Text style={styles.expiryText}>{expiringCoins} expiring in {expiryDays} days</Text>
            </View>
          )}

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={20} color={colors.background.primary} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.warningScale[700],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
      },
    }),
  },
  gradient: {
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  coinEmoji: {
    fontSize: 26,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.background.primary,
    marginBottom: 2,
  },
  usageHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  expiryBadge: {
    position: 'absolute',
    top: -8,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  expiryText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  arrowContainer: {
    marginLeft: 8,
  },
});

export default memo(WalletReminderBanner);
