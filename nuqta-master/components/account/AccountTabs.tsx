// AccountTabs - Animated Segmented Control
// Fixed-width 3-segment control with sliding pill indicator

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  LayoutChangeEvent} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { AccountTabsProps, AccountTabType } from '@/types/account.types';
import { TAB_ORDER } from '@/data/accountData';
import { Colors, Timing, BorderRadius } from '@/constants/DesignSystem';

const PILL_INSET = 3;

function getTabIndex(tab: AccountTabType): number {
  return TAB_ORDER.indexOf(tab);
}

function AccountTabs({ tabs, activeTab, onTabPress }: AccountTabsProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const pillAnim = useSharedValue(getTabIndex(activeTab));

  useEffect(() => {
    pillAnim.value = withSpring(getTabIndex(activeTab), { damping: Timing.springSmooth.damping, stiffness: Timing.springSmooth.stiffness, mass: Timing.springSmooth.mass });
  }, [activeTab, pillAnim]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const tabWidth = containerWidth / tabs.length;

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(pillAnim.value, [0, 1, 2], [PILL_INSET, tabWidth + PILL_INSET, tabWidth * 2 + PILL_INSET]) }],
  }));

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      accessibilityRole="tablist"
    >
      {/* Animated sliding pill */}
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            {
              width: tabWidth - PILL_INSET * 2,
            },
            pillStyle,
          ]}
        />
      )}

      {/* Tab buttons */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabPress(tab.id)}
           
            accessibilityLabel={`${tab.title} tab`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <ThemedText
              style={[styles.tabText, isActive && styles.activeTabText]}
              numberOfLines={1}
            >
              {tab.title}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F0EDE6',
    borderRadius: BorderRadius.xl,
    padding: PILL_INSET,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: PILL_INSET,
    bottom: PILL_INSET,
    borderRadius: BorderRadius.xl - PILL_INSET,
    backgroundColor: Colors.primary[500],
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary[700],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 6px rgba(230, 184, 78, 0.3)' } as any,
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    zIndex: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[600],
    letterSpacing: 0.1,
  },
  activeTabText: {
    color: Colors.secondary[600],
    fontWeight: '700',
  },
});

export default React.memo(AccountTabs);
