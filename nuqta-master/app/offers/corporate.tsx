import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import * as identityApi from '@/services/identityApi';
import CachedImage from '@/components/ui/CachedImage';
import { useIsMounted } from '@/hooks/useIsMounted';

const FILTER_CHIPS = ['All', 'Lunch (12-2pm)', 'After Work (5-8pm)'];

function CorporateOffersPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const result = await identityApi.getCorporateOffers(1, 50);
      if (!isMounted()) return;
      setOffers(result.offers);
    } catch {
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const renderOffer = useCallback(({ item }: { item: any }) => (
    <Pressable style={styles.offerCard}>
      <View style={styles.offerInfo}>
        <ThemedText style={styles.offerTitle} numberOfLines={2}>
          {item.title || item.name}
        </ThemedText>
        <ThemedText style={styles.offerDescription} numberOfLines={2}>
          {item.description}
        </ThemedText>
        <View style={styles.zoneBadge}>
          <ThemedText style={styles.zoneBadgeText}>Work Perk</ThemedText>
        </View>
      </View>
      {item.icon && (
        <CachedImage source={{ uri: item.icon }} style={styles.offerImage} />
      )}
    </Pressable>
  ), []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Work Perks Near Office</ThemedText>
      </View>

      <View style={styles.chipRow}>
        {FILTER_CHIPS.map((chip) => (
          <Pressable
            key={chip}
            style={[styles.chip, activeFilter === chip && styles.chipActive]}
            onPress={() => setActiveFilter(chip)}
          >
            <ThemedText
              style={[styles.chipText, activeFilter === chip && styles.chipTextActive]}
            >
              {chip}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={offers}
        renderItem={renderOffer}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={5}
        initialNumToRender={6}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.secondary[600]} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color={colors.text.tertiary} />
              <ThemedText style={styles.emptyText}>No work perks available yet</ThemedText>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingTop: 56, paddingHorizontal: spacing.base, paddingBottom: spacing.md,
  },
  backButton: { padding: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  chipRow: {
    flexDirection: 'row', paddingHorizontal: spacing.base, gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.gray[100] },
  chipActive: { backgroundColor: colors.secondary[600] },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  chipTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: spacing.base, paddingBottom: 120 },
  offerCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: borderRadius.lg,
    padding: spacing.base, marginBottom: spacing.md, ...shadows.subtle,
  },
  offerInfo: { flex: 1 },
  offerTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
  offerDescription: { fontSize: 13, color: colors.text.secondary, marginBottom: spacing.sm },
  zoneBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.secondary[600] + '15',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  zoneBadgeText: { fontSize: 11, fontWeight: '600', color: colors.secondary[600] },
  offerImage: { width: 80, height: 80, borderRadius: borderRadius.md, marginLeft: spacing.md },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 14, color: colors.text.tertiary, marginTop: spacing.md },
});

export default withErrorBoundary(CorporateOffersPage, 'OffersCorporate');
