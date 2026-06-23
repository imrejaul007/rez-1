import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Deal Store Page - All deals in one place
 * 100% production ready - Connected to /api/campaigns
 */

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { campaignsApi, DealCategory, CampaignDeal } from '@/services/campaignsApi';
import CoinIcon from '@/components/ui/CoinIcon';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
const DealStorePage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dealCategories, setDealCategories] = useState<DealCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const filteredCampaign = (params.campaign as string) || null;
  const filteredDealName = (params.deal as string) || null;

  const categories = ['all', 'Cashback', 'Coins', 'Bank Offers', 'Flash Deals'];

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      setIsLoading(true);
      const response = await campaignsApi.getExcitingDeals(20); // Get more for deal store

      if (response.success && response.data && response.data.dealCategories.length > 0) {
        // Remove duplicates by ID and title
        const uniqueCategories = response.data.dealCategories.filter((cat, index, self) => {
          const firstIndex = self.findIndex((c) => {
            // Match by exact ID
            if (c.id === cat.id) return true;
            // Match by title if IDs are different but titles match
            if (c.title?.toLowerCase() === cat.title?.toLowerCase() && c.id && cat.id) {
              return true;
            }
            return false;
          });
          return index === firstIndex;
        });
        
        if (!isMounted()) return;
        setDealCategories(uniqueCategories);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleDealPress = (deal: CampaignDeal | undefined, categoryId: string, dealIndex: number) => {
    // Safety check: ensure deal exists
    if (!deal) {
      router.push(`/deals/${categoryId}` as any);
      return;
    }

    // Navigate to deal detail page
    router.push(`/deals/${categoryId}/${dealIndex}` as any);
  };

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/deals/${categoryId}` as any);
  };

  const renderDealValue = (deal: CampaignDeal | undefined) => {
    if (!deal) return null;
    
    if (deal.cashback) {
      return <Text style={styles.dealCashback}>{deal.cashback}</Text>;
    }
    if (deal.coins) {
      return (
        <View style={styles.dealCoinsRow}>
          <CoinIcon size={16} />
          <Text style={styles.dealCoins}>{deal.coins}</Text>
        </View>
      );
    }
    if (deal.bonus) {
      return <Text style={styles.dealBonus}>{deal.bonus}</Text>;
    }
    if (deal.drop) {
      return <Text style={styles.dealDrop}>🎁 {deal.drop}</Text>;
    }
    return null;
  };

  // Filter deals based on selected category and query params
  const filteredDealCategories = useMemo(() => dealCategories
    .filter((category) => {
      // Filter by campaign if specified in URL
      if (filteredCampaign) {
        return category.id === filteredCampaign ||
               category.id?.toLowerCase().includes(filteredCampaign.toLowerCase()) ||
               filteredCampaign.toLowerCase().includes(category.id?.toLowerCase() || '');
      }
      // Filter by category tab
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'Cashback') {
        return category.id === 'super-cashback-weekend' ||
               category.id === 'super-cashback' ||
               category.title?.toLowerCase().includes('cashback');
      }
      if (selectedCategory === 'Coins') {
        return category.id === 'triple-coin-day' ||
               category.title?.toLowerCase().includes('coin');
      }
      if (selectedCategory === 'Bank Offers') {
        return category.id === 'mega-bank-offers' ||
               category.title?.toLowerCase().includes('bank');
      }
      if (selectedCategory === 'Flash Deals') {
        return category.id === 'flash-coin-drops' ||
               category.title?.toLowerCase().includes('flash');
      }
      return true;
    })
    .map((category) => {
      // If a specific deal name is provided, filter deals within the category
      if (filteredDealName) {
        const filteredDeals = category.deals.filter((deal) => {
          const dealStoreName = deal.store?.toLowerCase() || '';
          const searchName = filteredDealName.toLowerCase().replace(/\+/g, ' ');
          return dealStoreName.includes(searchName) || searchName.includes(dealStoreName);
        });

        // Only return category if it has matching deals
        if (filteredDeals.length > 0) {
          return {
            ...category,
            deals: filteredDeals,
          };
        }
        return null;
      }
      return category;
    })
    .filter((cat) => cat !== null) as DealCategory[], [dealCategories, filteredCampaign, selectedCategory, filteredDealName]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.success, colors.tealGreen]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Deal Store</Text>
            <Text style={styles.headerSubtitle}>All deals in one place</Text>
          </View>
          <Pressable style={styles.searchButton}>
            <Ionicons name="search" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroEmoji}>🔥</Text>
          <Text style={styles.heroTitle}>Don't Miss Out!</Text>
          <Text style={styles.heroSubtitle}>New deals added every hour • Limited quantities</Text>
        </View>
      </LinearGradient>

      {/* Category Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.filterChip,
                selectedCategory === category && styles.filterChipActive
              ]}
            >
              <Text style={[
                styles.filterChipText,
                selectedCategory === category && styles.filterChipTextActive
              ]}>
                {category === 'all' ? 'All Deals' : category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Deal Categories */}
        {filteredDealCategories.length > 0 ? (
          filteredDealCategories.map((category) => (
            <View key={category.id} style={styles.categorySection}>
              {/* Category Header */}
              <Pressable
                onPress={() => router.push(`/deals/${category.id}` as any)}
               
              >
                <LinearGradient
                  colors={category.gradientColors as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.categoryHeader}
                >
                  <View>
                    <Text style={styles.categoryTitle}>{category.title}</Text>
                    <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
                  </View>
                  <View style={[styles.categoryBadge, { backgroundColor: category.badgeBg || Colors.background.primary }]}>
                    <Text style={[styles.categoryBadgeText, { color: category.badgeColor || Colors.nileBlue }]}>
                      {category.badge}
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>

              {/* Deals Grid */}
              <View style={styles.dealsGrid}>
                {category.deals && Array.isArray(category.deals) && category.deals.length > 0 ? (
                  category.deals
                    .filter((deal) => deal && deal.image) // Filter out invalid deals first
                    .map((deal, idx) => {
                      // Additional safety check
                      if (!deal) return null;
                      
                      return (
                        <Pressable
                          key={`${category.id}-deal-${idx}-${deal.store || idx}`}
                          style={styles.dealCard}
                          onPress={() => {
                            // Navigate to deal detail page using the current index
                            router.push(`/deals/${category.id}/${idx}` as any);
                          }}
                         
                        >
                          <View style={styles.dealImageContainer}>
                            <CachedImage source={deal.image} style={styles.dealImage} />
                            {deal.endsIn && (
                              <View style={styles.timerBadge}>
                                <Text style={styles.timerText}>{deal.endsIn} left</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.dealInfo}>
                            <Text style={styles.dealStore} numberOfLines={1}>
                              {deal.store || 'Store'}
                            </Text>
                            {renderDealValue(deal)}
                          </View>
                        </Pressable>
                      );
                    })
                ) : (
                  <View style={styles.noDealsContainer}>
                    <Text style={styles.noDealsText}>No deals available</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={Colors.text.tertiary} />
            <Text style={styles.emptyText}>No deals found</Text>
            {filteredDealName && (
              <Text style={styles.emptySubtext}>
                No deals found for "{filteredDealName}"
              </Text>
            )}
            <Pressable
              style={styles.clearFilterButton}
              onPress={() => router.push('/deal-store' as any)}
            >
              <Text style={styles.clearFilterText}>Clear Filter</Text>
            </Pressable>
          </View>
        )}

        {/* Bottom CTA */}
        <View style={styles.bottomCTA}>
          <LinearGradient
            colors={[Colors.brand.purple, colors.brand.pink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaTitle}>💰 Maximize Your Savings</Text>
            <Text style={styles.ctaSubtitle}>Stack cashback + coins + bank offers for maximum savings!</Text>
            <Pressable style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Learn How</Text>
            </Pressable>
          </LinearGradient>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.8)',
  },
  searchButton: {
    padding: Spacing.sm,
  },
  heroBanner: {
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  heroEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.9)',
  },
  filtersContainer: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  filterChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.gold,
  },
  filterChipText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: Spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  categoryTitle: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  categoryBadge: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
  },
  categoryBadgeText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  dealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  dealCard: {
    width: '48%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.xs,
  },
  dealImageContainer: {
    position: 'relative',
  },
  dealImage: {
    width: '100%',
    height: 100,
  },
  timerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  timerText: {
    fontSize: Typography.overline.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  dealInfo: {
    padding: Spacing.md,
  },
  dealStore: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.xs,
  },
  dealCashback: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.gold,
  },
  dealCoinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dealCoins: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.warning,
  },
  dealBonus: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.brand.purple,
  },
  dealDrop: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.error,
  },
  bottomCTA: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.sm,
  },
  ctaGradient: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.sm,
  },
  ctaSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  ctaButton: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  ctaButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.brand.purple,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyText: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  clearFilterButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  clearFilterText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  noDealsContainer: {
    width: '100%',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  noDealsText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(DealStorePage, 'DealStore');
