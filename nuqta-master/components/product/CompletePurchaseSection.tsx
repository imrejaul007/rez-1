/**
 * CompletePurchaseSection Component
 *
 * Three purchase options:
 * 1. Visit Store & Buy
 * 2. 60-Minute Delivery (Coming Soon)
 * 3. Buy Online
 *
 * Based on reference design from ProductPage redesign
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { triggerImpact } from '@/utils/haptics';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';

interface StoreInfo {
  name: string;
  address?: string;
  city?: string;
  openTime?: string;
  closeTime?: string;
  latitude?: number;
  longitude?: number;
}

interface CompletePurchaseSectionProps {
  /** Store information */
  storeInfo?: StoreInfo;
  /** Delivery fee */
  deliveryFee?: number;
  /** Product ID for buy action */
  productId: string;
  /** Currency symbol */
  currency?: string;
  /** Callback for Visit Store */
  onVisitStore?: () => void;
  /** Callback for Buy Online */
  onBuyOnline?: () => void;
  /** Custom style */
  style?: any;
}

export const CompletePurchaseSection: React.FC<CompletePurchaseSectionProps> = ({
  storeInfo,
  deliveryFee = 49,
  productId,
  currency,
  onVisitStore,
  onBuyOnline,
  style,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = currency || getCurrencySymbol();
  const router = useRouter();

  const handleVisitStore = () => {
    triggerImpact('Light');
    if (onVisitStore) {
      onVisitStore();
    } else if (storeInfo?.latitude && storeInfo?.longitude) {
      // Open maps with store location
      const scheme = Platform.select({
        ios: 'maps:0,0?q=',
        android: 'geo:0,0?q=',
      });
      const latLng = `${storeInfo.latitude},${storeInfo.longitude}`;
      const label = encodeURIComponent(storeInfo.name || 'Store');
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`,
      });
      if (url) { try { Linking.openURL(url); } catch (e) { catchAndWarn(e, 'CompletePurchaseSection/openURL'); } }
    }
  };

  const handleBuyOnline = () => {
    triggerImpact('Light');
    if (onBuyOnline) {
      onBuyOnline();
    } else {
      router.push('/cart');
    }
  };

  const storeHours = storeInfo?.openTime && storeInfo?.closeTime
    ? `${storeInfo.openTime} - ${storeInfo.closeTime}`
    : '10 AM - 9 PM';

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionTitle}>Complete Your Purchase</Text>

      {/* Option 1: Visit Store & Buy */}
      <View style={styles.optionCard}>
        <View style={styles.optionHeader}>
          <View style={[styles.iconContainer, styles.iconStore]}>
            <Ionicons name="storefront" size={22} color={colors.tealGreen} />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Visit Store & Buy</Text>
            <Text style={styles.optionSubtitle}>Product reserved for you</Text>
          </View>
        </View>

        {/* Store Details */}
        <View style={styles.storeDetails}>
          <View style={styles.storeDetailRow}>
            <Ionicons name="location-outline" size={16} color={colors.neutral[500]} />
            <Text style={styles.storeDetailText}>
              {storeInfo?.name || 'Store'}, {storeInfo?.city || 'Bangalore'}
            </Text>
          </View>
          <View style={styles.storeDetailRow}>
            <Ionicons name="time-outline" size={16} color={colors.neutral[500]} />
            <Text style={styles.storeDetailText}>Open: {storeHours}</Text>
          </View>
        </View>

        {/* Visit Store Button */}
        <Pressable
          style={styles.visitStoreButton}
          onPress={handleVisitStore}
         
        >
          <Ionicons name="storefront-outline" size={18} color={colors.background.primary} />
          <Text style={styles.visitStoreButtonText}>Visit Store</Text>
        </Pressable>

        <Text style={styles.storeHint}>
          {`Scan ${BRAND.APP_NAME} QR at store for instant checkout`}
        </Text>
      </View>

      {/* Option 2: 60-Minute Delivery (Coming Soon) */}
      <View style={[styles.optionCard, styles.optionDisabled]}>
        <View style={styles.comingSoonBanner}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>

        <View style={styles.optionHeader}>
          <View style={[styles.iconContainer, styles.iconDelivery]}>
            <Ionicons name="flash" size={22} color={colors.brand.purpleMedium} />
          </View>
          <View style={styles.optionInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.optionTitle}>60-Minute Delivery</Text>
              <View style={styles.fastBadge}>
                <Text style={styles.fastBadgeText}>Fast</Text>
              </View>
            </View>
            <Text style={styles.optionSubtitle}>Get it delivered to your doorstep</Text>
          </View>
        </View>

        {/* Delivery Fee */}
        <View style={styles.deliveryFeeRow}>
          <Text style={styles.deliveryFeeLabel}>Delivery Fee</Text>
          <Text style={styles.deliveryFeeValue}>{currencySymbol}{deliveryFee}</Text>
        </View>
        <Text style={styles.deliveryHint}>
          {`Returned as ${BRAND.COIN_NAME} after sharing`}
        </Text>

        {/* Disabled Button */}
        <View style={styles.disabledButton}>
          <Ionicons name="bicycle" size={18} color={colors.neutral[400]} />
          <Text style={styles.disabledButtonText}>Get Delivered in 60 Min</Text>
        </View>
      </View>

      {/* Option 3: Buy Online */}
      <View style={styles.optionCard}>
        <View style={styles.optionHeader}>
          <View style={[styles.iconContainer, styles.iconOnline]}>
            <Ionicons name="cart" size={22} color={colors.neutral[700]} />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Buy Online</Text>
            <Text style={styles.optionSubtitle}>Standard delivery in 2-3 days</Text>
          </View>
        </View>

        {/* Buy Online Button */}
        <Pressable
          style={styles.buyOnlineButton}
          onPress={handleBuyOnline}
         
        >
          <Ionicons name="bag-check" size={18} color={colors.background.primary} />
          <Text style={styles.buyOnlineButtonText}>Buy Now & Earn Cashback</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 14,
  },

  // Option Card
  optionCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  optionDisabled: {
    opacity: 0.7,
    position: 'relative',
    overflow: 'hidden',
  },

  comingSoonBanner: {
    position: 'absolute',
    top: 10,
    right: -30,
    backgroundColor: colors.warningScale[400],
    paddingHorizontal: 30,
    paddingVertical: 4,
    transform: [{ rotate: '45deg' }],
    zIndex: 10,
  },

  comingSoonText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },

  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  iconStore: {
    backgroundColor: '#CCFBF1',
  },

  iconDelivery: {
    backgroundColor: colors.tint.pink,
  },

  iconOnline: {
    backgroundColor: colors.neutral[100],
  },

  optionInfo: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 2,
  },

  optionSubtitle: {
    fontSize: 13,
    color: colors.neutral[500],
  },

  fastBadge: {
    backgroundColor: colors.tint.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  fastBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.blue,
  },

  // Store Details
  storeDetails: {
    backgroundColor: colors.neutral[50],
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },

  storeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  storeDetailText: {
    fontSize: 13,
    color: colors.neutral[600],
  },

  // Visit Store Button
  visitStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealGreen,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 10,
  },

  visitStoreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background.primary,
  },

  storeHint: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: 'center',
  },

  // Delivery Fee
  deliveryFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },

  deliveryFeeLabel: {
    fontSize: 13,
    color: colors.neutral[500],
  },

  deliveryFeeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },

  deliveryHint: {
    fontSize: 12,
    color: colors.lightMustard,
    marginBottom: 14,
  },

  // Disabled Button
  disabledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[200],
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },

  disabledButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[400],
  },

  // Buy Online Button
  buyOnlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[900],
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },

  buyOnlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default React.memo(CompletePurchaseSection);
