import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

export type TabId = 'nuqta' | 'nuqta-mall' | 'cash-store';

interface HomeTabBarProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

const HomeTabBar: React.FC<HomeTabBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        {/* Tab 1: nuqta */}
        <Pressable
          style={styles.tabItem}
          onPress={() => onTabChange('nuqta')}
          accessibilityLabel="Near You tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'nuqta' }}
          accessibilityHint="Switch to deals near your location"
        >
          <View style={[
            styles.tab,
            activeTab === 'nuqta' ? styles.tabActive : styles.tabInactive
          ]}>
            <Text style={[
              styles.tabTextSingle,
              activeTab === 'nuqta' ? styles.tabTextActive : styles.tabTextInactive
            ]}>nuqta</Text>
          </View>
        </Pressable>

        {/* Tab 2: Nuqta Mall */}
        <Pressable
          style={styles.tabItem}
          onPress={() => onTabChange('nuqta-mall')}
          accessibilityLabel={`${BRAND.APP_NAME} Mall tab`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'nuqta-mall' }}
          accessibilityHint="Switch to nationwide online mall"
        >
          <View style={[
            styles.tab,
            activeTab === 'nuqta-mall' ? styles.tabActive : styles.tabInactive
          ]}>
            <Text style={[
              styles.tabTextSmall,
              activeTab === 'nuqta-mall' ? styles.tabTextActive : styles.tabTextInactive
            ]}>{BRAND.APP_NAME}</Text>
            <Text style={[
              styles.tabTextLarge,
              activeTab === 'nuqta-mall' ? styles.tabTextActive : styles.tabTextInactive
            ]}>Mall.</Text>
          </View>
        </Pressable>

        {/* Tab 3: Cash Store */}
        <Pressable
          style={styles.tabItem}
          onPress={() => onTabChange('cash-store')}
          accessibilityLabel="Cash Store tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'cash-store' }}
          accessibilityHint="Switch to cash store with locked pricing"
        >
          <View style={[
            styles.tab,
            activeTab === 'cash-store' ? styles.tabActive : styles.tabInactive
          ]}>
            <Text style={[
              styles.tabTextSmall,
              activeTab === 'cash-store' ? styles.tabTextActive : styles.tabTextInactive
            ]}>Cash</Text>
            <Text style={[
              styles.tabTextLarge,
              activeTab === 'cash-store' ? styles.tabTextActive : styles.tabTextInactive
            ]}>Store</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabItem: {
    flex: 1,
  },
  tab: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  // Active tab - Nile Blue background
  tabActive: {
    backgroundColor: colors.nileBlue,
  },
  // Inactive tab - White background
  tabInactive: {
    backgroundColor: colors.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  // Text styles
  tabTextSingle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tabTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  tabTextLarge: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  // Active text - White
  tabTextActive: {
    color: colors.background.primary,
  },
  // Inactive text - Nile Blue
  tabTextInactive: {
    color: colors.nileBlue,
  },
});

export default React.memo(HomeTabBar);
