/**
 * Sliding Tabs
 *
 * Tab navigation with Nuqta design palette
 */

import React, { useEffect} from 'react';
import { View, Pressable, StyleSheet, Dimensions} from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { SlidingTabsProps, TabData } from '@/types/cart';
import { borderRadius, colors, spacing } from '@/constants/theme';
const defaultTabs: TabData[] = [
  { key: 'products', title: 'Products', icon: 'cube-outline' },
  { key: 'service', title: 'Service', icon: 'construct-outline' },
  { key: 'lockedproduct', title: 'Locked', icon: 'lock-closed-outline' }
];

function SlidingTabs({
  activeTab,
  onTabChange,
  tabs = defaultTabs
}: SlidingTabsProps) {
  const { width } = Dimensions.get('window');
  const tabWidth = width / tabs.length;
  const underlinePosition = useSharedValue(0);
  const underlineStyle = useAnimatedStyle(() => {
    const inputRange = tabs.map((_: any, index: number) => index * tabWidth);
    const outputRange = tabs.map((_: any, index: number) => (index * tabWidth) + (tabWidth * 0.2));
    return {
      transform: [{ translateX: interpolate(underlinePosition.value, inputRange, outputRange, 'clamp') }],
    };
  });

  // Responsive design considerations for three tabs
  const isSmallScreen = width < 375;
  const isVerySmallScreen = width < 320;

  // Dynamic sizing based on screen width and tab count
  const getResponsiveTabSizes = () => {
    if (tabs.length >= 3) {
      if (isVerySmallScreen) {
        return { fontSize: 13, iconSize: 15, spacing: 2 };
      } else if (isSmallScreen) {
        return { fontSize: 14, iconSize: 16, spacing: 3 };
      } else {
        return { fontSize: 15, iconSize: 17, spacing: 4 };
      }
    } else {
      return { fontSize: 16, iconSize: 18, spacing: 6 };
    }
  };

  const { fontSize: tabFontSize, iconSize: tabIconSize, spacing: iconSpacing } = getResponsiveTabSizes();

  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.key === activeTab);
    animateUnderline(activeIndex);
  }, [activeTab, tabs]);

  const animateUnderline = (tabIndex: number) => {
    underlinePosition.value = withTiming(tabIndex, { duration: 200 });
  };

  const handleTabPress = (tabKey: string) => {
    if (tabKey !== activeTab) {
      onTabChange(tabKey as 'products' | 'service' | 'lockedproduct');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, { width: tabWidth }]}
              onPress={() => handleTabPress(tab.key)}
             
              accessibilityLabel={`${tab.title} tab`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={[
                styles.tabContent,
                isActive && styles.tabContentActive
              ]}>
                <View style={[
                  styles.iconWrapper,
                  isActive && styles.iconWrapperActive
                ]}>
                  <Ionicons
                    name={tab.icon as any}
                    size={tabIconSize}
                    color={isActive ? colors.nuqta.nileBlue : colors.neutral[400]}
                  />
                </View>
                <ThemedText style={[
                  styles.tabText,
                  { fontSize: tabFontSize },
                  isActive ? styles.activeTabText : styles.inactiveTabText
                ]}>
                  {tab.title}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Animated Underline with Gradient */}
      <Animated.View
        style={[
          styles.underlineContainer,
          { width: tabWidth * 0.6 },
          underlineStyle
        ]}
      >
        <LinearGradient
          colors={[colors.nuqta.mustard, colors.nuqta.peach]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.underlineGradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.nuqta.linen,
    position: 'relative',
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 56,
  },
  tab: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 0,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  tabContentActive: {
    backgroundColor: colors.nuqta.linen,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(255, 205, 87, 0.3)',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  activeTabText: {
    color: colors.nuqta.nileBlue,
    fontWeight: '600',
  },
  inactiveTabText: {
    color: colors.neutral[400],
    fontWeight: '500',
  },
  underlineContainer: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  underlineGradient: {
    flex: 1,
    borderRadius: 1.5,
  },
});

export default React.memo(SlidingTabs);
