/**
 * StreakLoyaltySection Component
 * Display user's daily streak, brand loyalty, and missions
 * Adapted from Rez_v-2-main StreakLoyaltySection
 */

import React, { memo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import userLoyaltyApi, { UserLoyalty } from '@/services/userLoyaltyApi';
import { LoyaltyData } from '@/data/categoryDummyData';
import CoinIcon from '@/components/ui/CoinIcon';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface StreakLoyaltySectionProps {
  data?: LoyaltyData;
  categorySlug?: string;
  primaryColor?: string;
  onMissionPress?: (missionId: string) => void;
  pageConfig?: any; // receives pageConfig for loyalty config overrides
}

// Category-aware empty text for brand loyalty
const CATEGORY_LOYALTY_TEXT: Record<string, string> = {
  'food-dining': 'Order from restaurants to build brand loyalty tiers',
  'grocery-essentials': 'Shop at stores to build brand loyalty tiers',
  'beauty-wellness': 'Visit salons & spas to build brand loyalty tiers',
  'healthcare': 'Visit clinics & pharmacies to build brand loyalty tiers',
  'fashion': 'Shop at fashion stores to build brand loyalty tiers',
  'fitness-sports': 'Visit gyms & clubs to build brand loyalty tiers',
};

// Helper to convert API loyalty data to component format
const convertApiToLoyaltyData = (apiData: UserLoyalty): LoyaltyData => ({
  streak: {
    current: apiData.streak.current,
    target: apiData.streak.target,
    lastCheckin: apiData.streak.lastCheckin || '',
  },
  brandLoyalty: apiData.brandLoyalty.map(b => ({
    brandId: b.brandId,
    brandName: b.brandName,
    purchaseCount: b.purchaseCount,
    tier: b.tier,
    progress: b.progress,
    nextTierAt: b.nextTierAt,
  })),
  missions: apiData.missions.map(m => ({
    id: m.missionId,
    title: m.title,
    description: m.description || '',
    progress: m.progress,
    target: m.target,
    reward: m.reward,
    icon: m.icon,
  })),
  coins: {
    available: apiData.coins.available,
    expiring: apiData.coins.expiring,
    expiryDays: apiData.coins.expiryDate
      ? Math.max(0, Math.ceil((new Date(apiData.coins.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0,
  },
});

const StreakLoyaltySection: React.FC<StreakLoyaltySectionProps> = ({
  data,
  categorySlug,
  primaryColor,
  onMissionPress,
  pageConfig,
}) => {
  const accentColor = primaryColor || colors.lightMustard;
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [apiData, setApiData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (data) {
      setApiData(data);
      setLoading(false);
      return;
    }

    // Don't call authenticated API until auth is ready
    if (authLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchLoyalty = async () => {
      try {
        setLoading(true);
        const response = await userLoyaltyApi.getLoyalty(categorySlug);
        if (response.success && response.data?.loyalty) {
          const converted = convertApiToLoyaltyData(response.data.loyalty);
          // Override coins with category-specific data if available
          if (response.data.categoryCoins) {
            converted.coins = {
              available: response.data.categoryCoins.available || 0,
              expiring: response.data.categoryCoins.expiring || 0,
              expiryDays: response.data.categoryCoins.expiryDate
                ? Math.max(0, Math.ceil((new Date(response.data.categoryCoins.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : 0,
            };
          }
          if (!isMounted()) return;
          setApiData(converted);
        } else {
          setApiData(null);
        }
      } catch (err) {
        if (!isMounted()) return;
        setApiData(null);
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchLoyalty();
  }, [data, categorySlug, authLoading, isAuthenticated]);

  const displayData = data || apiData;

  const handleMissionPress = (missionId: string) => {
    if (onMissionPress) {
      onMissionPress(missionId);
    } else if (categorySlug) {
      router.push(`/MainCategory/${categorySlug}/loyalty/missions` as any);
    } else {
      router.push('/missions' as any);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={accentColor} />
      </View>
    );
  }

  if (!displayData) {
    return null;
  }

  const hasBrands = displayData.brandLoyalty && displayData.brandLoyalty.length > 0;
  const hasMissions = displayData.missions && displayData.missions.length > 0;

  return (
    <View style={styles.container}>
      {/* Daily Streak */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.fireEmoji}>🔥</Text>
          <Text style={styles.sectionTitle}>Daily Streak</Text>
        </View>
        <View style={styles.streakRow}>
          {[...Array(displayData.streak.target)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.streakDot,
                i < displayData.streak.current && [styles.streakDotActive, { backgroundColor: accentColor }],
              ]}
            >
              {i < displayData.streak.current && (
                <Ionicons name="checkmark" size={12} color={colors.background.primary} />
              )}
            </View>
          ))}
        </View>
        <Text style={styles.streakText}>
          {displayData.streak.current}/{displayData.streak.target} days - Keep going!
        </Text>
      </View>

      {/* Brand Loyalty */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.crownEmoji}>👑</Text>
          <Text style={styles.sectionTitle}>Brand Loyalty</Text>
        </View>
        {hasBrands ? (
          <View style={styles.loyaltyList}>
            {displayData.brandLoyalty.slice(0, 3).map((brand) => (
              <View key={brand.brandId} style={styles.loyaltyItem}>
                <View style={styles.loyaltyInfo}>
                  <Text style={styles.loyaltyBrand}>{brand.brandName}</Text>
                  <Text style={styles.loyaltyTier}>{brand.tier}</Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${brand.progress}%`, backgroundColor: accentColor }]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {brand.purchaseCount}/{brand.nextTierAt}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            {pageConfig?.loyaltyConfig?.emptyMessage
              || CATEGORY_LOYALTY_TEXT[categorySlug || '']
              || 'Explore stores to build loyalty and earn rewards'}
          </Text>
        )}
      </View>

      {/* Weekly Missions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.targetEmoji}>🎯</Text>
          <Text style={styles.sectionTitle}>Weekly Missions</Text>
        </View>
        {hasMissions ? (
          <View style={styles.missionsList}>
            {displayData.missions.slice(0, 3).map((mission) => (
              <Pressable
                key={mission.id}
                style={styles.missionItem}
                onPress={() => handleMissionPress(mission.id)}
               
              >
                <View style={styles.missionIcon}>
                  <Text style={styles.missionEmoji}>{mission.icon}</Text>
                </View>
                <View style={styles.missionInfo}>
                  <Text style={styles.missionTitle}>{mission.title}</Text>
                  <View style={styles.missionProgress}>
                    <View style={styles.missionProgressBar}>
                      <View
                        style={[
                          styles.missionProgressFill,
                          { width: `${(mission.progress / mission.target) * 100}%`, backgroundColor: accentColor },
                        ]}
                      />
                    </View>
                    <Text style={styles.missionProgressText}>
                      {mission.progress}/{mission.target}
                    </Text>
                  </View>
                </View>
                <View style={styles.missionReward}>
                  <CoinIcon size={14} />
                  <Text style={styles.rewardText}>{mission.reward}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            Complete missions to earn coin rewards
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(11, 34, 64, 0.04), 0 8px 24px rgba(11, 34, 64, 0.06)',
      },
    }),
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fireEmoji: {
    fontSize: 18,
  },
  crownEmoji: {
    fontSize: 18,
  },
  targetEmoji: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  streakRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  streakDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakDotActive: {
    backgroundColor: colors.lightMustard,
  },
  streakText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  loyaltyList: {
    gap: 12,
  },
  loyaltyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loyaltyInfo: {
    width: 80,
  },
  loyaltyBrand: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  loyaltyTier: {
    fontSize: 10,
    color: colors.warningScale[400],
    fontWeight: '600',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.lightMustard,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: colors.neutral[400],
    width: 30,
    textAlign: 'right',
  },
  missionsList: {
    gap: 10,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    padding: 12,
    borderRadius: 12,
  },
  missionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  missionEmoji: {
    fontSize: 18,
  },
  missionInfo: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  missionProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  missionProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  missionProgressFill: {
    height: '100%',
    backgroundColor: colors.lightMustard,
    borderRadius: 2,
  },
  missionProgressText: {
    fontSize: 10,
    color: colors.neutral[400],
  },
  missionReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  coinSmall: {
    fontSize: 10,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warningScale[700],
  },
  emptyText: {
    fontSize: 13,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: 12,
  },
});

export default memo(StreakLoyaltySection);
