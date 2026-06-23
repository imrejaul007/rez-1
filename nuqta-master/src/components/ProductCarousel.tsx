// @ts-nocheck
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
  withSpring,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const SPACING = 16;

interface Product {
  id: string;
  brand: string;
  title: string;
  subtitle: string;
  image: string;
  cashback: number;
}

const products: Product[] = [
  {
    id: '1',
    brand: 'Zara',
    title: 'Power',
    subtitle: 'Your Rules',
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=400&fit=crop',
    cashback: 10,
  },
  {
    id: '2',
    brand: 'Zara',
    title: 'Elegance',
    subtitle: 'Redefined',
    image:
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300&h=400&fit=crop',
    cashback: 12,
  },
  {
    id: '3',
    brand: 'Zara',
    title: 'Style',
    subtitle: 'Statement',
    image:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=300&h=400&fit=crop',
    cashback: 15,
  },
];

interface ProductCardProps {
  product: Product;
  index: number;
  scrollX: Animated.SharedValue<number>;
}

const ProductCard = ({ product, index, scrollX }: ProductCardProps) => {
  const inputRange = [
    (index - 1) * CARD_WIDTH,
    index * CARD_WIDTH,
    (index + 1) * CARD_WIDTH,
  ];

  // 3D Carousel Animation Styles
  const animatedStyle = useAnimatedStyle(() => {
    // Scale: Center card is larger (1.0), side cards are smaller (0.85)
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.85, 1.0, 0.85],
      Extrapolate.CLAMP
    );

    // Opacity: Center card is opaque, side cards fade
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolate.CLAMP
    );

    // 3D Perspective Rotation
    const rotateY = interpolate(
      scrollX.value,
      inputRange,
      [15, 0, -15], // Rotate side cards for 3D effect
      Extrapolate.CLAMP
    );

    // Translate for depth effect
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [20, 0, 20], // Center card pops up
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { perspective: 1000 },
        { scale },
        { rotateY: `${rotateY}deg` },
        { translateY },
      ],
      opacity,
    };
  });

  // Enhanced shadow for center card
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

    const elevation = interpolate(
      scrollX.value,
      inputRange,
      [5, 15, 5],
      Extrapolate.CLAMP
    );

    return {
      shadowOpacity,
      shadowRadius,
      elevation,
    };
  });

  const CardWrapper = Platform.OS === 'web' ? Pressable : Pressable;

  return (
    <CardWrapper
      key={product.id}
      style={{ width: CARD_WIDTH }}
     
    >
      <Animated.View style={[styles.productCard, animatedStyle, shadowStyle]}>
        <ImageBackground
          source={{ uri: product.image }}
          style={styles.productImage}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
            style={styles.overlay}
          >
            <Text style={styles.brandText}>{product.brand}</Text>

            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>CASHBACK {product.cashback}%</Text>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>{product.title}</Text>
              <Text style={styles.subtitle}>{product.subtitle}</Text>
            </View>

            <Pressable style={styles.bottomButton}>
              <Text style={styles.cashbackInfo}>
                Cashback upto {product.cashback} %
              </Text>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          </LinearGradient>
        </ImageBackground>
      </Animated.View>
    </CardWrapper>
  );
};

const ProductCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    scrollX.value = scrollPosition;
    const index = Math.round(scrollPosition / CARD_WIDTH);
    setActiveIndex(index);
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {products.map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: activeIndex === index ? '#8B5CF6' : '#E5E7EB',
              width: activeIndex === index ? 24 : 8,
              transform: [{ scale: activeIndex === index ? 1 : 0.8 }],
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            scrollX={scrollX}
          />
        ))}
      </ScrollView>
      {renderDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 30, // More padding for 3D effect
  },
  scrollContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    paddingVertical: 20, // Prevent clipping
  },
  productCard: {
    height: 320,
    marginHorizontal: 8,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, // Will be animated
    shadowRadius: 12, // Will be animated
    elevation: 8, // Will be animated
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
    color: '#fff',
  },
  ribbon: {
    position: 'absolute',
    top: 16,
    right: -40,
    backgroundColor: '#8B5CF6',
    paddingVertical: 4,
    paddingHorizontal: 40,
    transform: [{ rotate: '45deg' }],
  },
  ribbonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  textContainer: {
    marginBottom: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  bottomButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cashbackInfo: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
  },
  arrow: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s ease',
  },
});

export default ProductCarousel;
