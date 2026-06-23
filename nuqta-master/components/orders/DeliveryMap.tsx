import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { catchAndWarn } from '@/utils/catchAndReport';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { OrderLocationUpdate } from '@/hooks/useOrderTracking';
import { colors } from '@/constants/theme';

interface DeliveryMapProps {
  locationUpdate: OrderLocationUpdate | null;
  deliveryAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  storeLocation?: {
    latitude: number;
    longitude: number;
  };
}

function DeliveryMap({ locationUpdate, deliveryAddress, storeLocation }: DeliveryMapProps) {
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);

  useEffect(() => {
    if (locationUpdate?.estimatedArrival) {
      const updateETA = () => {
        const arrival = new Date(locationUpdate.estimatedArrival!);
        const now = new Date();
        const diff = arrival.getTime() - now.getTime();
        const minutes = Math.max(0, Math.floor(diff / 60000));

        if (minutes > 60) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          setEstimatedTime(`${hours}h ${mins}m`);
        } else if (minutes === 0) {
          setEstimatedTime('Arriving now');
        } else {
          setEstimatedTime(`${minutes} min`);
        }
      };

      updateETA();
      const interval = setInterval(updateETA, 60000);
      return () => clearInterval(interval);
    }
  }, [locationUpdate?.estimatedArrival]);

  const handleCallDriver = () => {
    if (locationUpdate?.deliveryPartner.phone) {
      try {
        Linking.openURL(`tel:${locationUpdate.deliveryPartner.phone}`);
      } catch (e) { catchAndWarn(e, 'DeliveryMap/handleCallDriver'); }
    }
  };

  const openInMaps = () => {
    try {
      if (locationUpdate?.location) {
        const { latitude, longitude } = locationUpdate.location;
        const url = Platform.select({
          ios: `maps://app?daddr=${latitude},${longitude}`,
          android: `google.navigation:q=${latitude},${longitude}`,
          default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        });
        if (url) Linking.openURL(url).catch(() => {});
      } else if (deliveryAddress?.latitude && deliveryAddress?.longitude) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${deliveryAddress.latitude},${deliveryAddress.longitude}`;
        Linking.openURL(url).catch(() => {});
      }
    } catch (e) { catchAndWarn(e, 'DeliveryMap/openInMaps'); }
  };

  // Build static map URL for web fallback
  const getStaticMapUrl = (): string | null => {
    const lat = locationUpdate?.location?.latitude;
    const lng = locationUpdate?.location?.longitude;
    const destLat = deliveryAddress?.latitude;
    const destLng = deliveryAddress?.longitude;

    if (!lat && !destLat) return null;

    // Use OpenStreetMap static map (no API key needed)
    const centerLat = lat || destLat || 0;
    const centerLng = lng || destLng || 0;
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLng}&zoom=14&size=600x300&markers=${centerLat},${centerLng},red-pushpin`;
  };

  if (!locationUpdate) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderMap}>
          <View style={styles.placeholderIconContainer}>
            <Ionicons name="location-outline" size={48} color={colors.nileBlue} />
          </View>
          <Text style={styles.placeholderText}>Waiting for delivery tracking...</Text>
          <Text style={styles.placeholderSubtext}>
            Real-time tracking will appear once your order is dispatched
          </Text>
        </View>

        {deliveryAddress && (
          <View style={styles.addressContainer}>
            <View style={styles.addressHeader}>
              <Ionicons name="navigate-outline" size={16} color={colors.nileBlue} />
              <Text style={styles.addressLabel}>Delivery Address</Text>
            </View>
            <Text style={styles.addressText}>
              {deliveryAddress.addressLine1}
              {deliveryAddress.addressLine2 ? `, ${deliveryAddress.addressLine2}` : ''}
            </Text>
            <Text style={styles.addressText}>
              {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}
            </Text>
            {(deliveryAddress.latitude && deliveryAddress.longitude) && (
              <Pressable style={styles.openMapLink} onPress={openInMaps}>
                <Ionicons name="open-outline" size={14} color={colors.nileBlue} />
                <Text style={styles.openMapLinkText}>Open in Maps</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  const staticMapUrl = getStaticMapUrl();

  return (
    <View style={styles.container}>
      {/* Map area: Static image on web, location info card on native */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' && staticMapUrl ? (
          <CachedImage
            source={{ uri: staticMapUrl }}
            style={styles.staticMapImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <View style={styles.locationPinLarge}>
              <Ionicons name="location" size={36} color={colors.error} />
            </View>
            <Text style={styles.mapLocationText}>
              {locationUpdate.location.address || 'Delivery in progress'}
            </Text>

            {locationUpdate.distanceToDestination != null && (
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate" size={14} color={colors.nileBlue} />
                <Text style={styles.distanceText}>
                  {(locationUpdate.distanceToDestination / 1000).toFixed(1)} km away
                </Text>
              </View>
            )}
          </View>
        )}

        <Pressable style={styles.openMapButton} onPress={openInMaps}>
          <Ionicons name="map-outline" size={16} color={colors.background.primary} />
          <Text style={styles.openMapButtonText}>Open in Maps</Text>
        </Pressable>
      </View>

      {/* Delivery Partner Info */}
      <View style={styles.driverInfoContainer}>
        <View style={styles.driverInfo}>
          <View style={styles.driverAvatarContainer}>
            {locationUpdate.deliveryPartner.photoUrl ? (
              <CachedImage
                source={{ uri: locationUpdate.deliveryPartner.photoUrl }}
                style={styles.driverAvatar}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.driverAvatarPlaceholder}>
                <Text style={styles.driverAvatarText}>
                  {locationUpdate.deliveryPartner.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {/* Online indicator */}
            <View style={styles.onlineIndicator} />
          </View>

          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{locationUpdate.deliveryPartner.name}</Text>
            {locationUpdate.deliveryPartner.vehicle && (
              <Text style={styles.driverVehicle}>
                {locationUpdate.deliveryPartner.vehicle}
              </Text>
            )}
            {estimatedTime && (
              <View style={styles.etaBadge}>
                <Ionicons name="time-outline" size={12} color={colors.successScale[400]} />
                <Text style={styles.estimatedArrival}>Arriving in {estimatedTime}</Text>
              </View>
            )}
          </View>
        </View>

        <Pressable
          style={styles.callButton}
          onPress={handleCallDriver}
         
        >
          <Ionicons name="call" size={20} color={colors.background.primary} />
        </Pressable>
      </View>

      {/* Current Location Info */}
      {locationUpdate.location.address && (
        <View style={styles.currentLocationContainer}>
          <View style={styles.addressHeader}>
            <Ionicons name="location" size={14} color={colors.error} />
            <Text style={styles.currentLocationLabel}>Current Location</Text>
          </View>
          <Text style={styles.currentLocationText}>
            {locationUpdate.location.address}
          </Text>
        </View>
      )}

      {/* Delivery Address */}
      {deliveryAddress && (
        <View style={styles.addressContainer}>
          <View style={styles.addressHeader}>
            <Ionicons name="navigate-outline" size={14} color={colors.nileBlue} />
            <Text style={styles.addressLabel}>Delivery Address</Text>
          </View>
          <Text style={styles.addressText}>
            {deliveryAddress.addressLine1}
            {deliveryAddress.addressLine2 ? `, ${deliveryAddress.addressLine2}` : ''}
          </Text>
          <Text style={styles.addressText}>
            {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
  },
  mapContainer: {
    position: 'relative',
  },
  staticMapImage: {
    width: '100%',
    height: 300,
    backgroundColor: colors.neutral[100],
  },
  mapPlaceholder: {
    height: 300,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationPinLarge: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.nileBlue,
  },
  openMapButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  openMapButtonText: {
    color: colors.background.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  placeholderMap: {
    height: 220,
    backgroundColor: colors.linen,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    margin: 16,
    borderWidth: 2,
    borderColor: '#e8d5b5',
    borderStyle: 'dashed',
  },
  placeholderIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.nileBlue,
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  driverInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  driverAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.background.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.successScale[400],
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  driverVehicle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  estimatedArrival: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.successScale[400],
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.successScale[400],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentLocationContainer: {
    padding: 16,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  currentLocationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
    textTransform: 'uppercase',
  },
  currentLocationText: {
    fontSize: 14,
    color: colors.neutral[900],
    marginTop: 4,
  },
  addressContainer: {
    padding: 16,
    backgroundColor: colors.neutral[50],
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
    textTransform: 'uppercase',
  },
  addressText: {
    fontSize: 14,
    color: colors.neutral[700],
    lineHeight: 20,
  },
  openMapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  openMapLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
  },
});

export default React.memo(DeliveryMap);
