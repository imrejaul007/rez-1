// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import mallApi from '@/services/mallApi';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

interface Offer {
  id: string;
  title: string;
  description: string;
  image?: string;
  discount?: string;
  cashback?: number;
  store?: {
    name: string;
    logo?: string;
  };
  validUntil?: string;
}

const ExclusiveOffers = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await mallApi.getOffers(1, 5);
      if (response.offers && response.offers.length > 0) {
        const transformedOffers = response.offers.map((offer: any) => ({
          id: offer._id || offer.id,
          title: offer.title || 'Special Offer',
          description: offer.description || '',
          image: offer.image || null,
          discount: offer.discountPercentage ? `${offer.discountPercentage}% OFF` : offer.discount,
          cashback: offer.cashbackPercentage || null,
          store: offer.store ? {
            name: offer.store.name || 'Store',
            logo: offer.store.logo || null,
          } : null,
          validUntil: offer.validity?.endDate || offer.validUntil,
        }));
        setOffers(transformedOffers);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load offers');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  // Loading state
  if (isLoading) {
    return <CardGridSkeleton />;
  }

  // Empty state - show static banner
  if (offers.length === 0) {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.bannerContainer}
          onPress={() => navigateTo('/offers')}
        >
          <LinearGradient
            colors={[Colors.gold, Colors.gold, Colors.nileBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Exclusive Offers</Text>
              <Text style={styles.bannerSubtitle}>Unlock special deals and cashback rewards</Text>
              <Pressable
                style={styles.bannerButton}
                onPress={() => navigateTo('/offers')}
              >
                <Text style={styles.bannerButtonText}>View All Offers</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Exclusive Offers" compact={true}>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Exclusive Offers</Text>
        <Pressable onPress={() => navigateTo('/offers')}>
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {/* Offers Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
      >
        {offers.map((offer) => (
          <Pressable
            key={offer.id}
            style={styles.offerCard}
            onPress={() => navigateTo(`/offers/${offer.id}`)}
           
          >
            <LinearGradient
              colors={[Colors.gold, Colors.nileBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.offerGradient}
            >
              {/* Offer Image or Icon */}
              {offer.image ? (
                <CachedImage source={offer.image} style={styles.offerImage} />
              ) : (
                <View style={styles.offerIconContainer}>
                  <Ionicons name="pricetag" size={32} color={Colors.background.primary} />
                </View>
              )}

              {/* Offer Content */}
              <View style={styles.offerContent}>
                <View style={styles.offerBadge}>
                  <Text style={styles.offerBadgeText}>
                    {offer.discount || (offer.cashback ? `${offer.cashback}% Cashback` : 'Special')}
                  </Text>
                </View>
                <Text style={styles.offerTitle} numberOfLines={2}>{offer.title}</Text>
                {offer.store && (
                  <Text style={styles.offerStore}>{offer.store.name}</Text>
                )}
              </View>
            </LinearGradient>
          </Pressable>
        ))}

        {/* View All Card */}
        <Pressable
          style={styles.viewAllCard}
          onPress={() => navigateTo('/offers')}
        >
          <View style={styles.viewAllIconContainer}>
            <Ionicons name="arrow-forward" size={24} color={Colors.gold} />
          </View>
          <Text style={styles.viewAllCardText}>View All</Text>
        </Pressable>
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  viewAllText: {
    fontSize: Typography.body.fontSize,
    color: Colors.gold,
    fontWeight: '600',
  },
  loadingContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  offerCard: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  offerGradient: {
    flex: 1,
    flexDirection: 'row',
    padding: Spacing.base,
  },
  offerImage: {
    width: 80,
    height: '100%',
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  offerIconContainer: {
    width: 80,
    height: '100%',
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  offerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  offerBadgeText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  offerTitle: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  offerStore: {
    fontSize: Typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.8)',
  },
  viewAllCard: {
    width: 100,
    height: 140,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.successScale[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.linen,
    borderStyle: 'dashed',
  },
  viewAllIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewAllCardText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.gold,
  },
  // Fallback banner styles
  bannerContainer: {
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  bannerContent: {
    alignItems: 'flex-start',
  },
  bannerTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: Typography.body.fontSize,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Spacing.base,
  },
  bannerButton: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  bannerButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.gold,
  },
});

export default React.memo(ExclusiveOffers);
