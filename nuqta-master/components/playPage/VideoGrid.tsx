// @ts-nocheck
import React from 'react';
import { 
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Dimensions
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { VideoGridProps, PLAY_PAGE_COLORS } from '@/types/playPage.types';
import VideoCard from './VideoCard';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

function VideoGrid({ 
  items, 
  onItemPress, 
  autoPlay = true,
  showLoadMore = false,
  onLoadMore,
  loading = false 
}: VideoGridProps) {
  
  const renderVideoCard = ({ item }: { item: any }) => (
    <VideoCard
      item={item}
      onPress={onItemPress}
      autoPlay={autoPlay}
      size="medium"
      style={styles.card}
    />
  );

  const renderLoadMore = () => {
    if (!showLoadMore) return null;

    return (
      <View style={styles.loadMoreContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={PLAY_PAGE_COLORS.primary} />
        ) : (
          <Pressable 
            style={styles.loadMoreButton}
            onPress={onLoadMore}
           
          >
            <ThemedText style={styles.loadMoreText}>Load More</ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyText}>No Videos Yet 📭</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Check back soon for fresh content!
      </ThemedText>
    </View>
  );

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        renderEmpty()
      ) : (
        <FlashList
          data={items}
          renderItem={renderVideoCard}
          keyExtractor={(item, index) => `${item.id || index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
          ListFooterComponent={renderLoadMore}
          snapToInterval={width * 0.7 + 16}   // smooth snapping like carousel
          decelerationRate="fast"
          snapToAlignment="start"
          estimatedItemSize={250}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  horizontalList: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  card: {
    width: width * 0.7, // make cards 70% of screen width
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  loadMoreContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 30,
  },
  loadMoreButton: {
    backgroundColor: PLAY_PAGE_COLORS.primary,
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingVertical: 12,
    shadowColor: PLAY_PAGE_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  loadMoreText: {
    color: colors.background.primary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: PLAY_PAGE_COLORS.text,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: PLAY_PAGE_COLORS.textSecondary,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default React.memo(VideoGrid);
