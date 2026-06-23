import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { UGCVideoItem, PLAY_PAGE_COLORS } from "@/types/playPage.types";
import VideoGrid from "./VideoGrid";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { colors } from '@/constants/theme';

interface MainContentSectionProps {
  videos: UGCVideoItem[];
  onVideoPress: (video: UGCVideoItem) => void;
  onReadMorePress?: () => void;
  autoPlay?: boolean;
  loading?: boolean;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
  hasReadMore?: boolean;
}

function MainContentSection({
  videos,
  onVideoPress,
  onReadMorePress,
  autoPlay = true,
  loading = false,
  showLoadMore = false,
  onLoadMore,
  hasReadMore = true,
}: MainContentSectionProps) {
  return (
    <View style={styles.container}>
      {/* Video Grid */}
      <VideoGrid
        items={videos}
        onItemPress={onVideoPress}
        columns={2}
        autoPlay={autoPlay}
        showLoadMore={showLoadMore}
        onLoadMore={onLoadMore}
        loading={loading}
      />

      {/* Read More Section */}
      {hasReadMore && videos.length > 0 && (
        <Pressable
          style={styles.readMoreSection}
         
          onPress={onReadMorePress}
        >
        </Pressable>
      )}
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: PLAY_PAGE_COLORS.background,
    paddingTop: 8,
  },
  readMoreSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  readMoreText: {
    fontSize: 15,
    fontWeight: "600",
    color: PLAY_PAGE_COLORS.primary,
    marginRight: 6,
  },
});

export default React.memo(MainContentSection);
