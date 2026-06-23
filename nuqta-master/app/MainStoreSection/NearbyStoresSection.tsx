import { withErrorBoundary } from '@/utils/withErrorBoundary';
// NearbyStoresSection.tsx - Nearby ReZ stores section
import React, { useState, useEffect } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { CardGridSkeleton } from '@/components/skeletons';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import {
  Colors,
  Spacing,
  BorderRadius,
} from "@/constants/DesignSystem";
import { storesApi } from "@/services/storesApi";
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

export interface NearbyStore {
  id: string;
  name: string;
  distance: string;
}

export interface NearbyStoresSectionProps {
  stores?: NearbyStore[];
  currentStoreId?: string;
  userLat?: number;
  userLng?: number;
}

// Deprecated: sample data kept for reference only — not used as fallback in production
// const SAMPLE_STORES: NearbyStore[] = [
//   { id: "1", name: "Cafe Coffee Day", distance: "450m" },
//   { id: "2", name: "McDonald's", distance: "600m" },
//   { id: "3", name: "Pizza Hut", distance: "750m" },
// ];

// Format distance to human readable string
const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

function NearbyStoresSection({
  stores: propStores,
  currentStoreId,
  userLat,
  userLng,
}: NearbyStoresSectionProps) {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [stores, setStores] = useState<NearbyStore[]>(propStores || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userLat && userLng) {
      fetchNearbyStores();
    }
  }, [userLat, userLng, currentStoreId]);

  const fetchNearbyStores = async () => {
    if (!userLat || !userLng) return;

    try {
      setLoading(true);
      const response = await storesApi.getNearbyStores(userLat, userLng, 10, 5);

      if (response.success && response.data && response.data.length > 0) {
        // Filter out current store and format data
        const nearbyStores: NearbyStore[] = response.data
          .filter((store: any) => store._id !== currentStoreId && store.id !== currentStoreId)
          .slice(0, 3) // Limit to 3 stores
          .map((store: any) => ({
            id: store._id || store.id,
            name: store.name,
            distance: store.distance ? formatDistance(store.distance) : '~1km',
          }));

        if (nearbyStores.length > 0) {
          if (!isMounted()) return;
          setStores(nearbyStores);
        }
      }
    } catch (error: any) {
      // API failed — keep empty state (no fake data fallback)
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleStorePress = (store: NearbyStore) => {
    triggerImpact('Light');
    // Navigate to the store page
    router.push(`/MainStorePage?storeId=${store.id}` as any);
  };

  // Don't render section if no nearby stores are available
  if (stores.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <ThemedText style={styles.sectionTitle}>{`Nearby ${BRAND.APP_NAME} stores`}</ThemedText>

      {/* Stores List */}
      <View style={styles.storesList}>
        {stores.map((store) => (
          <Pressable
            key={store.id}
            style={styles.storeItem}
           
            onPress={() => handleStorePress(store)}
            accessibilityRole="button"
            accessibilityLabel={`${store.name}, ${store.distance}`}
          >
            <ThemedText style={styles.storeName}>{store.name}</ThemedText>
            <ThemedText style={styles.storeDistance}>{store.distance}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  storesList: {
    gap: Spacing.sm,
  },
  storeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  storeName: {
    fontSize: 15,
    color: Colors.text.primary,
  },
  storeDistance: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(NearbyStoresSection, 'MainStoreSectionNearbyStoresSection');
