/**
 * Related Hotels Section - Displays similar hotels
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

interface Location {
  city: string;
  address?: string;
}

interface RelatedHotelsSectionProps {
  currentHotelId: string;
  location: Location;
}

const RelatedHotelsSection: React.FC<RelatedHotelsSectionProps> = ({ currentHotelId, location }) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();
  const [relatedHotels, setRelatedHotels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadRelatedHotels();
  }, [currentHotelId, location]);

  const loadRelatedHotels = async () => {
    try {
      setIsLoading(true);
      const response = await travelApi.getByCategory('hotels', {
        page: 1,
        limit: 10,
        sortBy: 'rating',
      });

      if (response.success && response.data?.services) {
        // Filter out current hotel and limit to 5
        const filtered = response.data.services
          .filter((hotel: any) => (hotel._id || hotel.id) !== currentHotelId)
          .slice(0, 5);
        if (!isMounted()) return;
        setRelatedHotels(filtered);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleHotelPress = (hotelId: string) => {
    router.push(`/hotel/${hotelId}` as any);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Related Hotels</Text>
        <ActivityIndicator size="small" color={colors.brand.pink} style={styles.loader} />
      </View>
    );
  }

  if (relatedHotels.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bed" size={24} color={colors.brand.pink} />
        <Text style={styles.title}>Related Hotels</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {relatedHotels.map((hotel) => {
          const hotelId = hotel._id || hotel.id;
          const imageUrl = hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400';
          const price = hotel.pricing?.selling || 0;
          const rating = hotel.ratings?.average || 0;
          const cashback = hotel.cashback?.percentage || hotel.serviceCategory?.cashbackPercentage || 0;

          return (
            <Pressable
              key={hotelId}
              style={styles.hotelCard}
              onPress={() => handleHotelPress(hotelId)}
             
            >
              <CachedImage source={{ uri: imageUrl }} style={styles.hotelImage} contentFit="cover" cachePolicy="memory-disk" />
              {cashback > 0 && (
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>{cashback}%</Text>
                </View>
              )}
              <View style={styles.hotelInfo}>
                <Text style={styles.hotelName} numberOfLines={1}>{hotel.name}</Text>
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
  hotelCard: {
    width: 280,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginRight: 16,
  },
  hotelImage: {
    width: '100%',
    height: 180,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
  },
  hotelInfo: {
    padding: 16,
  },
  hotelName: {
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
    color: colors.brand.pink,
  },
});

export default React.memo(RelatedHotelsSection);
