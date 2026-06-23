// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Saved/Favorite Offers Page
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import realOffersApi from '@/services/realOffersApi';
import { useIsAuthenticated } from '@/stores/selectors';
import logger from '@/utils/logger';
import { platformAlertConfirm } from '@/utils/platformAlert';
import { CardGridSkeleton } from '@/components/skeletons';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

function SavedOffersScreen() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();

  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSavedOffers = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const response = await realOffersApi.getUserFavoriteOffers();
      if (response.success && response.data) {
        setOffers(Array.isArray(response.data) ? response.data : response.data.offers || []);
      }
    } catch (err: any) {
      logger.error('[SavedOffers] Error:', err);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  const isMounted = useIsMounted();
  useEffect(() => { fetchSavedOffers(); }, [fetchSavedOffers]);

  const handleRemove = async (offerId: string) => {
    const confirmed = await platformAlertConfirm(
      'Remove from Saved',
      'Remove this offer from your saved list?'
    );
    if (!confirmed) return;
    try {
      await realOffersApi.removeOfferFromFavorites(offerId);
      if (!isMounted()) return;
      setOffers(prev => prev.filter(o => (o._id || o.id) !== offerId));
    } catch (err: any) {
      logger.error('[SavedOffers] Remove error:', err);
    }
  };

  const handleOfferPress = (offer: any) => {
    const offerId = offer._id || offer.id;
    router.push(`/offers/${offerId}`);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Save</ThemedText>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="log-in-outline" size={64} color={Colors.border.default} />
          <ThemedText style={styles.emptyTitle}>Login Required</ThemedText>
          <ThemedText style={styles.emptySubtitle}>Please login to view your saved offers</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <CardGridSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Save</ThemedText>
        <View style={styles.headerBtn}>
          {offers.length > 0 && (
            <View style={styles.countBadge}>
              <ThemedText style={styles.countText}>{offers.length}</ThemedText>
            </View>
          )}
        </View>
      </View>

      {offers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={64} color={Colors.border.default} />
          <ThemedText style={styles.emptyTitle}>No Saved Offers</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Tap the bookmark icon on any offer to save it here
          </ThemedText>
          <Pressable
            style={styles.browseButton}
            onPress={() => router.push('/offers')}
          >
            <ThemedText style={styles.browseButtonText}>Browse Offers</ThemedText>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSavedOffers(); }} />
          }
          showsVerticalScrollIndicator={false}
        >
          {offers.map((offer) => {
            const offerId = offer._id || offer.id;
            const isExpired = offer.validity?.endDate && new Date(offer.validity.endDate) < new Date();

            return (
              <Pressable
                key={offerId}
                style={styles.card}
                onPress={() => handleOfferPress(offer)}
               
              >
                {/* Image */}
                <View style={styles.imageContainer}>
                  {offer.image ? (
                    <CachedImage source={offer.image} style={styles.cardImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.cardImage, styles.imagePlaceholder]}>
                      <Ionicons name="image-outline" size={30} color={Colors.border.default} />
                    </View>
                  )}
                  {/* Remove button */}
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => handleRemove(offerId)}
                  >
                    <Ionicons name="bookmark" size={18} color={Colors.warning} />
                  </Pressable>
                  {/* Cashback badge */}
                  {offer.cashbackPercentage > 0 && (
                    <View style={styles.cashbackBadge}>
                      <ThemedText style={styles.cashbackText}>
                        {offer.cashbackPercentage}% OFF
                      </ThemedText>
                    </View>
                  )}
                  {isExpired && (
                    <View style={styles.expiredOverlay}>
                      <ThemedText style={styles.expiredText}>EXPIRED</ThemedText>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                  <ThemedText style={styles.cardTitle} numberOfLines={2}>{offer.title}</ThemedText>
                  <ThemedText style={styles.cardStore} numberOfLines={1}>
                    {offer.store?.name || 'Store'}
                  </ThemedText>
                  {offer.validity?.endDate && !isExpired && (
                    <ThemedText style={styles.cardExpiry}>
                      Expires: {new Date(offer.validity.endDate).toLocaleDateString()}
                    </ThemedText>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  headerBtn: { width: 40, height: 40, borderRadius: BorderRadius.xl, backgroundColor: Colors.background.secondary, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: Typography.h4.fontSize, fontWeight: '600' },
  countBadge: { backgroundColor: Colors.info, borderRadius: 10, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  countText: { color: Colors.text.inverse, fontSize: Typography.bodySmall.fontSize, fontWeight: '600' },
  scroll: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.base, gap: Spacing.md, paddingBottom: 120 },
  card: { width: CARD_WIDTH, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.default },
  imageContainer: { position: 'relative' },
  cardImage: { width: '100%', height: CARD_WIDTH * 0.7, backgroundColor: Colors.background.secondary },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  removeBtn: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  cashbackBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: Colors.success, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: 6 },
  cashbackText: { color: Colors.text.inverse, fontSize: Typography.caption.fontSize, fontWeight: '700' },
  expiredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  expiredText: { color: Colors.text.inverse, fontSize: Typography.body.fontSize, fontWeight: '700' },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: Typography.body.fontSize, fontWeight: '600', color: Colors.text.primary, marginBottom: 3 },
  cardStore: { fontSize: Typography.bodySmall.fontSize, color: Colors.text.tertiary, marginBottom: Spacing.xs },
  cardExpiry: { fontSize: Typography.caption.fontSize, color: Colors.warning },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing['2xl'] },
  emptyTitle: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.text.primary, marginTop: Spacing.base },
  emptySubtitle: { fontSize: Typography.body.fontSize, color: Colors.text.tertiary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
  browseButton: { backgroundColor: Colors.info, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: 10, marginTop: Spacing.lg },
  browseButtonText: { color: Colors.text.inverse, fontSize: Typography.body.fontSize, fontWeight: '600' },
});

export default withErrorBoundary(SavedOffersScreen, 'SavedOffers');
