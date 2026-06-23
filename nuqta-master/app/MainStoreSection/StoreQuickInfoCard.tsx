import { withErrorBoundary } from '@/utils/withErrorBoundary';
// StoreQuickInfoCard.tsx - Store info card with description, hours, location
import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';

interface OperationalHours {
  open?: string;
  close?: string;
  closed?: boolean;
}

interface StoreQuickInfoCardProps {
  storeName: string;
  description?: string;
  isVerified?: boolean;
  operationalInfo?: {
    hours?: {
      monday?: OperationalHours;
      tuesday?: OperationalHours;
      wednesday?: OperationalHours;
      thursday?: OperationalHours;
      friday?: OperationalHours;
      saturday?: OperationalHours;
      sunday?: OperationalHours;
    };
  };
  location?: {
    address?: string;
    city?: string;
    state?: string;
    coordinates?: {
      lat?: number;
      lng?: number;
    };
  };
}

function StoreQuickInfoCard({
  storeName,
  description,
  isVerified = false,
  operationalInfo,
  location,
}: StoreQuickInfoCardProps) {
  // Get current day's hours
  const getCurrentDayHours = () => {
    if (!operationalInfo?.hours) return null;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const todayHours = operationalInfo.hours[today as keyof typeof operationalInfo.hours];

    if (!todayHours || todayHours.closed) {
      return { isOpen: false, closingTime: null };
    }

    // Check if currently open
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const parseTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 100 + minutes;
    };

    if (todayHours.open && todayHours.close) {
      const openTime = parseTime(todayHours.open);
      const closeTime = parseTime(todayHours.close);
      const isOpen = currentTime >= openTime && currentTime <= closeTime;

      return {
        isOpen,
        closingTime: todayHours.close,
        openingTime: todayHours.open,
      };
    }

    return null;
  };

  const hoursInfo = getCurrentDayHours();

  // Format address
  const getFormattedAddress = () => {
    if (!location) return null;
    const parts = [location.address, location.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const formattedAddress = getFormattedAddress();

  // Open in maps
  const handleOpenMaps = () => {
    if (location?.coordinates?.lat && location?.coordinates?.lng) {
      const url = Platform.select({
        ios: `maps://app?daddr=${location.coordinates.lat},${location.coordinates.lng}`,
        android: `google.navigation:q=${location.coordinates.lat},${location.coordinates.lng}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}`,
      });
      try { Linking.openURL(url); } catch (e) { catchAndWarn(e, 'StoreQuickInfoCard/openURL'); }
    } else if (formattedAddress) {
      const encodedAddress = encodeURIComponent(formattedAddress);
      try { Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`); } catch (e) { catchAndWarn(e, 'StoreQuickInfoCard/openURL'); }
    }
  };

  return (
    <View style={styles.container}>
      {/* Store Name & Verified Badge */}
      <View style={styles.headerRow}>
        <ThemedText style={styles.storeName} numberOfLines={1}>
          {storeName}
        </ThemedText>
        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={colors.lightMustard} />
          </View>
        )}
      </View>

      {/* Description */}
      {description && (
        <ThemedText style={styles.description} numberOfLines={2}>
          {description}
        </ThemedText>
      )}

      {/* Hours Info */}
      {hoursInfo && (
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={colors.neutral[500]} />
          <ThemedText style={styles.infoText}>
            {hoursInfo.isOpen ? (
              <>
                <ThemedText style={styles.openText}>Open</ThemedText>
                {hoursInfo.closingTime && ` until ${hoursInfo.closingTime}`}
              </>
            ) : (
              <>
                <ThemedText style={styles.closedText}>Closed</ThemedText>
                {hoursInfo.openingTime && ` · Opens at ${hoursInfo.openingTime}`}
              </>
            )}
          </ThemedText>
        </View>
      )}

      {/* Location Row */}
      {formattedAddress && (
        <View style={styles.locationRow}>
          <View style={styles.locationInfo}>
            <Ionicons name="location-outline" size={16} color={colors.neutral[500]} />
            <ThemedText style={styles.addressText} numberOfLines={1}>
              {formattedAddress}
            </ThemedText>
          </View>
          <Pressable
            style={styles.openButton}
            onPress={handleOpenMaps}
           
          >
            <View style={styles.openDot} />
            <ThemedText style={styles.openButtonText}>Open</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  storeName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.nileBlue,
    flex: 1,
  },
  verifiedBadge: {
    // Just the icon
  },
  description: {
    fontSize: 14,
    color: colors.neutral[500],
    lineHeight: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  openText: {
    color: "#00875A",
    fontWeight: "600",
  },
  closedText: {
    color: colors.error,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  addressText: {
    fontSize: 13,
    color: colors.neutral[600],
    flex: 1,
  },
  openButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.lightMustard,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lightMustard,
  },
  openButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.lightMustard,
  },
});

export default withErrorBoundary(StoreQuickInfoCard, 'MainStoreSectionStoreQuickInfoCard');
