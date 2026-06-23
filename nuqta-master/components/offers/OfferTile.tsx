/**
 * OfferTile — Compact offer card used across home feed, search results, and deal sections.
 *
 * Layout:
 * - Top row: store logo + name + distance badge
 * - Hero: "SAVE {currency}{amount}"
 * - Sub: "{percent}% Cashback"
 * - Badges row: up to 3 small pills
 * - Footer: expiry date
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';

interface OfferTileProps {
  storeName: string;
  storeLogo?: string;
  distance?: number;
  saveAmount: number;
  cashbackPercent?: number;
  badges?: Array<{ label: string; color: string }>;
  expiryDate?: string;
  onPress: () => void;
  currencySymbol: string;
}

const MAX_BADGES = 3;

const OfferTile: React.FC<OfferTileProps> = ({
  storeName,
  storeLogo,
  distance,
  saveAmount,
  cashbackPercent,
  badges,
  expiryDate,
  onPress,
  currencySymbol,
}) => {
  const visibleBadges = badges?.slice(0, MAX_BADGES);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Top row: logo + store name + distance */}
      <View style={styles.topRow}>
        <CachedImage
          source={storeLogo ? { uri: storeLogo } : require('@/assets/images/icon.png')}
          style={styles.storeLogo}
          contentFit="cover"
        />
        <Text style={styles.storeName} numberOfLines={1}>
          {storeName}
        </Text>
        {distance != null && distance > 0 && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location-outline" size={10} color={colors.gray[600]} />
            <Text style={styles.distanceText}>
              {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
            </Text>
          </View>
        )}
      </View>

      {/* Hero savings */}
      <Text style={styles.heroText}>
        SAVE {currencySymbol}{saveAmount.toLocaleString()}
      </Text>

      {/* Cashback sub-line */}
      {cashbackPercent != null && cashbackPercent > 0 && (
        <Text style={styles.cashbackText}>{cashbackPercent}% Cashback</Text>
      )}

      {/* Badges row */}
      {visibleBadges && visibleBadges.length > 0 && (
        <View style={styles.badgesRow}>
          {visibleBadges.map((badge, idx) => (
            <View
              key={idx}
              style={[styles.badge, { backgroundColor: badge.color + '1A' }]}
            >
              <Text style={[styles.badgeText, { color: badge.color }]}>
                {badge.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Expiry footer */}
      {expiryDate && (
        <Text style={styles.expiryText}>Expires {expiryDate}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: colors.nuqta.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(26, 58, 82, 0.08)',
      } as any,
    }),
  },
  cardPressed: {
    opacity: 0.92,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  storeLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[50],
  },
  storeName: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.gray[600],
  },

  // Hero
  heroText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a3a52',
    marginBottom: 2,
  },

  // Cashback
  cashbackText: {
    fontSize: 12,
    color: '#627D98',
    marginBottom: spacing.sm,
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Expiry
  expiryText: {
    fontSize: 11,
    color: colors.gray[500],
  },
});

export default React.memo(OfferTile);
