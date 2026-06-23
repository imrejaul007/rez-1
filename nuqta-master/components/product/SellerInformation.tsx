import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

/**
 * SellerInformation Component
 *
 * Displays seller/store information with ratings, performance metrics, and actions
 * Features:
 * - Store profile with logo and name
 * - Store ratings and review count
 * - Performance badges (verified, top seller, etc.)
 * - Quick actions (visit store, view products, contact)
 * - Store statistics (products, followers, response time)
 * - Seller location
 */

interface SellerStats {
  totalProducts: number;
  followers: number;
  responseTime: string; // e.g., "< 2 hours"
  positiveRatings: number; // percentage
  yearsActive: number;
}

interface SellerBadge {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}

interface SellerInformationProps {
  storeId: string;
  storeName: string;
  storeLogo?: string;
  storeRating?: number;
  storeReviewCount?: number;
  location?: string;
  stats?: SellerStats;
  badges?: SellerBadge[];
  isVerified?: boolean;
  onVisitStore?: () => void;
  onViewProducts?: () => void;
  onContact?: () => void;
}

export const SellerInformation: React.FC<SellerInformationProps> = ({
  storeId,
  storeName,
  storeLogo,
  storeRating = 4.5,
  storeReviewCount = 0,
  location,
  stats,
  badges = [],
  isVerified = true,
  onVisitStore,
  onViewProducts,
  onContact,
}) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Default stats if not provided
  const defaultStats: SellerStats = {
    totalProducts: 250,
    followers: 1200,
    responseTime: '< 2 hours',
    positiveRatings: 95,
    yearsActive: 3,
  };

  const sellerStats = stats || defaultStats;

  // Default badges if not provided
  const defaultBadges: SellerBadge[] = [
    {
      id: 'verified',
      icon: 'shield-checkmark',
      label: 'Verified Seller',
      color: colors.lightMustard,
    },
    {
      id: 'top-rated',
      icon: 'star',
      label: 'Top Rated',
      color: colors.warningScale[400],
    },
  ];

  const sellerBadges = badges.length > 0 ? badges : (isVerified ? defaultBadges : []);

  /**
   * Handle visit store
   */
  const handleVisitStore = () => {
    if (onVisitStore) {
      onVisitStore();
    } else {
      router.push(`/StoreListPage?storeId=${storeId}` as any);
    }
  };

  /**
   * Handle view products
   */
  const handleViewProducts = () => {
    if (onViewProducts) {
      onViewProducts();
    } else {
      router.push(`/StoreListPage?storeId=${storeId}&tab=products` as any);
    }
  };

  /**
   * Handle contact seller
   */
  const handleContact = () => {
    if (onContact) {
      onContact();
    } else {
      // Navigate to chat or contact page
      router.push(`/help/chat?storeId=${storeId}` as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header - Always Visible */}
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
       
      >
        <View style={styles.headerContent}>
          {/* Store Logo */}
          <View style={styles.logoContainer}>
            {storeLogo ? (
              <CachedImage source={storeLogo} style={styles.logo} contentFit="cover" />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Ionicons name="storefront" size={24} color={colors.brand.purpleLight} />
              </View>
            )}
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.lightMustard} />
              </View>
            )}
          </View>

          {/* Store Info */}
          <View style={styles.storeInfo}>
            <View style={styles.storeNameRow}>
              <ThemedText style={styles.storeName} numberOfLines={1}>
                {storeName}
              </ThemedText>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.neutral[500]}
              />
            </View>

            {/* Rating */}
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={colors.brand.goldBright} />
              <ThemedText style={styles.ratingText}>{storeRating.toFixed(1)}</ThemedText>
              {storeReviewCount > 0 && (
                <ThemedText style={styles.reviewCount}>
                  ({storeReviewCount.toLocaleString()} reviews)
                </ThemedText>
              )}
            </View>

            {/* Location */}
            {location && (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={12} color={colors.neutral[500]} />
                <ThemedText style={styles.locationText} numberOfLines={1}>
                  {location}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      {/* Quick Action Buttons - Always Visible */}
      <View style={styles.quickActions}>
        <Pressable
          style={styles.quickActionButton}
          onPress={handleVisitStore}
         
        >
          <Ionicons name="storefront-outline" size={18} color={colors.brand.purpleLight} />
          <ThemedText style={styles.quickActionText}>Visit Store</ThemedText>
        </Pressable>

        <Pressable
          style={styles.quickActionButton}
          onPress={handleViewProducts}
         
        >
          <Ionicons name="grid-outline" size={18} color={colors.brand.purpleLight} />
          <ThemedText style={styles.quickActionText}>Products</ThemedText>
        </Pressable>

        <Pressable
          style={styles.quickActionButton}
          onPress={handleContact}
         
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.brand.purpleLight} />
          <ThemedText style={styles.quickActionText}>Contact</ThemedText>
        </Pressable>
      </View>

      {/* Expanded Details */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Divider */}
          <View style={styles.divider} />

          {/* Performance Badges */}
          {sellerBadges.length > 0 && (
            <View style={styles.badgesSection}>
              <ThemedText style={styles.sectionTitle}>Achievements</ThemedText>
              <View style={styles.badgesContainer}>
                {sellerBadges.map(badge => (
                  <View key={badge.id} style={styles.badge}>
                    <View style={[styles.badgeIcon, { backgroundColor: `${badge.color}15` }]}>
                      <Ionicons name={badge.icon} size={16} color={badge.color} />
                    </View>
                    <ThemedText style={styles.badgeLabel}>{badge.label}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Statistics */}
          <View style={styles.statsSection}>
            <ThemedText style={styles.sectionTitle}>Store Statistics</ThemedText>
            <View style={styles.statsGrid}>
              {/* Products */}
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {sellerStats.totalProducts.toLocaleString()}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Products</ThemedText>
              </View>

              {/* Followers */}
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {sellerStats.followers >= 1000
                    ? `${(sellerStats.followers / 1000).toFixed(1)}K`
                    : sellerStats.followers.toLocaleString()}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Followers</ThemedText>
              </View>

              {/* Positive Ratings */}
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{sellerStats.positiveRatings}%</ThemedText>
                <ThemedText style={styles.statLabel}>Positive</ThemedText>
              </View>

              {/* Years Active */}
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{sellerStats.yearsActive}</ThemedText>
                <ThemedText style={styles.statLabel}>Years</ThemedText>
              </View>
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={styles.metricsSection}>
            <View style={styles.metricRow}>
              <Ionicons name="time-outline" size={18} color={colors.lightMustard} />
              <View style={styles.metricContent}>
                <ThemedText style={styles.metricLabel}>Response Time</ThemedText>
                <ThemedText style={styles.metricValue}>{sellerStats.responseTime}</ThemedText>
              </View>
            </View>

            <View style={styles.metricRow}>
              <Ionicons name="ribbon-outline" size={18} color={colors.brand.purpleLight} />
              <View style={styles.metricContent}>
                <ThemedText style={styles.metricLabel}>Seller Rating</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {sellerStats.positiveRatings}% positive feedback
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Follow Button */}
          <Pressable
            style={styles.followButton}
           
            onPress={() => {
              // TODO: Implement follow functionality
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.brand.purpleLight} />
            <ThemedText style={styles.followButtonText}>Follow Store</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: 16,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },

  // Header
  header: {
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  // Logo
  logoContainer: {
    position: 'relative',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.neutral[200],
  },
  logoPlaceholder: {
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.background.primary,
    borderRadius: 10,
  },

  // Store Info
  storeInfo: {
    flex: 1,
    gap: 6,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  reviewCount: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.neutral[500],
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint.pink,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
    gap: 6,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },

  // Expanded Content
  expandedContent: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginBottom: 16,
  },

  // Section Title
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 12,
  },

  // Badges
  badgesSection: {
    marginBottom: 20,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[700],
  },

  // Statistics
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.purpleLight,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.neutral[500],
  },

  // Metrics
  metricsSection: {
    gap: 12,
    marginBottom: 20,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },

  // Follow Button
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.brand.purpleLight,
    gap: 8,
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
});

export default React.memo(SellerInformation);
