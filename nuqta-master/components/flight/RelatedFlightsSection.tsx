/**
 * Related Flights Section - Shows similar flight options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import travelApi from '@/services/travelApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Route {
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
}

interface RelatedFlightsSectionProps {
  currentFlightId: string;
  route: Route;
}

const RelatedFlightsSection: React.FC<RelatedFlightsSectionProps> = ({
  currentFlightId,
  route,
}) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [relatedFlights, setRelatedFlights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadRelatedFlights();
  }, []);

  const loadRelatedFlights = async () => {
    try {
      setIsLoading(true);
      const response = await travelApi.getByCategory('flights', {
        page: 1,
        limit: 4,
        sortBy: 'rating',
      });

      if (response.success && response.data) {
        // Filter out current flight and limit to 3
        const filtered = (response.data.services || [])
          .filter((flight: any) => flight._id !== currentFlightId && flight.id !== currentFlightId)
          .slice(0, 3);
        if (!isMounted()) return;
        setRelatedFlights(filtered);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleFlightPress = (flightId: string) => {
    router.push(`/flight/${flightId}` as any);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You Might Also Like</Text>
        <ActivityIndicator size="small" color={colors.infoScale[400]} style={styles.loader} />
      </View>
    );
  }

  if (relatedFlights.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You Might Also Like</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {relatedFlights.map((flight) => (
          <Pressable
            key={flight._id || flight.id}
            style={styles.flightCard}
            onPress={() => handleFlightPress(flight._id || flight.id)}
          >
            {flight.images && flight.images[0] && (
              <CachedImage
                source={flight.images[0]}
                style={styles.flightImage}
                contentFit="cover"
              />
            )}
            <View style={styles.flightContent}>
              <Text style={styles.flightName} numberOfLines={2}>
                {flight.name}
              </Text>
              <View style={styles.flightInfo}>
                <Ionicons name="star" size={14} color={colors.warningScale[400]} />
                <Text style={styles.rating}>
                  {flight.ratings?.average?.toFixed(1) || '4.5'}
                </Text>
                <Text style={styles.reviews}>
                  ({flight.ratings?.count || 0})
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  {currencySymbol}{flight.pricing?.selling || flight.price || 0}
                </Text>
                {flight.pricing?.original && flight.pricing.original > (flight.pricing?.selling || 0) && (
                  <Text style={styles.originalPrice}>
                    {currencySymbol}{flight.pricing.original}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 16,
  },
  loader: {
    marginVertical: 20,
  },
  scrollContent: {
    paddingRight: 20,
  },
  flightCard: {
    width: 200,
    marginRight: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flightImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.neutral[100],
  },
  flightContent: {
    padding: 12,
  },
  flightName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 8,
    minHeight: 36,
  },
  flightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  reviews: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.infoScale[400],
  },
  originalPrice: {
    fontSize: 12,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
});

export default React.memo(RelatedFlightsSection);
