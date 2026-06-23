// @ts-nocheck
/**
 * ExclusiveOffersSection Component
 * Horizontal scrollable exclusive offer cards
 * Adapted from Rez_v-2-main FashionExclusiveCard
 */

import React, { memo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import exclusiveOffersApi, { ExclusiveOffer } from '@/services/exclusiveOffersApi';
import { exclusiveOffersData } from '@/data/categoryDummyData';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ExclusiveOffersSectionProps {
  categorySlug?: string;
  offers?: ExclusiveOffer[];
  onOfferPress?: (offer: ExclusiveOffer) => void;
}

const CARD_WIDTH = 180;

const OfferCard = memo(({
  offer,
  onPress,
}: {
  offer: ExclusiveOffer;
  onPress: () => void;
}) => (
  <Pressable
    style={styles.offerCard}
    onPress={onPress}
   
    accessibilityLabel={`${offer.title} offer`}
    accessibilityRole="button"
  >
    <LinearGradient
      colors={offer.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardGradient}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{offer.icon}</Text>
      </View>

      <Text style={styles.offerTitle}>{offer.title}</Text>
      <Text style={styles.offerDiscount}>{offer.discount}</Text>
      <Text style={styles.offerDescription}>{offer.description}</Text>

      <View style={styles.claimButton}>
        <Text style={styles.claimText}>Claim Now</Text>
      </View>
    </LinearGradient>
  </Pressable>
));

OfferCard.displayName = 'OfferCard';

const ExclusiveOffersSection: React.FC<ExclusiveOffersSectionProps> = ({
  categorySlug,
  offers,
  onOfferPress,
}) => {
  const router = useRouter();
  const [apiOffers, setApiOffers] = useState<ExclusiveOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (offers) {
      setApiOffers(offers);
      setLoading(false);
      return;
    }

    const fetchOffers = async () => {
      try {
        setLoading(true);
        const response = await exclusiveOffersApi.getOffers(
          categorySlug ? { category: categorySlug, limit: 10 } : { limit: 10 }
        );
        if (response.success && response.data?.offers?.length > 0) {
          if (!isMounted()) return;
          setApiOffers(response.data.offers);
        } else {
          // Fallback to dummy data if API returns empty
          setApiOffers(exclusiveOffersData as any);
        }
      } catch (err) {
        // Fallback to dummy data on error
        if (!isMounted()) return;
        setApiOffers(exclusiveOffersData as any);
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchOffers();
  }, [categorySlug, offers]);

  const displayOffers = offers || apiOffers;

  const handlePress = useCallback((offer: ExclusiveOffer) => {
    if (onOfferPress) {
      onOfferPress(offer);
    } else {
      const offerId = offer._id || (offer as any).id;
      router.push({
        pathname: '/offer/[id]',
        params: { id: offerId },
      } as any);
    }
  }, [router, onOfferPress]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.warningScale[700]} />
      </View>
    );
  }

  if (!displayOffers || displayOffers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.crownEmoji}>👑</Text>
          <Text style={styles.sectionTitle}>Exclusive For You</Text>
        </View>
        <Pressable
          style={styles.seeAllButton}
          onPress={() => router.push('/offers/exclusive' as any)}
          accessibilityLabel="See all exclusive offers"
        >
          <Text style={styles.seeAllText}>All Offers</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {displayOffers.map((offer) => (
          <OfferCard
            key={offer._id || (offer as any).id}
            offer={offer}
            onPress={() => handlePress(offer)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(11, 34, 64, 0.04), 0 8px 24px rgba(11, 34, 64, 0.06)',
      },
    }),
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crownEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: -0.4,
  },
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.tint.amberLight,
    borderRadius: 8,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningScale[700],
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  offerCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
    height: 180,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 22,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 2,
  },
  offerDiscount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.background.primary,
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 12,
  },
  claimButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  claimText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default memo(ExclusiveOffersSection);
