import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import categoriesApi, { Category } from '@/services/categoriesApi';
import CategoryProductsSection from './CategoryProductsSection';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface FeaturedCategoriesContainerProps {
  productsPerCategory?: number;
}

function FeaturedCategoriesContainer({
  productsPerCategory = 10,
}: FeaturedCategoriesContainerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const fetchFeaturedCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await categoriesApi.getFeaturedCategories();

      if (response.success && response.data && response.data.length > 0) {
        // Use whatever featured categories the API returns (up to 5)
        if (!isMounted()) return;
        setCategories(response.data.slice(0, 5));
      } else {
        setError('Failed to load categories');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load categories');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedCategories();
  }, [fetchFeaturedCategories]);

  // Don't render anything while loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="small" color={colors.lightMustard} />
          </View>
          <ThemedText style={styles.loadingText}>Loading categories...</ThemedText>
        </View>
      </View>
    );
  }

  // Don't render if there's an error or no categories
  if (error || categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section divider with subtle gradient line */}
      <View style={styles.sectionDivider}>
        <LinearGradient
          colors={['transparent', 'rgba(255, 205, 87, 0.15)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.dividerGradient}
        />
      </View>

      {/* Featured header */}
      <View style={styles.featuredHeader}>
        <View style={styles.featuredBadge}>
          <ThemedText style={styles.featuredBadgeText}>SHOP BY CATEGORY</ThemedText>
        </View>
      </View>

      {categories.map((category) => {
        // Safely extract string values to prevent rendering objects
        const catId = typeof category._id === 'string' ? category._id : String(category._id);
        const catSlug = typeof category.slug === 'string' ? category.slug : '';
        const catName = typeof category.name === 'string' ? category.name : 'Category';

        return (
          <CategoryProductsSection
            key={catId}
            categorySlug={catSlug}
            categoryName={catName}
            limit={productsPerCategory}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingTop: 8,
  },
  sectionDivider: {
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  dividerGradient: {
    height: 1,
  },
  featuredHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  featuredBadge: {
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.12)',
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.nileBlue,
    fontFamily: 'Inter',
    letterSpacing: 1,
  },
  loadingContainer: {
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 4px 16px rgba(26, 58, 82, 0.06)',
      },
    }),
  },
  loadingContent: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 13,
    color: colors.gray[400],
    fontFamily: 'Inter',
    fontWeight: '500',
  },
});

export default memo(FeaturedCategoriesContainer);
