// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Alliance Store Page
// Partner alliance stores with combined loyalty - connected to real backend data

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Shadows } from '@/constants/DesignSystem';
import mallApi from '@/services/mallApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface AllianceStore {
  _id: string;
  name: string;
  logo?: string;
  category?: { name: string; slug: string };
  offers?: { cashback?: number };
  ratings?: { average: number; count: number };
  tags?: string[];
  isVerified?: boolean;
}

function AllianceStorePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [stores, setStores] = useState<AllianceStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const data = await mallApi.getAllianceStores(30);
      if (!isMounted()) return;
      setStores(data || []);
    } catch (err) {
      if (!isMounted()) return;
      setError('Unable to load alliance stores');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderStore = useCallback(({ item }: { item: AllianceStore }) => (
    <Pressable
      style={styles.storeCard}
      onPress={() => router.push(`/MainStorePage?storeId=${item._id}` as any)}
     
    >
      {/* Store Image */}
      <View style={styles.storeImageContainer}>
        {item.logo ? (
          <CachedImage
            source={item.logo}
            style={styles.storeLogo}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={[colors.brand.sky, colors.brand.skyDark]}
            style={styles.storeLogoFallback}
          >
            <ThemedText style={styles.storeInitials}>{getInitials(item.name)}</ThemedText>
          </LinearGradient>
        )}
        {item.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.brand.sky} />
          </View>
        )}
      </View>

      <ThemedText style={styles.storeName} numberOfLines={1}>{item.name}</ThemedText>
      <ThemedText style={styles.storeCategory} numberOfLines={1}>
        {item.category?.name || 'Store'}
      </ThemedText>

      {/* Rating */}
      {item.ratings && item.ratings.count > 0 && (
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={colors.warningScale[400]} />
          <ThemedText style={styles.ratingText}>
            {item.ratings.average.toFixed(1)}
          </ThemedText>
          <ThemedText style={styles.ratingCount}>
            ({item.ratings.count})
          </ThemedText>
        </View>
      )}

      <View style={styles.benefitsContainer}>
        <View style={styles.benefitRow}>
          <View style={styles.benefitIconContainer}>
            <Ionicons name="flash" size={12} color={colors.brand.sky} />
          </View>
          <ThemedText style={styles.benefitText} numberOfLines={1}>
            {item.offers?.cashback ? `${item.offers.cashback}% Coins` : 'Earn Coins'}
          </ThemedText>
        </View>
        <View style={styles.benefitRow}>
          <View style={styles.benefitIconContainer}>
            <Ionicons name="link" size={12} color={colors.successScale[700]} />
          </View>
          <ThemedText style={styles.benefitText} numberOfLines={1}>
            Partner Points
          </ThemedText>
        </View>
      </View>
    </Pressable>
  ), [router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.sky} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient
          colors={[colors.brand.sky, colors.brand.skyDark, '#075985']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
             
            >
              <View style={styles.backButtonInner}>
                <Ionicons name="chevron-back" size={22} color={colors.brand.sky} />
              </View>
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Alliance Stores</ThemedText>
            </View>

            <View style={styles.placeholder} />
          </View>

          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="link" size={32} color={colors.background.primary} />
            </View>
            <ThemedText style={styles.heroTitle}>Partner Benefits</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              {`Earn ${BRAND.COIN_NAME} + Partner Points together`}
            </ThemedText>
          </View>
        </LinearGradient>

        {/* Content */}
        {isLoading ? (
          <CardGridSkeleton />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[400]} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryButton} onPress={() => fetchStores()}>
              <ThemedText style={styles.retryText}>Try Again</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlashList
            data={stores}
            renderItem={renderStore}
            keyExtractor={(item) => item._id}
          estimatedItemSize={110}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => fetchStores(true)}
                tintColor={colors.brand.sky}
                colors={[colors.brand.sky]}
              />
            }
            ListHeaderComponent={
              <View style={styles.infoCard}>
                <LinearGradient
                  colors={[colors.tint.blue, colors.tint.blueLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.infoCardGradient}
                >
                  <View style={styles.infoIconContainer}>
                    <LinearGradient
                      colors={[colors.brand.sky, colors.brand.skyDark]}
                      style={styles.infoIconGradient}
                    >
                      <Ionicons name="gift" size={20} color={colors.background.primary} />
                    </LinearGradient>
                  </View>
                  <View style={styles.infoContent}>
                    <ThemedText style={styles.infoTitle}>Double Rewards</ThemedText>
                    <ThemedText style={styles.infoText}>
                      Shop at alliance stores to earn both ${BRAND.COIN_NAME} and partner loyalty points
                    </ThemedText>
                  </View>
                </LinearGradient>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="storefront-outline" size={64} color={colors.neutral[400]} />
                <ThemedText style={styles.emptyText}>No alliance stores yet</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Partner stores will appear here soon
                </ThemedText>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Shadows.medium,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.subtle,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.background.primary,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    gap: 12,
  },
  infoCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  infoCardGradient: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  infoIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C4A6E',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.brand.skyDark,
    lineHeight: 18,
  },
  storeCard: {
    width: '48%',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F4F8',
    ...Shadows.subtle,
  },
  storeImageContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  storeLogo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
  },
  storeLogoFallback: {
    width: 72,
    height: 72,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInitials: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.background.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: '25%',
    backgroundColor: colors.background.primary,
    borderRadius: 10,
    padding: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 4,
    width: '100%',
  },
  storeCategory: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  ratingCount: {
    fontSize: 11,
    color: colors.neutral[400],
  },
  benefitsContainer: {
    width: '100%',
    gap: 6,
    marginTop: 'auto',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  benefitIconContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 11,
    color: colors.brand.skyDark,
    fontWeight: '600',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.brand.sky,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.neutral[400],
  },
});

export default withErrorBoundary(AllianceStorePage, 'MallAllianceStore');
