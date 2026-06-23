import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { StoreCardProps } from '@/types/store-search';
import ProductGrid from './ProductGrid';
import QuickActions from '@/components/store/QuickActions';
import FastImage from '@/components/common/FastImage';
import CachedImage from '@/components/ui/CachedImage';
import { BRAND } from '@/constants/brand';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS
} from '@/constants/search-constants';
import { colors } from '@/constants/theme';

// Generate a consistent color from store name for letter avatar
const getAvatarColor = (name: string): string => {
  const avatarColors = [
    '#4F46E5', colors.brand.purple, colors.deepPink, colors.error,
    colors.brand.orangeDark, colors.warningScale[700], '#65A30D', colors.successScale[700],
    colors.cyanDark, colors.brand.blue, '#4338CA', colors.brand.purpleDeep,
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const StoreCard: React.FC<StoreCardProps & {
  showQuickActions?: boolean;
  bookingType?: 'RESTAURANT' | 'SERVICE' | 'CONSULTATION' | 'RETAIL' | 'HYBRID';
  contact?: {
    phone?: string;
    email?: string;
  };
}> = ({
  store,
  onStoreSelect,
  onProductSelect,
  showDistance = true,
  maxProducts = 4,
  showQuickActions = true,
  bookingType,
  contact,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const [logoError, setLogoError] = useState(false);

  const handleStorePress = () => {
    if (onStoreSelect) {
      onStoreSelect(store);
    }
  };

  const storeLogo = store.logo || null;
  const storeName = store.storeName || 'Store';
  const avatarColor = useMemo(() => getAvatarColor(storeName), [storeName]);
  const showLetterAvatar = !storeLogo || logoError;

  // Rating display
  const ratingDisplay = store.rating > 0 ? store.rating.toFixed(1) : null;

  const styles = createStyles(screenWidth);

  return (
    <View style={styles.container}>
      {/* Compact Header: Logo/Avatar + Store Info */}
      <Pressable
        onPress={handleStorePress}
       
        style={styles.cardHeader}
      >
        {/* Logo or Letter Avatar */}
        <View style={styles.avatarContainer}>
          {showLetterAvatar ? (
            <View style={[styles.letterAvatar, { backgroundColor: avatarColor }]}>
              <ThemedText style={styles.letterAvatarText}>
                {storeName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          ) : (
            <FastImage
              source={{ uri: storeLogo! }}
              style={styles.logoImage}
              resizeMode="cover"
              onError={() => setLogoError(true)}
              showLoader={false}
            />
          )}
          {/* Online status indicator on avatar */}
          {store.isOpen && (
            <View style={styles.onlineIndicator} />
          )}
        </View>

        {/* Store Info */}
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <ThemedText style={styles.storeName} numberOfLines={1}>
              {storeName}
            </ThemedText>
            {ratingDisplay && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={10} color={colors.background.primary} />
                <ThemedText style={styles.ratingText}>{ratingDisplay}</ThemedText>
              </View>
            )}
          </View>

          <View style={styles.detailRow}>
            {store.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={11} color={COLORS.GRAY_400} />
                <ThemedText style={styles.locationText} numberOfLines={1}>
                  {store.location}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Badges Row */}
          <View style={styles.badgesRow}>
            {store.hasNuqtaPay && (
              <View style={styles.nuqtaPayBadge}>
                <CachedImage source={BRAND.COIN_IMAGE} width={13} height={13} showShimmer={false} />
                <ThemedText style={styles.nuqtaPayText}>{BRAND.PAY_NAME}</ThemedText>
              </View>
            )}
            {store.distance != null && (
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate" size={10} color={colors.neutral[500]} />
                <ThemedText style={styles.distanceText}>
                  {store.distance < 1
                    ? `${Math.round(store.distance * 1000)}m`
                    : `${store.distance.toFixed(1)}km`}
                </ThemedText>
              </View>
            )}
            {(store.cashbackPercent ?? 0) > 0 && (
              <View style={styles.cashbackBadge}>
                <Ionicons name="gift" size={10} color={colors.successScale[700]} />
                <ThemedText style={styles.cashbackText}>{store.cashbackPercent}% cashback</ThemedText>
              </View>
            )}
            {store.estimatedDelivery && (
              <View style={styles.deliveryBadge}>
                <Ionicons name="time" size={10} color={colors.brand.indigo} />
                <ThemedText style={styles.deliveryText}>{store.estimatedDelivery}</ThemedText>
              </View>
            )}
          </View>

          {store.description ? (
            <ThemedText style={styles.description} numberOfLines={2}>
              {store.description}
            </ThemedText>
          ) : null}
        </View>

        {/* Chevron arrow */}
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={16} color={COLORS.GRAY_300} />
        </View>
      </Pressable>

      {/* Products Grid */}
      {store.products && store.products.length > 0 && (
        <View style={styles.productsContainer}>
          <ProductGrid
            products={store.products}
            store={store}
            onProductSelect={onProductSelect}
            maxItems={maxProducts}
            columns={2}
          />
        </View>
      )}

      {/* Quick Actions */}
      {showQuickActions && (
        <View style={styles.quickActionsContainer}>
          <QuickActions
            storeId={store.storeId}
            storeName={store.storeName}
            bookingType={bookingType || 'RETAIL'}
            contact={contact}
            location={{
              address: store.location,
            }}
            variant="compact"
            maxActions={4}
            hideTitle
          />
        </View>
      )}
    </View>
  );
};

const createStyles = (screenWidth: number) => {
  const isTablet = screenWidth > 768;
  const cardPadding = isTablet ? SPACING.XL : SPACING.LG;

  return StyleSheet.create({
    container: {
      backgroundColor: COLORS.WHITE,
      borderRadius: 18,
      marginBottom: SPACING.MD,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.04)',
      elevation: 2,
      shadowColor: colors.nileBlue,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: cardPadding,
      paddingVertical: SPACING.LG,
    },
    avatarContainer: {
      marginRight: SPACING.MD,
      position: 'relative',
    },
    letterAvatar: {
      width: 52,
      height: 52,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    letterAvatarText: {
      color: colors.background.primary,
      fontSize: 22,
      fontWeight: '800',
    },
    logoImage: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: COLORS.GRAY_100,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.successScale[400],
      borderWidth: 2.5,
      borderColor: COLORS.WHITE,
    },
    headerInfo: {
      flex: 1,
      minWidth: 0,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    storeName: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.TEXT_PRIMARY,
      flex: 1,
      marginRight: SPACING.SM,
      letterSpacing: -0.4,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.successScale[400],
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
      gap: 3,
    },
    ratingText: {
      color: colors.background.primary,
      fontSize: 11.5,
      fontWeight: '800',
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 3,
    },
    locationText: {
      fontSize: 12,
      color: COLORS.TEXT_SECONDARY,
      flex: 1,
    },
    chevronContainer: {
      paddingLeft: SPACING.SM,
      paddingTop: 4,
    },
    badgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 4,
      marginTop: 2,
    },
    nuqtaPayBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint.orange,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      gap: 4,
      borderWidth: 1,
      borderColor: '#FED7AA',
    },
    nuqtaPayText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: '#C2410C',
    },
    distanceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral[100],
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      gap: 3,
    },
    distanceText: {
      fontSize: 10.5,
      fontWeight: '600',
      color: colors.neutral[500],
    },
    cashbackBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint.greenLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      gap: 3,
      borderWidth: 1,
      borderColor: '#A7F3D0',
    },
    cashbackText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: colors.successScale[700],
    },
    deliveryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.indigoMist,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      gap: 3,
      borderWidth: 1,
      borderColor: '#C7D2FE',
    },
    deliveryText: {
      fontSize: 10.5,
      fontWeight: '600',
      color: '#4F46E5',
    },
    description: {
      fontSize: 12,
      color: COLORS.GRAY_400,
      lineHeight: 17,
    },
    productsContainer: {
      paddingHorizontal: cardPadding,
      paddingTop: SPACING.SM,
      paddingBottom: SPACING.SM,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[100],
      backgroundColor: '#FAFBFC',
    },
    quickActionsContainer: {
      paddingHorizontal: cardPadding,
      paddingBottom: SPACING.SM,
      paddingTop: SPACING.XS,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[100],
    },
  });
};

export default React.memo(StoreCard);
