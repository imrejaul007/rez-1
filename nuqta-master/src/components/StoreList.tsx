import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface Store {
  id: string;
  name: string;
  cashback: number;
  logoText: string;
  gradient: [string, string, ...string[]];
  accentColor: string;
}

const stores: Store[] = [
  {
    id: '1',
    name: 'ZARA',
    cashback: 10,
    logoText: 'ZARA',
    gradient: ['#1F2937', '#111827', '#000000'],
    accentColor: '#8B5CF6',
  },
  {
    id: '2',
    name: 'adidas',
    cashback: 10,
    logoText: 'adidas',
    gradient: ['#1E3A8A', '#1E40AF', '#3B82F6'],
    accentColor: '#3B82F6',
  },
  {
    id: '3',
    name: 'PUMA',
    cashback: 10,
    logoText: 'PUMA',
    gradient: ['#000000', '#1F2937', '#374151'],
    accentColor: '#F59E0B',
  },
  {
    id: '4',
    name: 'VANS',
    cashback: 10,
    logoText: 'VANS',
    gradient: ['#DC2626', '#991B1B', '#7F1D1D'],
    accentColor: '#EF4444',
  },
  {
    id: '5',
    name: 'NIKE',
    cashback: 10,
    logoText: 'NIKE',
    gradient: ['#000000', '#0F172A', '#1E293B'],
    accentColor: '#ffcd57',
  }
];

interface StoreCardProps {
  store: Store;
  index: number;
  onPress: (store: Store) => void;
}

const StoreCard = ({ store, index, onPress }: StoreCardProps) => {
  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);
  const translateY = useSharedValue(0);
  const shimmer = useSharedValue(-100);

  // Entrance animation
  useEffect(() => {
    translateY.value = withDelay(
      index * 100,
      withSpring(0, {
        damping: 12,
        stiffness: 100,
      })
    );

    // Floating animation
    translateY.value = withDelay(
      index * 100 + 500,
      withRepeat(
        withTiming(-5, {
          duration: 2000 + index * 200,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );

    // Shimmer effect
    shimmer.value = withRepeat(
      withTiming(200, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateZ: `${rotateZ.value}deg` },
      { translateY: translateY.value },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, {
      damping: 10,
      stiffness: 400,
    });
    rotateZ.value = withSpring(5, {
      damping: 10,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 10,
      stiffness: 400,
    });
    rotateZ.value = withSpring(0, {
      damping: 10,
      stiffness: 300,
    });
  };

  return (
    <Pressable
      style={styles.storeContainer}
      onPress={() => onPress(store)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
     
    >
      <Animated.View style={[styles.storeWrapper, animatedStyle]}>
        {/* 3D Card Container */}
        <View style={styles.cardContainer}>
          {/* Shimmer overlay */}
          <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>

          {/* Store Logo Circle */}
          <LinearGradient
            colors={store.gradient}
            style={styles.storeCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Inner glow */}
            <View style={styles.innerGlow} />

            <Text style={styles.logoText}>{store.logoText}</Text>
          </LinearGradient>

          {/* Cashback Badge - Outside gradient for better visibility */}
          <View style={[styles.cashbackBadge, { backgroundColor: store.accentColor }]}>
            <Text style={styles.badgeText}>{store.cashback}%</Text>
          </View>
        </View>

        {/* Cashback Label */}
        <View style={styles.labelContainer}>
          <Text style={styles.cashbackLabel}>Cash back</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const StoreList = () => {
  const handleStorePress = (store: Store) => {
    console.log('Store pressed:', store.name);
  };

  const handleViewAllPress = () => {
    console.log('View all stores pressed');
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Store you can't miss</Text>
        <Pressable
          onPress={handleViewAllPress}
          style={styles.viewAllButton}
        >
          <Text style={styles.viewAllText}>View all</Text>
        </Pressable>
      </View>

      {/* Store Grid */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* First Row */}
        <View style={styles.storeRow}>
          {stores.map((store, index) => (
            <StoreCard
              key={`${store.id}-1`}
              store={store}
              index={index}
              onPress={handleStorePress}
            />
          ))}
        </View>

        {/* Second Row */}
        <View style={styles.storeRow}>
          {stores.map((store, index) => (
            <StoreCard
              key={`${store.id}-2`}
              store={store}
              index={index + 5}
              onPress={handleStorePress}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 20,
    
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 20,
    marginVertical: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  scrollContainer: {
    maxHeight: 250,
    overflow: 'visible',
  },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: -5,
    paddingTop: 15,
    marginBottom: 24,
    overflow: 'visible',
  },
  storeContainer: {
    alignItems: 'center',
    overflow: 'visible',
  },
  storeWrapper: {
    alignItems: 'center',
  },
  cardContainer: {
    position: 'relative',
    overflow: 'visible',
    borderRadius: 40,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -100,
    right: 0,
    bottom: 0,
    width: 100,
    zIndex: 10,
  },
  shimmerGradient: {
    flex: 1,
  },
  storeCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },
  innerGlow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoText: {
    fontSize: 11,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    zIndex: 1,
  },
  cashbackBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 15,
    borderWidth: 3,
    borderColor: 'white',
    zIndex: 100,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  labelContainer: {
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  cashbackLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default StoreList;