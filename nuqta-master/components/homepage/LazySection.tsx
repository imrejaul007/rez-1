/**
 * Lazy Section Component
 *
 * Loads section content only when visible in the viewport.
 * - Web: IntersectionObserver
 * - Native: onLayout + scrollY comparison
 *
 * Performance: Each section registers a scroll listener that self-removes
 * once visible (sections are keepMounted by default, so they never need
 * to re-check). This keeps active listeners to a minimum during scroll.
 */

import React, { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, Dimensions, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedReaction, useAnimatedStyle, withTiming, runOnJS, SharedValue } from 'react-native-reanimated';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LazySectionProps {
  sectionId: string;
  renderSection: () => ReactNode;
  height?: number;
  threshold?: number;
  rootMargin?: number;
  onVisible?: () => void;
  unloadWhenOffscreen?: boolean;
  keepMounted?: boolean;
  style?: ViewStyle;
  placeholder?: ReactNode;
  /** Parent ScrollView's scroll position (SharedValue) - required for native viewport detection */
  scrollY?: SharedValue<number>;
}

/**
 * Web implementation using IntersectionObserver
 */
function useLazySectionWeb(
  ref: React.RefObject<View>,
  threshold: number,
  rootMargin: number,
  onVisible?: () => void,
): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const element = ref.current as any;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (onVisible) onVisible();
          // Disconnect after first visibility — section stays mounted
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: `${rootMargin}px`,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, rootMargin, onVisible]);

  return isVisible;
}

/**
 * Native implementation using onLayout position + scrollY.
 * Reaction self-stops once the section becomes visible.
 */
function useLazySectionNative(
  sectionY: number | null,
  scrollY: SharedValue<number> | undefined,
  rootMargin: number,
  onVisible?: () => void,
): boolean {
  const [isVisible, setIsVisible] = useState(false);
  const visibleRef = useRef(false);
  const visibleFlag = useSharedValue(0); // worklet-safe flag (0=hidden, 1=visible)
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  useEffect(() => {
    if (Platform.OS === 'web' || visibleRef.current) return;

    // If no scrollY provided, fall back to showing immediately
    if (!scrollY || sectionY === null) {
      const timer = setTimeout(() => {
        if (!visibleRef.current) {
          visibleRef.current = true;
          visibleFlag.value = 1;
          setIsVisible(true);
          if (onVisibleRef.current) onVisibleRef.current();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scrollY, sectionY, rootMargin]);

  // Use useAnimatedReaction to observe scrollY changes
  const markVisible = useCallback(() => {
    if (!visibleRef.current) {
      visibleRef.current = true;
      setIsVisible(true);
      if (onVisibleRef.current) onVisibleRef.current();
    }
  }, []);

  useAnimatedReaction(
    () => scrollY?.value ?? 0,
    (scrollOffset) => {
      if (Platform.OS === 'web' || visibleFlag.value === 1 || !scrollY || sectionY === null) return;

      const viewportBottom = scrollOffset + SCREEN_HEIGHT + rootMargin;
      const viewportTop = scrollOffset - rootMargin;
      const visible = sectionY < viewportBottom && sectionY > viewportTop - SCREEN_HEIGHT;

      if (visible) {
        visibleFlag.value = 1;
        runOnJS(markVisible)();
      }
    },
    [sectionY, rootMargin]
  );

  return isVisible;
}

/**
 * LazySection Component
 */
const LazySection: React.FC<LazySectionProps> = ({
  sectionId,
  renderSection,
  height = 400,
  threshold = 0.1,
  rootMargin = Platform.OS === 'web' ? 300 : 600,
  onVisible,
  unloadWhenOffscreen = false,
  keepMounted = true,
  style,
  placeholder,
  scrollY,
}) => {
  const ref = useRef<View>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const sectionYRef = useRef<number | null>(null);
  const [sectionY, setSectionY] = useState<number | null>(null);
  const fadeAnim = useSharedValue(0);

  // Measure section position on layout — use measureInWindow for absolute position
  // Only measure once (subsequent layouts don't change content position)
  const handleLayout = useCallback((_event: LayoutChangeEvent) => {
    if (Platform.OS !== 'web' && sectionYRef.current === null) {
      ref.current?.measureInWindow((_x, y) => {
        if (y !== undefined && sectionYRef.current === null) {
          sectionYRef.current = y;
          setSectionY(y);
        }
      });
    }
  }, []);

  // Use appropriate hook based on platform
  const isVisible = Platform.OS === 'web'
    ? useLazySectionWeb(ref, threshold, rootMargin, onVisible)
    : useLazySectionNative(sectionY, scrollY, rootMargin, onVisible);

  // Track if section has ever been loaded — fade in content
  useEffect(() => {
    if (isVisible && !hasLoaded) {
      setHasLoaded(true);
      fadeAnim.value = withTiming(1, { duration: 200 });
    }
  }, [isVisible, hasLoaded]);

  const shouldRenderContent = hasLoaded && (keepMounted || isVisible || !unloadWhenOffscreen);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  return (
    <View
      ref={ref}
      onLayout={handleLayout}
      style={[styles.container, style, { minHeight: shouldRenderContent ? undefined : height }]}
      accessible={true}
      accessibilityLabel={`${sectionId} section`}
      accessibilityRole="summary"
    >
      {!shouldRenderContent && (
        placeholder || <View style={[styles.placeholder, { height }]} />
      )}

      {shouldRenderContent && (
        <Animated.View style={[styles.content, fadeStyle]}>
          {renderSection()}
        </Animated.View>
      )}
    </View>
  );
};

export default React.memo(LazySection, (prev, next) => {
  return (
    prev.sectionId === next.sectionId &&
    prev.height === next.height &&
    prev.threshold === next.threshold &&
    prev.keepMounted === next.keepMounted &&
    prev.scrollY === next.scrollY
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  placeholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
