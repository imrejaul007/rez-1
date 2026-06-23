/**
 * MallOfferCard Component
 *
 * Card component for displaying exclusive mall offers
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MallOffer, OfferBadge } from '../../../types/mall.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface MallOfferCardProps {
  offer: MallOffer;
  onPress: (offer: MallOffer) => void;
  width?: number;
}

const BADGE_COLORS: Record<OfferBadge, { bg: string; text: string }> = {
  'limited-time': { bg: colors.lightPeach, text: colors.brand.amberDark },
  'mall-exclusive': { bg: colors.nileBlue, text: colors.background.primary },
  'flash-sale': { bg: colors.error, text: colors.background.primary },
  'best-deal': { bg: colors.nileBlue, text: colors.background.primary },
};

// Helper to check if string is a valid image URL
const isValidImageUrl = (url: string | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image');
};

const MallOfferCard: React.FC<MallOfferCardProps> = ({
  offer,
  onPress,
  width = 260,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  // Calculate days remaining (guard against missing/invalid dates)
  const validUntil = offer.validUntil ? new Date(offer.validUntil) : null;
  const now = new Date();
  const daysRemaining = validUntil && !isNaN(validUntil.getTime())
    ? Math.max(0, Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Value display
  const valueDisplay = offer.valueType === 'percentage'
    ? `${offer.value}% off`
    : `${currencySymbol}${offer.value} off`;

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={() => onPress(offer)}
     
    >
      <View style={styles.card}>
        {/* Offer Image */}
        <View style={styles.imageContainer}>
          {isValidImageUrl(offer.image) ? (
            <CachedImage
              source={offer.image}
              style={styles.offerImage}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={[colors.nileBlue, colors.brand.nileBlueLight]}
              style={styles.offerImage}
            />
          )}

          {/* Badge */}
          {offer.badge && (
            <View style={[
              styles.badge,
              { backgroundColor: BADGE_COLORS[offer.badge]?.bg || colors.neutral[500] }
            ]}>
              <Text style={[styles.badgeText, { color: BADGE_COLORS[offer.badge]?.text || colors.background.primary }]}>
                {offer.badge === 'mall-exclusive' ? 'Mall Exclusive' :
                 offer.badge === 'limited-time' ? 'Limited Time' :
                 offer.badge === 'flash-sale' ? 'Flash Sale' : 'Best Deal'}
              </Text>
            </View>
          )}
        </View>

        {/* Offer Details */}
        <View style={styles.detailsContainer}>
          {/* Brand Info */}
          <View style={styles.brandRow}>
            <Text style={styles.brandName} numberOfLines={1}>
              {offer.brand?.name || offer.store?.name || 'Brand'}
            </Text>
            {offer.isMallExclusive && (
              <View style={styles.exclusiveTag}>
                <Text style={styles.exclusiveTagText}>Mall Exclusive</Text>
              </View>
            )}
          </View>

          {/* Offer Title */}
          <Text style={styles.offerTitle} numberOfLines={2}>
            {offer.title}
          </Text>

          {/* Value and Extra Coins */}
          <View style={styles.valueRow}>
            <Text style={styles.valueText}>{valueDisplay}</Text>
            {(offer.extraCoins ?? 0) > 0 && (
              <View style={styles.coinsContainer}>
                <Text style={styles.coinsText}>+{offer.extraCoins} Coins</Text>
              </View>
            )}
          </View>

          {/* Validity and CTA */}
          <View style={styles.footerRow}>
            <Text style={styles.validityText}>
              Valid till: {validUntil ? formatDate(validUntil) : 'N/A'}
            </Text>
            <Pressable style={styles.shopButton} onPress={() => onPress(offer)}>
              <Text style={styles.shopButtonText}>Shop Now</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.background.primary} />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 14,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  offerImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background.primary,
  },
  detailsContainer: {
    padding: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
    flex: 1,
  },
  exclusiveTag: {
    backgroundColor: colors.lavenderMist,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exclusiveTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
    lineHeight: 20,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.nileBlue,
  },
  coinsContainer: {
    backgroundColor: colors.linen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  coinsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  validityText: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  shopButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default memo(MallOfferCard);
