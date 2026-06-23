// @ts-nocheck
/**
 * ShopByVibeSection Component
 * Horizontal scrollable vibe cards for mood-based shopping
 * Adapted from Rez_v-2-main FashionVibeCard
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
import categoryMetadataApi, { Vibe } from '@/services/categoryMetadataApi';
import { getVibesForCategory } from '@/data/categoryDummyData';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ShopByVibeSectionProps {
  categorySlug: string;
  vibes?: Vibe[];
  onVibePress?: (vibe: Vibe) => void;
}

const CARD_WIDTH = 130;

const VibeCard = memo(({
  vibe,
  onPress,
}: {
  vibe: Vibe;
  onPress: () => void;
}) => (
  <Pressable
    style={[styles.vibeCard, { backgroundColor: `${vibe.color}12` }]}
    onPress={onPress}
   
    accessibilityLabel={`Shop ${vibe.name} vibe`}
    accessibilityRole="button"
  >
    <View style={[styles.iconContainer, { backgroundColor: `${vibe.color}20` }]}>
      <Text style={styles.icon}>{vibe.icon}</Text>
    </View>
    <Text style={[styles.vibeName, { color: vibe.color }]}>{vibe.name}</Text>
    <Text style={styles.vibeDescription} numberOfLines={2}>{vibe.description}</Text>
  </Pressable>
));

VibeCard.displayName = 'VibeCard';

const ShopByVibeSection: React.FC<ShopByVibeSectionProps> = ({
  categorySlug,
  vibes,
  onVibePress,
}) => {
  const router = useRouter();
  const [apiVibes, setApiVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (vibes) {
      setApiVibes(vibes);
      setLoading(false);
      return;
    }

    const fetchVibes = async () => {
      try {
        setLoading(true);
        const response = await categoryMetadataApi.getVibes(categorySlug);
        if (response.success && response.data?.vibes?.length > 0) {
          if (!isMounted()) return;
          setApiVibes(response.data.vibes);
          setError(false);
        } else {
          // Fallback to dummy data if API returns empty
          const fallbackVibes = getVibesForCategory(categorySlug);
          setApiVibes(fallbackVibes);
          setError(true);
        }
      } catch (err) {
        // Fallback to dummy data on error
        const fallbackVibes = getVibesForCategory(categorySlug);
        if (!isMounted()) return;
        setApiVibes(fallbackVibes);
        setError(true);
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchVibes();
  }, [categorySlug, vibes]);

  const displayVibes = vibes || apiVibes;

  const handlePress = useCallback((vibe: Vibe) => {
    if (onVibePress) {
      onVibePress(vibe);
    } else {
      router.push({
        pathname: '/shop',
        params: { vibe: vibe.id, category: categorySlug },
      } as any);
    }
  }, [router, categorySlug, onVibePress]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.brand.indigo} />
      </View>
    );
  }

  if (!displayVibes || displayVibes.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.vibeEmoji}>✨</Text>
          <Text style={styles.sectionTitle}>Shop by Vibe</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {displayVibes.map((vibe) => (
          <VibeCard
            key={vibe.id}
            vibe={vibe}
            onPress={() => handlePress(vibe)}
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
    height: 160,
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
  vibeEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  vibeCard: {
    width: CARD_WIDTH,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 26,
  },
  vibeName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  vibeDescription: {
    fontSize: 11,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 15,
  },
});

export default memo(ShopByVibeSection);
