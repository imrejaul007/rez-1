// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { UGCVideoItem, PLAY_PAGE_COLORS } from '@/types/playPage.types';
import SectionHeader from './SectionHeader';
import ThumbnailVideoCard from './ThumbnailVideoCard';

interface MerchantVideoSectionProps {
  videos: UGCVideoItem[];
  onVideoPress: (video: UGCVideoItem) => void;
  onViewAllPress?: () => void;
  loading?: boolean;
}

function MerchantVideoSection({
  videos,
  onVideoPress,
  onViewAllPress,
  loading = false
}: MerchantVideoSectionProps) {
  const renderItem = ({ item }: { item: UGCVideoItem }) => (
    <ThumbnailVideoCard
      item={item}
      onPress={onVideoPress}
      showHashtags={true}
    />
  );

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Products"
        showViewAll={videos.length > 4}
        onViewAllPress={onViewAllPress}
      />

      <FlashList
        data={videos.slice(0, 4)}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || `merchant-video-${index}`}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={250}

        // Performance Optimizations
        initialNumToRender={4} // Render first 4 videos (2 rows)
        maxToRenderPerBatch={4} // Render 4 videos at a time
        windowSize={5} // Keep 5 screen heights in memory
        removeClippedSubviews={true} // Remove off-screen views
        updateCellsBatchingPeriod={50} // Batch updates every 50ms
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: PLAY_PAGE_COLORS.background,
    paddingBottom: 24,
    marginBottom: 8,
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    justifyContent: 'space-between',
    gap: 12,
  },
});

export default React.memo(MerchantVideoSection);
