import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useNearbyStores, NearbyStore } from '@/hooks/useNearbyStores';
import { useRegionState } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import CoinLoader from '@/components/ui/CoinLoader';
import { BRAND } from '@/constants/brand';

interface StoresNearYouProps {
  onMapViewPress?: () => void;
}

const StoresNearYou: React.FC<StoresNearYouProps> = ({ onMapViewPress }) => {
  const router = useRouter();

  // Get current region for display
  const regionState = useRegionState();
  const regionName = regionState.regionConfig?.name || 'your area';

  // Use the nearby stores hook to fetch real data
  // Now with region fallback for coordinates when GPS unavailable
  const {
    stores,
    isLoading,
    error,
    hasLocationPermission,
    refetch,
    requestLocationPermission,
  } = useNearbyStores({ radius: 2, limit: 5, useRegionFallback: true });

  const handleMapView = () => {
    if (onMapViewPress) {
      onMapViewPress();
    } else {
      router.push('/explore/map');
    }
  };

  const handleStorePress = (storeId: string) => {
    router.push(`/MainStorePage?storeId=${storeId}` as any);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="location" size={20} color={colors.lightPeach} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Stores Near You</Text>
              <Text style={styles.subtitle}>Within 2km • {regionName}</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <CoinLoader size={40} message={`Finding the best deals in ${regionName}...`} />
        </View>
      </View>
    );
  }

  // Location permission not granted AND no stores loaded yet
  // With region fallback, we can still show stores without GPS permission
  // Only show this if we have no stores and no error (meaning we're waiting for location)
  if (!hasLocationPermission && stores.length === 0 && !error && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="location" size={20} color={colors.lightPeach} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Stores Near You</Text>
              <Text style={styles.subtitle}>Within 2km • {regionName}</Text>
            </View>
          </View>
        </View>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconContainer}>
            <Ionicons name="location-outline" size={48} color={colors.neutral[400]} />
          </View>
          <Text style={styles.permissionTitle}>Enable Location</Text>
          <Text style={styles.permissionText}>
            Allow location access for more accurate store recommendations in {regionName}
          </Text>
          <Pressable
            style={styles.enableButton}
            onPress={requestLocationPermission}
           
          >
            <Ionicons name="navigate" size={16} color={colors.background.primary} style={{ marginRight: 6 }} />
            <Text style={styles.enableButtonText}>Enable Location</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="location" size={20} color={colors.lightPeach} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Stores Near You</Text>
              <Text style={styles.subtitle}>Within 2km • {regionName}</Text>
            </View>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Unable to load stores</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={refetch}
           
          >
            <Ionicons name="refresh" size={16} color={colors.background.primary} style={{ marginRight: 6 }} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Invite merchant share handler
  const handleInviteMerchant = async () => {
    try {
      await Share.share({
        message: `Join ${BRAND.APP_NAME} and reach more customers with smart cashback rewards! Download now: ${BRAND.WEBSITE}`,
      });
    } catch { /* user cancelled */ }
  };

  // Empty state - no stores found
  if (stores.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="location" size={20} color={colors.lightPeach} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Stores Near You</Text>
              <Text style={styles.subtitle}>Within 2km • {regionName}</Text>
            </View>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={48} color={colors.neutral[400]} />
          <Text style={styles.emptyTitle}>We're coming to {regionName}!</Text>
          <Text style={styles.emptyText}>
            Great news — amazing savings are on their way to your area. Meanwhile, explore online deals or help us grow faster!
          </Text>
          <View style={styles.emptyActionsRow}>
            <Pressable
              style={styles.emptyActionCard}
              onPress={() => router.push('/mall/offers' as any)}
            >
              <Ionicons name="globe-outline" size={20} color={colors.lightMustard} />
              <Text style={styles.emptyActionText}>Browse Online Deals</Text>
            </Pressable>
            <Pressable
              style={styles.emptyActionCard}
              onPress={handleInviteMerchant}
            >
              <Ionicons name="person-add-outline" size={20} color={colors.lightMustard} />
              <Text style={styles.emptyActionText}>Invite a Store</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.refreshButton}
            onPress={refetch}
          >
            <Ionicons name="refresh" size={16} color={colors.lightMustard} style={{ marginRight: 6 }} />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Success state - show stores
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="location" size={20} color={colors.lightPeach} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Stores Near You</Text>
            <Text style={styles.subtitle}>Within 2km • {regionName}</Text>
          </View>
        </View>
        <Pressable
          onPress={handleMapView}
         
          style={styles.mapViewButton}
        >
          <Text style={styles.mapViewText}>Map View</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.lightMustard} />
        </Pressable>
      </View>

      {/* Store Cards */}
      <View style={styles.storesContainer}>
        {stores.map((store: NearbyStore) => (
          <Pressable
            key={store.id}
            onPress={() => handleStorePress(store.id)}
           
            style={styles.storeCard}
          >
            <LinearGradient
              colors={[colors.background.primary, colors.linen]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Store Name Row */}
              <View style={styles.storeNameRow}>
                <View style={styles.storeNameLeft}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  {store.isLive && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveBadgeDot} />
                      <Text style={styles.liveBadgeText}>Live</Text>
                    </View>
                  )}
                </View>
                <View style={styles.distanceContainer}>
                  <Ionicons name="location-outline" size={12} color={colors.nileBlue} />
                  <Text style={styles.distance}>{store.distance}</Text>
                </View>
              </View>

              {/* Status Row */}
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <Ionicons
                    name={store.closingSoon ? "time-outline" : "checkmark-circle-outline"}
                    size={14}
                    color={store.closingSoon ? colors.lightMustard : colors.nileBlue}
                    style={styles.statusIcon}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      store.closingSoon && styles.closingSoonText,
                    ]}
                  >
                    {store.status} Wait: {store.waitTime}
                  </Text>
                </View>
                <View style={styles.cashbackContainer}>
                  <Ionicons name="cash-outline" size={12} color={colors.lightMustard} />
                  <Text style={styles.cashbackText}>{store.cashback}</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '400',
  },
  mapViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  mapViewText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  storesContainer: {
    gap: 14,
  },
  storeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.08)',
  },
  storeNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeNameLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.nileBlue,
    letterSpacing: -0.2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.background.primary,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.3,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distance: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 205, 87, 0.08)',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusIcon: {
    marginRight: 2,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.nileBlue,
  },
  closingSoonText: {
    color: colors.lightMustard,
  },
  cashbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cashbackText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  // Loading state styles
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  // Permission state styles
  permissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    marginTop: 8,
  },
  permissionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  enableButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background.primary,
  },
  // Error state styles
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.errorScale[50],
    borderRadius: 16,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginTop: 12,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: colors.errorScale[700],
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  // Empty state styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[700],
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    width: '100%',
  },
  emptyActionCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 205, 87, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  emptyActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.lightMustard,
    textAlign: 'center',
  },
});

export default React.memo(StoresNearYou);

