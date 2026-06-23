import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { FashionCategory } from "@/hooks/useFashionData";

// Card dimensions - circular design
const CARD_SIZE = 70;
const CARD_SPACING = 16;
const CARD_TOTAL_WIDTH = CARD_SIZE + CARD_SPACING;

interface CategoryCardProps {
  category: FashionCategory;
  index: number;
  activeIndex: number;
  onPress: (category: FashionCategory) => void;
  totalOriginal: number;
  isSelected?: boolean; // Whether this is the currently selected subcategory
}

const CategoryCard = ({ category, index, activeIndex, onPress, totalOriginal, scrollOffset, layoutWidth, isSelected }: CategoryCardProps & { scrollOffset: number; layoutWidth: number }) => {
  // Calculate this card's position relative to the center of the viewport
  const cardCenterX = (index * CARD_TOTAL_WIDTH) + (CARD_SIZE / 2);
  const viewportCenterX = scrollOffset + (layoutWidth / 2);
  const distanceFromCenter = Math.abs(cardCenterX - viewportCenterX);

  // Normalize distance (0 = center, 1 = far)
  const maxDistance = layoutWidth / 2;
  const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1);

  // Get category style (icon and colors)
  const getCategoryStyle = (category: FashionCategory) => {
    if (category.icon) {
      const metadataColor = category.metadata?.color || '#ffcd57';
      return {
        icon: category.icon as any,
        gradientColors: [metadataColor, adjustColor(metadataColor, -20)] as [string, string],
        iconColor: '#FFFFFF',
      };
    }

    const lowerName = category.name.toLowerCase();

    if (lowerName.includes('men') && !lowerName.includes('women')) {
      return { icon: 'shirt-outline' as const, gradientColors: ['#4E65FF', '#3B4FCC'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('women')) {
      return { icon: 'rose-outline' as const, gradientColors: ['#FF6B9D', '#E54B7D'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('kid') || lowerName.includes('child')) {
      return { icon: 'happy-outline' as const, gradientColors: ['#FFA800', '#E69500'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('foot') || lowerName.includes('shoe')) {
      return { icon: 'footsteps-outline' as const, gradientColors: ['#A770EF', '#8B5CF6'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('access') || lowerName.includes('watch') || lowerName.includes('bag')) {
      return { icon: 'watch-outline' as const, gradientColors: ['#FFA800', '#E69500'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('sale') || lowerName.includes('offer') || lowerName.includes('discount')) {
      return { icon: 'pricetag-outline' as const, gradientColors: ['#FF6B6B', '#E54545'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('gift') || lowerName.includes('present')) {
      return { icon: 'gift-outline' as const, gradientColors: ['#EC4899', '#D63384'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('fruit')) {
      return { icon: 'nutrition-outline' as const, gradientColors: ['#F59E0B', '#D97706'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('grocery')) {
      return { icon: 'basket-outline' as const, gradientColors: ['#ffcd57', '#1a3a52'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('meat') || lowerName.includes('chicken') || lowerName.includes('mutton')) {
      return { icon: 'restaurant-outline' as const, gradientColors: ['#EF4444', '#DC2626'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('restaurant') || lowerName.includes('food') || lowerName.includes('dining')) {
      return { icon: 'restaurant-outline' as const, gradientColors: ['#ffcd57', '#1a3a52'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('electronic') || lowerName.includes('gadget') || lowerName.includes('tech')) {
      return { icon: 'phone-portrait-outline' as const, gradientColors: ['#3B82F6', '#2563EB'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('organic')) {
      return { icon: 'leaf-outline' as const, gradientColors: ['#ffcd57', '#1a3a52'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('medicine') || lowerName.includes('pharmacy') || lowerName.includes('health')) {
      return { icon: 'medical-outline' as const, gradientColors: ['#EF4444', '#DC2626'] as [string, string], iconColor: '#FFFFFF' };
    }
    if (lowerName.includes('fleet') || lowerName.includes('car') || lowerName.includes('vehicle')) {
      return { icon: 'car-outline' as const, gradientColors: ['#6366F1', '#4F46E5'] as [string, string], iconColor: '#FFFFFF' };
    }

    return { icon: 'grid-outline' as const, gradientColors: ['#8B5CF6', '#7C3AED'] as [string, string], iconColor: '#FFFFFF' };
  };

  const categoryStyle = getCategoryStyle(category);

  // Calculate visual styles based on distance from center (smooth interpolation)
  // Scale: 1.2 at center, 0.8 at edges (more prominent center item)
  const scale = 1.2 - (normalizedDistance * 0.4);
  // Opacity: 1 at center, 0.5 at edges
  const opacity = 1 - (normalizedDistance * 0.5);
  // TranslateY: -8 at center, 8 at edges (more pop for center)
  const translateY = -8 + (normalizedDistance * 16);

  // Check if this item is at the center (selected)
  const isCentered = normalizedDistance < 0.15;

  return (
    <Pressable
      onPress={() => onPress(category)}
     
      style={styles.cardTouchable}
    >
      <View
        style={[
          styles.categoryCard,
          {
            transform: [{ scale }, { translateY }],
            opacity,
            shadowOpacity: isCentered ? 0.5 : 0.4 - (normalizedDistance * 0.3),
            elevation: isCentered ? 16 : 12 - (normalizedDistance * 8),
          }
        ]}
      >
        <LinearGradient
          colors={categoryStyle.gradientColors}
          style={[
            styles.circleGradient,
            isCentered && styles.circleGradientSelected,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.circleHighlight} />
          <Ionicons
            name={categoryStyle.icon}
            size={isCentered ? 32 : 28}
            color={categoryStyle.iconColor}
          />
        </LinearGradient>
        {/* Selection indicator ring */}
        {isCentered && (
          <View style={[styles.selectionRing, { borderColor: categoryStyle.gradientColors[0] }]} />
        )}
      </View>

      <Text style={[styles.categoryName, { opacity, fontWeight: isCentered ? '700' : '600' }]} numberOfLines={1}>
        {category.name}
      </Text>
    </Pressable>
  );
};

// Helper function to adjust color brightness
const adjustColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
};

interface ProductionCategorySliderProps {
  categories: FashionCategory[];
  isLoading: boolean;
  selectedSlug?: string; // Currently selected subcategory slug
  onSelect?: (category: FashionCategory) => void; // Callback when subcategory is selected (no navigation)
}

// Inject CSS for hiding scrollbar on web
const injectWebStyles = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const styleId = 'category-slider-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .category-slider-scroll::-webkit-scrollbar {
          display: none !important;
        }
        .category-slider-scroll {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }
};

const ProductionCategorySlider = ({ categories, isLoading, selectedSlug, onSelect }: ProductionCategorySliderProps) => {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(400); // Default width
  const isRepositioning = useRef(false);
  const hasInitializedSelection = useRef(false);

  // Get display categories (max 8)
  const originalCategories = categories.slice(0, 8);
  const totalOriginal = originalCategories.length;

  // Create infinite loop: duplicate items 3x for seamless scrolling
  // [copy of items] + [original items] + [copy of items]
  const infiniteCategories = totalOriginal > 0
    ? [...originalCategories, ...originalCategories, ...originalCategories]
    : [];

  // The middle set starts at index = totalOriginal
  const middleSetStart = totalOriginal * CARD_TOTAL_WIDTH;
  const oneSetWidth = totalOriginal * CARD_TOTAL_WIDTH;

  // Inject CSS on mount for web
  useEffect(() => {
    injectWebStyles();
  }, []);

  // Initialize scroll position to middle set and select middle item
  useEffect(() => {
    if (totalOriginal > 0 && scrollViewRef.current) {
      setTimeout(() => {
        // Calculate the scroll position to center the middle item
        const middleItemIndex = Math.floor(totalOriginal / 2);
        const initialScrollX = middleSetStart + (middleItemIndex * CARD_TOTAL_WIDTH) - (layoutWidth / 2) + (CARD_SIZE / 2);
        scrollViewRef.current?.scrollTo({ x: initialScrollX, animated: false });
        setScrollOffset(initialScrollX);
        setActiveIndex(middleItemIndex);

        // Trigger initial selection callback for middle item
        if (onSelect && originalCategories[middleItemIndex] && !hasInitializedSelection.current) {
          hasInitializedSelection.current = true;
          onSelect(originalCategories[middleItemIndex]);
        }
      }, 100);
    }
  }, [totalOriginal, middleSetStart, layoutWidth]);

  // Trigger onSelect when active index changes (user scrolls to new center item)
  useEffect(() => {
    if (onSelect && originalCategories[activeIndex] && hasInitializedSelection.current) {
      onSelect(originalCategories[activeIndex]);
    }
  }, [activeIndex]);

  const handleCategoryPress = (category: FashionCategory) => {
    // If onSelect callback is provided, use it (no navigation)
    if (onSelect) {
      onSelect(category);
    } else {
      // Fallback to navigation if no callback provided
      router.push(`/category/${category.slug || category._id}` as any);
    }
  };

  // Handle scroll with infinite loop repositioning
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isRepositioning.current) return;

    const scrollX = event.nativeEvent.contentOffset.x;
    const currentLayoutWidth = event.nativeEvent.layoutMeasurement.width;

    // Update scroll state for card animations
    setScrollOffset(scrollX);
    setLayoutWidth(currentLayoutWidth);

    // Calculate the center of the visible area
    const centerX = scrollX + (currentLayoutWidth / 2);

    // Find which item index is at the center
    const centerIndex = Math.round(centerX / CARD_TOTAL_WIDTH);

    // Normalize to 0 to totalOriginal-1
    const normalizedIndex = ((centerIndex % totalOriginal) + totalOriginal) % totalOriginal;
    setActiveIndex(normalizedIndex);

    // Reposition immediately when approaching boundaries (before duplicates are visible)
    // Left boundary: when we're about to see the first set
    const leftBoundary = middleSetStart - CARD_TOTAL_WIDTH;
    // Right boundary: when we're about to see the third set
    const rightBoundary = middleSetStart + oneSetWidth - CARD_TOTAL_WIDTH;

    if (scrollX <= leftBoundary) {
      // Scrolled to left edge - jump forward to same position in middle set
      isRepositioning.current = true;
      const newX = scrollX + oneSetWidth;
      scrollViewRef.current?.scrollTo({ x: newX, animated: false });
      setTimeout(() => { isRepositioning.current = false; }, 20);
    } else if (scrollX >= rightBoundary) {
      // Scrolled to right edge - jump back to same position in middle set
      isRepositioning.current = true;
      const newX = scrollX - oneSetWidth;
      scrollViewRef.current?.scrollTo({ x: newX, animated: false });
      setTimeout(() => { isRepositioning.current = false; }, 20);
    }
  }, [totalOriginal, middleSetStart, oneSetWidth]);

  // Loading state
  if (isLoading && categories.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#ffcd57" />
        </View>
      </View>
    );
  }

  // Empty state
  if (categories.length === 0) {
    return null;
  }

  // Render dot indicators (for original items only)
  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {originalCategories.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: activeIndex === index ? '#ffcd57' : '#E5E7EB',
              width: activeIndex === index ? 16 : 6,
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Browse Categories</Text>
        <View style={styles.sectionDivider} />
      </View>

      <View style={styles.scrollWrapper}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={CARD_TOTAL_WIDTH}
          snapToAlignment="center"
          // @ts-ignore - web specific props
          className={Platform.OS === 'web' ? 'category-slider-scroll' : undefined}
        >
          {infiniteCategories.map((category, index) => (
            <CategoryCard
              key={`${category._id}-${index}`}
              category={category}
              index={index}
              activeIndex={activeIndex}
              onPress={handleCategoryPress}
              totalOriginal={totalOriginal}
              scrollOffset={scrollOffset}
              layoutWidth={layoutWidth}
            />
          ))}
        </ScrollView>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: 0.3,
  },
  sectionDivider: {
    width: 40,
    height: 3,
    backgroundColor: '#ffcd57',
    borderRadius: 2,
    marginTop: 6,
  },
  scrollWrapper: {
    overflow: 'visible',
  },
  scrollContent: {
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
  cardTouchable: {
    alignItems: 'center',
    marginRight: CARD_SPACING,
    width: CARD_SIZE,
  },
  categoryCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_SIZE / 2,
    shadowColor: '#ffcd57',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  circleGradient: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  circleGradientSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  selectionRing: {
    position: 'absolute',
    width: CARD_SIZE + 10,
    height: CARD_SIZE + 10,
    borderRadius: (CARD_SIZE + 10) / 2,
    borderWidth: 2,
    borderColor: '#ffcd57',
    top: -5,
    left: -5,
  },
  circleHighlight: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 20,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
    width: CARD_SIZE + 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProductionCategorySlider;
