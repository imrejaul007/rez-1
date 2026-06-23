// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { UGCVideoItem, PLAY_PAGE_COLORS } from '@/types/playPage.types';
import SectionHeader from './SectionHeader';
import ThumbnailVideoCard from './ThumbnailVideoCard';

interface UGCVideoSectionProps {
  videos: UGCVideoItem[];
  onVideoPress: (video: UGCVideoItem) => void;
  onViewAllPress?: () => void;
  onLoadMore?: () => void;
  loading?: boolean;
  hasMore?: boolean;
}

function UGCVideoSection({
  videos,
  onVideoPress,
  onViewAllPress,
  onLoadMore,
  loading = false,
  hasMore = false
}: UGCVideoSectionProps) {
  const renderItem = ({ item }: { item: UGCVideoItem }) => (
    <ThumbnailVideoCard
      item={item}
      onPress={onVideoPress}
      showHashtags={true}
    />
  );

  const handleEndReached = () => {
    if (!loading && hasMore && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="UGC Videos"
        showViewAll={videos.length > 4}
        onViewAllPress={onViewAllPress}
      />

      <FlashList
        data={videos.slice(0, 4)}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || `ugc-video-${index}`}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={250}

        // Performance Optimizations
        initialNumToRender={4} // Render first 4 videos (2 rows)
        maxToRenderPerBatch={4} // Render 4 videos at a time for smoother experience
        windowSize={5} // Keep 5 screen heights worth of content in memory
        removeClippedSubviews={true} // Remove views outside viewport (Android)
        updateCellsBatchingPeriod={50} // Batch view updates every 50ms
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: PLAY_PAGE_COLORS.background,
    paddingBottom: 16,
  },
  gridContainer: {
    paddingHorizontal: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
});

export default React.memo(UGCVideoSection);
