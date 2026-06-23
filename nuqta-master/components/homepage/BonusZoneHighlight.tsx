/**
 * BonusZoneHighlight
 *
 * Lightweight homepage section that shows 1-2 featured Bonus Zone campaigns.
 * Renders nothing if there are no featured active campaigns.
 * Lazy-loaded in NearUTabContent to avoid bloating the home page.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import bonusZoneApi, { BonusZoneCampaign } from '@/services/bonusZoneApi';
import BonusZoneCard from '@/components/earn/BonusZoneCard';
import { useGetCurrencySymbol, useRegionState } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const MAX_FEATURED = 2;

const BonusZoneHighlight: React.FC = () => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const regionState = useRegionState();
  const currencySymbol = getCurrencySymbol();

  const [featured, setFeatured] = useState<BonusZoneCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await bonusZoneApi.getBonusCampaigns(regionState?.currentRegion);
        if (!cancelled && response.success && response.data?.campaigns) {
          const featuredCampaigns = response.data.campaigns
            .filter(c => c.display.featured)
            .slice(0, MAX_FEATURED);
          setFeatured(featuredCampaigns);
        }
      } catch (err) {
        // Silently fail — this is a non-critical promotional section
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [regionState?.currentRegion]);

  // Don't render anything if loading or no featured campaigns
  if (loading) return null;
  if (featured.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrapper}>
            <Ionicons name="gift" size={16} color={colors.brand.orange} />
          </View>
          <Text style={styles.headerTitle}>Bonus Zone</Text>
        </View>
        <Pressable
          style={styles.viewAllButton}
          onPress={() => router.push('/bonus-zone')}
         
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brand.orange} />
        </Pressable>
      </View>

      <Text style={styles.subtitle}>Earn extra coins with limited-time bonuses</Text>

      {/* Featured Campaign Cards */}
      <View style={styles.cardsContainer}>
        {featured.map(campaign => (
          <BonusZoneCard
            key={campaign.slug}
            campaign={campaign}
            currencySymbol={currencySymbol}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.tint.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.orange,
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 12,
    marginLeft: 36,
  },
  cardsContainer: {
    gap: 0,
  },
});

export default React.memo(BonusZoneHighlight);
