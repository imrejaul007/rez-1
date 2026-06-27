// @ts-nocheck
// GalleryViewerModal.tsx
// Beautiful full-screen gallery viewer with swipe navigation

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  Share,
  ActivityIndicator,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { GalleryItem } from '@/services/storeGalleryApi';
import storeGalleryApi from '@/services/storeGalleryApi';
import productGalleryApi from '@/services/productGalleryApi';
import ZoomableImage from './ZoomableImage';
import analyticsService from '@/services/analyticsService';
import { useGalleryImagePreloader } from './GalleryImagePreloader';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GalleryViewerModalProps {
  visible: boolean;
  items: GalleryItem[];
  initialIndex: number;
  storeId: string;
  onClose: () => void;
  type?: 'store' | 'product'; // Add type prop
}

function GalleryViewerModal({
  visible,
  items,
  initialIndex,
  storeId,
  onClose,
  type = 'store', // Default to 'store' for backward compatibility
}: GalleryViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [viewedItems, setViewedItems] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useSharedValue(1);
  
  // Preload images for better performance
  useGalleryImagePreloader(items, currentIndex, 2);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsLoading(true);
      setShowInfo(true);
      
      // Track gallery viewer opened
      analyticsService.track('gallery_viewer_opened', {
        storeId,
        itemCount: items.length,
        initialIndex,
      });
      
      // Track view for the initial item (only if not already viewed in this session)
      if (items[initialIndex] && !viewedItems.has(items[initialIndex].id)) {
        // Mark as viewed
        setViewedItems(prev => new Set(prev).add(items[initialIndex].id));

        // Track view and update view count - use appropriate API based on type
        if (type === 'product') {
          // Product galleries don't have trackView endpoint yet, just track analytics
          analyticsService.track('gallery_item_viewed', {
            productId: storeId,
            itemId: items[initialIndex].id,
            itemType: items[initialIndex].type,
            category: items[initialIndex].category,
          });
        } else {
          // Store gallery
          storeGalleryApi.trackView(storeId, items[initialIndex].id).then((newViewCount) => {
            if (newViewCount > 0) {
              setViewCounts(prev => ({
                ...prev,
                [items[initialIndex].id]: newViewCount,
              }));
            }
          });
          analyticsService.track('gallery_item_viewed', {
            storeId,
            itemId: items[initialIndex].id,
            itemType: items[initialIndex].type,
            category: items[initialIndex].category,
          });
        }
      }
      
      // Initialize view counts from items
      const initialViewCounts: Record<string, number> = {};
      items.forEach(item => {
        initialViewCounts[item.id] = item.views || 0;
      });
      setViewCounts(initialViewCounts);

      // Scroll to initial index
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * SCREEN_WIDTH,
          animated: false,
        });
        setIsLoading(false);
      }, 100);
    } else {
      // Track gallery viewer closed
      analyticsService.track('gallery_viewer_closed', {
        storeId,
        itemsViewed: currentIndex + 1,
        totalItems: items.length,
      });
    }
  }, [visible, initialIndex, items.length, storeId]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent?.contentOffset?.x ?? 0;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    
    if (index !== currentIndex && index >= 0 && index < items.length) {
      setCurrentIndex(index);
      // Track view for new item (only if not already viewed in this session)
      const item = items[index];
      if (item && !viewedItems.has(item.id)) {
        // Mark as viewed
        setViewedItems(prev => new Set(prev).add(item.id));

        // Track view and update view count - use appropriate API based on type
        if (type === 'product') {
          // Product galleries don't have trackView endpoint yet, just track analytics
          analyticsService.track('gallery_item_viewed', {
            productId: storeId,
            itemId: item.id,
            itemType: item.type,
            category: item.category,
            index,
          });
        } else {
          // Store gallery
          storeGalleryApi.trackView(storeId, item.id).then((newViewCount) => {
            if (newViewCount > 0) {
              setViewCounts(prev => ({
                ...prev,
                [item.id]: newViewCount,
              }));
            }
          });
          analyticsService.track('gallery_item_viewed', {
            storeId,
            itemId: item.id,
            itemType: item.type,
            category: item.category,
            index,
          });
        }
      }
    }
  };

  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      // handleScroll will update currentIndex when scroll completes
    }
  }, [currentIndex, items.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      scrollViewRef.current?.scrollTo({
        x: prevIndex * SCREEN_WIDTH,
        animated: true,
      });
      // handleScroll will update currentIndex when scroll completes
    }
  }, [currentIndex]);

  const fadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const toggleInfo = useCallback(() => {
    fadeAnim.value = withTiming(showInfo ? 0 : 1, { duration: 300 });
    setShowInfo(!showInfo);
  }, [showInfo]);

  // Keyboard shortcuts for web
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;

    const handleKeyPress = (e: globalThis.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            goToPrevious();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < items.length - 1) {
            goToNext();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          toggleInfo();
          break;
        case 'g':
        case 'G':
          e.preventDefault();
          const newMode = viewMode === 'carousel' ? 'grid' : 'carousel';
          setViewMode(newMode);
          analyticsService.track('gallery_view_mode_changed', {
            storeId,
            mode: newMode,
          });
          break;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [visible, currentIndex, viewMode, items.length, goToNext, goToPrevious, onClose, toggleInfo, Platform.OS]);

  const handleShare = async () => {
    const currentItem = items[currentIndex];
    if (!currentItem) return;

    try {
      // Use Web Share API on web, React Native Share on native
      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({
          title: currentItem.title || `Gallery ${currentItem.type}`,
          text: currentItem.title
            ? `Check out this ${currentItem.type} from the store: ${currentItem.title}`
            : `Check out this ${currentItem.type} from the store`,
          url: currentItem.url,
        });
        
        // Track share event
        analyticsService.track('gallery_item_shared', {
          storeId,
          itemId: currentItem.id,
          itemType: currentItem.type,
          platform: 'web',
        });
      } else {
        // Native platforms
        const result = await Share.share({
          message: currentItem.title
            ? `Check out this ${currentItem.type} from the store: ${currentItem.title}`
            : `Check out this ${currentItem.type} from the store`,
          url: currentItem.url,
        });
        
        // Track share event
        if (result.action === Share.sharedAction) {
          analyticsService.track('gallery_item_shared', {
            storeId,
            itemId: currentItem.id,
            itemType: currentItem.type,
            platform: result.activityType || 'unknown',
          });
        }
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error?.name !== 'AbortError' && error?.message !== 'User did not share') {
        analyticsService.track('gallery_item_share_failed', {
          storeId,
          itemId: currentItem.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  const currentItem = items[currentIndex];

  if (!visible || items.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Header with gradient overlay */}
        <Animated.View
          style={[
            styles.header,
            fadeAnimatedStyle,
          ]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0)']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Pressable
                style={styles.headerButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close gallery viewer"
                accessibilityHint="Double tap to close the gallery"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={28} color={colors.background.primary} />
              </Pressable>

              <View style={styles.headerCenter} accessibilityRole="header">
                <Text 
                  style={styles.headerTitle} 
                  numberOfLines={1}
                  accessibilityLabel={`${currentItem?.title || 'Gallery'}, item ${currentIndex + 1} of ${items.length}`}
                >
                  {currentItem?.title || 'Gallery'}
                </Text>
                <Text 
                  style={styles.headerSubtitle}
                  accessibilityLabel={`Image ${currentIndex + 1} of ${items.length}`}
                >
                  {currentIndex + 1} / {items.length}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  style={styles.headerButton}
                  onPress={() => {
                    const newMode = viewMode === 'carousel' ? 'grid' : 'carousel';
                    setViewMode(newMode);
                    analyticsService.track('gallery_view_mode_changed', {
                      storeId,
                      mode: newMode,
                    });
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={viewMode === 'carousel' ? 'Switch to grid view' : 'Switch to carousel view'}
                  accessibilityHint="Double tap to toggle between grid and carousel view"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={viewMode === 'carousel' ? 'grid' : 'albums'}
                    size={24}
                    color={colors.background.primary}
                  />
                </Pressable>
                <Pressable
                  style={styles.headerButton}
                  onPress={toggleInfo}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={showInfo ? 'Hide image information' : 'Show image information'}
                  accessibilityHint="Double tap to toggle image details"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={showInfo ? 'information-circle' : 'information-circle-outline'}
                    size={24}
                    color={colors.background.primary}
                  />
                </Pressable>
                <Pressable
                  style={styles.headerButton}
                  onPress={handleShare}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Share this image"
                  accessibilityHint="Double tap to share this gallery item"
                  accessibilityRole="button"
                >
                  <Ionicons name="share-social" size={24} color={colors.background.primary} />
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Main content - scrollable gallery or grid view */}
        {viewMode === 'carousel' ? (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH}
            snapToAlignment="start"
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {items.map((item, index) => (
              <View key={item.id} style={styles.itemContainer}>
                {item.type === 'video' ? (
                  <Video
                    source={item.url}
                    style={styles.media}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={index === currentIndex}
                    isLooping
                    useNativeControls
                  />
                ) : (
                  <ZoomableImage
                    source={item.url}
                    style={styles.media}
                    onLoadStart={() => setIsLoading(true)}
                    onLoadEnd={() => setIsLoading(false)}
                  />
                )}
                {isLoading && index === currentIndex && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.background.primary} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.gridScrollView}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, index) => (
              <Pressable
                key={item.id}
                style={styles.gridItem}
                onPress={() => {
                  setViewMode('carousel');
                  setCurrentIndex(index);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({
                      x: index * SCREEN_WIDTH,
                      animated: false,
                    });
                  }, 100);
                }}
               
              >
                <CachedImage
                  source={item.type === 'video' ? (item.thumbnail || item.url) : item.url}
                  style={styles.gridImage}
                  contentFit="cover"
                />
                {item.type === 'video' && (
                  <View style={styles.gridVideoBadge}>
                    <Ionicons name="play-circle" size={20} color={colors.background.primary} />
                  </View>
                )}
                {index === currentIndex && (
                  <View style={styles.gridSelectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.infoScale[400]} />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Navigation arrows - only show in carousel mode */}
        {viewMode === 'carousel' && (
          <>
            {currentIndex > 0 && (
              <Pressable
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={goToPrevious}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Ionicons name="chevron-back" size={32} color={colors.background.primary} />
              </Pressable>
            )}

            {currentIndex < items.length - 1 && (
              <Pressable
                style={[styles.navButton, styles.navButtonRight]}
                onPress={goToNext}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Ionicons name="chevron-forward" size={32} color={colors.background.primary} />
              </Pressable>
            )}
          </>
        )}

        {/* Info panel with gradient overlay - only show in carousel mode */}
        {viewMode === 'carousel' && showInfo && currentItem && (
          <Animated.View
            style={[
              styles.infoPanel,
              fadeAnimatedStyle,
            ]}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
              style={styles.infoGradient}
            >
              <ScrollView style={styles.infoContent} showsVerticalScrollIndicator={false}>
                {currentItem.title && (
                  <Text style={styles.infoTitle}>{currentItem.title}</Text>
                )}
                {currentItem.description && (
                  <Text style={styles.infoDescription}>{currentItem.description}</Text>
                )}
                {currentItem.tags && currentItem.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {currentItem.tags.map((tag, idx) => (
                      <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* View Count */}
                <View style={styles.viewCountContainer}>
                  <Ionicons name="eye" size={16} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.viewCountText}>
                    {viewCounts[currentItem.id] ?? currentItem.views ?? 0} {((viewCounts[currentItem.id] ?? currentItem.views ?? 0) === 1) ? 'view' : 'views'}
                  </Text>
                </View>
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Pagination dots - only show in carousel mode */}
        {viewMode === 'carousel' && items.length > 1 && (
          <View style={styles.pagination}>
            {items.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.text.primary,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
  },
  itemContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    transform: [{ translateY: -25 }],
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.4,
    zIndex: 10,
  },
  infoGradient: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  infoContent: {
    maxHeight: SCREEN_HEIGHT * 0.35,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tagText: {
    fontSize: 12,
    color: colors.background.primary,
    fontWeight: '500',
  },
  viewCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewCountText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: colors.background.primary,
    fontWeight: '500',
  },
  pagination: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: colors.background.primary,
  },
  // Grid view styles
  gridScrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  gridItem: {
    width: (SCREEN_WIDTH - 32) / 3,
    height: (SCREEN_WIDTH - 32) / 3,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridVideoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  gridSelectedIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
});

export default React.memo(GalleryViewerModal);

