// Transaction Tabs Component
// Tab navigation for filtering transactions by category

import React from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { WalletTab, TransactionCategory } from '@/types/wallet.types';
import { colors } from '@/constants/theme';

interface TransactionTabsProps {
  tabs: WalletTab[];
  activeTab: TransactionCategory;
  onTabPress: (tabId: TransactionCategory) => void;
}

function TransactionTabs({ tabs, activeTab, onTabPress }: TransactionTabsProps) {
  
  const renderTab = (tab: WalletTab) => {
    const isActive = tab.id === activeTab;
    
    return (
      <Pressable
        key={tab.id}
        style={[
          styles.tab,
          isActive && styles.activeTab,
        ]}
        onPress={() => onTabPress(tab.id)}
       
        accessibilityLabel={`${tab.title} tab`}
        accessibilityRole="tab"
        accessibilityHint={`Double tap to filter transactions by ${tab.title}`}
        accessibilityState={{ selected: isActive }}
      >
        <ThemedText style={[
          styles.tabText,
          isActive && styles.activeTabText,
        ]}>
          {tab.title}
        </ThemedText>
        
        {tab.count !== undefined && tab.count > 0 && (
          <View style={[
            styles.badge,
            isActive && styles.activeBadge,
          ]}>
            <ThemedText style={[
              styles.badgeText,
              isActive && styles.activeBadgeText,
            ]}>
              {tab.count}
            </ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        style={styles.tabsScroll}
      >
        {tabs.map(renderTab)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFBFC',
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingVertical: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.slateLight,
    minWidth: 70,
    justifyContent: 'center',
    shadowColor: colors.slateGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 1,
  },
  activeTab: {
    backgroundColor: colors.brand.purpleLight,
    borderColor: colors.brand.purpleLight,
    shadowColor: colors.brand.purpleLight,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.01 }],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  activeTabText: {
    color: 'white',
  },
  badge: {
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
    shadowColor: colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  activeBadge: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.1,
    lineHeight: 13,
  },
  activeBadgeText: {
    color: colors.brand.purpleLight,
  },
});

export default React.memo(TransactionTabs);
