// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import bonusZoneApi, { BonusZoneCampaign } from '@/services/bonusZoneApi';
import campaignsApi, { Campaign } from '@/services/campaignsApi';
import BonusZoneCard from '@/components/earn/BonusZoneCard';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors } from '@/constants/DesignSystem';
import { useRegionState } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';
import { colors, shadows } from '@/constants/theme';

const FILTER_TABS = [
  { key: 'all',        label: 'All Deals',      icon: 'flash' },
  { key: 'cashback',   label: 'Cashback',       icon: 'cash-outline' },
  { key: 'bank',       label: 'Bank Offers',    icon: 'card-outline' },
  { key: 'multiplier', label: '2× Coins',       icon: 'rocket-outline' },
  { key: 'festival',   label: 'Festival',       icon: 'gift-outline' },
] as const;

type FilterKey = typeof FILTER_TABS[number]['key'];

function DealsIndexPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isMounted = useIsMounted();
  const regionState = useRegionState();

  const [bonusCampaigns, setBonusCampaigns] = useState<BonusZoneCampaign[]>([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [error, setError] = useState<string | null>(null);

  const loadDeals = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [bonusRes, campaignsRes] = await Promise.allSettled([
        bonusZoneApi.getBonusCampaigns(regionState?.currentRegion),
        campaignsApi.getActiveCampaigns({ limit: 20 }),
      ]);

      if (!isMounted()) return;

      if (bonusRes.status === 'fulfilled' && bonusRes.value.success && bonusRes.value.data) {
        setBonusCampaigns(bonusRes.value.data.campaigns || []);
      }

      if (campaignsRes.status === 'fulfilled' && campaignsRes.value.success && campaignsRes.value.data) {
        setFeaturedCampaigns(campaignsRes.value.data.campaigns || []);
      }

    } catch {
      if (isMounted()) setError('Failed to load deals. Pull down to retry.');
    } finally {
      if (isMounted()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [regionState?.currentRegion, isMounted]);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  // Filter bonus campaigns by type
  const filteredCampaigns = bonusCampaigns.filter(c => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'cashback') return ['cashback_boost', 'first_transaction_bonus', 'bill_upload_bonus'].includes(c.campaignType);
    if (activeFilter === 'bank') return c.campaignType === 'bank_offer';
    if (activeFilter === 'multiplier') return c.campaignType === 'category_multiplier';
    if (activeFilter === 'festival') return c.campaignType === 'festival_offer';
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.nileBlue, '#2a5080']}
        style={{
          paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 4),
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>
              Deals
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {bonusCampaigns.length > 0
                ? `${bonusCampaigns.length} active deals for you`
                : 'Latest offers & cashback boosts'}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/bonus-zone' as any)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
              Bonus Zone
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Filter tabs */}
      <View style={{ backgroundColor: '#fff', elevation: 2, shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 } }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
        >
          {FILTER_TABS.map(tab => {
            const isActive = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isActive ? Colors.nileBlue : '#F1F5F9',
                }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={13}
                  color={isActive ? '#fff' : '#64748b'}
                />
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: isActive ? '#fff' : '#64748b',
                }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDeals(true)}
            tintColor={Colors.nileBlue}
          />
        }
      >
        {/* Loading state */}
        {loading && <CardGridSkeleton count={6} />}

        {/* Error state */}
        {!loading && error && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="alert-circle-outline" size={48} color="#cbd5e1" />
            <Text style={{ color: '#94a3b8', marginTop: 12, textAlign: 'center' }}>{error}</Text>
            <Pressable
              onPress={() => loadDeals()}
              style={{ marginTop: 12, backgroundColor: Colors.nileBlue, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Bonus campaigns */}
        {!loading && !error && filteredCampaigns.length > 0 && (
          <>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
              {activeFilter === 'all' ? 'Active Deals' : FILTER_TABS.find(t => t.key === activeFilter)?.label}
              {' '}
              <Text style={{ fontWeight: '400', color: '#94a3b8', fontSize: 13 }}>
                ({filteredCampaigns.length})
              </Text>
            </Text>
            <View style={{ gap: 10 }}>
              {filteredCampaigns.map(campaign => (
                <BonusZoneCard
                  key={campaign.id}
                  campaign={campaign}
                  onPress={() => router.push(`/deals/${campaign.id}` as any)}
                />
              ))}
            </View>
          </>
        )}

        {/* Featured campaigns from campaignsApi */}
        {!loading && !error && featuredCampaigns.length > 0 && activeFilter === 'all' && (
          <>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginTop: 24, marginBottom: 12 }}>
              Featured Campaigns
            </Text>
            <View style={{ gap: 10 }}>
              {featuredCampaigns.map(campaign => (
                <Pressable
                  key={campaign._id}
                  onPress={() => router.push(`/deals/${campaign._id}` as any)}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 14,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    ...shadows.sm,
                  }}
                >
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: Colors.nileBlue + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Ionicons name="pricetag-outline" size={20} color={Colors.nileBlue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }} numberOfLines={1}>
                      {campaign.title || campaign.name}
                    </Text>
                    {campaign.description && (
                      <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }} numberOfLines={1}>
                        {campaign.description}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Empty state */}
        {!loading && !error && filteredCampaigns.length === 0 && featuredCampaigns.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="flash-outline" size={56} color="#e2e8f0" />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#94a3b8', marginTop: 16 }}>
              No deals right now
            </Text>
            <Text style={{ fontSize: 13, color: '#cbd5e1', marginTop: 6, textAlign: 'center' }}>
              Check back soon for cashback offers and special deals
            </Text>
            <Pressable
              onPress={() => loadDeals()}
              style={{ marginTop: 16, backgroundColor: Colors.nileBlue, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Refresh</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default withErrorBoundary(DealsIndexPage, 'DealsIndexPage');
