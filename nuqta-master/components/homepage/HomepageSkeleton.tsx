import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import SkeletonCard from '@/components/common/SkeletonCard';
import { colors } from '@/constants/theme';

/**
 * Homepage Skeleton
 *
 * Full-page skeleton matching the exact layout of the Near-U tab homepage:
 * - Header bar (location + icons)
 * - Hero banner
 * - Tab section
 * - Quick actions row
 * - Horizontal card sections (stores, products)
 *
 * Heights and widths match the real components for zero-shift loading.
 */

/** Header skeleton: location pill + icon buttons */
const HeaderSkeleton = React.memo(() => (
  <View style={headerStyles.container}>
    <View style={headerStyles.top}>
      {/* Location pill */}
      <View style={headerStyles.locationPill}>
        <SkeletonCard width={24} height={24} variant="circle" />
        <SkeletonCard width={120} height={16} borderRadius={6} style={{ marginLeft: 8 }} />
        <SkeletonCard width={14} height={14} variant="circle" style={{ marginLeft: 4 }} />
      </View>
      {/* Header actions: coin pill, cart, bell, profile */}
      <View style={headerStyles.actions}>
        <SkeletonCard width={48} height={22} borderRadius={12} />
        <SkeletonCard width={32} height={32} variant="circle" />
        <SkeletonCard width={32} height={32} variant="circle" />
        <SkeletonCard width={32} height={32} variant="circle" />
      </View>
    </View>
  </View>
));

/** Hero banner skeleton: 1 large card */
const HeroBannerSkeleton = React.memo(() => (
  <View style={bannerStyles.container}>
    <SkeletonCard width="100%" height={140} borderRadius={16} />
  </View>
));

/** Tab section skeleton: 4 tabs */
const TabSectionSkeleton = React.memo(() => (
  <View style={tabStyles.container}>
    <View style={tabStyles.row}>
      {[100, 60, 110, 60].map((w, i) => (
        <SkeletonCard key={i} width={w} height={36} borderRadius={20} />
      ))}
    </View>
    {/* Search bar */}
    <View style={tabStyles.searchRow}>
      <SkeletonCard width="100%" height={44} borderRadius={12} />
    </View>
    {/* Category chips */}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tabStyles.chipScroll}>
      <View style={tabStyles.chipRow}>
        {[70, 85, 65, 90, 60, 75].map((w, i) => (
          <SkeletonCard key={i} width={w} height={32} borderRadius={16} style={{ marginRight: 8 }} />
        ))}
      </View>
    </ScrollView>
  </View>
));

/** Quick actions skeleton: 4 icon buttons */
const QuickActionsSkeleton = React.memo(() => (
  <View style={quickStyles.container}>
    <View style={quickStyles.row}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={quickStyles.action}>
          <SkeletonCard width={44} height={44} variant="circle" />
          <SkeletonCard width={48} height={10} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  </View>
));

/** Horizontal card section skeleton: title + scrollable cards */
const CardSectionSkeleton = React.memo(({
  cardWidth = 280,
  cardHeight = 160,
  numCards = 3,
  titleWidth = 160,
}: {
  cardWidth?: number;
  cardHeight?: number;
  numCards?: number;
  titleWidth?: number;
}) => (
  <View style={sectionStyles.container}>
    {/* Section title */}
    <View style={sectionStyles.header}>
      <SkeletonCard width={titleWidth} height={20} borderRadius={6} />
    </View>
    {/* Horizontal cards */}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
      contentContainerStyle={sectionStyles.scrollContent}
    >
      {Array.from({ length: numCards }).map((_, i) => (
        <View key={i} style={[sectionStyles.card, { width: cardWidth, marginRight: i < numCards - 1 ? 16 : 0 }]}>
          <SkeletonCard width={cardWidth} height={cardHeight} borderRadius={12} />
          <SkeletonCard width={cardWidth * 0.7} height={14} borderRadius={4} style={{ marginTop: 8 }} />
          <SkeletonCard width={cardWidth * 0.4} height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      ))}
    </ScrollView>
  </View>
));

/** Product grid skeleton: 2-column grid of product cards */
const ProductGridSkeleton = React.memo(() => (
  <View style={gridStyles.container}>
    <View style={sectionStyles.header}>
      <SkeletonCard width={140} height={20} borderRadius={6} />
    </View>
    <View style={gridStyles.row}>
      {[0, 1].map(i => (
        <View key={i} style={gridStyles.card}>
          <SkeletonCard width="100%" height={120} borderRadius={12} />
          <SkeletonCard width="80%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
          <SkeletonCard width="50%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
          <SkeletonCard width="40%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  </View>
));

export default function HomepageSkeleton() {
  return (
    <View style={styles.container}>
      <HeaderSkeleton />
      <HeroBannerSkeleton />
      <TabSectionSkeleton />
      <QuickActionsSkeleton />
      {/* Trending Stores section */}
      <CardSectionSkeleton cardWidth={280} cardHeight={160} numCards={3} titleWidth={160} />
      {/* New Arrivals section */}
      <CardSectionSkeleton cardWidth={160} cardHeight={180} numCards={4} titleWidth={130} />
      {/* Just for You section */}
      <CardSectionSkeleton cardWidth={230} cardHeight={140} numCards={3} titleWidth={120} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 50,
  },
});

const headerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#fffaeb',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

const bannerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#fffaeb',
  },
});

const tabStyles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  searchRow: {
    paddingHorizontal: 20,
  },
  chipScroll: {
    maxHeight: 40,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
});

const quickStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  action: {
    alignItems: 'center',
  },
});

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  card: {
    flexShrink: 0,
  },
});

const gridStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
  },
});
