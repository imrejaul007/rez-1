import React, { useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { ReviewTabsProps, TabType } from '@/types/reviews';
import { colors } from '@/constants/theme';

const ReviewTabs: React.FC<ReviewTabsProps> = ({
  activeTab,
  onTabChange,
  reviewCount,
  ugcCount = 0,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const tabWidth = screenWidth / 2.3; // more dynamic than fixed 64px padding
  const translateX = useSharedValue(0);

  useEffect(() => {
    const targetX = activeTab === 'reviews' ? 0 : tabWidth;
    translateX.value = withSpring(targetX, { damping: 18, stiffness: 150 });
  }, [activeTab, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleTabPress = (tab: TabType) => {
    onTabChange(tab);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {/* Active tab indicator */}
        <Animated.View
          style={[
            styles.activeIndicator,
            { width: tabWidth },
            indicatorStyle,
          ]}
        />

        {/* Reviews Tab */}
        <Pressable
          style={[styles.tab, { width: tabWidth }]}
          onPress={() => handleTabPress('reviews')}
         
          accessibilityLabel={`Reviews tab. ${reviewCount} reviews`}
          accessibilityRole="tab"
          accessibilityHint="Double tap to view reviews"
          accessibilityState={{ selected: activeTab === 'reviews' }}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === 'reviews'
                ? styles.activeTabText
                : styles.inactiveTabText,
            ]}
          >
            Reviews ({reviewCount})
          </ThemedText>
        </Pressable>

        {/* UGC Content Tab */}
        <Pressable
          style={[styles.tab, { width: tabWidth }]}
          onPress={() => handleTabPress('ugc')}
         
          accessibilityLabel={`UGC content tab${ugcCount > 0 ? `. ${ugcCount} items` : ''}`}
          accessibilityRole="tab"
          accessibilityHint="Double tap to view user-generated content"
          accessibilityState={{ selected: activeTab === 'ugc' }}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === 'ugc'
                ? styles.activeTabText
                : styles.inactiveTabText,
            ]}
          >
            UGC Content {ugcCount > 0 && `(${ugcCount})`}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.tint.coolGray,
    borderRadius: 20,
    padding: 6,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  activeIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    shadowColor: colors.brand.purple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  tab: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    zIndex: 1,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTabText: {
    color: colors.brand.purple,
    fontWeight: '700',
  },
  inactiveTabText: {
    color: colors.slateGray,
  },
});

export default React.memo(ReviewTabs);
