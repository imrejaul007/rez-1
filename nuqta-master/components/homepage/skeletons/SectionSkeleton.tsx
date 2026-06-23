// @ts-nocheck
import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import SkeletonCard from '@/components/common/SkeletonCard';
import ProductCardSkeleton from './ProductCardSkeleton';
import StoreCardSkeleton from './StoreCardSkeleton';
import EventCardSkeleton from './EventCardSkeleton';
import { ThemedView } from '@/components/ThemedView';

interface SectionSkeletonProps {
  cardType?: 'product' | 'store' | 'event' | 'recommendation';
  cardWidth?: number;
  spacing?: number;
  numCards?: number;
  showIndicator?: boolean;
}

/**
 * Section Skeleton Loader
 *
 * Shows skeleton for entire horizontal section:
 * - Section title skeleton
 * - Horizontal row of card skeletons (default 3-4 cards)
 * - Automatically matches the card type layout
 */
function SectionSkeleton({
  cardType = 'product',
  cardWidth = 280,
  spacing = 16,
  numCards = 4,
  showIndicator = true,
}: SectionSkeletonProps) {
  // Determine which skeleton card to render based on card type
  const renderSkeletonCard = () => {
    switch (cardType) {
      case 'product':
      case 'recommendation':
        return <ProductCardSkeleton width={cardWidth} />;
      case 'store':
        return <StoreCardSkeleton width={cardWidth} />;
      case 'event':
        return <EventCardSkeleton width={cardWidth} />;
      default:
        return <ProductCardSkeleton width={cardWidth} />;
    }
  };

  // Generate array of skeleton cards
  const skeletonCards = Array.from({ length: numCards }, (_, index) => ({
    id: `skeleton-${index}`,
  }));

  const renderSkeletonItem = useCallback(({ item, index }: { item: { id: string }; index: number }) => (
    <View
      style={[
        styles.cardContainer,
        { width: cardWidth, marginRight: index === skeletonCards.length - 1 ? 0 : spacing },
      ]}
    >
      {renderSkeletonCard()}
    </View>
  ), [cardWidth, spacing, skeletonCards.length, renderSkeletonCard]);

  return (
    <ThemedView style={styles.container}>
      {/* Section Header Skeleton */}
      <ThemedView style={styles.header}>
        <SkeletonCard
          width={180}
          height={24}
          borderRadius={6}
        />
        <View style={styles.titleAccent}>
          <SkeletonCard
            width={32}
            height={3}
            borderRadius={2}
          />
        </View>
      </ThemedView>

      {/* Horizontal Scroll Content Skeleton */}
      {Platform.OS === 'web' ? (
        <FlashList
          data={skeletonCards}
          horizontal
          showsHorizontalScrollIndicator={showIndicator}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing }]}
          style={styles.webFlatListContainer}
          removeClippedSubviews={false}
          scrollEnabled={false}
          renderItem={renderSkeletonItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={150}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={showIndicator}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing }]}
          scrollEnabled={false}
        >
          {skeletonCards.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.cardContainer,
                { width: cardWidth, marginRight: index === skeletonCards.length - 1 ? 0 : spacing },
              ]}
            >
              {renderSkeletonCard()}
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
    position: 'relative',
  },
  titleAccent: {
    position: 'absolute',
    bottom: -8,
    left: 20,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  webFlatListContainer: {
    overflow: 'scroll',
  },
  cardContainer: {
    flex: 0,
    flexShrink: 0,
  },
});

export default React.memo(SectionSkeleton);
