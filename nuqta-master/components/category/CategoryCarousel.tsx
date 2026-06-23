// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { CategoryCarouselItem } from '@/types/category.types';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

interface CategoryCarouselProps {
  items: CategoryCarouselItem[];
  onItemPress?: (item: CategoryCarouselItem) => void;
  title?: string;
}

// Separate component for carousel card to use hooks properly
interface CarouselCardProps {
  item: CategoryCarouselItem;
  index: number;
  scrollX: Animated.SharedValue<number>;
  onPress: (item: CategoryCarouselItem) => void;
}

const CarouselCard: React.FC<CarouselCardProps> = ({ item, index, scrollX, onPress }) => {
  const inputRange = [
    (index - 1) * CARD_WIDTH,
    index * CARD_WIDTH,
    (index + 1) * CARD_WIDTH,
  ];

  // Safely extract cashback value (can be number or object with percentage)
  const getCashbackValue = () => {
    if (typeof item.cashback === 'number') {
      return item.cashback;
    }
    if (typeof item.cashback === 'object' && item.cashback !== null) {
      return item.cashback.percentage || 0;
    }
    return 0;
  };

  const cashbackValue = getCashbackValue();

  const animatedStyle = useAnimatedStyle(() => {
    // Scale based on scroll position
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.85, 1.0, 0.85],
      Extrapolate.CLAMP
    );

    // 3D rotation based on scroll position
    const rotateY = interpolate(
      scrollX.value,
      inputRange,
      [15, 0, -15],
      Extrapolate.CLAMP
    );

    // Opacity based on scroll position
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { perspective: 1000 },
        { scale },
        { rotateY: `${rotateY}deg` },
      ],
      opacity,
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      scrollX.value,
      inputRange,
      [0.1, 0.3, 0.1],
      Extrapolate.CLAMP
    );

    const shadowRadius = interpolate(
      scrollX.value,
      inputRange,
      [8, 20, 8],
      Extrapolate.CLAMP
    );

    return {
      shadowOpacity,
      shadowRadius,
      elevation: interpolate(
        scrollX.value,
        inputRange,
        [5, 15, 5],
        Extrapolate.CLAMP
      ),
    };
  });

  const CardWrapper = Platform.OS === 'web' ? Pressable : Pressable;

  return (
    <CardWrapper
      style={{ width: CARD_WIDTH }}
     
      onPress={() => onPress(item)}
    >
      <Animated.View style={[styles.productCard, animatedStyle, shadowStyle]}>
        <ImageBackground
          source={{ uri: item.image || 'https://via.placeholder.com/300x200?text=No+Image' }}
          style={styles.productImage}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
            style={styles.overlay}
          >
            <Text style={styles.brandText}>{item.brand || 'Brand'}</Text>

            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>CASHBACK {cashbackValue}%</Text>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>{item.title || 'Title'}</Text>
              <Text style={styles.subtitle}>{item.subtitle || 'Subtitle'}</Text>
            </View>

            <Pressable 
              style={styles.bottomButton} 
             
              onPress={() => onPress(item)}
            >
              <Text style={styles.cashbackInfo}>
                Cashback upto {cashbackValue}%
              </Text>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          </LinearGradient>
        </ImageBackground>
      </Animated.View>
    </CardWrapper>
  );
};

const CategoryCarousel: React.FC<CategoryCarouselProps> = ({ 
  items, 
  onItemPress, 
  title = "Featured" 
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const index = Math.round(event.contentOffset.x / CARD_WIDTH);
      runOnJS(setActiveIndex)(index);
    },
  });

  const handleItemPress = (item: CategoryCarouselItem) => {
    if (onItemPress) {
      onItemPress(item);
    }
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {items.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: activeIndex === index ? colors.lightMustard : colors.neutral[200],
              width: activeIndex === index ? 20 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.headerContainer}>
          <Text style={styles.sectionTitle}>{title || 'Section Title'}</Text>
        </View>
      )}
      <AnimatedScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {items.map((item, index) => (
          <CarouselCard
            key={item.id}
            item={item}
            index={index}
            scrollX={scrollX}
            onPress={handleItemPress}
          />
        ))}
      </AnimatedScrollView>
      {renderDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 12,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.1)',
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  scrollContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
  },
  productCard: {
    height: 320,
    marginHorizontal: 8,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.background.primary,
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  productImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderRadius: 16,
  },
  overlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  brandText: {
    position: 'absolute',
    top: 16,
    left: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  ribbon: {
    position: 'absolute',
    top: 16,
    right: -40,
    backgroundColor: colors.lightMustard,
    paddingVertical: 4,
    paddingHorizontal: 40,
    transform: [{ rotate: '45deg' }],
  },
  ribbonText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  textContainer: {
    marginBottom: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.background.primary,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.background.primary,
    opacity: 0.8,
    marginTop: 2,
  },
  bottomButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 205, 87, 0.25)',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cashbackInfo: {
    flex: 1,
    fontSize: 14,
    color: colors.background.primary,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 18,
    color: colors.background.primary,
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default React.memo(CategoryCarousel);
