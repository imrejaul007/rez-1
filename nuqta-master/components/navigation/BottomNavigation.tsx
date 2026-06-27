// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, usePathname } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

// Import the Pay in Store icon (Nuqta animated coin)
const payInStoreIcon = require('@/assets/images/nuqta-coin-animated.gif');
import Svg, { Path } from 'react-native-svg';
import logger from '@/utils/logger';
import { useHomeTab } from '@/contexts/HomeTabContext';
import { useTheme } from '@/hooks/useTheme';
import { colors } from '@/constants/theme';
import { useUserIdentityStore } from '@/stores/userIdentityStore';

// Segment-aware Deals tab config — routes verified users to their exclusive offers page
const SEGMENT_DEALS_TAB: Record<string, { name: string; route: string; icon: string }> = {
  verified_student:    { name: 'Student',  route: '/offers/student',          icon: 'school-outline' },
  verified_employee:   { name: 'My Perks', route: '/offers/corporate',        icon: 'briefcase-outline' },
  verified_healthcare: { name: 'Health',   route: '/offers/zones/healthcare', icon: 'medkit-outline' },
  verified_defence:    { name: 'Defence',  route: '/offers/zones/defence',    icon: 'shield-outline' },
  verified_teacher:    { name: 'Teacher',  route: '/offers/zones/teacher',    icon: 'book-outline' },
  verified_senior:     { name: 'Senior',   route: '/offers/zones/senior',     icon: 'heart-outline' },
  verified_government: { name: 'Gov',      route: '/offers/zones/government', icon: 'business-outline' },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BottomNavigationProps {
  style?: any;
}

// Curved background SVG - creates transparent navbar with semi-circle dip in center
const CurvedBackground = ({ isPrive = false, isDark = false }: { isPrive?: boolean; isDark?: boolean }) => {
  const width = SCREEN_WIDTH;
  const height = 70;
  const scale = width / 375; // Scale based on 375px design

  // SVG path: flat on sides, curves DOWN in center to create semi-circle dip
  const path = `
    M 0 0
    L ${Math.floor(120 * scale)} 0
    C ${Math.floor(140 * scale)} 0 ${Math.floor(150 * scale)} 5 ${Math.floor(160 * scale)} 18
    C ${Math.floor(170 * scale)} 32 ${Math.floor(180 * scale)} 38 ${Math.floor(187.5 * scale)} 38
    C ${Math.floor(195 * scale)} 38 ${Math.floor(205 * scale)} 32 ${Math.floor(215 * scale)} 18
    C ${Math.floor(225 * scale)} 5 ${Math.floor(235 * scale)} 0 ${Math.floor(255 * scale)} 0
    L ${width} 0
    L ${width} ${height}
    L 0 ${height}
    Z
  `.trim();

  // Dark mode / Privé theme fill
  const fillColor = isPrive
    ? 'rgba(31, 41, 55, 0.98)'
    : isDark
      ? 'rgba(30, 30, 30, 0.95)'
      : 'rgba(255, 255, 255, 0.92)';

  return (
    <View style={[curvedBgStyles.container, isPrive && curvedBgStyles.priveContainer]} pointerEvents="none">
      <Svg
        width={width}
        height={height}
        style={{ pointerEvents: 'none' } as any}
      >
        <Path d={path} fill={fillColor} />
      </Svg>
    </View>
  );
};

// Styles for curved background (separate to avoid circular reference)
const curvedBgStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 1, // Lowest z-index - behind everything
    // Shadow to make the curve visible
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 -3px 6px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  priveContainer: {
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.goldAccent,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 -2px 8px rgba(201, 169, 98, 0.15)',
      },
    }),
  },
});

const BottomNavigation: React.FC<BottomNavigationProps> = ({ style }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useTheme();
  const { segment, statedIdentity } = useUserIdentityStore();

  // Get active home tab from context (with fallback for when context is not available)
  let isRezMallActive = false;
  let isCashStoreActive = false;
  let isPriveActive = false;
  try {
    const homeTabContext = useHomeTab();
    isRezMallActive = homeTabContext.isRezMallActive;
    isCashStoreActive = homeTabContext.isCashStoreActive;
    isPriveActive = homeTabContext.isPriveActive;
  } catch {
    // Context not available, use default tabs
    isRezMallActive = false;
    isCashStoreActive = false;
    isPriveActive = false;
  }

  // Hide bottom navigation on auth/onboarding pages and payment sub-flows
  const hidePages = [
    '/sign-in',
    '/onboarding',
    '/index', // Landing page
    '/pay-in-store/store-search',
    '/pay-in-store/enter-amount',
    '/pay-in-store/payment',
    '/pay-in-store/offers',
    '/product-page', // Product detail page has its own sticky bottom bar
    '/MainStorePage', // Main store page has its own sticky bottom bar
    '/picks', // Pick detail page has its own sticky bottom bar
    '/creator/', // Creator profile page
    '/submit-pick', // Pick submission page
    '/creator-dashboard', // Creator dashboard
    '/social/reels', // Full-screen reels experience
    '/social-impact/', // Event detail page has its own sticky bottom bar
    '/support/chat', // Live chat has its own input bar
    '/support/ticket/', // Ticket detail page has its own input bar
    '/support/create-ticket', // Ticket creation form
    '/support/feedback', // Feedback form
    '/support/report-fraud', // Fraud report form
    '/support/call', // Call support page
    '/orders/', // Order detail pages
    '/menu/', // Restaurant menu page has its own cart footer
  ];

  const shouldHide = hidePages.some(page => pathname?.startsWith(page));

  if (shouldHide) {
    return null;
  }

  // Determine which tab is active based on pathname
  const getActiveTab = () => {
    // Handle empty pathname - treat as home
    if (!pathname || pathname === '' || pathname === '/') {
      return 'Home';
    }

    // Normalize pathname for comparison (remove trailing slash)
    const normalizedPath = pathname.replace(/\/$/, '');

    // Cash Store tabs: Home, Wallet, Coins, Profile
    if (isCashStoreActive) {
      // Check for Wallet tab
      if (
        normalizedPath === '/wallet-screen' ||
        normalizedPath === '/wallet' ||
        normalizedPath.startsWith('/wallet/')
      ) {
        return 'Wallet';
      }

      // Check for Coins tab
      if (
        normalizedPath === '/coins' ||
        normalizedPath.startsWith('/coin')
      ) {
        return 'Coins';
      }

      // Check for Profile tab
      if (
        normalizedPath === '/account' ||
        normalizedPath.startsWith('/account/')
      ) {
        return 'Profile';
      }
    }
    // Nuqta Mall tabs: Home, Search, Pay at Store, Offers, Profile
    else if (isRezMallActive) {
      // Check for Search tab - multiple formats (search, categories)
      if (
        normalizedPath === '/categories' ||
        normalizedPath === '/(tabs)/categories' ||
        normalizedPath.startsWith('/categories/') ||
        normalizedPath.startsWith('/(tabs)/categories/') ||
        normalizedPath === '/search' ||
        normalizedPath.startsWith('/search/')
      ) {
        return 'Search';
      }

      // Check for Offers tab - multiple formats
      if (
        normalizedPath === '/mall/offers' ||
        normalizedPath.startsWith('/mall/offers/') ||
        normalizedPath === '/offers' ||
        normalizedPath.startsWith('/offers/') ||
        normalizedPath === '/cash-store/brands' ||
        normalizedPath.startsWith('/cash-store/')
      ) {
        return 'Offers';
      }

      // Check for Profile tab - multiple formats
      if (
        normalizedPath === '/account' ||
        normalizedPath.startsWith('/account/')
      ) {
        return 'Profile';
      }
    } else {
      // Default tabs: Home, Categories, Pay in Store, Play, Earn

      // Categories still accessible but no longer a nav tab — map to Home
      if (
        normalizedPath === '/(tabs)/categories' ||
        normalizedPath.startsWith('/(tabs)/categories/')
      ) {
        return 'Home';
      }

      // Check for Explore tab - multiple formats
      if (
        normalizedPath === '/explore' ||
        normalizedPath === '/(tabs)/explore' ||
        normalizedPath.startsWith('/explore/') ||
        normalizedPath.startsWith('/(tabs)/explore/')
      ) {
        return 'Explore';
      }

      // Check for Save tab
      if (
        normalizedPath === '/saved-offers' ||
        normalizedPath.startsWith('/saved-offers/')
      ) {
        return 'Save';
      }

      // Check for Deals tab — includes segment-specific offer routes
      if (
        normalizedPath === '/deals' ||
        normalizedPath.startsWith('/deals/') ||
        normalizedPath === '/offers/student' ||
        normalizedPath === '/offers/corporate' ||
        normalizedPath.startsWith('/offers/zones/')
      ) {
        return 'Deals';
      }

      // Check for You tab
      if (
        normalizedPath === '/profile' ||
        normalizedPath.startsWith('/profile/') ||
        normalizedPath === '/account' ||
        normalizedPath.startsWith('/account/')
      ) {
        return 'You';
      }
    }

    // Check for Earn tab - Play & Earn and game routes
    if (normalizedPath === '/playandearn' || normalizedPath.startsWith('/playandearn/')) {
      return 'Earn';
    }
    if (normalizedPath.startsWith('/games/') || normalizedPath === '/games' ||
        normalizedPath === '/scratch-card' || normalizedPath === '/coin-hunt') {
      return 'Earn';
    }

    // Check for Home tab - handle multiple formats
    // Home is at /(tabs) or /(tabs)/index, or root /
    // IMPORTANT: Check home last, after other tabs, to avoid conflicts
    if (
      normalizedPath === '/(tabs)' ||
      normalizedPath === '/(tabs)/index' ||
      normalizedPath.startsWith('/(tabs)/index/') ||
      // If pathname includes (tabs) but doesn't match other tabs, it's home
      (normalizedPath.includes('/(tabs)') &&
       !normalizedPath.includes('/explore') &&
       !normalizedPath.includes('/earn') &&
       !normalizedPath.includes('/categories'))
    ) {
      return 'Home';
    }

    // Default: no tab is active on other pages
    return null;
  };

  const activeTab = getActiveTab();

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  // Render a regular tab item
  const renderTab = (tab: { name: string; route: string; icon: string; isActive: boolean; showBadge?: boolean }, index?: number) => {
    // Theme-aware tab colors
    const activeColor = isPriveActive ? colors.brand.goldAccent : isDark ? colors.lightMustard : colors.secondary[600];
    const inactiveColor = isPriveActive ? '#A0A0A0' : isDark ? colors.neutral[500] : colors.neutral[500];

    return (
      <Pressable
        key={tab.name}
        style={isCashStoreActive ? styles.cashStoreTab : styles.tab}
        onPress={() => handleTabPress(tab.route)}

        accessibilityLabel={`${tab.name} tab`}
        accessibilityRole="tab"
        accessibilityState={{ selected: tab.isActive }}
      >
        <View>
          <Ionicons
            name={tab.icon as any}
            size={24}
            color={tab.isActive ? activeColor : inactiveColor}
          />
          {tab.showBadge && (
            <View style={styles.badgeDot} />
          )}
        </View>
        <Text style={[
          styles.tabLabelText,
          { color: tab.isActive ? activeColor : inactiveColor }
        ]}>
          {tab.name}
        </Text>
      </Pressable>
    );
  };

  // =====================================================
  // CASH STORE LAYOUT - 4 tabs, no center floating button
  // =====================================================
  if (isCashStoreActive) {
    const cashStoreTabs = [
      {
        name: 'Home',
        route: '/(tabs)',
        icon: 'home',
        isActive: activeTab === 'Home',
      },
      {
        name: 'Wallet',
        route: '/wallet-screen',
        icon: 'wallet-outline',
        isActive: activeTab === 'Wallet',
      },
      {
        name: 'Coins',
        route: '/coins',
        icon: 'server-outline',
        isActive: activeTab === 'Coins',
      },
      {
        name: 'Profile',
        route: '/account',
        icon: 'person-outline',
        isActive: activeTab === 'Profile',
      },
    ];

    return (
      <View style={[styles.cashStoreContainer, style]}>
        {/* Simple flat background */}
        <View style={[
          styles.cashStoreBackground,
          isDark && { backgroundColor: 'rgba(30, 30, 30, 0.98)', borderTopColor: 'rgba(255, 255, 255, 0.06)' },
        ]} />

        {/* 4 equal tabs */}
        <View style={styles.cashStoreTabBar}>
          {cashStoreTabs.map((tab, index) => renderTab(tab, index))}
        </View>
      </View>
    );
  }

  // =====================================================
  // NUQTA MALL / DEFAULT LAYOUT - 5 tabs with center floating button
  // =====================================================

  // Different tabs based on active home tab
  const tabs = isRezMallActive
    ? [
        // Nuqta Mall tabs: Home, Search, Pay at Store, Offers, Profile
        {
          name: 'Home',
          route: '/(tabs)',
          icon: 'home',
          isActive: activeTab === 'Home',
          isCenter: false,
        },
        {
          name: 'Search',
          route: '/search',
          icon: 'search',
          isActive: activeTab === 'Search',
          isCenter: false,
        },
        {
          name: 'Pay at Store',
          route: '/pay-in-store',
          icon: 'qr-code',
          isActive: false,
          isCenter: true,
        },
        {
          name: 'Offers',
          route: '/cash-store/brands',
          icon: 'pricetag',
          isActive: activeTab === 'Offers',
          isCenter: false,
        },
        {
          name: 'Profile',
          route: '/account',
          icon: 'person',
          isActive: activeTab === 'Profile',
          isCenter: false,
        },
      ]
    : [
        // V2 tabs: Home · Explore · [REZ Pay] · Deals · You
        {
          name: 'Home',
          route: '/(tabs)',
          icon: 'home',
          isActive: activeTab === 'Home',
          isCenter: false,
        },
        {
          name: 'Explore',
          route: '/explore',
          icon: 'compass-outline',
          isActive: activeTab === 'Explore',
          isCenter: false,
        },
        {
          name: 'REZ Pay',
          route: '/pay-in-store',
          icon: 'qr-code',
          isActive: false,
          isCenter: true,
        },
        {
          name: SEGMENT_DEALS_TAB[segment]?.name ?? 'Deals',
          route: SEGMENT_DEALS_TAB[segment]?.route ?? '/deals',
          icon: SEGMENT_DEALS_TAB[segment]?.icon ?? 'flash-outline',
          isActive: activeTab === 'Deals',
          isCenter: false,
        },
        {
          name: 'You',
          route: '/profile',
          icon: 'person-circle-outline',
          isActive: activeTab === 'You',
          isCenter: false,
          showBadge: segment === 'normal' && !!statedIdentity && statedIdentity !== 'general',
        },
      ];

  // Split tabs: left (first 2), center (floating), right (last 2)
  const leftTabs = tabs.filter(t => !t.isCenter).slice(0, 2);
  const rightTabs = tabs.filter(t => !t.isCenter).slice(2);
  const centerTab = tabs.find(t => t.isCenter)!;

  return (
    <View style={[styles.container, style]} pointerEvents="box-none">
      {/* Layer 1: Curved background (dark for Privé) */}
      <CurvedBackground isPrive={isPriveActive} isDark={isDark} />

      {/* Layer 2: Floating center button (above the curve) */}
      <View style={styles.floatingButtonContainer} pointerEvents="box-none">
        <Pressable
          style={styles.floatingButton}
          onPress={() => handleTabPress(centerTab.route)}
         
          accessibilityLabel={`${centerTab.name} tab`}
          accessibilityRole="tab"
        >
          <View style={[
            styles.floatingButtonCircle,
            isPriveActive && styles.floatingButtonCirclePrive,
          ]}>
            <ExpoImage
              source={payInStoreIcon}
              style={styles.payInStoreGif}
              contentFit="cover"
              cachePolicy="memory-disk"
              autoPlay={true}
            />
          </View>
        </Pressable>
        <Text style={[
          styles.floatingButtonLabel,
          isPriveActive && styles.floatingButtonLabelPrive,
          isDark && !isPriveActive && { color: '#9A9A9A' },
        ]}>{centerTab.name}</Text>
      </View>

      {/* Layer 3: Tab bar with left and right tabs */}
      <View style={styles.tabBar}>
        {/* Left tabs */}
        <View style={styles.leftTabs}>
          {leftTabs.map(tab => renderTab(tab))}
        </View>

        {/* Center spacer (for the floating button area) */}
        <View style={styles.centerSpacer} />

        {/* Right tabs */}
        <View style={styles.rightTabs}>
          {rightTabs.map(tab => renderTab(tab))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // =====================================================
  // DEFAULT / NUQTA MALL STYLES (with floating center button)
  // =====================================================

  // Main container - holds everything
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 95, // Taller to accommodate floating button
    zIndex: 1000,
    overflow: 'visible',
  },

  // Floating center button container - positioned above the curve
  floatingButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },

  // The touchable button wrapper
  floatingButton: {
    // No extra styling needed
  },

  // The gradient circle button (kept for reference)
  floatingButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background.primary,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  // White circle container for the coin icon
  floatingButtonCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },

  // Pay in Store icon - fills the circle completely
  payInStoreGif: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  // Label below floating button
  floatingButtonLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },

  // Privé theme - gold border for floating button
  floatingButtonCirclePrive: {
    borderColor: colors.brand.goldAccent,
    backgroundColor: colors.neutral[800],
  },

  // Privé theme - gold label
  floatingButtonLabelPrive: {
    color: colors.brand.goldAccent,
  },

  // Tab bar container
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    zIndex: 50, // Higher than curved background, but below floating button
  },

  // Left tabs section
  leftTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingLeft: 10,
    zIndex: 60,
  },

  // Center spacer for floating button
  centerSpacer: {
    width: 96,
  },

  // Right tabs section
  rightTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingRight: 10,
    zIndex: 60,
  },

  // Individual tab button
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
    minHeight: 48, // Android recommends 48px minimum touch target
  },

  // Tab label text
  tabLabelText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // Orange badge dot for unverified users on You tab
  badgeDot: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
  },

  // =====================================================
  // CASH STORE STYLES (4 equal tabs, no floating button)
  // =====================================================

  // Cash Store container - simpler, no floating button
  cashStoreContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 1000,
  },

  // Cash Store flat background
  cashStoreBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.06)',
      },
    }),
  },

  // Cash Store tab bar - 4 equal tabs
  cashStoreTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    paddingHorizontal: 16,
  },

  // Cash Store individual tab
  cashStoreTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 50,
  },
});

export default React.memo(BottomNavigation);
