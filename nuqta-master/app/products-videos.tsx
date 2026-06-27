// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { usePlayPageData } from '@/hooks/usePlayPageData';
import { UGCVideoItem, PLAY_PAGE_COLORS } from '@/types/playPage.types';
import ThumbnailVideoCard from '@/components/playPage/ThumbnailVideoCard';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

function ProductsVideosPage() {
  const router = useRouter();
  const { state, actions } = usePlayPageData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All', icon: 'grid-outline' },
    { id: 'fashion', label: 'Fashion', icon: 'shirt-outline' },
    { id: 'beauty', label: 'Beauty', icon: 'sparkles-outline' },
    { id: 'lifestyle', label: 'Lifestyle', icon: 'home-outline' },
    { id: 'tech', label: 'Tech', icon: 'phone-portrait-outline' },
  ];

  // Filter products based on search and category
  const filteredProducts = useMemo(() => state.merchantVideos.filter((video) => {
    const matchesSearch = video.description
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || video.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }), [state.merchantVideos, searchQuery, selectedCategory]);

  const handleVideoPress = useCallback((video: UGCVideoItem) => {
    actions.navigateToDetail(video);
  }, [actions]);

  const renderVideoCard = useCallback(({ item }: { item: UGCVideoItem }) => (
    <View style={{ width: CARD_WIDTH }}>
      <ThumbnailVideoCard
        item={item}
        onPress={handleVideoPress}
        showHashtags={true}
      />
    </View>
  ), [handleVideoPress]);

  return (
    <View style={styles.container}>
      {/* Animated Header with Glassmorphism */}
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purpleMedium, '#C084FC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
            <View style={styles.headerContent}>
              {/* Back Button */}
              <Pressable
                style={styles.backButton}
                onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
               
              >
                <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
              </Pressable>

              {/* Title */}
              <View style={styles.headerTitleContainer}>
                <ThemedText style={styles.headerTitle}>Products</ThemedText>
                <ThemedText style={styles.headerSubtitle}>
                  {filteredProducts.length} videos
                </ThemedText>
              </View>

              {/* Filter Button */}
              <Pressable style={styles.filterButton}>
                <Ionicons name="options-outline" size={24} color={Colors.text.inverse} />
              </Pressable>
            </View>
          </BlurView>
        ) : (
          <View style={styles.headerContent}>
            {/* Back Button */}
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
             
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>

            {/* Title */}
            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Products</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                {filteredProducts.length} videos
              </ThemedText>
            </View>

            {/* Filter Button */}
            <Pressable style={styles.filterButton}>
              <Ionicons name="options-outline" size={24} color={Colors.text.inverse} />
            </Pressable>
          </View>
        )}
      </LinearGradient>

      {/* Search Bar with Glassmorphism */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={Colors.brand.purple}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <Pressable
            key={category.id}
            style={[
              styles.categoryPill,
              selectedCategory === category.id && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
           
          >
            <Ionicons
              name={category.icon as any}
              size={18}
              color={selectedCategory === category.id ? colors.background.primary : colors.brand.purpleLight}
            />
            <ThemedText
              style={[
                styles.categoryPillText,
                selectedCategory === category.id && styles.categoryPillTextActive,
              ]}
            >
              {category.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Products Grid */}
      <FlashList
        data={filteredProducts}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item.id}
          estimatedItemSize={250}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.05)']}
              style={styles.emptyGradient}
            >
              <Ionicons name="videocam-off-outline" size={64} color="#C084FC" />
              <ThemedText style={styles.emptyTitle}>No Products Found</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Try adjusting your search or filters
              </ThemedText>
            </LinearGradient>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing.lg,
    shadowColor: colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerBlur: {
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.secondary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    height: 50,
    shadowColor: colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  clearButton: {
    padding: Spacing.xs,
  },
  categoriesContainer: {
    maxHeight: 60,
    backgroundColor: Colors.background.secondary,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.base,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryPillActive: {
    backgroundColor: Colors.brand.purple,
    borderColor: colors.brand.purpleLight,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryPillText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.brand.purple,
  },
  categoryPillTextActive: {
    color: Colors.text.inverse,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
  },
  gridContent: {
    paddingTop: Spacing.sm,
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyGradient: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    borderRadius: BorderRadius['2xl'],
    width: SCREEN_WIDTH - 64,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.tertiary,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});

export default withErrorBoundary(ProductsVideosPage, 'ProductsVideos');
