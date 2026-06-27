// @ts-nocheck
import React, { useMemo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  View
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BrandedStoreCardProps } from '@/types/homepage.types';
import FastImage from '@/components/common/FastImage';
import { colors } from '@/constants/theme';

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: BrandedStoreCardProps, nextProps: BrandedStoreCardProps) => {
  return (
    prevProps.store.id === nextProps.store.id &&
    prevProps.width === nextProps.width &&
    prevProps.store.brandName === nextProps.store.brandName &&
    prevProps.store.discount.description === nextProps.store.discount.description &&
    prevProps.store.cashback.description === nextProps.store.cashback.description &&
    prevProps.store.isPartner === nextProps.store.isPartner &&
    prevProps.store.partnerLevel === nextProps.store.partnerLevel
  );
};

function BrandedStoreCard({
  store,
  onPress,
  width = 200
}: BrandedStoreCardProps) {
  // Memoize accessibility label
  const storeLabel = useMemo(() => {
    return `${store.brandName}. ${store.discount.description}. ${store.cashback.description}${store.isPartner ? `. ${store.partnerLevel} partner` : ''}`;
  }, [store.brandName, store.discount.description, store.cashback.description, store.isPartner, store.partnerLevel]);

  // Memoize onPress callback
  const handlePress = useCallback(() => {
    try {
      onPress(store);
    } catch (error) {
      // silently handle
    }
  }, [onPress, store]);

  // Memoize partner badge styles
  const partnerBadgeStyles = useMemo(() => {
    const baseStyle = [styles.partnerBadge];
    if (store.partnerLevel === 'gold') {
      baseStyle.push(styles.goldPartner);
    } else if (store.partnerLevel === 'silver') {
      baseStyle.push(styles.silverPartner);
    } else if (store.partnerLevel === 'bronze') {
      baseStyle.push(styles.bronzePartner);
    }
    return baseStyle;
  }, [store.partnerLevel]);

  // Memoize partner text styles
  const partnerTextStyles = useMemo(() => {
    const baseStyle = [styles.partnerText];
    if (store.partnerLevel === 'gold') {
      baseStyle.push(styles.goldPartnerText);
    } else if (store.partnerLevel === 'silver') {
      baseStyle.push(styles.silverPartnerText);
    } else if (store.partnerLevel === 'bronze') {
      baseStyle.push(styles.bronzePartnerText);
    }
    return baseStyle;
  }, [store.partnerLevel]);

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={handlePress}
     
      delayPressIn={0}
      delayPressOut={0}
      accessibilityLabel={storeLabel}
      accessibilityRole="button"
      accessibilityHint="Double tap to view store details and offers"
    >
      <ThemedView style={[
        styles.card,
        { backgroundColor: store.backgroundColor || colors.offWhite }
      ]}>
        {/* Discount Badge */}
        <View
          style={styles.discountBadge}
          accessibilityLabel={`Discount: ${store.discount.description}`}
          accessibilityRole="text"
        >
          <ThemedText style={styles.discountText}>
            {store.discount.description}
          </ThemedText>
        </View>

        {/* Brand Logo */}
        <View
          style={styles.logoContainer}
          accessibilityLabel={`${store.brandName} logo`}
          accessibilityRole="image"
        >
          <FastImage
            source={store.brandLogo}
            style={styles.logo}
            resizeMode="contain"
            showLoader={true}
          />
        </View>

        {/* Brand Name */}
        <ThemedText
          style={styles.brandName}
          accessibilityLabel={`Store name: ${store.brandName}`}
        >
          {store.brandName}
        </ThemedText>

        {/* Cashback Info */}
        <View
          style={styles.cashbackContainer}
          accessibilityLabel={`Cashback offer: ${store.cashback.description}`}
          accessibilityRole="text"
        >
          <ThemedText style={styles.cashbackText}>
            {store.cashback.description}
          </ThemedText>
        </View>

        {/* Partner Badge */}
        {store.isPartner && (
          <View style={partnerBadgeStyles}>
            <ThemedText style={partnerTextStyles}>
              {(store.partnerLevel || '').toUpperCase() || '—'} PARTNER
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </Pressable>
  );
}

export default React.memo(BrandedStoreCard, arePropsEqual);

const styles = StyleSheet.create({
  container: {
    // Container styles handled by parent
    flex: 0,
    flexShrink: 0,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
    minHeight: 160,
    justifyContent: 'space-between',
  },
  discountBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  discountText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  logoContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  cashbackContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  cashbackText: {
    fontSize: 12,
    color: colors.lightMustard,
    fontWeight: '600',
    textAlign: 'center',
  },
  partnerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'center',
  },
  goldPartner: {
    backgroundColor: colors.tint.amberLight,
  },
  silverPartner: {
    backgroundColor: colors.neutral[100],
  },
  bronzePartner: {
    backgroundColor: '#FED7AA',
  },
  partnerText: {
    fontSize: 10,
    fontWeight: '700',
  },
  goldPartnerText: {
    color: colors.brand.amberDark,
  },
  silverPartnerText: {
    color: colors.neutral[700],
  },
  bronzePartnerText: {
    color: '#9A3412',
  },
});