import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { NUQTA } from './searchTheme';

interface SearchEmptyStateProps {
  query: string;
  didYouMeanSuggestions: string[];
  trendingSearches: any[];
  popularProducts: any[];
  currencySymbol: string;
  onDidYouMeanPress: (suggestion: string) => void;
  onTrendingPress: (query: string) => void;
  onClearSearch: () => void;
}

function SearchEmptyState({
  query,
  didYouMeanSuggestions,
  trendingSearches,
  popularProducts,
  currencySymbol,
  onDidYouMeanPress,
  onTrendingPress,
  onClearSearch,
}: SearchEmptyStateProps) {
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View
        style={styles.emptyContainer}
        accessibilityLabel="No search results found"
        accessibilityRole="alert"
      >
        <View style={styles.emptyIconContainer}>
          <Ionicons name="search-outline" size={64} color={NUQTA.nileBlue} accessibilityLabel="Search icon" />
        </View>
        <Text style={styles.emptyTitle}>No results found</Text>
        <Text style={styles.emptyMessage}>
          We couldn't find anything for "{query}"
        </Text>
        <Text style={styles.emptySuggestion}>
          Try different keywords or browse our categories
        </Text>

        {/* Did you mean? */}
        {didYouMeanSuggestions.length > 0 && (
          <View style={styles.didYouMeanSection}>
            <Text style={styles.didYouMeanTitle}>Did you mean?</Text>
            <View style={styles.emptyTrendingChips}>
              {didYouMeanSuggestions.map((suggestion, idx) => (
                <Pressable
                  key={`dym-${idx}`}
                  style={styles.didYouMeanChip}
                  onPress={() => onDidYouMeanPress(suggestion)}
                >
                  <Ionicons name="bulb-outline" size={14} color={NUQTA.lightMustard} />
                  <Text style={styles.didYouMeanChipText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {trendingSearches.length > 0 && (
          <View style={styles.emptyTrendingSection}>
            <Text style={styles.emptyTrendingTitle}>Try these popular searches</Text>
            <View style={styles.emptyTrendingChips}>
              {trendingSearches.slice(0, 5).map((t) => (
                <Pressable
                  key={t._id}
                  style={styles.emptyTrendingChip}
                  onPress={() => onTrendingPress(t.query)}
                >
                  <Ionicons name="trending-up" size={14} color={NUQTA.nileBlue} />
                  <Text style={styles.emptyTrendingChipText}>{t.query}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Pressable
          style={styles.emptyActionButton}
          onPress={onClearSearch}
          accessibilityLabel="Browse categories"
          accessibilityRole="button"
          accessibilityHint="Clears search and shows all available categories"
        >
          <LinearGradient
            colors={[NUQTA.nileBlue, NUQTA.nileBlueLight]}
            style={styles.emptyActionButtonGradient}
          >
            <Text style={styles.emptyActionText}>Browse Categories</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Popular Products Section */}
      {popularProducts.length > 0 && (
        <View style={styles.popularProductsSection}>
          <View style={styles.popularProductsHeader}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.popularProductsTitle}>Popular right now</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularProductsList}>
            {popularProducts.slice(0, 6).map((product: any) => {
              const price = product.pricing?.selling || (typeof product.price === 'number' ? product.price : product.price?.current) || 0;
              const image = product.images?.[0]?.url || product.images?.[0] || product.image || '';
              return (
                <Pressable
                  key={product._id}
                  style={styles.popularProductCard}
                  onPress={() => {
                    router.push({
                      pathname: '/product-page' as any,
                      params: { cardId: product._id, cardType: 'product' },
                    });
                  }}
                >
                  <CachedImage source={image} style={styles.popularProductImage} contentFit="cover" />
                  <View style={styles.popularProductInfo}>
                    <Text style={styles.popularProductName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.popularProductPrice}>{currencySymbol}{price.toFixed(2)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius['2xl'],
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: NUQTA.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: NUQTA.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: NUQTA.nileBlue,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyMessage: {
    ...Typography.body,
    color: NUQTA.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  emptySuggestion: {
    ...Typography.body,
    color: NUQTA.text.muted,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  emptyTrendingSection: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  emptyTrendingTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: NUQTA.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyTrendingChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyTrendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: NUQTA.linen,
    gap: 6,
  },
  emptyTrendingChipText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: NUQTA.nileBlue,
  },
  emptyActionButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  emptyActionButtonGradient: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyActionText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
    textAlign: 'center',
  },
  didYouMeanSection: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  didYouMeanTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: NUQTA.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  didYouMeanChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.3)',
    gap: 6,
  },
  didYouMeanChipText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: NUQTA.nileBlue,
  },
  popularProductsSection: {
    marginTop: Spacing.lg,
    paddingBottom: 120,
  },
  popularProductsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionAccentBar: {
    width: 4,
    height: 24,
    backgroundColor: NUQTA.lightMustard,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  popularProductsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NUQTA.nileBlue,
    marginLeft: Spacing.sm,
  },
  popularProductsList: {
    paddingHorizontal: Spacing.base,
    gap: 12,
  },
  popularProductCard: {
    width: 140,
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: NUQTA.nileBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 8px rgba(26, 58, 82, 0.06)' } as any,
    }),
  },
  popularProductImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.background.secondary,
  },
  popularProductInfo: {
    padding: 10,
  },
  popularProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: NUQTA.nileBlue,
    marginBottom: 4,
    minHeight: 34,
  },
  popularProductPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
});

export default React.memo(SearchEmptyState);
