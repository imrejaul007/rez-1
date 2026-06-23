// @ts-nocheck
/**
 * ShopByOccasionSection Component
 * Horizontal scrollable occasion cards for event-based shopping
 * Adapted from Rez_v-2-main FashionOccasionCard
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
import categoryMetadataApi, { Occasion } from '@/services/categoryMetadataApi';
import { getOccasionsForCategory } from '@/data/categoryDummyData';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ShopByOccasionSectionProps {
  categorySlug: string;
  occasions?: Occasion[];
  onOccasionPress?: (occasion: Occasion) => void;
}

const CARD_WIDTH = 140;

const getTagColor = (tag: string | null) => {
  switch (tag) {
    case 'Hot':
      return { bg: colors.errorScale[100], text: colors.error };
    case 'Trending':
      return { bg: colors.tint.blueLight, text: colors.brand.blue };
    case 'Coming Soon':
      return { bg: colors.tint.amberLight, text: colors.warningScale[700] };
    case 'Premium':
      return { bg: colors.tint.pink, text: colors.brand.purple };
    case 'Special':
      return { bg: colors.linen, text: colors.nileBlue };
    case 'Student':
      return { bg: '#CFFAFE', text: colors.cyanDark };
    case 'Popular':
      return { bg: colors.pinkMist, text: colors.deepPink };
    case 'Festive':
      return { bg: '#FFEDD5', text: colors.brand.orangeDark };
    default:
      return { bg: colors.neutral[100], text: colors.neutral[500] };
  }
};

const OccasionCard = memo(({
  occasion,
  onPress,
}: {
  occasion: Occasion;
  onPress: () => void;
}) => {
  const tagColors = getTagColor(occasion.tag);

  return (
    <Pressable
      style={[styles.occasionCard, { backgroundColor: `${occasion.color}10` }]}
      onPress={onPress}
     
      accessibilityLabel={`Shop for ${occasion.name}`}
      accessibilityRole="button"
    >
      {/* Tag Badge */}
      {occasion.tag && (
        <View style={[styles.tagBadge, { backgroundColor: tagColors.bg }]}>
          <Text style={[styles.tagText, { color: tagColors.text }]}>{occasion.tag}</Text>
        </View>
      )}

      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${occasion.color}20` }]}>
        <Text style={styles.icon}>{occasion.icon}</Text>
      </View>

      {/* Name */}
      <Text style={styles.occasionName}>{occasion.name}</Text>

      {/* Discount */}
      <View style={[styles.discountBadge, { backgroundColor: occasion.color }]}>
        <Text style={styles.discountText}>Up to {occasion.discount}% off</Text>
      </View>
    </Pressable>
  );
});

OccasionCard.displayName = 'OccasionCard';

const ShopByOccasionSection: React.FC<ShopByOccasionSectionProps> = ({
  categorySlug,
  occasions,
  onOccasionPress,
}) => {
  const router = useRouter();
  const [apiOccasions, setApiOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (occasions) {
      setApiOccasions(occasions);
      setLoading(false);
      return;
    }

    const fetchOccasions = async () => {
      try {
        setLoading(true);
        const response = await categoryMetadataApi.getOccasions(categorySlug);
        if (response.success && response.data?.occasions?.length > 0) {
          if (!isMounted()) return;
          setApiOccasions(response.data.occasions);
        } else {
          // Fallback to dummy data if API returns empty
          const fallbackOccasions = getOccasionsForCategory(categorySlug);
          setApiOccasions(fallbackOccasions);
        }
      } catch (err) {
        // Fallback to dummy data on error
        const fallbackOccasions = getOccasionsForCategory(categorySlug);
        if (!isMounted()) return;
        setApiOccasions(fallbackOccasions);
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchOccasions();
  }, [categorySlug, occasions]);

  const displayOccasions = occasions || apiOccasions;

  const handlePress = useCallback((occasion: Occasion) => {
    if (onOccasionPress) {
      onOccasionPress(occasion);
    } else {
      router.push({
        pathname: '/shop',
        params: { occasion: occasion.id, category: categorySlug },
      } as any);
    }
  }, [router, categorySlug, onOccasionPress]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.brand.indigo} />
      </View>
    );
  }

  if (!displayOccasions || displayOccasions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.occasionEmoji}>🎉</Text>
          <Text style={styles.sectionTitle}>Shop by Occasion</Text>
        </View>
        <Pressable
          style={styles.seeAllButton}
          onPress={() => router.push(`/occasions?category=${categorySlug}` as any)}
          accessibilityLabel="See all occasions"
        >
          <Text style={styles.seeAllText}>View All</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {displayOccasions.map((occasion) => (
          <OccasionCard
            key={occasion.id}
            occasion={occasion}
            onPress={() => handlePress(occasion)}
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
    height: 200,
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
  occasionEmoji: {
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
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  occasionCard: {
    width: CARD_WIDTH,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    position: 'relative',
  },
  tagBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  icon: {
    fontSize: 28,
  },
  occasionName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  discountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default memo(ShopByOccasionSection);
