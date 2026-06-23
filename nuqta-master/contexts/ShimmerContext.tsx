import React, { createContext, useContext, useRef, useEffect } from 'react';
import { Animated } from 'react-native';

const ShimmerContext = createContext<Animated.Value | null>(null);

export function ShimmerProvider({ children }: { children: React.ReactNode }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  return <ShimmerContext.Provider value={shimmerAnim}>{children}</ShimmerContext.Provider>;
}

export function useShimmer(): Animated.Value {
  const ctx = useContext(ShimmerContext);
  // Fallback for components rendered outside provider
  const fallback = useRef(new Animated.Value(0)).current;
  return ctx ?? fallback;
}
