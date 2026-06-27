// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Hotspot Detail Page — Shows offers for a specific hotspot area
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { apiClient } from '@/utils/apiClient';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
interface OfferFromAPI {
  _id: string;
  title?: string;
  description?: string;
  store?: {
    id: string;
    name: string;
    logo?: string;
  };
  cashbackPercentage?: number;
  originalPrice?: number;
  discountedPrice?: number;
  type?: string;
  validity?: {
    startDate?: string;
    endDate?: string;
  };
  image?: string;
  metadata?: {
    priority?: number;
  };
}

function HotspotDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    slug: string;
    name: string;
    image: string;
    totalDeals: string;
    lat: string;
    lng: string;
    city: string;
  }>();

  const [offers, setOffers] = useState<OfferFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!params.slug) return;
    const fetchOffers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/offers/hotspots/${params.slug}/offers`, { limit: 30 });
        if (response.success && response.data) {
          const data = response.data as any;
          setOffers(Array.isArray(data.offers) ? data.offers : Array.isArray(data) ? data : []);
        } else {
          if (!isMounted()) return;
          setOffers([]);
        }
      } catch (err) {
        if (!isMounted()) return;
        setError('Failed to load offers. Please try again.');
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };
    fetchOffers();
  }, [params.slug]);

  const handleDirections = () => {
    if (params.lat && params.lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${params.name}@${params.lat},${params.lng}`,
        android: `geo:${params.lat},${params.lng}?q=${params.lat},${params.lng}(${params.name})`,
        default: `https://www.google.com/maps/search/?api=1&query=${params.lat},${params.lng}`,
      });
      if (url) Linking.openURL(url).catch(() => {});
    }
  };

  const handleOfferPress = (offer: OfferFromAPI) => {
    if (offer.store?.id) {
      router.push(`/MainStorePage?storeId=${offer.store.id}`);
    }
  };

  const formatDiscount = (offer: OfferFromAPI) => {
    if (offer.cashbackPercentage) return `${offer.cashbackPercentage}% Cashback`;
    if (offer.originalPrice && offer.discountedPrice && offer.originalPrice > offer.discountedPrice) {
      const pct = Math.round((1 - offer.discountedPrice / offer.originalPrice) * 100);
      return `${pct}% OFF`;
    }
    return '';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      {/* Header */}
      <LinearGradient colors={[Colors.nileBlue, Colors.nileBlueLight]} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle} numberOfLines={1}>{params.name || 'Hotspot'}</ThemedText>
            {params.city && <ThemedText style={styles.headerSubtitle}>{params.city}</ThemedText>}
          </View>
          <Pressable style={styles.directionsHeaderBtn} onPress={handleDirections}>
            <Ionicons name="navigate" size={20} color={Colors.gold} />
          </Pressable>
        </View>

        {/* Hotspot image banner */}
        {params.image && (
          <View style={styles.bannerContainer}>
            <CachedImage source={params.image} style={styles.bannerImage} contentFit="cover" />
            <LinearGradient colors={['transparent', 'rgba(26,58,82,0.8)']} style={styles.bannerOverlay}>
              <View style={styles.bannerStats}>
                <View style={styles.bannerStat}>
                  <Ionicons name="pricetag-outline" size={16} color={Colors.gold} />
                  <ThemedText style={styles.bannerStatText}>{params.totalDeals || '0'} deals</ThemedText>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.nileBlue} />
          <ThemedText style={styles.loadingText}>Loading offers...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.nileBlue} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => {
            setLoading(true);
            setError(null);
            apiClient.get(`/offers/hotspots/${params.slug}/offers`, { limit: 30 })
              .then(r => {
                const data = r.data as any;
                setOffers(Array.isArray(data?.offers) ? data.offers : []);
              })
              .catch(() => setError('Failed to load offers.'))
              .finally(() => setLoading(false));
          }}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : offers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="pricetag-outline" size={48} color={colors.neutral[400]} />
          <ThemedText style={styles.emptyTitle}>No offers yet</ThemedText>
          <ThemedText style={styles.emptyText}>
            There are no active offers in {params.name || 'this area'} right now.
          </ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.sectionTitle}>
            {offers.length} {offers.length === 1 ? 'Offer' : 'Offers'} Available
          </ThemedText>
          {offers.map((offer) => (
            <Pressable
              key={offer._id}
              style={styles.offerCard}
              onPress={() => handleOfferPress(offer)}
             
            >
              <View style={styles.offerLeft}>
                {offer.store?.logo ? (
                  <CachedImage source={offer.store.logo} style={styles.storeLogo} contentFit="cover" />
                ) : (
                  <View style={styles.storeLogoPlaceholder}>
                    <Ionicons name="storefront" size={24} color={Colors.nileBlue} />
                  </View>
                )}
              </View>
              <View style={styles.offerInfo}>
                <ThemedText style={styles.offerTitle} numberOfLines={2}>
                  {offer.title || offer.store?.name || 'Offer'}
                </ThemedText>
                {offer.store?.name && offer.title && (
                  <ThemedText style={styles.offerStore}>{offer.store.name}</ThemedText>
                )}
                {offer.description && (
                  <ThemedText style={styles.offerDescription} numberOfLines={2}>{offer.description}</ThemedText>
                )}
              </View>
              {formatDiscount(offer) ? (
                <View style={styles.discountBadge}>
                  <ThemedText style={styles.discountText}>{formatDiscount(offer)}</ThemedText>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.linen,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: 12,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  directionsHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    height: 140,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingBottom: 12,
  },
  bannerStats: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  bannerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  errorText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  retryText: {
    color: colors.background.primary,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.base,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  offerLeft: {},
  storeLogo: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
  },
  storeLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginBottom: 2,
  },
  offerStore: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  offerDescription: {
    fontSize: 12,
    color: Colors.text.tertiary,
    lineHeight: 16,
  },
  discountBadge: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
});

export default withErrorBoundary(HotspotDetailPage, 'SearchHotspotDetail');
