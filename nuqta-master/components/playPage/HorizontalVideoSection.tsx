import React from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { UGCVideoItem } from '@/types/playPage.types';
import VideoCard from './VideoCard';
import { colors } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

interface HorizontalVideoSectionProps {
  videos: UGCVideoItem[];
  onVideoPress: (video: UGCVideoItem) => void;
  autoPlay?: boolean;
}

function HorizontalVideoSection({
  videos, 
  onVideoPress, 
  autoPlay = true 
}: HorizontalVideoSectionProps) {
  
  // Show ~1.2 cards at once (less compact than 2 full cards)
  const cardWidth = screenWidth * 0.75;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
      snapToInterval={cardWidth + 16} // smooth snap between cards
      decelerationRate="fast"
      pagingEnabled={false}
    >
      {videos.map((video, index) => (
        <VideoCard
          key={video.id}
          item={video}
          onPress={onVideoPress}
          autoPlay={autoPlay}
          size="large"
          style={[
            styles.videoCard,
            { width: cardWidth },
            index === videos.length - 1 && styles.lastCard
          ]}
        />
      ))}
    </ScrollView>
);
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: 16,
  },
  content: {
    paddingRight: 16,
    alignItems: 'center',
  },
  videoCard: {
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  lastCard: {
    marginRight: 0,
  },
});

export default React.memo(HorizontalVideoSection);
