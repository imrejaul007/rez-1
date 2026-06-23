import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import CategoryCashbackGrid from './CategoryCashbackGrid';
import { colors, spacing } from '@/constants/theme';

// Updated to 4 tabs
export type TabId = 'near-u' | 'mall' | 'cash' | 'prive';

// Tab configuration with icons and descriptions
const TAB_CONFIG: Record<TabId, {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}> = {
  'near-u': {
    iconName: 'location-outline',
    label: 'Near U',
    description: 'Local discovery + payments',
  },
  'mall': {
    iconName: 'storefront-outline',
    label: 'Mall',
    description: 'Curated brands, fast delivery',
  },
  'cash': {
    iconName: 'wallet-outline',
    label: 'Cash',
    description: 'Affiliate cashback & coupons',
  },
  'prive': {
    iconName: 'diamond-outline',
    label: 'Privé',
    description: 'Invite-only luxury deals',
  },
};

// Comprehensive theme configuration for each tab
const TAB_THEMES: Record<TabId, {
  heroGradient: string[];
  tabActiveColor: string;
  tabActiveTextColor: string;
  tabInactiveTextColor: string;
  categoryIconColor: string;
  containerBg: string;
}> = {
  'near-u': {
    heroGradient: ['#fff0c4', '#ffe8a8', colors.lightMustard],
    tabActiveColor: colors.nileBlue,
    tabActiveTextColor: colors.background.primary,
    tabInactiveTextColor: colors.nileBlue,
    categoryIconColor: colors.lightMustard,
    containerBg: colors.linen,
  },
  'mall': {
    heroGradient: [colors.lavenderMist, '#e0edf7', colors.lavenderMist],
    tabActiveColor: colors.brand.sky,
    tabActiveTextColor: colors.background.primary,
    tabInactiveTextColor: colors.brand.sky,
    categoryIconColor: colors.brand.sky,
    containerBg: colors.lavenderMist,
  },
  'cash': {
    heroGradient: ['#FFF5EE', '#FFE5D0', colors.lightPeach], // Soft Peach gradient
    tabActiveColor: colors.lightPeach, // Light Peach
    tabActiveTextColor: colors.nileBlue, // Nile Blue for contrast
    tabInactiveTextColor: colors.brand.caramel, // Peach Dark
    categoryIconColor: colors.brand.caramel, // Peach Dark
    containerBg: colors.lightPeach, // Match hero gradient bottom for seamless transition
  },
  'prive': {
    heroGradient: [colors.neutral[800], colors.neutral[700], colors.neutral[600]],
    tabActiveColor: colors.brand.goldAccent,
    tabActiveTextColor: colors.brand.goldAccent,
    tabInactiveTextColor: colors.brand.goldAccent,
    categoryIconColor: colors.brand.goldAccent,
    containerBg: colors.neutral[900],
  },
};

// Tab position interface for curve calculations
interface TabLayout {
  x: number;
  width: number;
}

interface HomeTabSectionProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  onSearchPress: () => void;
  coinBalance?: number;
  onCoinPress?: () => void;
  selectedCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  isPriveEligible?: boolean;
  onPriveLockedPress?: () => void;
}

// Tab order for layout calculations
const TAB_ORDER: TabId[] = ['near-u', 'mall', 'cash', 'prive'];

const HomeTabSection: React.FC<HomeTabSectionProps> = ({
  activeTab,
  onTabChange,
  onSearchPress,
  coinBalance = 0,
  onCoinPress,
  selectedCategory = 'all',
  onCategoryChange,
  isPriveEligible = false,
  onPriveLockedPress,
}) => {
  const router = useRouter();
  const theme = TAB_THEMES[activeTab];
  const isPriveMode = activeTab === 'prive';
  const [containerWidth, setContainerWidth] = useState(0);
  const [tabLayouts, setTabLayouts] = useState<Record<TabId, TabLayout>>({
    'near-u': { x: 0, width: 0 },
    'mall': { x: 0, width: 0 },
    'cash': { x: 0, width: 0 },
    'prive': { x: 0, width: 0 },
  });

  // Handle container layout measurement
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  // Handle individual tab layout measurement
  const handleTabLayout = useCallback((tabId: TabId, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts(prev => ({
      ...prev,
      [tabId]: { x: x + 9, width },
    }));
  }, []);

  // Handle Privé tab press - always switch to Privé tab
  // Eligibility is now handled inside PriveSectionContainer
  const handlePrivePress = useCallback(() => {
    onTabChange('prive');
  }, [onTabChange]);

  // Generate SVG path for curved background
  const generateCurvedPath = useCallback(() => {
    const activeLayout = tabLayouts[activeTab];
    if (!containerWidth || !activeLayout.width) return '';

    const curveRadius = 14;
    const tabRowBottom = 70;
    const tabTop = 6;
    const leftX = activeLayout.x + 2;
    const rightX = activeLayout.x + activeLayout.width - 2;
    const totalWidth = containerWidth;

    const path = `
      M 0 ${tabRowBottom}
      L ${Math.max(0, leftX - curveRadius)} ${tabRowBottom}
      C ${leftX - curveRadius / 2} ${tabRowBottom} ${leftX} ${tabRowBottom - curveRadius / 2} ${leftX} ${tabRowBottom - curveRadius}
      L ${leftX} ${tabTop + curveRadius}
      C ${leftX} ${tabTop + curveRadius / 2} ${leftX + curveRadius / 2} ${tabTop} ${leftX + curveRadius} ${tabTop}
      L ${rightX - curveRadius} ${tabTop}
      C ${rightX - curveRadius / 2} ${tabTop} ${rightX} ${tabTop + curveRadius / 2} ${rightX} ${tabTop + curveRadius}
      L ${rightX} ${tabRowBottom - curveRadius}
      C ${rightX} ${tabRowBottom - curveRadius / 2} ${rightX + curveRadius / 2} ${tabRowBottom} ${rightX + curveRadius} ${tabRowBottom}
      L ${totalWidth} ${tabRowBottom}
      L ${totalWidth} 350
      L 0 350
      Z
    `;
    return path;
  }, [activeTab, tabLayouts, containerWidth]);

  // Get container background based on mode
  const containerBg = isPriveMode
    ? colors.neutral[900]
    : activeTab === 'mall'
      ? colors.lavenderMist
      : activeTab === 'cash'
        ? colors.lightPeach
        : colors.linen;

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]} onLayout={handleContainerLayout}>
      {/* SVG Curved Background */}
      {containerWidth > 0 && (
        <View style={styles.svgContainer}>
          <Svg width={containerWidth} height={350} style={styles.svg}>
            <Path
              d={generateCurvedPath()}
              fill={theme.heroGradient[0]}
            />
          </Svg>
        </View>
      )}

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        {/* Tab 1: Near U */}
        <Pressable
          style={styles.tabItem}
          onPress={() => onTabChange('near-u')}
         
          onLayout={(e) => handleTabLayout('near-u', e)}
        >
          <View style={[
            styles.tab,
            styles.tabPill,
            activeTab === 'near-u'
              ? styles.tabActiveTransparent
              : styles.tabInactive
          ]}>
            <Ionicons
              name={TAB_CONFIG['near-u'].iconName}
              size={18}
              color={activeTab === 'near-u'
                ? colors.nileBlue
                : TAB_THEMES[activeTab].tabInactiveTextColor
              }
              style={styles.tabIcon}
            />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
              style={[
                styles.tabText,
                { color: activeTab === 'near-u'
                  ? colors.nileBlue
                  : TAB_THEMES[activeTab].tabInactiveTextColor
                }
              ]}>{TAB_CONFIG['near-u'].label}</Text>
          </View>
        </Pressable>

        {/* Tab 2: Mall */}
        <Pressable
          style={styles.tabItem}
          onPress={() => onTabChange('mall')}
         
          onLayout={(e) => handleTabLayout('mall', e)}
        >
          <View style={[
            styles.tab,
            styles.tabPill,
            activeTab === 'mall'
              ? styles.tabActiveTransparent
              : styles.tabInactive
          ]}>
            <Ionicons
              name={TAB_CONFIG['mall'].iconName}
              size={18}
              color={activeTab === 'mall'
                ? colors.brand.sky
                : TAB_THEMES[activeTab].tabInactiveTextColor
              }
              style={styles.tabIcon}
            />
            <Text 
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
              style={[
                styles.tabText,
                { color: activeTab === 'mall'
                  ? colors.brand.sky
                  : TAB_THEMES[activeTab].tabInactiveTextColor
                }
              ]}>{TAB_CONFIG['mall'].label}</Text>
          </View>
        </Pressable>

        {/* Tab 3: Cash */}
        <Pressable
          style={styles.tabItem}
          onPress={() => onTabChange('cash')}
         
          onLayout={(e) => handleTabLayout('cash', e)}
        >
          <View style={[
            styles.tab,
            styles.tabPill,
            activeTab === 'cash'
              ? styles.tabActiveTransparent
              : styles.tabInactive
          ]}>
            <Ionicons
              name={TAB_CONFIG['cash'].iconName}
              size={18}
              color={activeTab === 'cash'
                ? colors.brand.caramel // Nuqta Peach Dark
                : TAB_THEMES[activeTab].tabInactiveTextColor
              }
              style={styles.tabIcon}
            />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
              style={[
                styles.tabText,
                { color: activeTab === 'cash'
                  ? colors.brand.caramel // Nuqta Peach Dark
                  : TAB_THEMES[activeTab].tabInactiveTextColor
                }
              ]}>{TAB_CONFIG['cash'].label}</Text>
          </View>
        </Pressable>

        {/* Tab 4: Privé */}
        <Pressable
          style={styles.tabItem}
          onPress={handlePrivePress}
         
          onLayout={(e) => handleTabLayout('prive', e)}
        >
          <View style={[
            styles.tab,
            styles.tabPill,
            activeTab === 'prive'
              ? styles.tabActiveTransparent
              : [styles.tabInactive, !isPriveEligible && styles.tabLocked]
          ]}>
            <View style={styles.priveTabContent}>
              {!isPriveEligible && activeTab !== 'prive' && (
                <Ionicons
                  name="lock-closed-outline"
                  size={12}
                  color={TAB_THEMES[activeTab].tabInactiveTextColor}
                  style={styles.lockIcon}
                />
              )}
              <Text 
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.8}
                style={[
                  styles.tabText,
                  { color: activeTab === 'prive'
                    ? colors.brand.goldAccent
                    : TAB_THEMES[activeTab].tabInactiveTextColor
                  }
                ]}>{TAB_CONFIG['prive'].label}</Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Middle section with dynamic gradient based on active tab */}
      <LinearGradient
        colors={theme.heroGradient as [string, string, ...string[]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.middleSection}
      >
        {/* Tab Description Section - Center */}
        <View style={styles.descriptionSection}>
          <Text style={[
            styles.descriptionText,
            {
              color: isPriveMode
                ? colors.brand.goldAccent
                : activeTab === 'mall'
                  ? colors.brand.sky
                  : activeTab === 'cash'
                    ? colors.brand.caramel // Nuqta Peach Dark
                    : colors.nileBlue
            }
          ]}>
            {TAB_CONFIG[activeTab].description}
          </Text>
        </View>

        {/* Search Row with Promo Banner - Hide for Cash tab (has its own search bar) */}
        {activeTab !== 'cash' && (
          <View style={styles.searchRow}>
            {/* Compact Search Bar */}
            <Pressable
              style={[
                styles.searchContainerCompact,
                isPriveMode && styles.searchContainerPrive
              ]}
              onPress={onSearchPress}
             
            >
              <Ionicons
                name="search"
                size={18}
                color={isPriveMode ? '#A0A0A0' : colors.neutral[400]}
                style={styles.searchIcon}
              />
              <Text style={[
                styles.searchPlaceholderCompact,
                isPriveMode && styles.searchPlaceholderPrive
              ]}>
                {isPriveMode ? 'Search exclusive offers...' : 'Search products...'}
              </Text>
            </Pressable>

            {/* Promotional Banner - Deals Button */}
            <Pressable
              style={styles.promoBannerContainer}
             
              onPress={() => {
                router.push('/offers' as any);
              }}
            >
              {isPriveMode ? (
                <LinearGradient
                  colors={['#2A2A2A', '#1F1F1F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.promoBannerGradient}
                >
                  <View style={styles.promoBannerContent}>
                    <Text style={styles.promoBannerTitlePrive}>EXCLUSIVE</Text>
                    <Text style={styles.promoBannerSubtitlePrive}>ACCESS</Text>
                  </View>
                  <View style={styles.promoBannerIconWrapperPrive}>
                    <Ionicons name="diamond" size={18} color={colors.brand.goldAccent} />
                  </View>
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={activeTab === 'mall' ? [colors.brand.sky, colors.brand.skyDark] : [colors.lightMustard, colors.brand.goldRich, '#d4a645']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.promoBannerGradientDeals}
                >
                  <Ionicons name="flash" size={18} color={colors.background.primary} style={styles.dealsIcon} />
                  <Text style={styles.dealsText}>Deals</Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        )}

        {/* Category Cashback Grid - Only show when near-u tab is selected */}
        {activeTab === 'near-u' && (
          <CategoryCashbackGrid
            onCategoryPress={onCategoryChange}
            style={styles.categoryCashbackGrid}
          />
        )}

        {/* Privé mode exclusive content teaser */}
        {isPriveMode && (
          <View style={styles.priveTeaser}>
            <Text style={styles.priveTeaserIcon}>✦</Text>
            <Text style={styles.priveTeaserText}>
              Exclusive offers for Privé members
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingTop: 8,
    paddingBottom: 0,
    marginTop: -1,
    marginBottom: 0,
    position: 'relative',
    overflow: 'visible',
  },
  // SVG curved background
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  middleSection: {
    paddingTop: 8,
    paddingBottom: 6,
    marginBottom: -1,
    marginTop: 0,
    zIndex: 1,
    borderBottomWidth: 0,
  },
  // Tabs
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: 6,
    marginBottom: 4,
    zIndex: 2,
  },
  tabItem: {
    flex: 1,
  },
  tab: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    flexDirection: 'row',
    gap: 6,
  },
  tabPill: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    minHeight: 54,
  },
  tabIcon: {
    // Icon size is controlled by Ionicons size prop
  },
  tabActiveTransparent: {
    backgroundColor: 'transparent',
  },
  tabInactive: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  tabLocked: {
    opacity: 0.7,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  priveTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  lockIcon: {
    marginLeft: 0,
  },
  // Description Section
  descriptionSection: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 4,
    marginTop: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.nileBlue,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  descriptionTextPrive: {
    color: colors.brand.goldAccent,
  },
  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
    marginBottom: 0,
    gap: 10,
  },
  searchContainerCompact: {
    flex: 2,
    backgroundColor: colors.background.primary,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  searchContainerPrive: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholderCompact: {
    fontSize: 13,
    color: colors.neutral[400],
    flex: 1,
  },
  searchPlaceholderPrive: {
    color: colors.neutral[500],
  },
  // Promotional Banner
  promoBannerContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  promoBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
  },
  promoBannerGradientDeals: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  promoBannerContent: {
    flex: 1,
  },
  promoBannerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.error,
    letterSpacing: 0.5,
  },
  promoBannerTitlePrive: {
    color: colors.brand.goldAccent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  promoBannerSubtitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#991B1B',
    letterSpacing: 0.3,
    marginTop: -2,
  },
  promoBannerSubtitlePrive: {
    color: '#A88B4A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginTop: -2,
  },
  promoBannerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBannerIconWrapperPrive: {
    backgroundColor: 'rgba(201, 169, 98, 0.15)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Deals Button Styles (Orange Gradient)
  dealsIcon: {
    marginRight: 0,
  },
  dealsText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.3,
  },
  // Category Cashback Grid Container
  categoryCashbackGrid: {
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  // Privé teaser
  priveTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 6,
    gap: 6,
  },
  priveTeaserIcon: {
    fontSize: 16,
    color: colors.brand.goldAccent,
  },
  priveTeaserText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.brand.goldAccent,
    letterSpacing: 0.3,
  },
});

export default React.memo(HomeTabSection);
