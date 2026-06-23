// @ts-nocheck
import React from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HorizontalScrollSectionProps } from '@/types/homepage.types';
import { useThemeColor } from '@/hooks/useThemeColor';
import SectionSkeleton from './skeletons/SectionSkeleton';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth } = Dimensions.get('window');

// Memoize the component to prevent unnecessary re-renders
const HorizontalScrollSection = React.memo(function HorizontalScrollSection({
  section,
  onRefresh,
  renderCard,
  cardWidth = 280,
  spacing = 16,
  showIndicator = true,
  isLoading = false,
}: HorizontalScrollSectionProps & { isLoading?: boolean }) {
  const [refreshing, setRefreshing] = React.useState(false);
  const isMounted = useIsMounted();

  const primaryColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setRefreshing(false);
      }
    }
  };

  // Determine card type from section type for skeleton loader
  const getCardType = () => {
    const sectionType = section.type?.toLowerCase();
    if (sectionType?.includes('store')) return 'store';
    if (sectionType?.includes('event')) return 'event';
    if (sectionType?.includes('product')) return 'product';
    if (sectionType?.includes('recommendation')) return 'recommendation';
    return 'product'; // default
  };

  const renderSectionCard = React.useCallback(({ item, index }: { item: any; index: number }) => (
    <View
      style={[
        styles.cardContainer,
        { width: cardWidth, marginRight: index === section.items.length - 1 ? 0 : spacing },
      ]}
    >
      {renderCard(item)}
    </View>
  ), [cardWidth, spacing, section.items.length, renderCard]);

  // Show skeleton loader if loading or no items yet
  if (isLoading || !section.items || section.items.length === 0) {
    return (
      <SectionSkeleton
        cardType={getCardType()}
        cardWidth={cardWidth}
        spacing={spacing}
        numCards={4}
        showIndicator={showIndicator}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Section Header */}
      <ThemedView style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>{section.title}</ThemedText>
        <View style={[styles.titleAccent, { backgroundColor: primaryColor }]} />
      </ThemedView>

      {/* Horizontal Scroll Content - Optimized FlatList for all platforms */}
      <FlashList
        data={section.items}
        horizontal
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={showIndicator}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing }]}
        style={Platform.OS === 'web' ? styles.webFlatListContainer : undefined}
        // Performance optimizations
        removeClippedSubviews={Platform.OS !== 'web'} // Enable on native for better performance
        maxToRenderPerBatch={5} // Render 5 items per batch
        updateCellsBatchingPeriod={50} // Update every 50ms
        initialNumToRender={4} // Only render 4 items initially
        windowSize={5} // Keep 5 screens worth of items in memory
        scrollEventThrottle={16}
        decelerationRate="normal"
        estimatedItemSize={150}
        keyExtractor={(item, index) => item?.id || item?._id || `item-${index}`}
        renderItem={renderSectionCard}
      />

      {/* Optional iOS Always-visible Scroll Indicator */}
      {Platform.OS === 'ios' && showIndicator && (
        <View style={[styles.fakeIndicator, { backgroundColor: primaryColor }]} />
      )}
    </ThemedView>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if section items actually changed (deep comparison of IDs)
  if (prevProps.section.id !== nextProps.section.id) return false;
  if (prevProps.section.items.length !== nextProps.section.items.length) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;

  // Check if item IDs changed
  const prevIds = prevProps.section.items.map((item, i) => item?.id || item?._id || i).join(',');
  const nextIds = nextProps.section.items.map((item, i) => item?.id || item?._id || i).join(',');
  if (prevIds !== nextIds) return false;

  // Check if other props changed
  if (prevProps.cardWidth !== nextProps.cardWidth) return false;
  if (prevProps.spacing !== nextProps.spacing) return false;
  if (prevProps.showIndicator !== nextProps.showIndicator) return false;

  // If all checks pass, props are equal - skip re-render
  return true;
});

export default HorizontalScrollSection;

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  titleAccent: {
    position: 'absolute',
    bottom: -8,
    left: 20,
    width: 32,
    height: 3,
    borderRadius: 2,
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
  fakeIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 20,
    right: 20,
    height: 2,
    borderRadius: 1,
    opacity: 0.3,
  },
});
