import { withErrorBoundary } from '@/utils/withErrorBoundary';
// TabNavigation.tsx - Redesigned tab navigation for MainStorePage
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  LayoutChangeEvent,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
} from "@/constants/DesignSystem";

export type TabKey = "menu" | "photos" | "reviews" | "about";

interface TabData {
  key: TabKey;
  title: string;
}

const defaultTabs: TabData[] = [
  { key: "menu", title: "Menu" },
  { key: "photos", title: "Photos" },
  { key: "reviews", title: "Reviews" },
  { key: "about", title: "About" },
];

interface TabNavigationProps {
  activeTab: TabKey;
  onTabChange: (tabKey: TabKey) => void;
  compact?: boolean;
  menuTabLabel?: string;
}

function TabNavigation({
  activeTab,
  onTabChange,
  compact = false,
  menuTabLabel,
}: TabNavigationProps) {
  const [containerWidth, setContainerWidth] = useState<number>(Dimensions.get("window").width);
  const [tabPositions, setTabPositions] = useState<{ [key: string]: { x: number; width: number } }>({});

  // Animated value for underline position (reanimated for layout props)
  const underlineLeft = useSharedValue(0);
  const underlineWidth = useSharedValue(0);

  // Scale animations for each tab
  const scale0 = useSharedValue(1);
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const scale4 = useSharedValue(1);
  const scaleAnims = useRef([scale0, scale1, scale2, scale3, scale4]).current;

  // Override menu tab label if provided
  const tabs = menuTabLabel
    ? defaultTabs.map(t => t.key === 'menu' ? { ...t, title: menuTabLabel } : t)
    : defaultTabs;

  const tabCount = tabs.length;
  const tabWidth = containerWidth / tabCount;

  const underlineAnimStyle = useAnimatedStyle(() => ({
    left: underlineLeft.value,
    width: underlineWidth.value,
  }));

  useEffect(() => {
    const activePosition = tabPositions[activeTab];
    if (activePosition) {
      underlineLeft.value = withSpring(activePosition.x, { damping: 18, stiffness: 180 });
      underlineWidth.value = withSpring(activePosition.width, { damping: 18, stiffness: 180 });
    }
  }, [activeTab, tabPositions]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width || Dimensions.get("window").width;
    setContainerWidth(w);
  };

  const handleTabLayout = (key: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabPositions((prev) => ({
      ...prev,
      [key]: { x, width },
    }));
  };

  const handlePressIn = (index: number) => {
    scaleAnims[index].value = withSpring(0.95, { damping: 8, stiffness: 100 });
  };

  const handlePressOut = (index: number) => {
    scaleAnims[index].value = withSpring(1, { damping: 8, stiffness: 100 });
  };

  const handlePress = (tabKey: TabKey) => {
    triggerImpact('Light');
    onTabChange(tabKey);
  };

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <View style={[styles.container, compact && styles.containerCompact]} onLayout={onLayout}>
        <View style={styles.tabsRow}>
          {tabs.map((tab, index) => {
            const isActive = tab.key === activeTab;
            const scaleStyle = useAnimatedStyle(() => ({
              transform: [{ scale: scaleAnims[index].value }],
            }));

            return (
              <Animated.View
                key={tab.key}
                style={[
                  styles.tabWrapper,
                  scaleStyle,
                ]}
                onLayout={(e) => handleTabLayout(tab.key, e)}
              >
                <Pressable
                  style={[styles.tab, compact && styles.tabCompact]}
                  onPress={() => handlePress(tab.key)}
                  onPressIn={() => handlePressIn(index)}
                  onPressOut={() => handlePressOut(index)}
                 
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <ThemedText
                    style={[
                      styles.label,
                      isActive && styles.labelActive,
                      compact && styles.labelCompact,
                    ]}
                  >
                    {tab.title}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Animated Underline */}
        <Animated.View
          style={[
            styles.underline,
            underlineAnimStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  container: {
    backgroundColor: colors.background.primary,
    position: "relative",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: Spacing.base,
  },
  tabWrapper: {
    marginRight: Spacing.lg,
  },
  tab: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text.tertiary,
  },
  labelActive: {
    color: colors.lightMustard,
    fontWeight: "600",
  },
  underline: {
    position: "absolute",
    bottom: 0,
    height: 3,
    backgroundColor: colors.lightMustard,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  // Compact mode styles
  wrapperCompact: {
    borderBottomWidth: 0,
  },
  containerCompact: {
    paddingVertical: 0,
  },
  tabCompact: {
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  labelCompact: {
    fontSize: 14,
  },
});

export default withErrorBoundary(TabNavigation, 'MainStoreSectionTabNavigation');
