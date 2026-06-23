import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  interpolate
} from 'react-native-reanimated';

const SaleBanner = () => {
  const pulseAnimation = useSharedValue(1);
  const floatAnimation = useSharedValue(0);

  useEffect(() => {
    // Pulse animation for the discount badge
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    // Float animation for decorative elements
    floatAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
  }, [pulseAnimation, floatAnimation]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  const floatStyle = useAnimatedStyle(() => {
    const translateY = interpolate(floatAnimation.value, [0, 1], [0, -10]);
    return {
      transform: [{ translateY }],
    };
  });

  return (
    <LinearGradient
      colors={['#F8BBD9', '#E879F9']}
      style={styles.container}
    >
      {/* Floral Pattern Background - Simplified */}
      <View style={styles.floralContainer}>
        <Animated.View style={[styles.floralPattern1, floatStyle]} />
        <Animated.View style={[styles.floralPattern2, floatStyle]} />
        <Animated.View style={[styles.floralPattern3, floatStyle]} />
        <Animated.View style={[styles.floralPattern4, floatStyle]} />
      </View>

      {/* Sale Content */}
      <View style={styles.content}>
        <Text style={styles.saleTitle}>Wedding Glam in a Flash</Text>
        <Text style={styles.saleSubtitle}>sale</Text>
        
        {/* Discount Badge */}
        <View style={styles.discountContainer}>
          <Animated.View style={[styles.discountBadge, pulseStyle]}>
            <Text style={styles.uptoText}>UPTO</Text>
            <Text style={styles.discountText}>50%</Text>
            <Text style={styles.offText}>OFF</Text>
          </Animated.View>
        </View>
      </View>

      {/* Decorative Elements */}
      <View style={styles.decorativeElements}>
        {/* Left side decoration */}
        <View style={styles.leftDecoration}>
          <View style={styles.decorativeDot} />
          <View style={[styles.decorativeDot, { marginTop: 10, marginLeft: 15 }]} />
        </View>
        
        {/* Right side decoration */}
        <View style={styles.rightDecoration}>
          <View style={styles.decorativeDot} />
          <View style={[styles.decorativeDot, { marginTop: 15, marginRight: 20 }]} />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 180,
    width: '100%',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  floralContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floralPattern1: {
    position: 'absolute',
    top: 30,
    left: 40,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  floralPattern2: {
    position: 'absolute',
    top: 20,
    right: 50,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  floralPattern3: {
    position: 'absolute',
    bottom: 40,
    left: 60,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  floralPattern4: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  saleTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: 'white',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 1,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  saleSubtitle: {
    fontSize: 28,
    fontWeight: '300',
    color: 'white',
    fontStyle: 'italic',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  discountContainer: {
    alignItems: 'center',
  },
  discountBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  uptoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  discountText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B21A8',
    lineHeight: 32,
    letterSpacing: -1,
  },
  offText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  leftDecoration: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  rightDecoration: {
    position: 'absolute',
    top: 30,
    right: 20,
  },
  decorativeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});

export default SaleBanner;