// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Occasions Listing Page
 * Shows all shopping occasions for a category
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import categoryMetadataApi, { Occasion } from '@/services/categoryMetadataApi';
import { getOccasionsForCategory, getAllOccasions } from '@/data/categoryDummyData';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const COLORS = {
  white: colors.background.primary,
  navy: colors.brand.navyDark,
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray600: Colors.text.tertiary,
  green500: Colors.success,
  primaryGreen: Colors.gold,
  background: Colors.background.secondary,
};

const getTagColor = (tag: string | null) => {
  switch (tag) {
    case 'Hot':
      return { bg: Colors.errorScale[100], text: Colors.error };
    case 'Trending':
      return { bg: Colors.infoScale[200], text: Colors.info };
    case 'Coming Soon':
      return { bg: Colors.warningScale[200], text: Colors.warning };
    case 'Premium':
      return { bg: Colors.brand.purpleLight + '20', text: Colors.brand.purple };
    case 'Special':
      return { bg: colors.linen, text: Colors.nileBlue };
    case 'Student':
      return { bg: '#CFFAFE', text: colors.cyanDark };
    case 'Popular':
      return { bg: colors.pinkMist, text: colors.deepPink };
    case 'Festive':
      return { bg: '#FFEDD5', text: colors.brand.orangeDark };
    default:
      return { bg: Colors.background.secondary, text: Colors.text.tertiary };
  }
};

const OccasionCard = ({
  occasion,
  onPress,
}: {
  occasion: Occasion;
  onPress: () => void;
}) => {
  const tagColors = getTagColor(occasion.tag);

  return (
    <Pressable
      style={[styles.occasionCard, { backgroundColor: `${occasion.color}15` }]}
      onPress={onPress}
     
    >
      {/* Tag Badge */}
      {occasion.tag && (
        <View style={[styles.tagBadge, { backgroundColor: tagColors.bg }]}>
          <Text style={[styles.tagText, { color: tagColors.text }]}>{occasion.tag}</Text>
        </View>
      )}

      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${occasion.color}25` }]}>
        <Text style={styles.icon}>{occasion.icon}</Text>
      </View>

      {/* Name */}
      <Text style={styles.occasionName}>{occasion.name}</Text>

      {/* Discount */}
      <View style={[styles.discountBadge, { backgroundColor: occasion.color }]}>
        <Text style={styles.discountText}>Up to {occasion.discount}% off</Text>
      </View>

      {/* Shop Now Button */}
      <View style={styles.shopButton}>
        <Text style={styles.shopButtonText}>Shop Now</Text>
        <Ionicons name="arrow-forward" size={14} color={COLORS.primaryGreen} />
      </View>
    </Pressable>
  );
};

function OccasionsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const categorySlug = params.category as string;

  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load occasions
  useEffect(() => {
    loadOccasions();
  }, [categorySlug]);

  const loadOccasions = async () => {
    setLoading(true);
    try {
      const slug = categorySlug || '';
      const response = await categoryMetadataApi.getOccasions(slug);
      if (response.success && response.data?.occasions?.length > 0) {
        if (!isMounted()) return;
        setOccasions(response.data.occasions);
      } else {
        // No occasions available from API — show empty state instead of dummy data
        if (!isMounted()) return;
        setOccasions([]);
      }
    } catch (error) {
      if (!isMounted()) return;
      setOccasions([]);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOccasions();
  };

  const handleOccasionPress = useCallback((occasion: Occasion) => {
    router.push({
      pathname: '/shop',
      params: { occasion: occasion.id, category: categorySlug },
    } as any);
  }, [router, categorySlug]);

  const renderOccasion = useCallback(({ item }: { item: Occasion }) => (
    <OccasionCard occasion={item} onPress={() => handleOccasionPress(item)} />
  ), [handleOccasionPress]);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Text style={styles.pageTitle}>
        {categorySlug ? 'Shop for Every Occasion' : 'All Occasions'}
      </Text>
      <Text style={styles.pageSubtitle}>
        Find the perfect products for any event or celebration
      </Text>
      <Text style={styles.resultCount}>
        {occasions.length} {occasions.length === 1 ? 'occasion' : 'occasions'}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🎉</Text>
      <Text style={styles.emptyTitle}>No occasions found</Text>
      <Text style={styles.emptyText}>
        Check back later for upcoming occasions and deals
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.gold, '#e6b94e']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {categorySlug
              ? `${categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Occasions`
              : 'Shop by Occasion'}
          </Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Occasions List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
          <Text style={styles.loadingText}>Loading occasions...</Text>
        </View>
      ) : (
        <FlashList
          data={occasions}
          renderItem={renderOccasion}
          keyExtractor={(item) => item.id}
          estimatedItemSize={150}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primaryGreen}
              colors={[COLORS.primaryGreen]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.white,
  },
  placeholder: {
    width: 40,
  },
  headerContent: {
    padding: Spacing.base,
  },
  pageTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.xs,
  },
  pageSubtitle: {
    ...Typography.body,
    color: COLORS.gray600,
    marginBottom: Spacing.md,
  },
  resultCount: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: COLORS.gray600,
  },
  listContent: {
    paddingBottom: 100,
  },
  row: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  occasionCard: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    alignItems: 'center',
    position: 'relative',
  },
  tagBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  tagText: {
    ...Typography.overline,
    fontWeight: '700',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  icon: {
    fontSize: 36,
  },
  occasionName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 10,
  },
  discountBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: Spacing.md,
  },
  discountText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: COLORS.white,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  shopButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
  },
});

export default withErrorBoundary(OccasionsPage, 'Occasions');
