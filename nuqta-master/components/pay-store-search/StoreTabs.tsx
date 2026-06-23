/**
 * StoreTabs Component
 *
 * Horizontal scrollable tabs for filtering store types with animated selection indicator.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { colors } from '@/constants/theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type StoreTab = 'all' | 'brands' | 'local' | 'services';

export interface StoreTabsProps {
  activeTab: StoreTab;
  onTabChange: (tab: StoreTab) => void;
}

const COLORS = {
  primary: colors.nileBlue,      // Nile Blue
  gray: colors.neutral[500],
  border: colors.neutral[200],
  background: colors.background.primary,
};

interface TabConfig {
  id: StoreTab;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'all', label: 'All Stores' },
  { id: 'brands', label: 'Brands' },
  { id: 'local', label: 'Local Stores' },
  { id: 'services', label: 'Services' },
];

interface TabItemProps {
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}

const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onPress, onLayout }) => {
  const scale = useSharedValue(1);
  const activeValue = useSharedValue(isActive ? 1 : 0);

  // Update active state when prop changes
  React.useEffect(() => {
    activeValue.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive, activeValue]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  }, [scale]);

  const animatedPressableStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      activeValue.value,
      [0, 1],
      [COLORS.gray, COLORS.primary]
    );

    return { color };
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={onLayout}
      style={[styles.tab, animatedPressableStyle]}
    >
      <Animated.Text
        style={[
          styles.tabText,
          isActive && styles.activeTabText,
          animatedTextStyle,
        ]}
      >
        {tab.label}
      </Animated.Text>
    </AnimatedPressable>
  );
};

export const StoreTabs: React.FC<StoreTabsProps> = ({ activeTab, onTabChange }) => {
  const indicatorLeft = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const tabLayouts = React.useRef<{ [key: string]: { x: number; width: number } }>({});

  const handleTabPress = useCallback(
    (tab: StoreTab) => {
      onTabChange(tab);
    },
    [onTabChange]
  );

  const handleTabLayout = useCallback(
    (tabId: StoreTab) => (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      tabLayouts.current[tabId] = { x, width };

      // Update indicator position if this is the active tab
      if (tabId === activeTab) {
        indicatorLeft.value = withSpring(x, {
          damping: 20,
          stiffness: 150,
        });
        indicatorWidth.value = withSpring(width, {
          damping: 20,
          stiffness: 150,
        });
      }
    },
    [activeTab, indicatorLeft, indicatorWidth]
  );

  // Update indicator when active tab changes
  React.useEffect(() => {
    const layout = tabLayouts.current[activeTab];
    if (layout) {
      indicatorLeft.value = withSpring(layout.x, {
        damping: 20,
        stiffness: 150,
      });
      indicatorWidth.value = withSpring(layout.width, {
        damping: 20,
        stiffness: 150,
      });
    }
  }, [activeTab, indicatorLeft, indicatorWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    left: indicatorLeft.value,
    width: indicatorWidth.value,
  }));

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        <View style={styles.tabsWrapper}>
          <View style={styles.tabsContainer}>
            {TABS.map((tab) => (
              <TabItem
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onPress={() => handleTabPress(tab.id)}
                onLayout={handleTabLayout(tab.id)}
              />
            ))}
          </View>
          <Animated.View style={[styles.indicator, animatedIndicatorStyle]} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 8,
    marginBottom: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tabsWrapper: {
    position: 'relative',
    flexDirection: 'column',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.gray,
  },
  activeTabText: {
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: COLORS.primary,
  },
});

export default React.memo(StoreTabs);
