// @ts-nocheck
// ProductGallerySection.tsx
// Gallery section component for product page with category-based display

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import productGalleryApi, { ProductGalleryItem, ProductGalleryCategory } from '@/services/productGalleryApi';
import GalleryViewerModal from '@/components/store/GalleryViewerModal';
import GalleryGridSkeleton from '@/components/skeletons/GalleryGridSkeleton';
import analyticsService from '@/services/analyticsService';
import GalleryImagePreloader from '@/components/store/GalleryImagePreloader';
import { FeatureErrorBoundary as GalleryErrorBoundary } from '@/components/common/FeatureErrorBoundary';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - 48) / 3; // 3 columns with padding
const CATEGORY_CARD_HEIGHT = 180;

interface ProductGallerySectionProps {
  productId: string;
  variantId?: string;
}

function ProductGallerySection({ productId, variantId }: ProductGallerySectionProps) {
  const [allGalleryItems, setAllGalleryItems] = useState<ProductGalleryItem[]>([]);
  const [galleryItems, setGalleryItems] = useState<ProductGalleryItem[]>([]);
  const [categories, setCategories] = useState<ProductGalleryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [viewMode, setViewMode] = useState<'categories' | 'grid'>('categories');
  const isMounted = useIsMounted();

  // Extract unique tags from all gallery items
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    allGalleryItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (tag && tag.trim()) {
            tagSet.add(tag.trim().toLowerCase());
          }
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [allGalleryItems]);

  useEffect(() => {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    loadGallery();
    loadCategories();

    // Track gallery section view
    analyticsService.track('product_gallery_viewed', {
      productId,
      variantId,
      category: selectedCategory,
      tags: Array.from(selectedTags),
    });

    // Track performance
    setTimeout(() => {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const loadTime = endTime - startTime;
      if (loadTime > 0) {
        analyticsService.track('product_gallery_load_performance', {
          productId,
          loadTime: Math.round(loadTime),
          category: selectedCategory,
        });
      }
    }, 100);
  }, [productId, variantId]);

  // Filter items when category or tags change
  useEffect(() => {
    filterItems();
  }, [selectedCategory, selectedTags, allGalleryItems, variantId]);

  const loadGallery = async (retry = false) => {
    try {
      setLoading(true);
      setError(null);
      const response = await productGalleryApi.getGallery(productId, {
        variantId,
        limit: 100,
        sortBy: 'order',
        sortOrder: 'asc',
      });
      if (!isMounted()) return;
      setAllGalleryItems(response.items.filter(item => item.isVisible !== false));
      setRetryCount(0);

      analyticsService.track('product_gallery_load_success', {
        productId,
        itemCount: response.items.length,
        category: selectedCategory,
      });
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load gallery');
      setAllGalleryItems([]);

      analyticsService.track('product_gallery_load_error', {
        productId,
        error: err.message || 'Unknown error',
        retryCount,
        category: selectedCategory,
      });

      if (!retry && retryCount < 3) {
        if (!isMounted()) return;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadGallery(true);
        }, 2000 * (retryCount + 1));
      }
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...allGalleryItems];

    // Filter by variant if specified
    if (variantId) {
      filtered = filtered.filter(item => !item.variantId || item.variantId === variantId);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by tags
    if (selectedTags.size > 0) {
      filtered = filtered.filter(item => {
        if (!item.tags || !Array.isArray(item.tags)) return false;
        const itemTags = item.tags.map(t => t.trim().toLowerCase());
        return Array.from(selectedTags).every(selectedTag =>
          itemTags.includes(selectedTag.toLowerCase())
        );
      });
    }

    setGalleryItems(filtered);
  };

  const loadCategories = async () => {
    try {
      const cats = await productGalleryApi.getCategories(productId);
      if (!isMounted()) return;
      setCategories(cats);
    } catch (error) {
      // silently handle
    }
  };

  const handleItemPress = (index: number) => {
    setSelectedIndex(index);
    setViewerVisible(true);

    const item = galleryItems[index];
    if (item) {
      analyticsService.track('product_gallery_item_clicked', {
        productId,
        itemId: item.id,
        itemType: item.type,
        category: item.category,
        index,
      });
    }
  };

  const handleCategoryPress = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setViewMode('grid');
    analyticsService.track('product_gallery_category_filtered', {
      productId,
      category: categoryName,
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag.toLowerCase())) {
        newSet.delete(tag.toLowerCase());
      } else {
        newSet.add(tag.toLowerCase());
      }
      return newSet;
    });
    setViewMode('grid');
    analyticsService.track('product_gallery_tag_filtered', {
      productId,
      tag,
      action: selectedTags.has(tag.toLowerCase()) ? 'removed' : 'added',
    });
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedTags(new Set());
    setViewMode('categories');
  };

  const renderGalleryItem = ({ item, index }: { item: ProductGalleryItem; index: number }) => (
    <Pressable
      style={styles.galleryItem}
      onPress={() => handleItemPress(index)}
     
    >
      <CachedImage
        source={{ uri: item.url }}
        style={styles.galleryImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      {item.type === 'video' && (
        <View style={styles.videoBadge}>
          <Ionicons name="play-circle" size={20} color={colors.background.primary} />
        </View>
      )}
      {item.isCover && (
        <View style={styles.coverBadge}>
          <Ionicons name="star" size={12} color="#FFB800" />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={styles.itemOverlay}
      >
        {item.title && (
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  );

  const renderCategoryCard = (category: ProductGalleryCategory) => {
    const categoryItems = allGalleryItems.filter(
      item => item.category.toLowerCase() === category.name.toLowerCase()
    );

    if (categoryItems.length === 0) return null;

    return (
      <Pressable
        key={category.name}
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(category.name)}
       
      >
        <CachedImage
          source={{ uri: category.coverImage || categoryItems[0]?.url || '' }}
          style={styles.categoryCardImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.categoryCardOverlay}
        >
          <View style={styles.categoryCardContent}>
            <Text style={styles.categoryCardTitle}>
              {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
            </Text>
            <View style={styles.categoryCardMeta}>
              <Ionicons name="images" size={14} color={colors.background.primary} />
              <Text style={styles.categoryCardCount}>{category.count} items</Text>
            </View>
          </View>
        </LinearGradient>
        {categoryItems.some(item => item.isCover) && (
          <View style={styles.categoryCoverBadge}>
            <Ionicons name="star" size={16} color="#FFB800" />
          </View>
        )}
      </Pressable>
    );
  };

  if (loading && allGalleryItems.length === 0) {
    return <GalleryGridSkeleton />;
  }

  if (error && allGalleryItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Product Gallery</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => loadGallery()}>
            <Ionicons name="refresh" size={16} color={colors.background.primary} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (allGalleryItems.length === 0 && !loading) {
    return null; // Don't show section if no gallery items
  }

  const hasActiveFilters = selectedCategory !== 'all' || selectedTags.size > 0;

  return (
    <GalleryErrorBoundary>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="images" size={24} color={colors.neutral[800]} />
            <Text style={styles.sectionTitle}>Product Gallery</Text>
            {allGalleryItems.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{allGalleryItems.length}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            {hasActiveFilters && (
              <Pressable style={styles.clearButton} onPress={clearFilters}>
                <Ionicons name="close-circle" size={18} color={colors.neutral[500]} />
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            )}
            {galleryItems.length > 6 && (
              <Pressable
                style={styles.viewAllButton}
                onPress={() => handleItemPress(0)}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.lightMustard} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Category Filter Chips */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryFilter}
            contentContainerStyle={styles.categoryFilterContent}
          >
            <Pressable
              style={[
                styles.categoryChip,
                selectedCategory === 'all' && styles.categoryChipActive,
              ]}
              onPress={() => {
                setSelectedCategory('all');
                setViewMode('categories');
              }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === 'all' && styles.categoryChipTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>
            {categories.map((category) => (
              <Pressable
                key={category.name}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.name && styles.categoryChipActive,
                ]}
                onPress={() => handleCategoryPress(category.name)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category.name && styles.categoryChipTextActive,
                  ]}
                >
                  {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                </Text>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>{category.count}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Tag Filter Chips */}
        {availableTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagFilter}
            contentContainerStyle={styles.tagFilterContent}
          >
            <Text style={styles.tagFilterLabel}>Tags:</Text>
            {availableTags.map((tag) => (
              <Pressable
                key={tag}
                style={[
                  styles.tagChip,
                  selectedTags.has(tag) && styles.tagChipActive,
                ]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[
                    styles.tagChipText,
                    selectedTags.has(tag) && styles.tagChipTextActive,
                  ]}
                >
                  #{tag}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Category Cards View */}
        {viewMode === 'categories' && selectedCategory === 'all' && selectedTags.size === 0 && categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScrollView}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {categories.map(category => renderCategoryCard(category))}
          </ScrollView>
        ) : (
          /* Gallery Grid View */
          <FlashList
            data={galleryItems}
            renderItem={renderGalleryItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.galleryGrid}
            estimatedItemSize={80}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="images-outline" size={48} color={colors.neutral[400]} />
                <Text style={styles.emptyText}>No items found</Text>
                <Text style={styles.emptySubtext}>
                  {hasActiveFilters
                    ? 'Try adjusting your filters'
                    : 'No gallery items available'}
                </Text>
                {hasActiveFilters && (
                  <Pressable
                    style={styles.clearButtonLarge}
                    onPress={clearFilters}
                  >
                    <Text style={styles.clearButtonLargeText}>Clear Filters</Text>
                  </Pressable>
                )}
              </View>
            }
            ListFooterComponent={
              galleryItems.length > 0 ? (
                <Pressable
                  style={styles.moreButton}
                  onPress={() => handleItemPress(0)}
                >
                  <LinearGradient
                    colors={[colors.lightMustard, colors.nileBlue]}
                    style={styles.moreButtonGradient}
                  >
                    <Ionicons name="images" size={20} color={colors.background.primary} />
                    <Text style={styles.moreButtonText}>View Full Gallery</Text>
                  </LinearGradient>
                </Pressable>
              ) : null
            }
          />
        )}


        {/* Image Preloader */}
        {galleryItems.length > 0 && (
          <GalleryImagePreloader items={galleryItems.map(item => ({ ...item, url: item.url }))} preloadCount={3} />
        )}

        {/* Gallery Viewer Modal */}
        <GalleryViewerModal
          visible={viewerVisible}
          items={galleryItems.map(item => ({ ...item, url: item.url }))}
          initialIndex={selectedIndex}
          storeId={productId}
          onClose={() => setViewerVisible(false)}
          type="product"
        />
      </View>
    </GalleryErrorBoundary>
  );
}

export default React.memo(ProductGallerySection);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    marginVertical: 8,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  countBadge: {
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  clearButtonLarge: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.lightMustard,
    borderRadius: 8,
  },
  clearButtonLargeText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryFilter: {
    marginBottom: 12,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.lightMustard,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  categoryChipTextActive: {
    color: colors.background.primary,
  },
  categoryCount: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  tagFilter: {
    marginBottom: 12,
  },
  tagFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  tagFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[500],
    marginRight: 4,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  tagChipActive: {
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    borderColor: colors.lightMustard,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  tagChipTextActive: {
    color: colors.lightMustard,
    fontWeight: '600',
  },
  categoriesScrollView: {
    marginBottom: 12,
  },
  categoriesScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCard: {
    width: SCREEN_WIDTH * 0.75,
    height: CATEGORY_CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
    marginRight: 12,
  },
  categoryCardImage: {
    width: '100%',
    height: '100%',
  },
  categoryCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  categoryCardContent: {
    gap: 4,
  },
  categoryCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
    textTransform: 'capitalize',
  },
  categoryCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryCardCount: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.background.primary,
  },
  categoryCoverBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 184, 0, 0.9)',
    borderRadius: 20,
    padding: 6,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.lightMustard,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  galleryGrid: {
    paddingHorizontal: 16,
  },
  galleryItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  coverBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 184, 0, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  itemOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.background.primary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  moreButton: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  moreButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  moreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
});
