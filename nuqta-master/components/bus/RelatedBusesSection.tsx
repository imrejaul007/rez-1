/**
 * Related Buses Section - Displays similar buses
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import travelApi from '@/services/travelApi';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Route {
  from: string;
  to: string;
}

interface RelatedBusesSectionProps {
  currentBusId: string;
  route?: Route;
}

const RelatedBusesSection: React.FC<RelatedBusesSectionProps> = ({ currentBusId, route }) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();
  const [relatedBuses, setRelatedBuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadRelatedBuses();
  }, [currentBusId, route]);

  const loadRelatedBuses = async () => {
    try {
      setIsLoading(true);
      const response = await travelApi.getByCategory('bus', {
        page: 1,
        limit: 10,
        sortBy: 'rating',
      });

      if (response.success && response.data?.services) {
        // Filter out current bus and limit to 5
        const filtered = response.data.services
          .filter((bus: any) => (bus._id || bus.id) !== currentBusId)
          .slice(0, 5);
        if (!isMounted()) return;
        setRelatedBuses(filtered);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleBusPress = (busId: string) => {
    router.push(`/bus/${busId}` as any);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Related Buses</Text>
        <ActivityIndicator size="small" color={colors.brand.orange} style={styles.loader} />
      </View>
    );
  }

  if (relatedBuses.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bus" size={24} color={colors.brand.orange} />
        <Text style={styles.title}>Related Buses</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {relatedBuses.map((bus) => {
          const busId = bus._id || bus.id;
          // Ensure bus images, not train/cab images
          let imageUrl = bus.images?.[0] || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400';
          if ((imageUrl.toLowerCase().includes('train') || imageUrl.toLowerCase().includes('cab')) && 
              !imageUrl.toLowerCase().includes('bus')) {
            imageUrl = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400';
          }
          const price = bus.pricing?.selling || 0;
          const rating = bus.ratings?.average || 0;
          const cashback = bus.cashback?.percentage || bus.serviceCategory?.cashbackPercentage || 0;

          return (
            <Pressable
              key={busId}
              style={styles.busCard}
              onPress={() => handleBusPress(busId)}
             
            >
              <CachedImage source={{ uri: imageUrl }} style={styles.busImage} contentFit="cover" cachePolicy="memory-disk" />
              {cashback > 0 && (
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>{cashback}%</Text>
                </View>
              )}
              <View style={styles.busInfo}>
                <Text style={styles.busName} numberOfLines={1}>{bus.name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={colors.warningScale[400]} />
                  <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.priceText}>From {currencySymbol}{price.toLocaleString(locale)}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: -0.3,
  },
  loader: {
    marginTop: 20,
  },
  scrollContent: {
    gap: 16,
  },
  busCard: {
    width: 280,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginRight: 16,
  },
  busImage: {
    width: '100%',
    height: 180,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.brand.orange,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
  },
  busInfo: {
    padding: 16,
  },
  busName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.orange,
  },
});

export default React.memo(RelatedBusesSection);
