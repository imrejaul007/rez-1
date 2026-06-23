// @ts-nocheck
/**
 * CategoryTabBar Component
 * Compact glassy horizontal scrollable category tabs with images
 */

import React, { useRef, useEffect, useLayoutEffect, memo, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Text,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, usePathname } from 'expo-router';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { colors } from '@/constants/theme';

// Module-level variable to persist scroll position across re-renders
let persistedScrollPosition = 0;

// Nuqta Brand Colors
const COLORS = {
  primary: colors.lightMustard,
  primaryLight: 'rgba(255, 205, 87, 0.1)',
  deepTeal: colors.nileBlue,
  slate: '#1F2D3D',
  coolGray: colors.gray[400],
  mutedGray: '#8E99A4',
  white: colors.background.primary,
};

// Category images - using local assets (cached at module level to prevent reloading)
const CATEGORY_IMAGES = {
  dining: require('../../assets/category-icons/FOOD-DINING/Family-restaurants.png'),
  events: require('../../assets/category-icons/ENTERTAINMENT/Live-events.png'),
  stores: require('../../assets/images/stores/shopping-bags.png'),
  grocery: require('../../assets/category-icons/GROCERY-ESSENTIALS/Supermarkets.png'),
  beauty: require('../../assets/category-icons/BEAUTY-WELLNESS/Beauty-services.png'),
  health: require('../../assets/category-icons/HEALTHCARE/Pharmacy.png'),
  fashion: require('../../assets/category-icons/Shopping/Fashion.png'),
  fitness: require('../../assets/category-icons/FITNESS-SPORTS/Gyms.png'),
  education: require('../../assets/category-icons/EDUCATION-LEARNING/Coaching-center.png'),
  travel: require('../../assets/category-icons/TRAVEL-EXPERIENCES/Hotels.png'),
};

// Category data - connected to MainCategory pages (cached at module level)
const CATEGORIES = [
  { id: 'dining', label: 'Dining', image: CATEGORY_IMAGES.dining, route: '/MainCategory/food-dining' },
  { id: 'events', label: 'Events', image: CATEGORY_IMAGES.events, route: '/events' },
  { id: 'stores', label: 'Stores', image: CATEGORY_IMAGES.stores, route: '/StoreListPage' },
  { id: 'grocery', label: 'Grocery', image: CATEGORY_IMAGES.grocery, route: '/MainCategory/grocery-essentials' },
  { id: 'beauty', label: 'Beauty', image: CATEGORY_IMAGES.beauty, route: '/MainCategory/beauty-wellness' },
  { id: 'health', label: 'Health', image: CATEGORY_IMAGES.health, route: '/MainCategory/healthcare' },
  { id: 'fashion', label: 'Fashion', image: CATEGORY_IMAGES.fashion, route: '/MainCategory/fashion' },
  { id: 'fitness', label: 'Fitness', image: CATEGORY_IMAGES.fitness, route: '/MainCategory/fitness-sports' },
  { id: 'education', label: 'Education', image: CATEGORY_IMAGES.education, route: '/MainCategory/education-learning' },
  { id: 'travel', label: 'Travel', image: CATEGORY_IMAGES.travel, route: '/MainCategory/travel-experiences' },
] as const;

interface CategoryTabBarProps {
  selectedCategory?: string;
  onCategorySelect?: (categoryId: string) => void;
  isSticky?: boolean;
  style?: any;
  activeThemeColor?: string; // Dynamic theme color for active icons
}

// Memoized category tab item for web to prevent image flickering
interface WebCategoryTabItemProps {
  category: typeof CATEGORIES[0];
  isActive: boolean;
  onPress: (category: typeof CATEGORIES[0]) => void;
  themeColor: string;
}

const WebCategoryTabItem = memo<WebCategoryTabItemProps>(({ category, isActive, onPress, themeColor }) => {
  const handlePress = useCallback(() => {
    onPress(category);
  }, [category, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={webStyles.tabButton}
     
    >
      {/* Image Container */}
      <View style={[
        webStyles.imageContainer,
        isActive && [webStyles.imageContainerActive, { backgroundColor: themeColor, shadowColor: themeColor }]
      ]}>
        <CachedImage
          source={category.image}
          style={webStyles.categoryImage}
          contentFit="contain"
          transition={0}
          // @ts-ignore - web-specific props for caching
          loading="eager"
          decoding="sync"
        />
      </View>

      {/* Label */}
      <Text style={[
        webStyles.label,
        isActive && [webStyles.labelActive, { color: themeColor }]
      ]}>
        {category.label.toUpperCase()}
      </Text>
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Only re-render if isActive or themeColor changes
  return prevProps.isActive === nextProps.isActive &&
         prevProps.category.id === nextProps.category.id &&
         prevProps.themeColor === nextProps.themeColor;
});

// Web component with glassy effect - using React Native components for proper image handling
const WebCategoryTabBar: React.FC<CategoryTabBarProps> = memo(({ style, activeThemeColor }) => {
  const router = useRouter();
  const pathname = usePathname();
  const scrollViewRef = useRef<ScrollView>(null);
  const themeColor = activeThemeColor || COLORS.primary;

  // Memoize active category to prevent unnecessary recalculations
  const activeCategory = useMemo(() => {
    for (const category of CATEGORIES) {
      if (pathname === category.route || pathname.startsWith(category.route)) {
        return category.id;
      }
    }
    return null; // No active category on homepage
  }, [pathname]);

  // Restore scroll position when component mounts
  useLayoutEffect(() => {
    if (scrollViewRef.current && persistedScrollPosition > 0) {
      scrollViewRef.current.scrollTo({ x: persistedScrollPosition, animated: false });
    }
  });

  // Track scroll position - memoized to prevent recreation
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    persistedScrollPosition = event.nativeEvent.contentOffset.x;
  }, []);

  // Memoize the click handler to prevent recreation
  const handleCategoryClick = useCallback((category: typeof CATEGORIES[0]) => {
    if (category.route) {
      router.push(category.route as any);
    }
  }, [router]);

  return (
    <View style={[webStyles.container, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={webStyles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {CATEGORIES.map((category) => (
          <WebCategoryTabItem
            key={category.id}
            category={category}
            isActive={activeCategory === category.id}
            onPress={handleCategoryClick}
            themeColor={themeColor}
          />
        ))}
      </ScrollView>
    </View>
  );
});

// Web-specific styles
const webStyles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 2,
  },
  tabButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 62,
  },
  imageContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 4,
    overflow: 'hidden',
  },
  imageContainerActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  categoryImage: {
    width: 36,
    height: 36,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.slate,
    letterSpacing: 0.3,
  },
  labelActive: {
    fontWeight: '600',
    color: COLORS.primary,
  },
});

// Memoized category tab item for native to prevent image flickering
interface NativeCategoryTabItemProps {
  category: typeof CATEGORIES[0];
  isActive: boolean;
  onPress: (category: typeof CATEGORIES[0]) => void;
  themeColor: string;
}

const NativeCategoryTabItem = memo<NativeCategoryTabItemProps>(({ category, isActive, onPress, themeColor }) => {
  const handlePress = useCallback(() => {
    onPress(category);
  }, [category, onPress]);

  return (
    <Pressable
      style={styles.tabItem}
      onPress={handlePress}
     
    >
      <View style={[
        styles.imageContainer,
        isActive && [styles.imageContainerActive, { backgroundColor: themeColor, shadowColor: themeColor }]
      ]}>
        <CachedImage
          source={category.image}
          style={styles.categoryImage}
          contentFit="contain"
          transition={0}
        />
      </View>
      <Text style={[
        styles.tabLabel,
        isActive && [styles.tabLabelActive, { color: themeColor }]
      ]}>
        {category.label.toUpperCase()}
      </Text>
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Only re-render if isActive or themeColor changes
  return prevProps.isActive === nextProps.isActive &&
         prevProps.category.id === nextProps.category.id &&
         prevProps.themeColor === nextProps.themeColor;
});

// Native component
const NativeCategoryTabBar: React.FC<CategoryTabBarProps> = memo(({ style, isSticky, activeThemeColor }) => {
  const router = useRouter();
  const pathname = usePathname();
  const scrollViewRef = useRef<ScrollView>(null);
  const themeColor = activeThemeColor || COLORS.primary;

  // Memoize active category to prevent unnecessary recalculations
  const activeCategory = useMemo(() => {
    for (const category of CATEGORIES) {
      if (pathname === category.route || pathname.startsWith(category.route)) {
        return category.id;
      }
    }
    return null; // No active category on homepage
  }, [pathname]);

  // Restore scroll position when component mounts
  useLayoutEffect(() => {
    if (scrollViewRef.current && persistedScrollPosition > 0) {
      scrollViewRef.current.scrollTo({ x: persistedScrollPosition, animated: false });
    }
  });

  // Track scroll position - memoized to prevent recreation
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    persistedScrollPosition = event.nativeEvent.contentOffset.x;
  }, []);

  // Memoize the press handler to prevent recreation
  const handleCategoryPress = useCallback((category: typeof CATEGORIES[0]) => {
    if (category.route) {
      router.push(category.route as any);
    }
  }, [router]);

  const content = (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {CATEGORIES.map((category) => (
        <NativeCategoryTabItem
          key={category.id}
          category={category}
          isActive={activeCategory === category.id}
          onPress={handleCategoryPress}
          themeColor={themeColor}
        />
      ))}
    </ScrollView>
  );

  if (isSticky && Platform.OS !== 'web') {
    return (
      <BlurView intensity={95} tint="light" style={[styles.container, style]}>
        {content}
      </BlurView>
    );
  }

  return <View style={[styles.container, style]}>{content}</View>;
});

const CategoryTabBar: React.FC<CategoryTabBarProps> = memo((props) => {
  if (Platform.OS === 'web') {
    return <WebCategoryTabBar {...props} />;
  }
  return <NativeCategoryTabBar {...props} />;
}, (prevProps, nextProps) => {
  // Only re-render if selectedCategory or style actually changes
  return prevProps.selectedCategory === nextProps.selectedCategory &&
         prevProps.isSticky === nextProps.isSticky;
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 1,
  },
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 62,
  },
  imageContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 4,
    overflow: 'hidden',
  },
  imageContainerActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryImage: {
    width: 36,
    height: 36,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.slate,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export { CategoryTabBar };
export default CategoryTabBar;
