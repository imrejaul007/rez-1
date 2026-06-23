/**
 * Related Cabs Section - Displays similar cab options
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

interface RelatedCabsSectionProps {
  currentCabId: string;
}

const RelatedCabsSection: React.FC<RelatedCabsSectionProps> = ({ currentCabId }) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();
  const [relatedCabs, setRelatedCabs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadRelatedCabs();
  }, [currentCabId]);

  const loadRelatedCabs = async () => {
    try {
      setIsLoading(true);
      const response = await travelApi.getByCategory('cab', {
        page: 1,
        limit: 10,
        sortBy: 'rating',
      });

      if (response.success && response.data?.services) {
        // Filter out current cab and limit to 5
        const filtered = response.data.services
          .filter((cab: any) => (cab._id || cab.id) !== currentCabId)
          .slice(0, 5);
        if (!isMounted()) return;
        setRelatedCabs(filtered);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleCabPress = (cabId: string) => {
    router.push(`/cab/${cabId}` as any);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Related Cabs</Text>
        <ActivityIndicator size="small" color={colors.brand.amber} style={styles.loader} />
      </View>
    );
  }

  if (relatedCabs.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="car" size={24} color={colors.brand.amber} />
        <Text style={styles.title}>Related Cabs</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {relatedCabs.map((cab) => {
          const cabId = cab._id || cab.id;
          // Ensure cab images, not other category images
          let imageUrl = cab.images?.[0] || 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400';
          if ((imageUrl.toLowerCase().includes('bus') || imageUrl.toLowerCase().includes('train') || 
               imageUrl.toLowerCase().includes('airplane') || imageUrl.toLowerCase().includes('hotel')) &&
              !imageUrl.toLowerCase().includes('cab') && !imageUrl.toLowerCase().includes('taxi') && 
              !imageUrl.toLowerCase().includes('car')) {
            imageUrl = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400';
          }
          const price = cab.pricing?.selling || cab.price || 0;
          const rating = cab.ratings?.average || 0;
          const cashback = cab.cashback?.percentage || cab.serviceCategory?.cashbackPercentage || 0;

          return (
            <Pressable
              key={cabId}
              style={styles.cabCard}
              onPress={() => handleCabPress(cabId)}
             
            >
              <CachedImage source={{ uri: imageUrl }} style={styles.cabImage} contentFit="cover" cachePolicy="memory-disk" />
              <View style={styles.cabContent}>
                <Text style={styles.cabName} numberOfLines={2}>
                  {cab.name}
                </Text>
                <View style={styles.cabInfo}>
                  <Ionicons name="star" size={14} color={colors.warningScale[400]} />
                  <Text style={styles.rating}>
                    {rating.toFixed(1) || '4.5'}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>
                    {cab.price && cab.price < 100 ? `${currencySymbol}${price}/km` : `${currencySymbol}${price.toLocaleString(locale)}`}
                  </Text>
                  {cashback > 0 && (
                    <View style={styles.cashbackBadge}>
                      <Text style={styles.cashbackText}>{cashback}% CB</Text>
                    </View>
                  )}
                </View>
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
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  loader: {
    marginTop: 16,
  },
  scrollContent: {
    paddingRight: 16,
    gap: 16,
  },
  cabCard: {
    width: 200,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  cabImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.neutral[100],
  },
  cabContent: {
    padding: 12,
  },
  cabName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 8,
    minHeight: 40,
  },
  cabInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brand.amber,
  },
  cashbackBadge: {
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cashbackText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CA8A04',
  },
});

export default React.memo(RelatedCabsSection);
