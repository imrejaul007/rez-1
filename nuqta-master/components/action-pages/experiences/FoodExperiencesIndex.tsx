// @ts-nocheck
/**
 * All Food Experiences Page
 * /MainCategory/food-dining/experiences
 * Browse all store experiences with filtering
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { experiencesApi, StoreExperience } from '@/services/experiencesApi';
import SectionErrorBanner from '@/components/common/SectionErrorBanner';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  primaryGold: colors.warningScale[400],
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
  border: colors.neutral[200],
};

const TYPE_ICONS: Record<string, string> = {
  fastDelivery: '⚡', budgetFriendly: '💰', premium: '👑', organic: '🌿',
  oneRupee: '1️⃣', ninetyNine: '🏷️', luxury: '✨', verified: '✅',
  partner: '🤝', mall: '🏬',
};

function ExperiencesPage() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<StoreExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const fetchExperiences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await experiencesApi.getExperiences({ limit: 50 });
      if (res.success && res.data?.experiences) {
        if (!isMounted()) return;
        setExperiences(res.data.experiences);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load experiences. Pull down to refresh.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchExperiences(); }, [fetchExperiences]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExperiences();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const renderExperience = ({ item }: { item: StoreExperience }) => (
    <Pressable
      style={styles.expCard}
      onPress={() => { const eid = item._id || item.slug; if (eid) router.push(`/MainCategory/food-dining/experiences/${eid}` as any); }}
     
    >
      <LinearGradient
        colors={(item.backgroundColor && /^#[0-9A-Fa-f]{6}$/.test(item.backgroundColor)
          ? [item.backgroundColor, item.backgroundColor + '80']
          : [colors.neutral[50], colors.neutral[100]]) as any}
        style={styles.expGradient}
      >
        <View style={styles.expHeader}>
          <Text style={styles.expIcon}>{item.icon || TYPE_ICONS[item.type] || '🍽️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.expTitle}>{item.title}</Text>
            {item.subtitle && <Text style={styles.expSubtitle} numberOfLines={2}>{item.subtitle}</Text>}
          </View>
          {item.badge && (
            <View style={[styles.expBadge, { backgroundColor: item.badgeBg || COLORS.primaryGold }]}>
              <Text style={[styles.expBadgeText, { color: item.badgeColor || COLORS.white }]}>{item.badge}</Text>
            </View>
          )}
        </View>

        <View style={styles.expMeta}>
          {item.storeCount ? (
            <View style={styles.metaItem}>
              <Ionicons name="storefront-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{item.storeCount} restaurants</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </View>

        {item.benefits && item.benefits.length > 0 && (
          <View style={styles.benefitsRow}>
            {item.benefits.slice(0, 3).map((b, i) => (
              <View key={i} style={styles.benefitChip}>
                <Ionicons name="checkmark" size={12} color={colors.success} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Food Experiences</Text>
          <Text style={styles.headerSubtitle}>{experiences.length} experiences</Text>
        </View>
      </View>

      {error && <SectionErrorBanner message={error} onRetry={() => { setError(null); fetchExperiences(); }} compact />}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGold} />
          <Text style={styles.loadingText}>Loading experiences...</Text>
        </View>
      ) : (
        <FlashList
          data={experiences}
          keyExtractor={(item, i) => item._id || item.slug || `exp-${i}`}
          renderItem={renderExperience}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryGold]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>No experiences available</Text>
              <Text style={styles.emptySubtitle}>Food experiences will appear here soon</Text>
            </View>
          }
          estimatedItemSize={150}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  list: { padding: 16, paddingBottom: 100 },
  expCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  expGradient: { padding: 16 },
  expHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  expIcon: { fontSize: 36 },
  expTitle: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  expSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  expBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  expBadgeText: { fontSize: 10, fontWeight: '700' },
  expMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  benefitChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successScale[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  benefitText: { fontSize: 11, color: '#166534' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});

export default React.memo(ExperiencesPage);
