// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Pressable,
  StatusBar,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { IWhatsNewStory } from '@/types/whatsNew.types';
import whatsNewApi from '@/services/whatsNewApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDE_DURATION = 5000; // 5 seconds per slide

interface WhatsNewStoriesFlowProps {
  onClose: () => void;
  startIndex?: number;
}

const WhatsNewStoriesFlow: React.FC<WhatsNewStoriesFlowProps> = ({ onClose, startIndex = 0 }) => {
  const router = useRouter();
  const [stories, setStories] = useState<IWhatsNewStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const isMounted = useIsMounted();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentStoryIndex];
  const currentSlide = currentStory?.slides[currentSlideIndex];

  // Fetch stories
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await whatsNewApi.getStories(true);
        if (response.success && response.data.length > 0) {
          if (!isMounted()) return;
          setStories(response.data);
        } else {
          onClose();
        }
      } catch (error) {
        onClose();
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchStories();
  }, []);

  // Jump to startIndex when stories load
  useEffect(() => {
    if (stories.length > 0 && startIndex > 0 && startIndex < stories.length) {
      setCurrentStoryIndex(startIndex);
    }
  }, [stories.length, startIndex]);

  // Track view when story changes
  useEffect(() => {
    if (currentStory && currentSlideIndex === 0) {
      whatsNewApi.trackView(currentStory._id);
    }
  }, [currentStoryIndex]);

  // Auto-advance timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    const duration = currentSlide?.duration || SLIDE_DURATION;
    const progressInterval = 50; // Update progress every 50ms
    let elapsed = 0;

    setProgress(0);

    progressTimerRef.current = setInterval(() => {
      elapsed += progressInterval;
      setProgress(elapsed / duration);
    }, progressInterval);

    timerRef.current = setTimeout(() => {
      goToNextSlide();
    }, duration);
  }, [currentStoryIndex, currentSlideIndex, currentSlide]);

  useEffect(() => {
    if (!loading && stories.length > 0) {
      startTimer();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [currentStoryIndex, currentSlideIndex, loading, stories.length, startTimer]);

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  const goToNextSlide = () => {
    if (!currentStory) return;

    if (currentSlideIndex < currentStory.slides.length - 1) {
      // Go to next slide in current story
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      // Mark story as completed
      whatsNewApi.trackCompletion(currentStory._id);

      if (currentStoryIndex < stories.length - 1) {
        // Go to next story
        setCurrentStoryIndex(currentStoryIndex + 1);
        setCurrentSlideIndex(0);
      } else {
        // All stories viewed
        onClose();
      }
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      // Go to previous slide in current story
      setCurrentSlideIndex(currentSlideIndex - 1);
    } else if (currentStoryIndex > 0) {
      // Go to previous story's last slide
      const prevStory = stories[currentStoryIndex - 1];
      setCurrentStoryIndex(currentStoryIndex - 1);
      setCurrentSlideIndex(prevStory.slides.length - 1);
    }
  };

  const handleTap = (event: any) => {
    const x = event.nativeEvent.locationX;
    if (x < SCREEN_WIDTH / 3) {
      goToPrevSlide();
    } else {
      goToNextSlide();
    }
  };

  const handleCtaPress = () => {
    if (currentStory?.ctaButton) {
      whatsNewApi.trackClick(currentStory._id);

      const { action, target } = currentStory.ctaButton;

      if (action === 'screen') {
        onClose();
        router.push(target as any);
      } else if (action === 'link' || action === 'deeplink') {
        onClose();
        router.push(target as any);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.background.primary} />
      </View>
    );
  }

  if (!currentStory || !currentSlide) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background Image */}
      <CachedImage
        source={currentSlide.image}
        style={styles.backgroundImage}
        contentFit="cover"
      />

      {/* Overlay for darker background */}
      <View
        style={[
          styles.overlay,
          { backgroundColor: currentSlide.backgroundColor || 'rgba(0,0,0,0.3)' },
        ]}
      />

      {/* Tap Zones */}
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.tapZone} />
      </TouchableWithoutFeedback>

      {/* Progress Bars */}
      <View style={styles.progressContainer}>
        {/* Story Progress (multiple stories) */}
        <View style={styles.storyProgressRow}>
          {stories.map((story, index) => (
            <View key={story._id} style={styles.storyProgressWrapper}>
              <View style={styles.storyProgressBg}>
                <View
                  style={[
                    styles.storyProgressFill,
                    {
                      width:
                        index < currentStoryIndex
                          ? '100%'
                          : index === currentStoryIndex
                          ? `${(currentSlideIndex / story.slides.length) * 100}%`
                          : '0%',
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Slide Progress (within current story) */}
        <View style={styles.slideProgressRow}>
          {currentStory.slides.map((_, index) => (
            <View key={index} style={styles.slideProgressWrapper}>
              <View style={styles.slideProgressBg}>
                <Animated.View
                  style={[
                    styles.slideProgressFill,
                    {
                      width:
                        index < currentSlideIndex
                          ? '100%'
                          : index === currentSlideIndex
                          ? `${progress * 100}%`
                          : '0%',
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.storyInfo}>
          {currentStory.icon?.startsWith('http') ? (
            <CachedImage source={currentStory.icon} style={styles.storyIcon} />
          ) : (
            <View style={styles.storyIconEmoji}>
              <ThemedText style={styles.storyIconEmojiText}>{currentStory.icon}</ThemedText>
            </View>
          )}
          <View style={styles.storyTextContainer}>
            <ThemedText style={styles.storyTitle}>{currentStory.title}</ThemedText>
            {currentStory.subtitle && (
              <ThemedText style={styles.storySubtitle}>{currentStory.subtitle}</ThemedText>
            )}
          </View>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.background.primary} />
        </Pressable>
      </View>

      {/* Overlay Text */}
      {currentSlide.overlayText && (
        <View style={styles.overlayTextContainer}>
          <ThemedText style={styles.overlayText}>{currentSlide.overlayText}</ThemedText>
        </View>
      )}

      {/* CTA Button */}
      {currentStory.ctaButton && (
        <Pressable style={styles.ctaButton} onPress={handleCtaPress}>
          <ThemedText style={styles.ctaButtonText}>
            {currentStory.ctaButton.text}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  tapZone: {
    ...StyleSheet.absoluteFillObject,
  },
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: 8,
    right: 8,
    zIndex: 10,
  },
  storyProgressRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  storyProgressWrapper: {
    flex: 1,
    marginHorizontal: 2,
  },
  storyProgressBg: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  slideProgressRow: {
    flexDirection: 'row',
  },
  slideProgressWrapper: {
    flex: 1,
    marginHorizontal: 2,
  },
  slideProgressBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  slideProgressFill: {
    height: '100%',
    backgroundColor: colors.background.primary,
  },
  header: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  storyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  storyIconEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.background.primary,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyIconEmojiText: {
    fontSize: 20,
  },
  storyTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  storyTitle: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  storySubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  overlayTextContainer: {
    position: 'absolute',
    bottom: 220,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  overlayText: {
    color: colors.background.primary,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  ctaButton: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: colors.background.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  ctaButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default React.memo(WhatsNewStoriesFlow);
