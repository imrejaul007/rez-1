/**
 * FooterTrustSection Component
 * Trust indicators and coin info footer
 * Fetches real coin data from loyalty API
 */

import React, { memo, useState, useEffect } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import userLoyaltyApi from '@/services/userLoyaltyApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface FooterTrustSectionProps {
  categorySlug?: string;
  pageConfig?: any; // receives pageConfig for trust badges
}

// Default hardcoded trust badges (used when pageConfig doesn't provide them)
const DEFAULT_TRUST_BADGES = [
  { icon: 'shield-checkmark', color: colors.lightMustard, text: 'Secure Payments' },
  { icon: 'refresh', color: colors.infoScale[400], text: 'Easy Returns' },
  { icon: 'headset', color: colors.brand.purpleLight, text: '24/7 Support' },
];

const FooterTrustSection: React.FC<FooterTrustSectionProps> = ({
  categorySlug,
  pageConfig,
}) => {
  const router = useRouter();
  const [expiringCoins, setExpiringCoins] = useState(0);
  const [expiryDays, setExpiryDays] = useState(0);
  const isMounted = useIsMounted();

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const res = await userLoyaltyApi.getCoinBalance();
        if (res.success && res.data?.coins) {
          if (!isMounted()) return;
          setExpiringCoins(res.data.coins.expiring || 0);
          if (res.data.coins.expiryDate) {
            const days = Math.max(0, Math.ceil(
              (new Date(res.data.coins.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            ));
            if (!isMounted()) return;
            setExpiryDays(days);
          }
        }
      } catch {
        // Silent fail - footer is non-critical
      }
    };
    fetchCoins();
  }, []);

  const loyaltyRoute = categorySlug
    ? `/MainCategory/${categorySlug}/loyalty/coins`
    : '/wallet';

  return (
    <View style={styles.container}>
      {/* Trust Badges */}
      <View style={styles.trustBadges}>
        {(pageConfig?.trustBadges?.length ? pageConfig.trustBadges : DEFAULT_TRUST_BADGES).map(
          (badge: { icon: string; color: string; text?: string; label?: string }, index: number) => (
            <View key={index} style={styles.trustBadge}>
              <Ionicons name={badge.icon as any} size={18} color={badge.color} />
              <Text style={styles.trustText}>{badge.label || badge.text}</Text>
            </View>
          )
        )}
      </View>

      {/* Coins Info */}
      {expiringCoins > 0 && expiryDays > 0 && (
        <View style={styles.coinsInfo}>
          <Pressable
            style={styles.expiryWarning}
            onPress={() => router.push(loyaltyRoute as any)}
          >
            <Ionicons name="alert-circle" size={14} color={colors.error} />
            <Text style={styles.expiryText}>
              {expiringCoins} coins expiring in {expiryDays} days - Use them now!
            </Text>
          </Pressable>
        </View>
      )}

      {/* App Badge */}
      <View style={styles.appBadge}>
        <Text style={styles.appName}>{BRAND.APP_NAME}</Text>
        <Text style={styles.appTagline}>{BRAND.TAGLINE}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(11, 34, 64, 0.04), 0 8px 24px rgba(11, 34, 64, 0.06)',
      },
    }),
  },
  trustBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  coinsInfo: {
    width: '100%',
    backgroundColor: '#FEF9E6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  expiryText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '500',
  },
  appBadge: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brand.amberDeep,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 11,
    color: colors.neutral[400],
    marginTop: 2,
  },
});

export default memo(FooterTrustSection);
