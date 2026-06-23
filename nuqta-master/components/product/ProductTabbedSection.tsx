/**
 * ProductTabbedSection Component
 *
 * Tabbed content section with:
 * - Description tab
 * - Specs tab
 * - Reviews tab (inline reviews)
 * - Lock Info tab
 *
 * Based on reference design from ProductPage redesign
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { triggerImpact } from '@/utils/haptics';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

type TabId = 'description' | 'specs' | 'reviews' | 'lockinfo';

interface TabConfig {
  id: TabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface Specification {
  key: string;
  value: string;
}

interface Review {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  date: string;
  text: string;
  cashbackEarned?: number;
}

interface LockDetails {
  isLocked: boolean;
  lockedAt?: string;
  expiresAt?: string;
  lockFee?: number;
}

interface ProductTabbedSectionProps {
  /** Product description */
  description?: string;
  /** Product features (bullet points) */
  features?: string[];
  /** Product specifications */
  specifications?: Specification[];
  /** Product reviews */
  reviews?: Review[];
  /** Average rating */
  averageRating?: number;
  /** Total review count */
  reviewCount?: number;
  /** Lock details */
  lockDetails?: LockDetails;
  /** Callback when View All Reviews is pressed */
  onViewAllReviews?: () => void;
  /** Currency symbol */
  currency?: string;
  /** Custom style */
  style?: any;
}

// Tab configuration
const TABS: TabConfig[] = [
  { id: 'description', label: 'Description', icon: 'document-text-outline' },
  { id: 'specs', label: 'Specs', icon: 'list-outline' },
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { id: 'lockinfo', label: 'Lock Info', icon: 'lock-closed-outline' },
];

// Default reviews for display
const DEFAULT_REVIEWS: Review[] = [
  {
    id: '1',
    userName: 'Rahul Sharma',
    rating: 5,
    date: '2 days ago',
    text: 'Amazing quality and fast delivery. The product exceeded my expectations. Definitely worth every penny! Will order again.',
  },
  {
    id: '2',
    userName: 'Priya Patel',
    rating: 4,
    date: '5 days ago',
    text: 'Great product overall. The Lock feature made it super easy to reserve before visiting the store. Customer service was also very helpful.',
  },
  {
    id: '3',
    userName: 'Amit Kumar',
    rating: 5,
    date: '1 week ago',
    text: 'Excellent value for money! The coins bonus was a nice touch. I saved a lot using the lock feature when prices were about to increase.',
  },
  {
    id: '4',
    userName: 'Sneha Gupta',
    rating: 4,
    date: '2 weeks ago',
    text: 'Very satisfied with my purchase. The delivery was quick and the packaging was secure. Will recommend to friends and family.',
  },
  {
    id: '5',
    userName: 'Vikram Singh',
    rating: 5,
    date: '3 weeks ago',
    text: 'Best deal I found online! The cashback and coins made it even better. Highly recommend using the lock feature.',
  }
];

// Default specifications
const DEFAULT_SPECS: Specification[] = [
  { key: 'Category', value: 'Food & Dining' },
  { key: 'Sub Category', value: 'Cafe & Snacks' },
  { key: 'Availability', value: 'In Stock' },
  { key: 'Delivery Time', value: '30-45 mins' },
  { key: 'Pickup Available', value: 'Yes' },
  { key: 'Return Policy', value: 'Non-returnable' },
  { key: 'Payment Methods', value: 'All methods accepted' },
  { key: BRAND.COIN_NAME, value: '10% of purchase' },
  { key: 'Cashback', value: 'Up to 5%' },
  { key: 'Lock Duration', value: 'Up to 48 hours' }
];

// Default features
const DEFAULT_FEATURES: string[] = [
  'Premium quality ingredients',
  'Freshly prepared on order',
  'Hygienic packaging',
  'Best price guaranteed',
  `Earn ${BRAND.COIN_NAME} on every purchase`,
  'Get cashback on completion'
];

export const ProductTabbedSection: React.FC<ProductTabbedSectionProps> = ({
  description = 'No description available',
  features = [],
  specifications = [],
  reviews = [],
  averageRating = 4.2,
  reviewCount = 156,
  lockDetails,
  onViewAllReviews,
  currency,
  style,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = currency || getCurrencySymbol();
  const [activeTab, setActiveTab] = useState<TabId>('description');

  // Use default data if not provided
  const displayReviews = reviews.length > 0 ? reviews : DEFAULT_REVIEWS;
  const displaySpecs = specifications.length > 0 ? specifications : DEFAULT_SPECS;
  const displayFeatures = features.length > 0 ? features : DEFAULT_FEATURES;

  const handleTabPress = (tabId: TabId) => {
    triggerImpact('Light');
    setActiveTab(tabId);
  };

  // Render stars
  const renderStars = (rating: number, size: number = 14) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline'}
          size={size}
          color={colors.warningScale[400]}
        />
      );
    }
    return stars;
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'description':
        return (
          <View style={styles.tabContent}>
            {/* Product Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>About This Product</Text>
              <Text style={styles.descriptionText}>{description}</Text>
            </View>

            {/* Features List */}
            <View style={styles.featuresList}>
              <Text style={styles.sectionTitle}>Key Features</Text>
              {displayFeatures.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="checkmark" size={14} color={colors.background.primary} />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Why Buy From Nuqta */}
            <View style={styles.whyBuySection}>
              <Text style={styles.sectionTitle}>{`Why Buy From ${BRAND.APP_NAME}?`}</Text>
              <View style={styles.whyBuyGrid}>
                <View style={styles.whyBuyItem}>
                  <View style={[styles.whyBuyIcon, { backgroundColor: colors.linen }]}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.lightMustard} />
                  </View>
                  <Text style={styles.whyBuyLabel}>100% Genuine</Text>
                  <Text style={styles.whyBuyDesc}>Quality assured products</Text>
                </View>
                <View style={styles.whyBuyItem}>
                  <View style={[styles.whyBuyIcon, { backgroundColor: colors.tint.amberLight }]}>
                    <Ionicons name="cash-outline" size={20} color={colors.warningScale[400]} />
                  </View>
                  <Text style={styles.whyBuyLabel}>Cashback</Text>
                  <Text style={styles.whyBuyDesc}>Up to 5% on every order</Text>
                </View>
                <View style={styles.whyBuyItem}>
                  <View style={[styles.whyBuyIcon, { backgroundColor: colors.tint.purple }]}>
                    <Ionicons name="wallet-outline" size={20} color={colors.brand.purpleLight} />
                  </View>
                  <Text style={styles.whyBuyLabel}>{BRAND.COIN_NAME}</Text>
                  <Text style={styles.whyBuyDesc}>Earn 10% as coins</Text>
                </View>
                <View style={styles.whyBuyItem}>
                  <View style={[styles.whyBuyIcon, { backgroundColor: colors.tint.blueLight }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.infoScale[400]} />
                  </View>
                  <Text style={styles.whyBuyLabel}>Price Lock</Text>
                  <Text style={styles.whyBuyDesc}>Freeze price for 48hrs</Text>
                </View>
              </View>
            </View>

            {/* Quick Info */}
            <View style={styles.quickInfo}>
              <View style={styles.quickInfoItem}>
                <Ionicons name="time-outline" size={22} color={colors.lightMustard} />
                <Text style={styles.quickInfoText}>Fast Delivery</Text>
              </View>
              <View style={styles.quickInfoDivider} />
              <View style={styles.quickInfoItem}>
                <Ionicons name="refresh-outline" size={22} color={colors.lightMustard} />
                <Text style={styles.quickInfoText}>Easy Returns</Text>
              </View>
              <View style={styles.quickInfoDivider} />
              <View style={styles.quickInfoItem}>
                <Ionicons name="card-outline" size={22} color={colors.lightMustard} />
                <Text style={styles.quickInfoText}>Secure Pay</Text>
              </View>
            </View>
          </View>
        );

      case 'specs':
        return (
          <View style={styles.tabContent}>
            <View style={styles.specsTable}>
              {displaySpecs.map((spec, index) => (
                <View
                  key={index}
                  style={[
                    styles.specRow,
                    index % 2 === 0 && styles.specRowAlt,
                  ]}
                >
                  <Text style={styles.specKey}>{spec.key}</Text>
                  <Text style={styles.specValue}>{spec.value}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'reviews':
        return (
          <View style={styles.tabContent}>
            {/* Rating Summary */}
            <View style={styles.ratingSummary}>
              <View style={styles.ratingBig}>
                <Text style={styles.ratingNumber}>{averageRating.toFixed(1)}</Text>
                <View style={styles.ratingStars}>{renderStars(averageRating, 16)}</View>
                <Text style={styles.ratingCount}>{reviewCount} reviews</Text>
              </View>
            </View>

            {/* Reviews Header */}
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              {onViewAllReviews && (
                <Pressable onPress={onViewAllReviews}>
                  <Text style={styles.viewAllText}>View All</Text>
                </Pressable>
              )}
            </View>

            {/* Review Cards */}
            <View style={styles.reviewsList}>
              {displayReviews.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUser}>
                      {review.userAvatar ? (
                        <CachedImage source={{ uri: review.userAvatar }} style={styles.userAvatar} />
                      ) : (
                        <View style={styles.userAvatarPlaceholder}>
                          <Text style={styles.userAvatarText}>
                            {review.userName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={styles.userName}>{review.userName}</Text>
                        <View style={styles.reviewStars}>{renderStars(review.rating, 12)}</View>
                      </View>
                    </View>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                  <Text style={styles.reviewText}>{review.text}</Text>
                  {review.cashbackEarned && (
                    <View style={styles.cashbackBadge}>
                      <Text style={styles.cashbackText}>
                        Earned {currencySymbol}{review.cashbackEarned} cashback
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        );

      case 'lockinfo':
        return (
          <View style={styles.tabContent}>
            {lockDetails?.isLocked ? (
              <View style={styles.lockInfoCard}>
                <View style={styles.lockInfoHeader}>
                  <View style={styles.lockIconBg}>
                    <Ionicons name="lock-closed" size={24} color={colors.background.primary} />
                  </View>
                  <View>
                    <Text style={styles.lockInfoTitle}>Price Locked!</Text>
                    <Text style={styles.lockInfoSubtitle}>Your price is protected</Text>
                  </View>
                </View>

                <View style={styles.lockInfoDetails}>
                  {lockDetails.lockFee && (
                    <View style={styles.lockInfoRow}>
                      <Text style={styles.lockInfoLabel}>Lock Fee Paid</Text>
                      <Text style={styles.lockInfoValue}>
                        {currencySymbol}{lockDetails.lockFee}
                      </Text>
                    </View>
                  )}

                  {lockDetails.expiresAt && (
                    <View style={styles.lockInfoRow}>
                      <Text style={styles.lockInfoLabel}>Expires At</Text>
                      <Text style={styles.lockInfoValue}>
                        {new Date(lockDetails.expiresAt).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.lockBenefits}>
                  <View style={styles.lockBenefit}>
                    <Ionicons name="shield-checkmark" size={18} color={colors.lightMustard} />
                    <Text style={styles.lockBenefitText}>Price won't increase</Text>
                  </View>
                  <View style={styles.lockBenefit}>
                    <Ionicons name="time" size={18} color={colors.lightMustard} />
                    <Text style={styles.lockBenefitText}>Reserved for you</Text>
                  </View>
                  <View style={styles.lockBenefit}>
                    <Ionicons name="cash" size={18} color={colors.lightMustard} />
                    <Text style={styles.lockBenefitText}>Fee adjusted at checkout</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noLockCard}>
                <View style={styles.noLockIcon}>
                  <Ionicons name="lock-open-outline" size={40} color={colors.neutral[400]} />
                </View>
                <Text style={styles.noLockTitle}>No Active Lock</Text>
                <Text style={styles.noLockText}>
                  Lock this product to protect the price and reserve it for yourself
                </Text>

                <View style={styles.lockBenefitsPreview}>
                  <Text style={styles.benefitsTitle}>Benefits of Locking:</Text>
                  <View style={styles.benefitRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.lightMustard} />
                    <Text style={styles.benefitText}>Freeze the price for up to 48 hours</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.lightMustard} />
                    <Text style={styles.benefitText}>Reserve product availability</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.lightMustard} />
                    <Text style={styles.benefitText}>Lock fee adjusted at checkout</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Tab Headers */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
            ]}
            onPress={() => handleTabPress(tab.id)}
           
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.id ? colors.lightMustard : colors.neutral[500]}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tab Content */}
      {renderTabContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },

  // Tabs
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
  },

  tabsContent: {
    paddingHorizontal: 8,
  },

  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  tabActive: {
    borderBottomColor: colors.lightMustard,
    backgroundColor: colors.background.primary,
  },

  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[500],
  },

  tabLabelActive: {
    color: colors.lightMustard,
    fontWeight: '600',
  },

  // Tab Content
  tabContent: {
    padding: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 12,
  },

  // Description Tab
  descriptionSection: {
    marginBottom: 20,
  },

  descriptionText: {
    fontSize: 14,
    color: colors.neutral[600],
    lineHeight: 22,
  },

  featuresList: {
    marginBottom: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },

  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.lightMustard,
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[700],
    lineHeight: 20,
  },

  whyBuySection: {
    marginBottom: 20,
  },

  whyBuyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  whyBuyItem: {
    width: '47%',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },

  whyBuyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  whyBuyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 2,
  },

  whyBuyDesc: {
    fontSize: 12,
    color: colors.neutral[500],
  },

  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.linen,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.linen,
  },

  quickInfoItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },

  quickInfoDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.linen,
  },

  quickInfoText: {
    fontSize: 11,
    color: colors.nileBlue,
    fontWeight: '600',
  },

  // Specs Tab
  specsTable: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },

  specRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  specRowAlt: {
    backgroundColor: colors.neutral[50],
  },

  specKey: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
  },

  specValue: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[900],
    fontWeight: '600',
    textAlign: 'right',
  },

  // Reviews Tab
  ratingSummary: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    marginBottom: 16,
  },

  ratingBig: {
    alignItems: 'center',
  },

  ratingNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.neutral[800],
  },

  ratingStars: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 6,
  },

  ratingCount: {
    fontSize: 13,
    color: colors.neutral[500],
  },

  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.lightMustard,
  },

  reviewsList: {
    gap: 12,
  },

  reviewCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },

  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightMustard,
    alignItems: 'center',
    justifyContent: 'center',
  },

  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },

  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 2,
  },

  reviewStars: {
    flexDirection: 'row',
    gap: 1,
  },

  reviewDate: {
    fontSize: 12,
    color: colors.neutral[400],
  },

  reviewText: {
    fontSize: 14,
    color: colors.neutral[600],
    lineHeight: 20,
    marginBottom: 10,
  },

  cashbackBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.linen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.linen,
  },

  cashbackText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
  },

  // Lock Info Tab
  lockInfoCard: {
    backgroundColor: colors.linen,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.linen,
  },

  lockInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  lockIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightMustard,
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
  },

  lockInfoSubtitle: {
    fontSize: 13,
    color: colors.neutral[500],
  },

  lockInfoDetails: {
    backgroundColor: colors.background.primary,
    borderRadius: 10,
    padding: 14,
    gap: 12,
    marginBottom: 14,
  },

  lockInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  lockInfoLabel: {
    fontSize: 13,
    color: colors.neutral[500],
  },

  lockInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[900],
  },

  lockBenefits: {
    gap: 8,
  },

  lockBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  lockBenefitText: {
    fontSize: 13,
    color: colors.neutral[700],
  },

  // No Lock State
  noLockCard: {
    alignItems: 'center',
    padding: 20,
  },

  noLockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  noLockTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 6,
  },

  noLockText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  lockBenefitsPreview: {
    width: '100%',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
  },

  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 12,
  },

  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  benefitText: {
    fontSize: 13,
    color: colors.neutral[600],
  },

  // Empty State
  emptyText: {
    fontSize: 14,
    color: colors.neutral[400],
    textAlign: 'center',
    padding: 20,
  },
});

export default React.memo(ProductTabbedSection);
