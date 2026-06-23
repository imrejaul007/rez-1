/**
 * Related Trains Section - Displays similar trains
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

interface RelatedTrainsSectionProps {
  currentTrainId: string;
  route: Route;
}

const RelatedTrainsSection: React.FC<RelatedTrainsSectionProps> = ({ currentTrainId, route }) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();
  const [relatedTrains, setRelatedTrains] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadRelatedTrains();
  }, [currentTrainId, route]);

  const loadRelatedTrains = async () => {
    try {
      setIsLoading(true);
      const response = await travelApi.getByCategory('trains', {
        page: 1,
        limit: 10,
        sortBy: 'rating',
      });

      if (response.success && response.data?.services) {
        // Filter out current train and limit to 5
        const filtered = response.data.services
          .filter((train: any) => (train._id || train.id) !== currentTrainId)
          .slice(0, 5);
        if (!isMounted()) return;
        setRelatedTrains(filtered);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleTrainPress = (trainId: string) => {
    router.push(`/train/${trainId}` as any);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Related Trains</Text>
        <ActivityIndicator size="small" color={colors.success} style={styles.loader} />
      </View>
    );
  }

  if (relatedTrains.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="train" size={24} color={colors.success} />
        <Text style={styles.title}>Related Trains</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {relatedTrains.map((train) => {
          const trainId = train._id || train.id;
          // Ensure train images, not bus images
          let imageUrl = train.images?.[0] || 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400';
          if (imageUrl.toLowerCase().includes('bus') && !imageUrl.toLowerCase().includes('train')) {
            imageUrl = 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400';
          }
          const price = train.pricing?.selling || 0;
          const rating = train.ratings?.average || 0;
          const cashback = train.cashback?.percentage || train.serviceCategory?.cashbackPercentage || 0;

          return (
            <Pressable
              key={trainId}
              style={styles.trainCard}
              onPress={() => handleTrainPress(trainId)}
             
            >
              <CachedImage source={{ uri: imageUrl }} style={styles.trainImage} contentFit="cover" cachePolicy="memory-disk" />
              {cashback > 0 && (
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>{cashback}%</Text>
                </View>
              )}
              <View style={styles.trainInfo}>
                <Text style={styles.trainName} numberOfLines={1}>{train.name}</Text>
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
  trainCard: {
    width: 280,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginRight: 16,
  },
  trainImage: {
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
  trainInfo: {
    padding: 16,
  },
  trainName: {
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
    color: colors.success,
  },
});

export default React.memo(RelatedTrainsSection);
