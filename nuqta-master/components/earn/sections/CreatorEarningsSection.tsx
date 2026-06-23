import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import { SkeletonBox } from '@/components/earn/SkeletonLoader';
import { Creator, CreatorPick } from '@/services/creatorsApi';
import { Colors, Spacing } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

const NUQTA_COIN = BRAND.COIN_IMAGE;

interface CreatorEarningsSectionProps {
  featuredCreators: Creator[];
  trendingPicks: CreatorPick[];
  likedPicks: Set<string>;
  creatorStatus: 'none' | 'pending' | 'approved' | 'rejected';
  handlePickLike: (pickId: string) => void;
  navigateTo: (path: string) => void;
  currencySymbol: string;
}

const CreatorEarningsSection = React.memo(function CreatorEarningsSection({
  featuredCreators,
  trendingPicks,
  likedPicks,
  creatorStatus,
  handlePickLike,
  navigateTo,
  currencySymbol,
}: CreatorEarningsSectionProps) {
  return (
    <LinearGradient
      colors={['#FAF5FF', '#FDF2F8']}
      style={styles.creatorSection}
    >
      <View style={styles.creatorHeader}>
        <LinearGradient
          colors={[colors.brand.purpleMedium, colors.brand.pink]}
          style={styles.creatorIcon}
        >
          <Ionicons name="sparkles" size={20} color={Colors.text.inverse} />
        </LinearGradient>
        <View style={styles.creatorHeaderText}>
          <Text style={styles.creatorTitle}>Become a Creator</Text>
          <Text style={styles.creatorSubtitle}>Earn by recommending products</Text>
        </View>
        <Pressable onPress={() => navigateTo('/creators')} style={styles.exploreLink}>
          <Text style={styles.exploreLinkText}>Explore</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.brand.purpleMedium} />
        </Pressable>
      </View>

      {/* Featured Creators */}
      <View style={styles.featuredCreatorsGrid}>
        {featuredCreators.length > 0 ? featuredCreators.slice(0, 2).map((creator) => (
          <Pressable
            key={creator.id}
            style={styles.creatorCard}
            onPress={() => navigateTo(`/creator/${creator.id}`)}
          >
            <View style={styles.creatorAvatarRow}>
              <CachedImage
                source={creator.avatar}
                style={styles.creatorAvatar}
                width={40}
                height={40}
              />
              {creator.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.info} />
                </View>
              )}
            </View>
            <Text style={styles.creatorName}>{creator.name}</Text>
            <View style={styles.creatorStats}>
              <Ionicons name="star" size={12} color={Colors.warning} />
              <Text style={styles.creatorStatText}>{creator.rating}</Text>
              <Text style={styles.creatorStatDivider}>{'\u2022'}</Text>
              <Text style={styles.creatorStatText}>{creator.totalPicks} picks</Text>
            </View>
          </Pressable>
        )) : (
          <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
            <View style={{ flex: 1, alignItems: 'center', gap: 8, padding: 12 }}>
              <SkeletonBox width={56} height={56} borderRadius={28} />
              <SkeletonBox width={80} height={14} borderRadius={4} />
              <SkeletonBox width={60} height={12} borderRadius={4} />
            </View>
            <View style={{ flex: 1, alignItems: 'center', gap: 8, padding: 12 }}>
              <SkeletonBox width={56} height={56} borderRadius={28} />
              <SkeletonBox width={80} height={14} borderRadius={4} />
              <SkeletonBox width={60} height={12} borderRadius={4} />
            </View>
          </View>
        )}
      </View>

      {/* Trending Picks */}
      <View style={styles.trendingSection}>
        <Text style={styles.trendingTitle}>Trending Picks</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.trendingScroll}
        >
          {trendingPicks.length > 0 ? trendingPicks.map((pick) => (
            <Pressable
              key={pick.id}
              style={styles.pickCard}
              onPress={() => navigateTo(`/picks/${pick.id}`)}
            >
              <View style={styles.pickImageContainer}>
                <CachedImage
                  source={pick.productImage}
                  style={styles.pickImage}
                  width={140}
                  height={140}
                />
                {pick.videoUrl && (
                  <View style={styles.pickVideoBadge}>
                    <Ionicons name="videocam" size={11} color={Colors.text.inverse} />
                  </View>
                )}
                <Pressable
                  style={styles.pickHeartButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handlePickLike(pick.id);
                  }}
                >
                  <Ionicons
                    name={likedPicks.has(pick.id) ? 'heart' : 'heart-outline'}
                    size={16}
                    color={likedPicks.has(pick.id) ? Colors.error : Colors.text.primary}
                  />
                </Pressable>
                <View style={styles.pickTag}>
                  <Text style={styles.pickTagText}>{pick.tag}</Text>
                </View>
                <View style={styles.pickViewsBadge}>
                  <Ionicons name="trending-up" size={12} color={colors.brand.pink} />
                  <Text style={styles.pickViewsText}>{(pick.views / 1000).toFixed(1)}k</Text>
                </View>
              </View>
              <View style={styles.pickContent}>
                <Text style={styles.pickTitle} numberOfLines={2}>{pick.title}</Text>
                <View style={styles.pickPriceRow}>
                  <Text style={styles.pickPrice}>{currencySymbol}{pick.productPrice.toLocaleString()}</Text>
                  <Text style={styles.pickBrand}>{pick.productBrand}</Text>
                </View>
                <View style={styles.pickStatsRow}>
                  <Ionicons name="eye-outline" size={12} color={Colors.text.tertiary} />
                  <Text style={styles.pickStatText}>{(pick.views / 1000).toFixed(1)}k</Text>
                  <Text style={styles.pickStatDivider}>{'\u2022'}</Text>
                  <Text style={styles.pickStatText}>{pick.purchases} sold</Text>
                </View>
              </View>
            </Pressable>
          )) : (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ width: 140, gap: 8 }}>
                  <SkeletonBox width={140} height={100} borderRadius={12} />
                  <SkeletonBox width={120} height={14} borderRadius={4} />
                  <SkeletonBox width={80} height={12} borderRadius={4} />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Creator CTA */}
      {creatorStatus === 'approved' ? (
        <Pressable
          style={styles.creatorCTA}
          onPress={() => navigateTo('/creator-dashboard')}
        >
          <LinearGradient
            colors={['#9333EA', colors.brand.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.creatorCTAGradient}
          >
            <CachedImage source={NUQTA_COIN} style={{ width: 22, height: 22, borderRadius: 11 }} />
            <Text style={styles.creatorCTAText}>Go to Creator Dashboard</Text>
          </LinearGradient>
        </Pressable>
      ) : creatorStatus === 'pending' ? (
        <View style={[styles.creatorCTA, { opacity: 0.7 }]}>
          <LinearGradient
            colors={[colors.warningScale[700], colors.warningScale[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.creatorCTAGradient}
          >
            <Ionicons name="time" size={20} color={Colors.text.inverse} />
            <Text style={styles.creatorCTAText}>Application Under Review</Text>
          </LinearGradient>
        </View>
      ) : (
        <Pressable
          style={styles.creatorCTA}
          onPress={() => navigateTo('/creator-apply')}
        >
          <LinearGradient
            colors={[colors.brand.purpleMedium, colors.brand.pink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.creatorCTAGradient}
          >
            <CachedImage source={NUQTA_COIN} style={{ width: 22, height: 22, borderRadius: 11 }} />
            <Text style={styles.creatorCTAText}>Start Earning as Creator</Text>
          </LinearGradient>
        </Pressable>
      )}
    </LinearGradient>
  );
});

export default CreatorEarningsSection;
