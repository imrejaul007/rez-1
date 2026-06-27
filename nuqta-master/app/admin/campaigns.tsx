// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Admin Dashboard - Campaign Management
// Allows admins to view and edit campaigns, link deals to stores

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import apiClient from '@/services/apiClient';
import { useAuthUser, useCurrentRegionId, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Deal {
  store: string;
  storeId?: string;
  cashback?: string;
  coins?: string;
  bonus?: string;
  drop?: string;
  discount?: string;
  endsIn?: string;
  image?: string;
  storeDetails?: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
    location?: { city: string };
  };
}

interface Campaign {
  _id: string;
  campaignId: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  type: string;
  region: string;
  deals: Deal[];
  isActive: boolean;
  priority: number;
  startTime: string;
  endTime: string;
}

interface Store {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  image?: string;
  location?: { city: string };
}

function AdminCampaigns() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const currentRegion = useCurrentRegionId();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedDealIndex, setSelectedDealIndex] = useState<number | null>(null);
  const [storeSelectModalVisible, setStoreSelectModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadData();
  }, [isAuthenticated, authLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load campaigns
      const campaignResponse = await apiClient.get('/campaigns/admin/all');
      const campaignsData = (campaignResponse.data as any)?.campaigns || [];
      if (!isMounted()) return;
      setCampaigns(campaignsData);

      // Load stores for selection
      const storeResponse = await apiClient.get('/stores', { limit: 200 });
      const storesData = (storeResponse.data as any)?.stores || (storeResponse.data as any)?.data || [];
      if (!isMounted()) return;
      setStores(storesData);

    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to load campaigns. ' + (error.response?.data?.message || error.message));
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const openStoreSelector = (campaign: Campaign, dealIndex: number) => {
    setSelectedCampaign(campaign);
    setSelectedDealIndex(dealIndex);
    setStoreSearchQuery('');
    setStoreSelectModalVisible(true);
  };

  const handleLinkStore = async (storeId: string) => {
    if (!selectedCampaign || selectedDealIndex === null) return;

    setActionLoading(true);
    try {
      await apiClient.put(
        `/campaigns/admin/${selectedCampaign.campaignId}/deals/${selectedDealIndex}/link-store`,
        { storeId }
      );

      platformAlertSimple('Success', 'Store linked successfully!');
      if (!isMounted()) return;
      setStoreSelectModalVisible(false);
      loadData();
    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to link store. ' + (error.response?.data?.message || error.message));
    } finally {
      if (!isMounted()) return;
      setActionLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cashback': return Colors.success;
      case 'coins': return Colors.warning;
      case 'bank': return Colors.info;
      case 'bill': return Colors.brand.purple;
      case 'drop': return colors.brand.pink;
      case 'new-user': return colors.brand.cyan;
      default: return Colors.text.tertiary;
    }
  };

  const getRegionLabel = (region: string) => {
    switch (region) {
      case 'dubai': return 'Dubai';
      case 'bangalore': return 'Bangalore';
      case 'all': return 'All Regions';
      default: return region;
    }
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(storeSearchQuery.toLowerCase()) ||
    store.slug.toLowerCase().includes(storeSearchQuery.toLowerCase())
  );

  const toggleCampaignExpand = (campaignId: string) => {
    setExpandedCampaign(expandedCampaign === campaignId ? null : campaignId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.successScale[400]} />

      {/* Header */}
      <LinearGradient
        colors={[colors.successScale[400], colors.successScale[700]]}
        style={styles.header}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Campaign Management</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={loadData}
        >
          <Ionicons name="refresh" size={24} color="white" />
        </Pressable>
      </LinearGradient>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{campaigns.length}</Text>
          <Text style={styles.statLabel}>Campaigns</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{campaigns.filter(c => c.isActive).length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stores.length}</Text>
          <Text style={styles.statLabel}>Stores</Text>
        </View>
      </View>

      {/* Campaigns List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.successScale[400]} />
            <Text style={styles.loadingText}>Loading campaigns...</Text>
          </View>
        ) : campaigns.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={64} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No Campaigns</Text>
            <Text style={styles.emptyText}>No campaigns found in the database</Text>
          </View>
        ) : (
          campaigns.map((campaign) => (
            <View key={campaign._id} style={styles.campaignCard}>
              {/* Campaign Header */}
              <Pressable
                style={styles.campaignHeader}
                onPress={() => toggleCampaignExpand(campaign.campaignId)}
              >
                <View style={styles.campaignInfo}>
                  <View style={styles.campaignTitleRow}>
                    <View style={[styles.badgeContainer, { backgroundColor: getTypeColor(campaign.type) + '20' }]}>
                      <Text style={[styles.badgeText, { color: getTypeColor(campaign.type) }]}>
                        {campaign.badge}
                      </Text>
                    </View>
                    <Text style={styles.campaignTitle}>{campaign.title}</Text>
                  </View>
                  <Text style={styles.campaignSubtitle}>{campaign.subtitle}</Text>
                  <View style={styles.campaignMeta}>
                    <View style={[styles.typeTag, { backgroundColor: getTypeColor(campaign.type) + '15' }]}>
                      <Text style={[styles.typeTagText, { color: getTypeColor(campaign.type) }]}>
                        {campaign.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.regionTag}>{getRegionLabel(campaign.region)}</Text>
                    <View style={[styles.statusDot, { backgroundColor: campaign.isActive ? colors.successScale[400] : colors.error }]} />
                    <Text style={styles.statusText}>{campaign.isActive ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>
                <Ionicons
                  name={expandedCampaign === campaign.campaignId ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={colors.neutral[500]}
                />
              </Pressable>

              {/* Expanded Deals */}
              {expandedCampaign === campaign.campaignId && (
                <View style={styles.dealsContainer}>
                  <Text style={styles.dealsTitle}>Deals ({campaign.deals.length})</Text>
                  {campaign.deals.map((deal, index) => (
                    <View key={deal.storeId ?? `deal-${index}`} style={styles.dealCard}>
                      <View style={styles.dealInfo}>
                        {deal.image && (
                          <CachedImage source={deal.image} style={styles.dealImage} />
                        )}
                        <View style={styles.dealDetails}>
                          <Text style={styles.dealStore}>{deal.store}</Text>
                          <Text style={styles.dealValue}>
                            {deal.cashback || deal.coins || deal.bonus || deal.drop || deal.discount || '-'}
                          </Text>
                        </View>
                      </View>

                      {/* Store Link Status */}
                      <View style={styles.storeLinkSection}>
                        {deal.storeDetails ? (
                          <View style={styles.linkedStore}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
                            <Text style={styles.linkedStoreText}>
                              Linked to: {deal.storeDetails.name}
                            </Text>
                          </View>
                        ) : deal.storeId ? (
                          <View style={styles.linkedStore}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
                            <Text style={styles.linkedStoreText}>Store ID: {deal.storeId}</Text>
                          </View>
                        ) : (
                          <View style={styles.unlinkedStore}>
                            <Ionicons name="warning" size={16} color={colors.warningScale[400]} />
                            <Text style={styles.unlinkedStoreText}>No store linked</Text>
                          </View>
                        )}

                        <Pressable
                          style={styles.linkButton}
                          onPress={() => openStoreSelector(campaign, index)}
                        >
                          <Ionicons name="link" size={16} color="white" />
                          <Text style={styles.linkButtonText}>
                            {deal.storeId ? 'Change' : 'Link Store'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Store Selection Modal */}
      <Modal
        visible={storeSelectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStoreSelectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Store</Text>
              <Pressable onPress={() => setStoreSelectModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </Pressable>
            </View>

            {selectedCampaign && selectedDealIndex !== null && (
              <View style={styles.selectedDealInfo}>
                <Text style={styles.selectedDealLabel}>Linking store for:</Text>
                <Text style={styles.selectedDealName}>
                  {selectedCampaign.deals[selectedDealIndex]?.store}
                </Text>
              </View>
            )}

            {/* Search Box */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={colors.neutral[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search stores..."
                placeholderTextColor={colors.neutral[400]}
                value={storeSearchQuery}
                onChangeText={setStoreSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Store List */}
            <ScrollView style={styles.storeList} showsVerticalScrollIndicator={false}>
              {actionLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.successScale[400]} />
                </View>
              ) : filteredStores.length === 0 ? (
                <View style={styles.noStoresContainer}>
                  <Ionicons name="storefront-outline" size={48} color={colors.neutral[300]} />
                  <Text style={styles.noStoresText}>No stores found</Text>
                </View>
              ) : (
                filteredStores.map((store) => (
                  <Pressable
                    key={store._id}
                    style={styles.storeItem}
                    onPress={() => handleLinkStore(store._id)}
                  >
                    <View style={styles.storeItemInfo}>
                      {store.logo || store.image ? (
                        <CachedImage
                          source={store.logo || store.image}
                          style={styles.storeItemImage}
                        />
                      ) : (
                        <View style={styles.storeItemImagePlaceholder}>
                          <Ionicons name="storefront" size={20} color={colors.neutral[400]} />
                        </View>
                      )}
                      <View style={styles.storeItemDetails}>
                        <Text style={styles.storeItemName}>{store.name}</Text>
                        <Text style={styles.storeItemSlug}>{store.slug}</Text>
                        {store.location?.city && (
                          <Text style={styles.storeItemCity}>{store.location.city}</Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  refreshButton: {
    padding: Spacing.sm,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
    padding: Spacing.base,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  campaignCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  badgeContainer: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  campaignTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  campaignSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  campaignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  typeTagText: {
    ...Typography.overline,
    fontWeight: '600',
  },
  regionTag: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.sm,
  },
  statusText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  dealsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    padding: Spacing.base,
  },
  dealsTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  dealCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dealInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dealImage: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  dealDetails: {
    flex: 1,
  },
  dealStore: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  dealValue: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  storeLinkSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  linkedStore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  linkedStoreText: {
    ...Typography.bodySmall,
    color: Colors.success,
    flex: 1,
  },
  unlinkedStore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  unlinkedStoreText: {
    ...Typography.bodySmall,
    color: Colors.warning,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 6,
  },
  linkButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  selectedDealInfo: {
    padding: Spacing.base,
    backgroundColor: Colors.successScale[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  selectedDealLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  selectedDealName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.success,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    margin: Spacing.base,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    fontSize: 15,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  storeList: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  noStoresContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noStoresText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  storeItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeItemImage: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  storeItemImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  storeItemDetails: {
    flex: 1,
  },
  storeItemName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  storeItemSlug: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  storeItemCity: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
});

export default withErrorBoundary(AdminCampaigns, 'AdminCampaigns');
