// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { SearchSection, SearchCategory } from '@/types/search.types';
import RecentSearches from './RecentSearches';
import TrendingSearchesSection from './TrendingSearchesSection';
import PopularStoresSection from './PopularStoresSection';
import { NUQTA } from './searchTheme';

const { width } = Dimensions.get('window');

interface CategoriesViewProps {
  sections: SearchSection[];
  recentSearches: any[];
  trendingSearches: any[];
  popularStores: any[];
  onCategoryPress: (category: SearchCategory) => void;
  onViewAll: (sectionId: string) => void;
  onRecentSearchPress: (query: string) => void;
  onRemoveSearch: (id: string) => void;
  onClearAllSearches: () => void;
  onTrendingSearchPress: (query: string) => void;
  onPopularStorePress: (store: any) => void;
}

function CategoriesView({
  sections,
  recentSearches,
  trendingSearches,
  popularStores,
  onCategoryPress,
  onViewAll,
  onRecentSearchPress,
  onRemoveSearch,
  onClearAllSearches,
  onTrendingSearchPress,
  onPopularStorePress,
}: CategoriesViewProps) {
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Premium Quick Search Actions */}
      <View style={styles.quickSearchActions}>
        {/* AI Search Card - Nile Blue Theme */}
        <Pressable
          style={styles.quickSearchCard}
          onPress={() => router.push('/search/ai-search')}
        >
          <LinearGradient
            colors={[NUQTA.nileBlue, NUQTA.nileBlueLight]}
            style={styles.quickSearchGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.quickSearchAccent} />
            <View style={styles.quickSearchIconContainer}>
              <Ionicons name="sparkles" size={26} color={NUQTA.lightMustard} />
            </View>
            <Text style={styles.quickSearchText}>AI Search</Text>
            <Text style={styles.quickSearchSubtext}>Natural language</Text>
          </LinearGradient>
        </Pressable>

        {/* Hotspots Card - Mustard Theme */}
        <Pressable
          style={styles.quickSearchCard}
          onPress={() => router.push('/search/hotspots')}
        >
          <LinearGradient
            colors={[NUQTA.lightMustard, NUQTA.mustardDark]}
            style={styles.quickSearchGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[styles.quickSearchAccent, { backgroundColor: 'rgba(26, 58, 82, 0.1)' }]} />
            <View style={[styles.quickSearchIconContainer, { backgroundColor: 'rgba(26, 58, 82, 0.15)' }]}>
              <Ionicons name="location" size={26} color={NUQTA.nileBlue} />
            </View>
            <Text style={[styles.quickSearchText, { color: NUQTA.nileBlue }]}>Hotspots</Text>
            <Text style={[styles.quickSearchSubtext, { color: 'rgba(26, 58, 82, 0.7)' }]}>Nearby deals</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <RecentSearches
          searches={recentSearches}
          onSearchPress={onRecentSearchPress}
          onRemoveSearch={onRemoveSearch}
          onClearAll={onClearAllSearches}
        />
      )}

      {/* Trending Searches */}
      <TrendingSearchesSection
        searches={trendingSearches}
        onPress={onTrendingSearchPress}
      />

      {/* Popular Stores */}
      <PopularStoresSection
        stores={popularStores}
        onStorePress={onPopularStorePress}
        onViewAll={() => router.push('/explore/stores' as any)}
      />

      {/* Category Sections */}
      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          {/* Premium Section Header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              {section.subtitle && (
                <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
              )}
            </View>
            <Pressable
              style={styles.viewAllButton}
              onPress={() => onViewAll(section.id)}
              accessibilityLabel={`View all ${section.title}`}
              accessibilityRole="button"
              accessibilityHint={`Opens full list of ${section.title} categories`}
            >
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="arrow-forward" size={16} color={NUQTA.nileBlue} style={{ marginLeft: Spacing.xs }} />
            </Pressable>
          </View>

          {/* Premium Categories Grid */}
          <View style={styles.categoriesGrid}>
            {section.categories.map((category) => (
              <Pressable
                key={category.id}
                style={styles.categoryCard}
                onPress={() => onCategoryPress(category)}
                accessibilityLabel={`${category.name} category, up to ${category.cashbackPercentage}% cashback`}
                accessibilityRole="button"
                accessibilityHint={`Opens ${category.name} category page with products and offers`}
              >
                {/* Category Image */}
                <View style={styles.categoryImageContainer}>
                  {category.image ? (
                    <CachedImage
                      source={category.image}
                      style={styles.categoryImage}
                      contentFit="cover"
                      accessibilityLabel={`${category.name} category image`}
                      accessibilityRole="image"
                    />
                  ) : (
                    <LinearGradient
                      colors={[NUQTA.lavenderMist, NUQTA.lavenderDark]}
                      style={styles.categoryImagePlaceholder}
                      accessibilityLabel={`${category.name} category placeholder`}
                    >
                      <Ionicons name="image-outline" size={32} color={NUQTA.nileBlue} />
                    </LinearGradient>
                  )}
                  {/* Premium overlay gradient */}
                  <LinearGradient
                    colors={['transparent', 'rgba(26, 58, 82, 0.03)']}
                    style={styles.categoryImageOverlay}
                  />
                </View>

                {/* Category Info */}
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <View style={styles.cashbackRow}>
                    <LinearGradient
                      colors={[NUQTA.nileBlue, NUQTA.nileBlueLight]}
                      style={styles.cashbackBadge}
                    >
                      <Text style={styles.cashbackBadgeText}>Upto {category.cashbackPercentage}%</Text>
                    </LinearGradient>
                    <Text style={styles.categoryCashback}>cashback</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
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
  quickSearchActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  quickSearchCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: NUQTA.nileBlue,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 6px 24px rgba(26, 58, 82, 0.15)',
      },
    }),
  },
  quickSearchGradient: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    position: 'relative',
    overflow: 'hidden',
  },
  quickSearchAccent: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickSearchIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickSearchText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: 0.2,
  },
  quickSearchSubtext: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
    fontWeight: '500',
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  sectionHeaderLeft: {},
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionAccentBar: {
    width: 4,
    height: 24,
    backgroundColor: NUQTA.lightMustard,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: NUQTA.nileBlue,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    ...Typography.body,
    color: NUQTA.text.secondary,
    fontWeight: '500',
    marginLeft: Spacing.base,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    backgroundColor: NUQTA.lavenderMist,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: NUQTA.lavenderDark,
  },
  viewAllText: {
    ...Typography.body,
    color: NUQTA.nileBlue,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - 46) / 2,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
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
      web: {
        boxShadow: '0px 4px 20px rgba(26, 58, 82, 0.08)',
      },
    }),
  },
  categoryImageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: 110,
  },
  categoryImagePlaceholder: {
    width: '100%',
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryInfo: {
    padding: 14,
  },
  categoryName: {
    ...Typography.body,
    fontWeight: '700',
    color: NUQTA.nileBlue,
    marginBottom: 10,
  },
  cashbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cashbackBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  cashbackBadgeText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  categoryCashback: {
    ...Typography.bodySmall,
    color: NUQTA.lightMustard,
    fontWeight: '600',
  },
});

export default React.memo(CategoriesView);
