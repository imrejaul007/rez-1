/**
 * PriveOffersCarousel - Featured offers carousel
 * Horizontal scrollable exclusive offers
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PriveOffer {
  id: string;
  brand: string;
  title: string;
  subtitle: string;
  reward: string;
  expiresIn: string;
  isExclusive: boolean;
}

interface PriveOffersCarouselProps {
  offers?: PriveOffer[];
  onViewAll?: () => void;
}

export const PriveOffersCarousel: React.FC<PriveOffersCarouselProps> = ({
  offers = [],
  onViewAll,
}) => {
  const router = useRouter();

  // Don't render if no offers
  if (!offers || offers.length === 0) {
    return null;
  }

  const handleOfferPress = (offerId: string) => {
    router.push(`/prive/prive-offers` as any);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>CURATED FOR YOU</Text>
        <Pressable onPress={onViewAll || (() => router.push('/prive/prive-offers' as any))}>
          <Text style={styles.seeAll}>See All →</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {offers.map((offer) => (
          <Pressable
            key={offer.id}
            style={styles.offerCard}
            onPress={() => handleOfferPress(offer.id)}
           
          >
            {offer.isExclusive && (
              <View style={styles.exclusiveBadge}>
                <Text style={styles.exclusiveText}>EXCLUSIVE</Text>
              </View>
            )}
            <Text style={styles.brandName}>{offer.brand}</Text>
            <Text style={styles.offerTitle}>{offer.title}</Text>
            <Text style={styles.offerSubtitle}>{offer.subtitle}</Text>

            <View style={styles.offerFooter}>
              <Text style={styles.reward}>{offer.reward}</Text>
              <Text style={styles.expiry}>Expires in {offer.expiresIn}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: PRIVE_SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PRIVE_SPACING.xl,
    marginBottom: PRIVE_SPACING.lg,
  },
  sectionLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    letterSpacing: 1.5,
  },
  seeAll: {
    fontSize: 12,
    color: PRIVE_COLORS.gold.primary,
  },
  scrollContent: {
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingRight: PRIVE_SPACING.xl,
  },
  offerCard: {
    width: SCREEN_WIDTH * 0.7,
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginRight: PRIVE_SPACING.md,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  exclusiveBadge: {
    position: 'absolute',
    top: PRIVE_SPACING.md,
    right: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.transparent.gold20,
    paddingHorizontal: PRIVE_SPACING.sm,
    paddingVertical: PRIVE_SPACING.xs,
    borderRadius: PRIVE_RADIUS.sm,
  },
  exclusiveText: {
    fontSize: 9,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
    letterSpacing: 0.5,
  },
  brandName: {
    fontSize: 12,
    color: PRIVE_COLORS.gold.primary,
    marginBottom: PRIVE_SPACING.xs,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
  },
  offerSubtitle: {
    fontSize: 13,
    color: PRIVE_COLORS.text.tertiary,
  },
  offerFooter: {
    marginTop: PRIVE_SPACING.lg,
    paddingTop: PRIVE_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: PRIVE_COLORS.transparent.white08,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reward: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  expiry: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
  },
});

export default React.memo(PriveOffersCarousel);
